#!/usr/bin/env python3
"""Build participant debrief PDF from GGIR part5 (Ali Meredith workflow).

Maps GGIR personsummary / daysummary columns to the numbers Ali types by hand
(Sleep, Sedentary, Light, MVPA hours per wear period; sleep by weekday;
average sleep efficiency). PDF via reportlab stack D only (no HTML path).

Ali reference: HBC/other/1466_8-24-2026_Report.pptx

Usage:
  python repos/boost-report-plots/debrief/build_debrief.py 7222 --cohort obs --lab-id 1417 \\
    --manual-json repos/boost-report-plots/debrief/example_manual_1466.json \\
    --out temp/debrief_7222.pdf

  # same + copy into Ali's completed-report folder:
  python repos/boost-report-plots/debrief/build_debrief.py 7222 --lab-id 1417 --out temp/debrief_7222.pdf --land

  # layout-D visual QA without GGIR (synthetic wear + example fitness):
  python repos/boost-report-plots/debrief/build_debrief.py --demo --out temp/debrief_demo_D.pdf

Completed-report landing:
  Windows: W:\\Repositories\\Accelerometer_Data\\ActivityFiles\\BOOST-I\\auto
  vosslink: /mnt/nfs/rdss/vosslab/Repositories/Accelerometer_Data/ActivityFiles/BOOST-I/auto

See HELP.md for the full GGIR → PDF → land flow.
"""

from __future__ import annotations

import argparse
import base64
import io
import json
import re
import sys
import tempfile
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

TOOL_DIR = Path(__file__).resolve().parent
if str(TOOL_DIR) not in sys.path:
    sys.path.insert(0, str(TOOL_DIR))
from debrief_pdf import build_debrief_pdf_from_data  # noqa: E402
from io_paths import (  # noqa: E402
    group_writable,
    land_pdf_group_writable,
    part5_newest_mtime,
)

LAYOUTS = (
    "a_split",
    "b_stacked",
    "c_dual_chart",
    "d_activity_hero",
    "e_stack3",
    "f_stack3_visual",
    "g_metrics_hero",
)
LAYOUTS_DIR = TOOL_DIR / "layouts"
PARTS_DIR = LAYOUTS_DIR / "parts"
# Production = stack D (reportlab). HTML layout ids kept for archival samples only.
DEFAULT_LAYOUT = "d_activity_hero"

DEFAULT_WINDOWS_OBS = Path(
    r"Z:\Projects\BOOST\ObservationalStudy\3-experiment\data"
    r"\act-obs-final-test-2\derivatives\GGIR-3.2.6"
)
DEFAULT_WINDOWS_INT = Path(
    r"Z:\Projects\BOOST\InterventionStudy\3-experiment\output"
    r"\derivatives\GGIR-3.2.6"
)
DEFAULT_LINUX_OBS = Path(
    "/mnt/nfs/lss/vosslabhpc/Projects/BOOST/ObservationalStudy"
    "/3-experiment/data/act-obs-final-test-2/derivatives/GGIR-3.2.6"
)
DEFAULT_LINUX_INT = Path(
    "/mnt/nfs/lss/vosslabhpc/Projects/BOOST/InterventionStudy"
    "/3-experiment/output/derivatives/GGIR-3.2.6"
)

DOW_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
DOW_SHORT = {"Monday": "Mon.", "Tuesday": "Tues.", "Wednesday": "Wed.", "Thursday": "Thur.",
             "Friday": "Fri.", "Saturday": "Sat.", "Sunday": "Sun"}


@dataclass
class WearPeriodMetrics:
    session: str
    date_range: str
    sleep_h: float
    sedentary_h: float
    light_h: float
    mvpa_h: float
    sleep_efficiency_pct: float | None


@dataclass
class DebriefData:
    subject_id: str
    lab_id: str
    cohort: str
    wear_periods: list[WearPeriodMetrics] = field(default_factory=list)
    sleep_by_dow: list[tuple[str, float]] = field(default_factory=list)
    sleep_by_dow_wp: list[tuple[str, list[tuple[str, float]]]] = field(default_factory=list)
    avg_sleep_efficiency_pct: float | None = None
    manual: dict = field(default_factory=dict)
    activity_chart_b64: str = ""
    sleep_chart_b64: str = ""
    sleep_wp_chart_b64: str = ""
    fitness_sessions_b64: str = ""
    fitness_prepost_b64: str = ""
    fitness_hr_b64: str = ""
    summary_paragraph: str = ""
    summary_runs: list = field(default_factory=list)  # list[SummaryRun]


def _pick_ggir_root(cohort: str, explicit: str | None) -> Path:
    if explicit:
        return Path(explicit)
    if cohort == "obs":
        if DEFAULT_WINDOWS_OBS.is_dir():
            return DEFAULT_WINDOWS_OBS
        return DEFAULT_LINUX_OBS
    if DEFAULT_WINDOWS_INT.is_dir():
        return DEFAULT_WINDOWS_INT
    return DEFAULT_LINUX_INT


def _infer_cohort(subject_id: str) -> str:
    sid = int(subject_id)
    if sid >= 8000:
        return "int"
    return "obs"


def _results_dir(session_dir: Path) -> Path | None:
    ses_name = session_dir.name
    candidates = [
        session_dir / f"output_{ses_name}" / "results",
        session_dir / f"output_{ses_name}" / f"output_{ses_name}" / "results",
        session_dir / "output_accel" / "results",
    ]
    for path in candidates:
        if path.is_dir() and list(path.glob("part5_personsummary_MM*.csv")):
            return path
    return None


def _first_csv(results_dir: Path, pattern: str) -> Path | None:
    matches = sorted(results_dir.glob(pattern))
    return matches[0] if matches else None


def _minutes_to_hours(minutes: float) -> float:
    return round(float(minutes) / 60.0, 1)


def _person_hours(row: pd.Series) -> dict[str, float]:
    sleep = float(row["dur_spt_min_pla"])
    inactivity = float(row["dur_day_total_IN_min_pla"])
    light = float(row["dur_day_total_LIG_min_pla"])
    mvpa = float(row["dur_day_total_MOD_min_pla"]) + float(row["dur_day_total_VIG_min_pla"])
    return {
        "sleep_h": _minutes_to_hours(sleep),
        "sedentary_h": _minutes_to_hours(inactivity),
        "light_h": _minutes_to_hours(light),
        "mvpa_h": _minutes_to_hours(mvpa),
    }


def _format_date_range(dates: pd.Series) -> str:
    parsed = pd.to_datetime(dates, errors="coerce").dropna()
    if parsed.empty:
        return "unknown dates"
    start = parsed.min().strftime("%m/%d/%Y")
    end = parsed.max().strftime("%m/%d/%Y")
    if start == end:
        return start
    return f"{start}-{end}"


def _load_sessions(ggir_root: Path, subject_id: str) -> list[tuple[str, Path, Path]]:
    accel = ggir_root / f"sub-{subject_id}" / "accel"
    if not accel.is_dir():
        raise FileNotFoundError(f"No GGIR accel tree: {accel}")

    loaded: list[tuple[str, Path, Path]] = []
    for ses_dir in sorted(accel.glob("ses-*")):
        results = _results_dir(ses_dir)
        if results is None:
            continue
        person = _first_csv(results, "part5_personsummary_MM*.csv")
        day = _first_csv(results, "part5_daysummary_MM*.csv")
        if person and day:
            loaded.append((ses_dir.name, person, day))
    if not loaded:
        raise FileNotFoundError(f"No part5 person+day CSVs under {accel}")
    return loaded


def _sleep_by_weekday(day_frames: list[pd.DataFrame]) -> list[tuple[str, float]]:
    df = pd.concat(day_frames, ignore_index=True)
    if "weekday" not in df.columns or "dur_spt_sleep_min" not in df.columns:
        return []

    df = df.copy()
    df["weekday"] = df["weekday"].astype(str).str.strip()
    df["sleep_h"] = pd.to_numeric(df["dur_spt_sleep_min"], errors="coerce") / 60.0
    grouped = df.groupby("weekday", as_index=False)["sleep_h"].mean()

    name_map = {
        "Monday": "Monday", "Mon": "Monday", "Mon.": "Monday",
        "Tuesday": "Tuesday", "Tues": "Tuesday", "Tues.": "Tuesday", "Tue": "Tuesday",
        "Wednesday": "Wednesday", "Wed": "Wednesday", "Wed.": "Wednesday",
        "Thursday": "Thursday", "Thur": "Thursday", "Thur.": "Thursday", "Thu": "Thursday",
        "Friday": "Friday", "Fri": "Friday", "Fri.": "Friday",
        "Saturday": "Saturday", "Sat": "Saturday", "Sat.": "Saturday",
        "Sunday": "Sunday", "Sun": "Sunday", "Sun.": "Sunday",
    }
    grouped["weekday_norm"] = grouped["weekday"].map(lambda x: name_map.get(x, x))
    out: list[tuple[str, float]] = []
    for dow in DOW_ORDER:
        match = grouped[grouped["weekday_norm"] == dow]
        if not match.empty:
            out.append((DOW_SHORT[dow], round(float(match["sleep_h"].iloc[0]), 1)))
    return out


def _avg_sleep_efficiency(day_frames: list[pd.DataFrame]) -> float | None:
    df = pd.concat(day_frames, ignore_index=True)
    col = "sleep_efficiency_after_onset"
    if col not in df.columns:
        return None
    vals = pd.to_numeric(df[col], errors="coerce").dropna()
    if vals.empty:
        return None
    return round(float(vals.mean()) * 100.0, 1)


def _b(text: str) -> str:
    """HTML bold — matches Ali PPTX emphasis on measured values."""
    return f"<strong>{text}</strong>"


def _bold_hr_zones(text: str) -> str:
    """Bold BPM values in zone strings like '60% 102, 70% 119, 80% 135'."""
    parts = [p.strip() for p in text.split(",") if p.strip()]
    out: list[str] = []
    for part in parts:
        m = re.search(r"(\d+)\s*$", part)
        if m:
            out.append(part[: m.start()] + _b(m.group(1)))
        else:
            out.append(part)
    return ", ".join(out)


def _fitness_placeholders(m: dict, lab_id: str) -> dict[str, str]:
    """Build fitness text placeholders with Ali-style bold on key numbers."""
    pre_vo2 = str(m.get("pre_vo2", "—"))
    post_vo2 = str(m.get("post_vo2", "—"))
    waist_pre = str(m.get("waist_pre", "—")).replace(" cm", "")
    waist_post = str(m.get("waist_post", "—")).replace(" cm", "")
    hr_pre = str(m.get("resting_hr_pre", "—"))
    hr_post = str(m.get("resting_hr_post", "—"))
    sessions = str(m.get("sessions_completed", "—"))
    adherence = str(m.get("adherence_pct", "—"))
    hr_zones = str(m.get("hr_zones", "—"))
    hr_max = str(m.get("hr_max", "—"))

    return {
        "{{LAB_ID}}": _b(f"Activity Report LabID: {lab_id}"),
        "{{LAB_ID_PLAIN}}": lab_id,
        "{{PRE_VO2_LINE}}": f"Pre-intervention VO<sub>2</sub> max: {_b(f'{pre_vo2} ml/kg/min')}",
        "{{POST_VO2_LINE}}": f"Post-intervention VO<sub>2</sub> max: {_b(f'{post_vo2} ml/kg/min')}",
        "{{WAIST_PRE_LINE}}": f"Waist Circumference: {_b(f'{waist_pre} cm')}",
        "{{WAIST_POST_LINE}}": f"Waist Circumference: {_b(f'{waist_post} cm')}",
        "{{HR_PRE_LINE}}": f"Resting Heart Rate: {_b(f'{hr_pre} bpm')}",
        "{{HR_POST_LINE}}": f"Resting Heart Rate: {_b(f'{hr_post} bpm')}",
        "{{SESSIONS_LINE}}": f"Exercise Sessions: {_b(sessions)}",
        "{{ADHERENCE_LINE}}": f"{_b(f'{adherence}% adherence rate')}",
        "{{HR_ZONES_LINE}}": f"Heart Rate Zones: {_bold_hr_zones(hr_zones)}",
        "{{HR_MAX_LINE}}": f"Heart Rate Max: {_b(f'{hr_max} bpm')}",
        "{{HR_MAX_PLAIN}}": f"{hr_max} bpm" if hr_max not in {"—", ""} else "—",
        "{{PRE_VO2_DATE}}": str(m.get("pre_vo2_date", "—")),
        "{{POST_VO2_DATE}}": str(m.get("post_vo2_date", "—")),
        "{{EXercise_RANGE}}": str(m.get("exercise_range", "—")),
    }


def _chart_activity_bars(wear_periods: list[WearPeriodMetrics]) -> str:
    """Stacked horizontal bars per wear period with hour labels on segments."""
    n = len(wear_periods)
    segment_colors = {
        "Sleep": "#aec7e8",
        "Sedentary": "#ffbb78",
        "Light": "#98df8a",
        "MVPA": "#ff9896",
    }
    segment_order = ["Sleep", "Sedentary", "Light", "MVPA"]
    min_label_h = 0.55  # hours — smaller segments skip in-bar text

    fig_h = max(2.2, 0.52 * n + 1.0)
    fig, ax = plt.subplots(figsize=(7.2, fig_h))

    bar_h = 0.36
    for i, wp in enumerate(wear_periods):
        y = n - 1 - i
        vals = {
            "Sleep": wp.sleep_h,
            "Sedentary": wp.sedentary_h,
            "Light": wp.light_h,
            "MVPA": wp.mvpa_h,
        }
        left = 0.0
        for seg in segment_order:
            v = vals[seg]
            ax.barh(
                y,
                v,
                left=left,
                height=bar_h,
                color=segment_colors[seg],
                edgecolor="#333333",
                linewidth=0.5,
            )
            if v >= min_label_h:
                ax.text(
                    left + v / 2,
                    y,
                    f"{v:.1f}",
                    ha="center",
                    va="center",
                    fontsize=8,
                    color="#111111",
                    fontweight="bold",
                )
            elif v >= 0.25:
                ax.text(
                    left + v,
                    y + bar_h / 2 + 0.06,
                    f"{v:.1f}",
                    ha="left",
                    va="bottom",
                    fontsize=7,
                    color="#333333",
                    fontweight="bold",
                )
            left += v

    ax.set_yticks([n - 1 - i for i in range(n)])
    ax.set_yticklabels([f"Wear Period {i + 1}" for i in range(n)], fontsize=9)
    ax.set_xlim(0, 24)
    ax.set_xticks([0, 6, 12, 18, 24])
    ax.set_xlabel("Average daily hours", fontsize=10, labelpad=8)
    ax.spines[["top", "right", "left"]].set_visible(False)
    ax.tick_params(axis="y", length=0, pad=4)

    # Wear-period date ranges on right (same PNG for HTML + reportlab)
    ax2 = ax.twinx()
    ax2.set_ylim(ax.get_ylim())
    ax2.set_yticks([n - 1 - i for i in range(n)])
    ax2.set_yticklabels(
        [wp.date_range for wp in wear_periods],
        fontsize=8,
        fontweight="bold",
        color="#222222",
    )
    ax2.tick_params(axis="y", length=0, pad=2)
    ax2.spines[["top", "right", "left"]].set_visible(False)

    fig.subplots_adjust(bottom=0.16, left=0.20, right=0.78, top=0.96)
    return _fig_to_b64(fig)


def _chart_sleep_dow(
    rows: list[tuple[str, float]],
    *,
    min_h: float = 6.0,
    goal_h: float = 8.0,
) -> str:
    if not rows:
        fig, ax = plt.subplots(figsize=(6.2, 2.8))
        ax.text(0.5, 0.5, "No weekday sleep data", ha="center", va="center")
        ax.axis("off")
        return _fig_to_b64(fig)

    labels = [r[0] for r in rows]
    values = [r[1] for r in rows]
    ymax = max(max(values) + 1.8, goal_h + 1.5)

    fig, ax = plt.subplots(figsize=(6.4, 3.2))

    # Highlight recommended sleep window (min → goal)
    ax.axhspan(min_h, goal_h, facecolor="#c8e6c9", alpha=0.55, zorder=0)
    ax.axhline(goal_h, color="#2e7d32", linestyle="--", linewidth=2.0, zorder=1)
    ax.axhline(min_h, color="#ef6c00", linestyle="--", linewidth=2.0, zorder=1)
    # Labels on the right — avoids Y-axis tick overlap; keep clear of crop
    x_ann = len(labels) - 0.08
    ax.text(
        x_ann, goal_h, f"  Goal {goal_h:.0f} h",
        fontsize=9, color="#2e7d32", va="bottom", ha="left", fontweight="bold", zorder=3,
        clip_on=False,
    )
    ax.text(
        x_ann, min_h, f"  Min {min_h:.0f} h",
        fontsize=9, color="#ef6c00", va="top", ha="left", fontweight="bold", zorder=3,
        clip_on=False,
    )

    bar_colors = []
    for v in values:
        if v < min_h:
            bar_colors.append("#ef9a9a")  # below min
        elif v >= goal_h:
            bar_colors.append("#81c784")  # at/above goal
        else:
            bar_colors.append("#aec7e8")  # in range

    ax.bar(
        labels, values, color=bar_colors, edgecolor="#333333", linewidth=0.5,
        width=0.65, zorder=2,
    )

    for i, v in enumerate(values):
        ax.text(
            i, v + 0.2, f"{v:.1f}", ha="center", va="bottom",
            fontsize=9, zorder=3, fontweight="bold",
        )

    ax.set_ylabel("Hours", fontsize=10, labelpad=6)
    ax.set_ylim(0, ymax)
    ax.set_xlim(-0.5, len(labels) + 1.35)  # room for Goal/Min labels on right
    ax.spines[["top", "right"]].set_visible(False)
    # clip_on=False annotations need pad so fig.savefig does not crop them
    fig.subplots_adjust(bottom=0.14, left=0.12, right=0.80, top=0.88)
    return _fig_to_b64(fig)


def _fig_to_b64(fig: plt.Figure) -> str:
    buf = io.BytesIO()
    # Do not use bbox_inches='tight' — it re-crops and can stack legend/labels.
    fig.savefig(buf, format="png", dpi=150, facecolor="white")
    plt.close(fig)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def build_debrief(
    subject_id: str,
    *,
    cohort: str,
    lab_id: str,
    ggir_root: Path,
    manual: dict | None = None,
) -> DebriefData:
    sessions = _load_sessions(ggir_root, subject_id)
    wear_periods: list[WearPeriodMetrics] = []
    day_frames: list[pd.DataFrame] = []
    session_names: list[str] = []

    for ses_name, person_path, day_path in sessions:
        person = pd.read_csv(person_path)
        day = pd.read_csv(day_path)
        day_frames.append(day)
        session_names.append(ses_name)
        row = person.iloc[0]
        hours = _person_hours(row)
        eff = row.get("sleep_efficiency_after_onset_pla")
        eff_pct = round(float(eff) * 100, 1) if pd.notna(eff) else None
        wear_periods.append(
            WearPeriodMetrics(
                session=ses_name,
                date_range=_format_date_range(day["calendar_date"]),
                sleep_h=hours["sleep_h"],
                sedentary_h=hours["sedentary_h"],
                light_h=hours["light_h"],
                mvpa_h=hours["mvpa_h"],
                sleep_efficiency_pct=eff_pct,
            )
        )

    manual = manual or {}
    from visual_metrics import (  # local import keeps optional matplotlib path clear
        build_fitness_visual_b64,
        chart_sleep_by_weekday_wear,
        sleep_by_weekday_wear,
    )

    sleep_wp = sleep_by_weekday_wear(day_frames, session_names)
    fit_viz = build_fitness_visual_b64(manual)

    data = DebriefData(
        subject_id=subject_id,
        lab_id=lab_id,
        cohort=cohort,
        wear_periods=wear_periods,
        sleep_by_dow=_sleep_by_weekday(day_frames),
        sleep_by_dow_wp=sleep_wp,
        avg_sleep_efficiency_pct=_avg_sleep_efficiency(day_frames),
        manual=manual,
    )
    data.activity_chart_b64 = _chart_activity_bars(wear_periods)
    data.sleep_chart_b64 = _chart_sleep_dow(data.sleep_by_dow)
    data.sleep_wp_chart_b64 = chart_sleep_by_weekday_wear(sleep_wp)
    data.fitness_sessions_b64 = fit_viz["sessions"]
    data.fitness_prepost_b64 = fit_viz["prepost"]
    data.fitness_hr_b64 = fit_viz["hr_zones"]
    from summary_text import build_debrief_summary, build_debrief_summary_runs

    data.summary_runs = build_debrief_summary_runs(data)
    data.summary_paragraph = build_debrief_summary(data)
    return data


def _sleep_efficiency_html(pct: float | None) -> str:
    if pct is None:
        return ""
    return f"Average Sleep Efficiency: {_b(f'{pct}%')}"


def _load_part(name: str) -> str:
    return (PARTS_DIR / name).read_text(encoding="utf-8")


def _apply_replacements(template: str, replacements: dict[str, str]) -> str:
    html = template
    for _ in range(6):
        prev = html
        for key, val in replacements.items():
            html = html.replace(key, val)
        if html == prev:
            break
    return html


def _core_replacements(data: DebriefData) -> dict[str, str]:
    """Data + chart placeholders (no layout part blobs)."""
    wp_date_items = "".join(
        f'<div class="wp-date">{wp.date_range}</div>'
        for wp in data.wear_periods
    )
    replacements = {
        "{{SUBJECT_ID}}": data.subject_id,
        "{{COHORT}}": data.cohort.upper(),
        "{{GENERATED}}": datetime.now().strftime("%m/%d/%Y"),
        "{{N_WP}}": str(len(data.wear_periods)),
        "{{WP_DATE_ITEMS}}": wp_date_items,
        "{{ACTIVITY_CHART}}": data.activity_chart_b64,
        "{{SLEEP_CHART}}": data.sleep_chart_b64,
        "{{SLEEP_WP_CHART}}": data.sleep_wp_chart_b64,
        "{{FITNESS_SESSIONS_CHART}}": data.fitness_sessions_b64,
        "{{FITNESS_PREPOST_CHART}}": data.fitness_prepost_b64,
        "{{FITNESS_HR_CHART}}": data.fitness_hr_b64,
        "{{SLEEP_EFFICIENCY_LINE}}": _sleep_efficiency_html(data.avg_sleep_efficiency_pct),
    }
    replacements.update(_fitness_placeholders(data.manual, data.lab_id))
    return replacements


def _expanded_part(filename: str, core: dict[str, str]) -> str:
    return _apply_replacements(_load_part(filename), core)


def _base_replacements(data: DebriefData) -> dict[str, str]:
    core = _core_replacements(data)
    replacements = dict(core)
    replacements["{{BASE_CSS}}"] = _load_part("base.css")
    replacements["{{HEADER}}"] = _expanded_part("header.html", core)
    replacements["{{FITNESS}}"] = _expanded_part("fitness.html", core)
    replacements["{{FITNESS_PREPOST}}"] = _expanded_part("fitness_prepost.html", core)
    replacements["{{FITNESS_SESSIONS}}"] = _expanded_part("fitness_sessions.html", core)
    replacements["{{FITNESS_COMPACT}}"] = _expanded_part("fitness_compact.html", core)
    replacements["{{ACTIVITY}}"] = _expanded_part("activity.html", core)
    replacements["{{SLEEP}}"] = _expanded_part("sleep.html", core)
    replacements["{{SLEEP_WP}}"] = _expanded_part("sleep_wp.html", core)
    replacements["{{FITNESS_VISUAL}}"] = _expanded_part("fitness_visual.html", core)
    return replacements


def _assert_render_complete(html: str) -> None:
    leftovers = (
        "{{ACTIVITY_CHART}}",
        "{{SLEEP_CHART}}",
        "{{SLEEP_WP_CHART}}",
        "{{FITNESS_SESSIONS_CHART}}",
        "{{FITNESS_PREPOST_CHART}}",
        "{{FITNESS_HR_CHART}}",
    )
    for token in leftovers:
        if token in html:
            raise RuntimeError(f"Render incomplete: {token} remains in HTML")


def render_html(data: DebriefData, layout: str = DEFAULT_LAYOUT) -> str:
    if layout not in LAYOUTS:
        raise ValueError(f"Unknown layout {layout!r}; choose from {', '.join(LAYOUTS)}")
    template = (LAYOUTS_DIR / f"{layout}.html").read_text(encoding="utf-8")
    html = _apply_replacements(template, _base_replacements(data))
    _assert_render_complete(html)
    return html


def build_demo_debrief(*, lab_id: str = "1466", manual: dict | None = None) -> DebriefData:
    """Synthetic DebriefData for layout-D visual QA (no GGIR required)."""
    from visual_metrics import (
        build_fitness_visual_b64,
        chart_sleep_by_weekday_wear,
    )

    if manual is None:
        example = TOOL_DIR / "example_manual_1466.json"
        manual = json.loads(example.read_text(encoding="utf-8")) if example.is_file() else {}
    # Drop legacy kcal if present in example JSON.
    manual = {k: v for k, v in manual.items() if k != "avg_kcal_session"}

    wear_periods = [
        WearPeriodMetrics("ses-1", "01/10/26-01/17/26", 7.2, 9.1, 3.4, 0.8, 88.0),
        WearPeriodMetrics("ses-2", "02/14/26-02/21/26", 7.5, 8.8, 3.6, 0.9, 89.5),
        WearPeriodMetrics("ses-3", "03/21/26-03/28/26", 7.0, 9.0, 3.5, 1.0, 87.2),
        WearPeriodMetrics("ses-4", "04/25/26-05/02/26", 7.4, 8.6, 3.8, 1.1, 90.1),
    ]
    sleep_by_dow = [
        ("Mon.", 6.8),
        ("Tues.", 7.1),
        ("Wed.", 7.4),
        ("Thur.", 6.9),
        ("Fri.", 7.0),
        ("Sat.", 8.2),
        ("Sun.", 8.0),
    ]
    sleep_wp = [
        (d, [(f"Wear Period {i + 1}", round(h + (i - 1) * 0.15, 1)) for i in range(4)])
        for d, h in [
            ("Mon", 6.8),
            ("Tue", 7.1),
            ("Wed", 7.4),
            ("Thu", 6.9),
            ("Fri", 7.0),
            ("Sat", 8.2),
            ("Sun", 8.0),
        ]
    ]
    fit_viz = build_fitness_visual_b64(manual)
    data = DebriefData(
        subject_id="9000",
        lab_id=lab_id,
        cohort="int",
        wear_periods=wear_periods,
        sleep_by_dow=sleep_by_dow,
        sleep_by_dow_wp=sleep_wp,
        avg_sleep_efficiency_pct=88.7,
        manual=manual,
    )
    data.activity_chart_b64 = _chart_activity_bars(wear_periods)
    data.sleep_chart_b64 = _chart_sleep_dow(sleep_by_dow)
    data.sleep_wp_chart_b64 = chart_sleep_by_weekday_wear(sleep_wp)
    data.fitness_sessions_b64 = fit_viz["sessions"]
    data.fitness_prepost_b64 = fit_viz["prepost"]
    data.fitness_hr_b64 = fit_viz["hr_zones"]
    from summary_text import build_debrief_summary, build_debrief_summary_runs

    data.summary_runs = build_debrief_summary_runs(data)
    data.summary_paragraph = build_debrief_summary(data)
    return data


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "subject",
        nargs="?",
        default="",
        help="BOOST subject id (e.g. 8031, 9031, 7222); omit with --demo",
    )
    ap.add_argument(
        "--demo",
        action="store_true",
        help="Build synthetic layout-D PDF (no GGIR); for visual QA",
    )
    ap.add_argument("--lab-id", default="", help="Lab ID for report header (Ali uses lab_id)")
    ap.add_argument(
        "--cohort",
        choices=("obs", "int", "auto"),
        default="auto",
        help="obs = 7xxx/77xx OO same OBS tree; int = 8xxx/9xxx",
    )
    ap.add_argument("--ggir-root", default="", help="Override GGIR-3.2.6 derivatives root")
    ap.add_argument("--manual-json", default="", help="JSON with HR/VO2/waist fields")
    ap.add_argument(
        "--auto-fitness",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Load fitness from Targeting REDCap + HR xlsx (default: on; --no-auto-fitness to skip)",
    )
    ap.add_argument("--fitness-csv", default="")
    ap.add_argument("--adherence-csv", default="")
    ap.add_argument("--hr-xlsx", default="")
    ap.add_argument("--fitness-search-dir", default="")
    ap.add_argument(
        "--out",
        default="",
        help="Output PDF path (required unless --land / --pdf-only-out)",
    )
    ap.add_argument(
        "--layout",
        choices=LAYOUTS,
        default=DEFAULT_LAYOUT,
        help=f"Ignored for PDF (always stack D / reportlab). Default: {DEFAULT_LAYOUT}",
    )
    ap.add_argument("--json-metrics", default="", help="Also write computed metrics JSON")
    ap.add_argument(
        "--land",
        action="store_true",
        help="Build PDF and copy into Ali BOOST-I/auto/ (group-writable)",
    )
    ap.add_argument(
        "--land-dir",
        default="",
        help="Override landing folder (default: BOOST-I/auto)",
    )
    ap.add_argument(
        "--pdf-only-out",
        default="",
        help="Optional local PDF path before/without land",
    )
    # Hard-disabled legacy flags (accepted so old scripts fail clearly).
    ap.add_argument("--ggir-sidecar", action="store_true", help=argparse.SUPPRESS)
    ap.add_argument("--write-html", action="store_true", help=argparse.SUPPRESS)
    ap.add_argument("--pdf-engine", default="reportlab", help=argparse.SUPPRESS)
    ap.add_argument("--force", action="store_true", help=argparse.SUPPRESS)
    args = ap.parse_args(argv)

    if args.ggir_sidecar or args.write_html or str(args.pdf_engine).lower() in {
        "html",
        "browser",
        "chromium",
        "edge",
    }:
        print(
            "ERROR: HTML debrief path removed. Use reportlab PDF only "
            "(--out report.pdf / --land). See HELP.md.",
            file=sys.stderr,
        )
        return 2
    if args.out and Path(args.out).suffix.lower() == ".html":
        print("ERROR: HTML output disabled; pass a .pdf --out path.", file=sys.stderr)
        return 2

    manual = {}
    if args.manual_json:
        manual = json.loads(Path(args.manual_json).read_text(encoding="utf-8"))
    manual.pop("avg_kcal_session", None)

    if args.demo:
        lab_id = args.lab_id or "1466"
        data = build_demo_debrief(lab_id=lab_id, manual=manual or None)
        out_path = Path(args.out or args.pdf_only_out or "temp/debrief_demo_D.pdf")
        out_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            build_debrief_pdf_from_data(data, out_path, engine="reportlab")
        except (FileNotFoundError, RuntimeError, ValueError, ModuleNotFoundError) as exc:
            print(f"ERROR: PDF export failed: {exc}", file=sys.stderr)
            return 1
        print(f"wrote demo {out_path} ({out_path.stat().st_size} bytes) layout=d_activity_hero")
        return 0

    if not args.subject:
        print("ERROR: pass subject id, or --demo for synthetic layout-D PDF", file=sys.stderr)
        return 2

    subject = args.subject.removeprefix("sub-")
    cohort = _infer_cohort(subject) if args.cohort == "auto" else args.cohort
    lab_id = args.lab_id or subject
    ggir_root = _pick_ggir_root(cohort, args.ggir_root or None)

    if args.auto_fitness:
        from fitness_manual import build_manual_map, resolve_fitness_paths, strip_meta

        paths = resolve_fitness_paths(
            fitness_csv=args.fitness_csv,
            adherence_csv=args.adherence_csv,
            hr_xlsx=args.hr_xlsx,
            search_dir=args.fitness_search_dir,
        )
        fmap = build_manual_map([subject], paths=paths)
        if subject in fmap:
            manual.update(strip_meta(fmap[subject]))
            manual.pop("avg_kcal_session", None)

    want_pdf = args.land or (args.out and Path(args.out).suffix.lower() == ".pdf") or bool(
        args.pdf_only_out
    )
    if not want_pdf and not args.json_metrics:
        print("ERROR: pass --out report.pdf and/or --land / --pdf-only-out", file=sys.stderr)
        return 2

    p5_mtime = part5_newest_mtime(ggir_root, subject)
    if p5_mtime is None:
        print(f"ERROR: no part5 personsummary for sub-{subject} under {ggir_root}", file=sys.stderr)
        return 1

    try:
        data = build_debrief(
            subject, cohort=cohort, lab_id=lab_id, ggir_root=ggir_root, manual=manual
        )
    except FileNotFoundError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    print(
        f"cohort={cohort} layout={DEFAULT_LAYOUT} ggir_root={ggir_root} "
        f"sessions={len(data.wear_periods)} pdf_engine=reportlab"
    )
    if args.json_metrics:
        payload = {
            "subject_id": data.subject_id,
            "lab_id": data.lab_id,
            "cohort": data.cohort,
            "layout": DEFAULT_LAYOUT,
            "avg_sleep_efficiency_pct": data.avg_sleep_efficiency_pct,
            "wear_periods": [wp.__dict__ for wp in data.wear_periods],
            "sleep_by_dow": data.sleep_by_dow,
        }
        Path(args.json_metrics).write_text(json.dumps(payload, indent=2), encoding="utf-8")
        print(f"wrote {args.json_metrics}")

    pdf_targets: list[Path] = []
    if args.out and Path(args.out).suffix.lower() == ".pdf":
        pdf_targets.append(Path(args.out))
    if args.land or args.pdf_only_out:
        pdf_local = (
            Path(args.pdf_only_out)
            if args.pdf_only_out
            else Path(tempfile.gettempdir()) / f"debrief_{subject}.pdf"
        )
        if pdf_local not in pdf_targets:
            pdf_targets.append(pdf_local)

    for out_path in pdf_targets:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            build_debrief_pdf_from_data(data, out_path, engine="reportlab")
        except (FileNotFoundError, RuntimeError, ValueError, ModuleNotFoundError) as exc:
            print(f"ERROR: PDF export failed: {exc}", file=sys.stderr)
            return 1
        try:
            group_writable(out_path)
        except OSError:
            pass
        print(f"wrote {out_path} ({out_path.stat().st_size} bytes)")

    if args.land:
        land_src = pdf_targets[-1]
        try:
            landed = land_pdf_group_writable(
                land_src, lab_id=lab_id, subject_id=subject, land_dir=args.land_dir or None
            )
        except FileNotFoundError as exc:
            print(f"ERROR: {exc}", file=sys.stderr)
            return 1
        print(f"landed {landed}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
