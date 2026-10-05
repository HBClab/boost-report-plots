#!/usr/bin/env python3
"""Fitness / sleep visual charts for reportlab stack D.

Layout numbers live in ``layout_constants`` (fractions / % / named sizes).
"""
from __future__ import annotations

import base64
import io
import re
from typing import Any

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from matplotlib.colors import LinearSegmentedColormap, to_rgba
from matplotlib.lines import Line2D
from matplotlib.patches import FancyBboxPatch, Patch

import layout_constants as LC

# Re-export for callers / docs that still import from here.
WP_COLORS = LC.WP_COLORS
GOAL_LINE = LC.COLOR_GOAL_LINE
MIN_LINE = LC.COLOR_MIN_LINE
ILLUSTRATIVE_BOUNDS_UNUSED = {
    "vo2": (20.0, 40.0),
    "waist": (70.0, 102.0),
    "rhr": (50.0, 80.0),
    "sessions": (0.0, 60.0),
}
BOUNDS = ILLUSTRATIVE_BOUNDS_UNUSED

DOW_ORDER = (
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
)
DOW_SHORT = {
    "Monday": "Mon",
    "Tuesday": "Tue",
    "Wednesday": "Wed",
    "Thursday": "Thu",
    "Friday": "Fri",
    "Saturday": "Sat",
    "Sunday": "Sun",
}
_NAME_MAP = {
    "Monday": "Monday",
    "Mon": "Monday",
    "Mon.": "Monday",
    "Tuesday": "Tuesday",
    "Tues": "Tuesday",
    "Tues.": "Tuesday",
    "Tue": "Tuesday",
    "Wednesday": "Wednesday",
    "Wed": "Wednesday",
    "Wed.": "Wednesday",
    "Thursday": "Thursday",
    "Thur": "Thursday",
    "Thur.": "Thursday",
    "Thu": "Thursday",
    "Friday": "Friday",
    "Fri": "Friday",
    "Fri.": "Friday",
    "Saturday": "Saturday",
    "Sat": "Saturday",
    "Sat.": "Saturday",
    "Sunday": "Sunday",
    "Sun": "Sunday",
    "Sun.": "Sunday",
}


def _fig_to_b64(fig: plt.Figure) -> str:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, facecolor="white")
    plt.close(fig)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def _num(val: Any) -> float | None:
    if val is None:
        return None
    s = str(val).strip().replace("cm", "").replace("bpm", "").strip()
    if not s or s in {"—", "-", "None"}:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def _fmt_cell(val: float | None, *, decimals: int = 1) -> str:
    if val is None:
        return "—"
    if abs(val - round(val)) < 1e-9:
        return str(int(round(val)))
    return f"{val:.{decimals}f}"


def _wear_period_label(ses: str) -> str:
    """ses-1 / WP1 / 1 → 'Wear Period 1'."""
    m = re.search(r"(\d+)", str(ses))
    if m:
        return f"Wear Period {int(m.group(1))}"
    return str(ses).replace("WP", "Wear Period ").replace("ses-", "Wear Period ")


def sleep_by_weekday_wear(
    day_frames: list[pd.DataFrame],
    session_names: list[str],
) -> list[tuple[str, list[tuple[str, float]]]]:
    """Return [(Mon, [(Wear Period 1, h), …]), …] for grouped sleep chart."""
    if not day_frames or len(day_frames) != len(session_names):
        return []
    pieces: list[pd.DataFrame] = []
    for ses, df in zip(session_names, day_frames):
        if "weekday" not in df.columns or "dur_spt_sleep_min" not in df.columns:
            continue
        part = df.copy()
        part["weekday"] = part["weekday"].astype(str).str.strip().map(lambda x: _NAME_MAP.get(x, x))
        part["sleep_h"] = pd.to_numeric(part["dur_spt_sleep_min"], errors="coerce") / 60.0
        part["wp"] = _wear_period_label(ses)
        pieces.append(part[["weekday", "wp", "sleep_h"]])
    if not pieces:
        return []
    all_df = pd.concat(pieces, ignore_index=True)
    out: list[tuple[str, list[tuple[str, float]]]] = []
    for dow in DOW_ORDER:
        sub = all_df[all_df["weekday"] == dow]
        if sub.empty:
            continue
        g = sub.groupby("wp", as_index=False)["sleep_h"].mean()
        g["_ord"] = g["wp"].str.extract(r"(\d+)").astype(float)
        g = g.sort_values("_ord")
        bars = [(str(r.wp), round(float(r.sleep_h), 1)) for r in g.itertuples()]
        out.append((DOW_SHORT[dow], bars))
    return out


def chart_sleep_by_weekday_wear(
    sleep_wp: list[tuple[str, list[tuple[str, float]]]],
    *,
    min_h: float = LC.SLEEP_MIN_DEFAULT_H,
    goal_h: float = LC.SLEEP_GOAL_DEFAULT_H,
) -> str:
    """Grouped vertical bars: weekday × wear period (soft activity hues)."""
    if not sleep_wp:
        fig, ax = plt.subplots(figsize=(LC.SLEEP_FIG_W_IN, LC.SLEEP_FIG_H_IN * 0.7))
        ax.text(0.5, 0.5, "No sleep-by-wear data", ha="center", va="center", transform=ax.transAxes)
        ax.axis("off")
        return _fig_to_b64(fig)

    labels = [d for d, _ in sleep_wp]
    all_wps: list[str] = []
    for _, bars in sleep_wp:
        for wp, _ in bars:
            name = wp if "Wear Period" in str(wp) else _wear_period_label(wp)
            if name not in all_wps:
                all_wps.append(name)

    n_dow = len(labels)
    n_wp = len(all_wps)
    x = np.arange(n_dow)
    width = LC.SLEEP_GROUP_WIDTH_FRAC / max(n_wp, 1)

    fig, ax = plt.subplots(figsize=(LC.SLEEP_FIG_W_IN, LC.SLEEP_FIG_H_IN))
    wp_patches: list[Patch] = []
    for i, wp in enumerate(all_wps):
        vals = []
        for _, bars in sleep_wp:
            lookup = {
                (k if "Wear Period" in str(k) else _wear_period_label(k)): v for k, v in bars
            }
            vals.append(lookup.get(wp, np.nan))
        offset = (i - (n_wp - 1) / 2) * width
        color = LC.WP_COLORS[i % len(LC.WP_COLORS)]
        ax.bar(
            x + offset,
            vals,
            width=width * LC.SLEEP_BAR_WIDTH_FRAC,
            color=color,
            edgecolor=LC.COLOR_BAR_EDGE,
            linewidth=0.35,
            zorder=2,
        )
        wp_patches.append(Patch(facecolor=color, edgecolor=LC.COLOR_BAR_EDGE, label=wp))

    ax.yaxis.grid(True, color=LC.COLOR_GRID, linewidth=0.7, zorder=0)
    ax.set_axisbelow(True)
    ax.axhline(goal_h, color=LC.COLOR_GOAL_LINE, ls="--", lw=1.8, zorder=5)
    ax.axhline(min_h, color=LC.COLOR_MIN_LINE, ls="--", lw=1.8, zorder=5)

    ax.set_xticks(x)
    ax.set_xticklabels(labels, fontsize=LC.SLEEP_FONT_TICK)
    ax.tick_params(axis="y", labelsize=LC.SLEEP_FONT_TICK)
    ax.set_ylabel("Hours", fontsize=LC.SLEEP_FONT_YLABEL)
    ymax = max(LC.SLEEP_YMAX_FLOOR, goal_h + 1.0)
    for _, bars in sleep_wp:
        for _, hval in bars:
            ymax = max(ymax, hval + LC.SLEEP_YMAX_PAD_H)
    ax.set_ylim(0, ymax)
    ax.set_xlim(-LC.SLEEP_XLIM_PAD_LEFT, n_dow - LC.SLEEP_XLIM_PAD_RIGHT)
    ax.spines[["top", "right"]].set_visible(False)

    line_handles = [
        Line2D([0], [0], color=LC.COLOR_GOAL_LINE, ls="--", lw=2.0, label=f"Goal ({goal_h:.0f} h)"),
        Line2D([0], [0], color=LC.COLOR_MIN_LINE, ls="--", lw=2.0, label=f"Min ({min_h:.0f} h)"),
    ]
    leg1 = ax.legend(
        handles=wp_patches,
        loc="upper center",
        bbox_to_anchor=LC.SLEEP_LEGEND1_ANCHOR,
        ncol=max(n_wp, 1),
        fontsize=LC.SLEEP_FONT_LEGEND,
        frameon=False,
        columnspacing=1.1,
        handlelength=1.5,
    )
    ax.add_artist(leg1)
    ax.legend(
        handles=line_handles,
        loc="upper center",
        bbox_to_anchor=LC.SLEEP_LEGEND2_ANCHOR,
        ncol=2,
        fontsize=LC.SLEEP_FONT_LEGEND,
        frameon=False,
        columnspacing=1.8,
        handlelength=2.2,
    )
    fig.subplots_adjust(**LC.SLEEP_SUBPLOT)
    return _fig_to_b64(fig)


def _short_date(val: object) -> str:
    """12/15/2025 or 2025-12-15 → compact 12/15/25 (or as-is if short)."""
    s = str(val or "").strip()
    if not s or s in {"—", "-", "None"}:
        return ""
    m = re.match(r"(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})", s)
    if m:
        a, b, y = m.group(1), m.group(2), m.group(3)
        if len(y) == 4:
            y = y[-2:]
        return f"{int(a)}/{int(b)}/{y}"
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", s)
    if m:
        return f"{int(m.group(2))}/{int(m.group(3))}/{m.group(1)[-2:]}"
    parts = re.split(r"\s+to\s+", s, flags=re.I)
    if len(parts) == 2:
        left, right = _short_date(parts[0]), _short_date(parts[1])
        if left and right:
            return f"{left} – {right}"
    return s


def chart_sessions_progress(manual: dict) -> str:
    """Loading-bar style: sessions completed / target."""
    raw = str(manual.get("sessions_completed") or "")
    m = re.search(r"(\d+)", raw)
    done = int(m.group(1)) if m else 0
    try:
        pct = float(str(manual.get("adherence_pct") or "0").replace("%", ""))
    except ValueError:
        pct = round(done / LC.SESSIONS_TARGET * 100) if done else 0
    target = LC.SESSIONS_TARGET
    span = _short_date(manual.get("exercise_range") or "")

    fig, ax = plt.subplots(figsize=(LC.SESSIONS_FIG_W_IN, LC.SESSIONS_FIG_H_IN))
    ax.barh(
        [0], [target], color=LC.COLOR_SESSIONS_TRACK,
        height=LC.SESSIONS_BAR_HEIGHT, edgecolor="#666", linewidth=0.6,
    )
    ax.barh(
        [0], [min(done, target)], color=LC.COLOR_SESSIONS_FILL,
        height=LC.SESSIONS_BAR_HEIGHT, edgecolor=LC.COLOR_BAR_EDGE, linewidth=0.6,
    )
    ax.set_xlim(0, target)
    ax.set_yticks([])
    ax.set_xlabel("")
    ax.set_xticks(list(LC.SESSIONS_XTICKS))
    ax.spines[["top", "right", "left"]].set_visible(False)
    ax.text(
        0.0, LC.SESSIONS_TITLE_Y_AX, f"{done} / {target} sessions",
        transform=ax.transAxes, ha="left", va="bottom",
        fontsize=LC.SESSIONS_FONT_TITLE, fontweight="bold",
    )
    ax.text(
        1.0, LC.SESSIONS_TITLE_Y_AX, f"{int(pct)}% adherence",
        transform=ax.transAxes, ha="right", va="bottom",
        fontsize=LC.SESSIONS_FONT_TITLE, fontweight="bold", color="#333",
    )
    if span:
        ax.text(
            0.5, LC.SESSIONS_SPAN_Y_AX, span,
            transform=ax.transAxes, ha="center", va="bottom",
            fontsize=LC.SESSIONS_FONT_SPAN, color=LC.COLOR_TEXT, fontweight="bold",
        )
    fig.subplots_adjust(**LC.SESSIONS_SUBPLOT)
    return _fig_to_b64(fig)


def _change_is_good(metric_key: str, pre: float, post: float) -> bool | None:
    """True = desirable change. Waist/RHR down = good; VO₂ up = good."""
    if abs(post - pre) < 1e-9:
        return None
    delta = post - pre
    if metric_key in {"waist", "rhr"}:
        return delta < 0
    if metric_key == "vo2":
        return delta > 0
    return delta > 0


def _prepost_pill_geometry() -> tuple[float, float, float, float, float]:
    """Return bar_x0, bar_w, x_pre, x_arrow, x_post as axes fractions (0–1)."""
    label_end = LC.PREPOST_LABEL_WIDTH_PCT
    right_edge = 1.0 - LC.PREPOST_RIGHT_MARGIN_PCT
    avail = right_edge - label_end
    bar_w = min(LC.PREPOST_PILL_WIDTH_PCT, avail - LC.PREPOST_PILL_SIDE_GAP_PCT)
    bar_x0 = label_end + (avail - bar_w) / 2.0
    x_pre = bar_x0 + bar_w * LC.PREPOST_COL_PRE_FRAC
    x_arrow = bar_x0 + bar_w * LC.PREPOST_COL_ARROW_FRAC
    x_post = bar_x0 + bar_w * LC.PREPOST_COL_POST_FRAC
    return bar_x0, bar_w, x_pre, x_arrow, x_post


def chart_prepost_tiles(manual: dict) -> str:
    """Pre → post change rows with soft value bars (layout via ``layout_constants``)."""
    pre_d = _short_date(manual.get("pre_vo2_date") or manual.get("pre_date") or "")
    post_d = _short_date(manual.get("post_vo2_date") or manual.get("post_date") or "")

    specs = [
        ("vo2", "VO₂ max", "ml/kg/min", _num(manual.get("pre_vo2")), _num(manual.get("post_vo2"))),
        ("waist", "Waist", "cm", _num(manual.get("waist_pre")), _num(manual.get("waist_post"))),
        (
            "rhr",
            "Resting HR",
            "bpm",
            _num(manual.get("resting_hr_pre")),
            _num(manual.get("resting_hr_post")),
        ),
    ]

    has_dates = bool(pre_d or post_d)
    header_fig_h = LC.PREPOST_HEADER_FIG_H_IN if has_dates else LC.PREPOST_HEADER_MIN_FIG_H_IN
    # Header band in data units (axes 0–1 width; 1.0 height unit per metric row).
    header_data_h = (
        LC.PREPOST_DATE_HEADER_DY + LC.PREPOST_HEADER_DATA_PAD
        if has_dates
        else LC.PREPOST_HEADER_MIN_FIG_H_IN
    )
    fig_h = LC.PREPOST_BASE_FIG_H_IN + LC.PREPOST_ROW_FIG_H_IN * len(specs) + header_fig_h
    fig, ax = plt.subplots(figsize=(LC.PREPOST_FIG_W_IN, fig_h))
    ax.set_xlim(0.0, 1.0)
    n = len(specs)
    top = float(n) + header_data_h
    ax.set_ylim(0.0, top)
    ax.axis("off")

    bar_x0, bar_w, x_pre, x_arrow, x_post = _prepost_pill_geometry()

    if pre_d or post_d:
        hy = float(n) + LC.PREPOST_DATE_HEADER_DY
        ax.text(
            x_pre, hy, pre_d or "Pre", ha="center", va="bottom",
            fontsize=LC.PREPOST_FONT_DATE, color=LC.COLOR_TEXT, fontweight="bold",
        )
        ax.text(
            x_post, hy, post_d or "Post", ha="center", va="bottom",
            fontsize=LC.PREPOST_FONT_DATE, color=LC.COLOR_TEXT, fontweight="bold",
        )

    for i, (key, name, unit, pre, post) in enumerate(specs):
        y = float(n - 1 - i) + LC.PREPOST_ROW_CENTER
        ax.add_patch(
            FancyBboxPatch(
                (bar_x0, y - LC.PREPOST_PILL_Y0_OFFSET),
                bar_w,
                LC.PREPOST_PILL_HEIGHT,
                boxstyle="round,pad=0.01,rounding_size=0.08",
                facecolor=LC.COLOR_PILL_FACE,
                edgecolor=LC.COLOR_PILL_EDGE,
                linewidth=0.7,
                transform=ax.transData,
                zorder=0,
            )
        )
        ax.text(
            LC.PREPOST_LABEL_X_PCT, y + LC.PREPOST_NAME_DY, name,
            ha="left", va="center", fontsize=LC.PREPOST_FONT_NAME,
            fontweight="bold", color=LC.COLOR_TEXT,
        )
        ax.text(
            LC.PREPOST_LABEL_X_PCT, y - LC.PREPOST_UNIT_DY, unit,
            ha="left", va="center", fontsize=LC.PREPOST_FONT_UNIT, color=LC.COLOR_TEXT_MUTED,
        )

        if pre is None and post is None:
            ax.text(
                x_arrow, y, "—", ha="center", va="center",
                fontsize=LC.PREPOST_FONT_VALUE, color="#888", zorder=1,
            )
            continue

        if pre is not None and post is not None:
            good = _change_is_good(key, pre, post)
            if post > pre:
                arrow = "▲"
            elif post < pre:
                arrow = "▼"
            else:
                arrow = "→"
            if good is True:
                post_color = LC.COLOR_GOOD
            elif good is False:
                post_color = LC.COLOR_BAD
            else:
                post_color = LC.COLOR_NEUTRAL
        else:
            arrow = "→"
            post_color = LC.COLOR_NEUTRAL

        ax.text(
            x_pre, y, _fmt_cell(pre), ha="center", va="center",
            fontsize=LC.PREPOST_FONT_VALUE, color=LC.COLOR_TEXT, fontweight="bold", zorder=1,
        )
        ax.text(
            x_arrow, y, arrow, ha="center", va="center",
            fontsize=LC.PREPOST_FONT_ARROW, color=post_color, fontweight="bold", zorder=1,
        )
        ax.text(
            x_post, y, _fmt_cell(post), ha="center", va="center",
            fontsize=LC.PREPOST_FONT_VALUE, color=post_color, fontweight="bold", zorder=1,
        )

    fig.subplots_adjust(**LC.PREPOST_SUBPLOT)
    return _fig_to_b64(fig)


def _resting_pct_of_max(manual: dict, hr_max: float | None) -> tuple[float | None, str]:
    """Resting as % of max HR. Prefer post RHR, else pre."""
    if hr_max is None or hr_max <= 0:
        return None, "no max"
    rhr = _num(manual.get("resting_hr_post"))
    src = "post resting"
    if rhr is None:
        rhr = _num(manual.get("resting_hr_pre"))
        src = "pre resting"
    if rhr is None:
        return LC.HR_REST_FALLBACK_PCT, f"typical ~{LC.HR_REST_FALLBACK_PCT:.0f}% (no resting HR)"
    pct = 100.0 * float(rhr) / float(hr_max)
    lo, hi = LC.HR_REST_CLIP_PCT
    pct = float(np.clip(pct, lo, hi))
    return pct, f"{src} {int(round(rhr))} bpm → {pct:.0f}%"


def chart_hr_zone_tiles(manual: dict) -> str:
    """HR targets = % of max; solid green to rest%, then green→orange→red to 100%."""
    zones: list[tuple[int, int]] = []
    raw = str(manual.get("hr_zones") or "")
    for part in raw.split(","):
        part = part.strip()
        m = re.match(r"(\d+)\s*%\s*(\d+)", part)
        if m:
            zones.append((int(m.group(1)), int(m.group(2))))
    hr_max = _num(manual.get("hr_max"))
    if not zones and hr_max:
        for pct in LC.HR_TRAIN_PCTS:
            zones.append((pct, int(round(hr_max * pct / 100.0))))
    if hr_max is None and zones:
        top = max(zones, key=lambda z: z[0])
        if top[0] > 0:
            hr_max = top[1] * 100.0 / top[0]

    fig, ax = plt.subplots(figsize=(LC.HR_FIG_W_IN, LC.HR_FIG_H_IN))
    if not zones and hr_max is None:
        ax.text(0.5, 0.5, "No HR zone data", ha="center", va="center", transform=ax.transAxes)
        ax.axis("off")
        return _fig_to_b64(fig)

    rest_pct, _note = _resting_pct_of_max(manual, hr_max)
    if rest_pct is None:
        rest_pct = LC.HR_REST_FALLBACK_PCT

    ax.set_title("Heart rate training targets", fontsize=LC.HR_FONT_TITLE, pad=8, loc="left")
    if hr_max is not None:
        ax.text(
            1.0, 1.08, f"max {int(round(hr_max))} bpm",
            transform=ax.transAxes, ha="right", va="bottom",
            fontsize=LC.HR_FONT_MAX, color="#666666",
        )

    ax.set_xlim(0, LC.HR_X_MAX_PCT)
    ax.set_ylim(0, LC.HR_Y_MAX)
    ax.set_yticks([])
    for spine in ("top", "left", "right"):
        ax.spines[spine].set_visible(False)

    cmap = LinearSegmentedColormap.from_list(
        "hr_effort", [LC.COLOR_HR_GREEN, LC.COLOR_HR_ORANGE, LC.COLOR_HR_RED]
    )
    n = 512
    xs = np.linspace(0, LC.HR_X_MAX_PCT, n)
    colors = np.zeros((1, n, 4))
    green = np.array(to_rgba(LC.COLOR_HR_GREEN))
    for i, x in enumerate(xs):
        if x <= rest_pct:
            colors[0, i] = green
        else:
            t = (x - rest_pct) / max(LC.HR_X_MAX_PCT - rest_pct, 1e-6)
            colors[0, i] = cmap(np.clip(t, 0, 1))

    bar_y0 = LC.HR_Y_MAX * LC.HR_BAR_Y0_FRAC
    bar_h = LC.HR_Y_MAX * LC.HR_BAR_H_FRAC
    im = ax.imshow(
        colors,
        aspect="auto",
        extent=[0, LC.HR_X_MAX_PCT, bar_y0, bar_y0 + bar_h],
        zorder=1,
        interpolation="bilinear",
        origin="lower",
    )
    round_box = FancyBboxPatch(
        (0, bar_y0),
        LC.HR_X_MAX_PCT,
        bar_h,
        boxstyle=f"round,pad=0,rounding_size={LC.HR_ROUNDING_SIZE}",
        transform=ax.transData,
        facecolor="none",
        edgecolor="#333333",
        linewidth=1.4,
        zorder=3,
    )
    ax.add_patch(round_box)
    im.set_clip_path(round_box)

    marker_pad = bar_h * 0.05
    ax.plot(
        [rest_pct, rest_pct],
        [bar_y0 - marker_pad, bar_y0 + bar_h + marker_pad],
        color="#1b5e20",
        lw=1.2,
        ls=":",
        zorder=4,
    )

    train_pcts = sorted({z[0] for z in zones} | set(LC.HR_TRAIN_PCTS))
    rest_tick = int(round(rest_pct))
    tick_pcts = sorted(set(train_pcts) | {rest_tick})
    tick_labels = [
        f"rest\n{rest_tick}%" if abs(p - rest_pct) < 0.6 else f"{p}%" for p in tick_pcts
    ]
    ax.set_xticks(tick_pcts)
    ax.set_xticklabels(tick_labels, fontsize=LC.HR_FONT_TICK, fontweight="bold")
    ax.tick_params(axis="x", length=5, width=0.9)

    bpm_by = {p: b for p, b in zones}
    for p in train_pcts:
        bpm = bpm_by.get(p)
        if bpm is None and hr_max is not None:
            bpm = int(round(hr_max * p / 100.0))
        if bpm is None:
            continue
        ax.text(
            p, bar_y0 + bar_h / 2, f"{bpm}",
            ha="center", va="center", fontsize=LC.HR_FONT_BPM,
            fontweight="bold", color=LC.COLOR_TEXT, zorder=5, clip_on=False,
        )

    fig.subplots_adjust(**LC.HR_SUBPLOT)
    return _fig_to_b64(fig)


def build_fitness_visual_b64(manual: dict) -> dict[str, str]:
    return {
        "sessions": chart_sessions_progress(manual),
        "prepost": chart_prepost_tiles(manual),
        "hr_zones": chart_hr_zone_tiles(manual),
    }
