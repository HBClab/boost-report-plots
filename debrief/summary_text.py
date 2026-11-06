#!/usr/bin/env python3
"""Hardcoded template summary for activity debrief PDFs (no LLM).

Prose explains what the metrics mean; only numbers are green/red toned.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any, Literal

if TYPE_CHECKING:
    from build_debrief import DebriefData

Tone = Literal["good", "bad"] | None


@dataclass(frozen=True)
class SummaryRun:
    text: str
    tone: Tone = None  # None = default black; only use on numbers


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


def _fmt(val: float | None, decimals: int = 1) -> str:
    if val is None:
        return "—"
    if abs(val - round(val)) < 1e-9:
        return str(int(round(val)))
    return f"{val:.{decimals}f}"


def _t(text: str, tone: Tone = None) -> SummaryRun:
    return SummaryRun(text, tone)


def _change_bits(
    pre: float | None,
    post: float | None,
    *,
    lower_is_good: bool,
    little_abs: float,
) -> tuple[str, Tone, Tone]:
    """Direction verb, tone for pre number, tone for post number."""
    if pre is None or post is None:
        return "could not be fully compared", None, None
    delta = post - pre
    if abs(delta) <= little_abs:
        return "was essentially unchanged", "good", "good"
    up = delta > 0
    if lower_is_good:
        tone: Tone = "good" if not up else "bad"
        return ("decreased" if not up else "increased"), None, tone
    tone = "good" if up else "bad"
    return ("increased" if up else "decreased"), None, tone


def _sessions_done(manual: dict) -> int | None:
    raw = str(manual.get("sessions_completed") or "")
    m = re.search(r"(\d+)", raw)
    return int(m.group(1)) if m else None


def build_debrief_summary_runs(data: "DebriefData") -> list[SummaryRun]:
    """Summary runs; tone only on numeric tokens; prose explains meaning."""
    m = data.manual or {}
    runs: list[SummaryRun] = []

    def add(parts: list[SummaryRun]) -> None:
        if runs and runs[-1].text.endswith("."):
            runs.append(_t(" "))
        runs.extend(parts)

    vo2_pre, vo2_post = _num(m.get("pre_vo2")), _num(m.get("post_vo2"))
    if vo2_pre is not None or vo2_post is not None:
        d, t_pre, t_post = _change_bits(vo2_pre, vo2_post, lower_is_good=False, little_abs=0.3)
        add(
            [
                _t("VO2 max (overall aerobic fitness) "),
                _t(d),
                _t(" from "),
                _t(_fmt(vo2_pre), t_pre),
                _t(" to "),
                _t(_fmt(vo2_post), t_post),
                _t(" ml/kg/min"),
            ]
        )
        if t_post == "good" and d.startswith("increased"):
            runs.append(_t(" — higher after training than before."))
        elif t_post == "good":
            runs.append(_t(" — about the same after training as before."))
        elif t_post == "bad":
            runs.append(_t(" — lower after training than before."))
        else:
            runs.append(_t("."))

    w_pre, w_post = _num(m.get("waist_pre")), _num(m.get("waist_post"))
    if w_pre is not None or w_post is not None:
        d, t_pre, t_post = _change_bits(w_pre, w_post, lower_is_good=True, little_abs=0.5)
        add(
            [
                _t("Waist circumference "),
                _t(d),
                _t(" from "),
                _t(_fmt(w_pre), t_pre),
                _t(" to "),
                _t(_fmt(w_post), t_post),
                _t(" cm"),
            ]
        )
        if t_post == "good" and "decreased" in d:
            runs.append(_t(" — a smaller waist after training."))
        elif t_post == "good":
            runs.append(_t(" — little change after training."))
        elif t_post == "bad":
            runs.append(_t(" — a larger waist after training."))
        else:
            runs.append(_t("."))

    r_pre, r_post = _num(m.get("resting_hr_pre")), _num(m.get("resting_hr_post"))
    if r_pre is not None or r_post is not None:
        d, t_pre, t_post = _change_bits(r_pre, r_post, lower_is_good=True, little_abs=2.0)
        add(
            [
                _t("Resting heart rate "),
                _t(d),
                _t(" from "),
                _t(_fmt(r_pre, 0), t_pre),
                _t(" to "),
                _t(_fmt(r_post, 0), t_post),
                _t(" bpm"),
            ]
        )
        if t_post == "good" and "decreased" in d:
            runs.append(_t(" — your heart beat slower at rest after training."))
        elif t_post == "good":
            runs.append(_t(" — little change at rest."))
        elif t_post == "bad":
            runs.append(_t(" — your heart beat faster at rest after training."))
        else:
            runs.append(_t("."))

    done = _sessions_done(m)
    try:
        adh = float(str(m.get("adherence_pct") or "").replace("%", "").strip())
    except ValueError:
        adh = None
    if done is not None or adh is not None:
        if adh is not None and adh >= 90:
            tone: Tone = "good"
            gloss = "near the planned training dose"
        elif adh is not None and adh >= 70:
            tone = "good"
            gloss = "most of the planned sessions were completed"
        elif adh is not None:
            tone = "bad"
            gloss = "well below the planned 60-session target"
        else:
            tone = None
            gloss = "relative to the 60-session plan"
        bits = [
            _t("Of the planned exercise sessions, "),
        ]
        if done is not None:
            bits += [_t(str(done), tone), _t("/60 were completed")]
        else:
            bits.append(_t("completion was recorded"))
        if adh is not None:
            bits += [_t(" ("), _t(f"{_fmt(adh, 0)}%", tone), _t(" adherence)")]
        bits += [_t(" — "), _t(gloss), _t(".")]
        add(bits)

    hr_max = _num(m.get("hr_max"))
    if hr_max is not None:
        add(
            [
                _t("Training heart-rate zones are "),
                _t(_fmt(hr_max * 0.60, 0) if hr_max else "—"),
                _t(" / "),
                _t(_fmt(hr_max * 0.70, 0) if hr_max else "—"),
                _t(" / "),
                _t(_fmt(hr_max * 0.80, 0) if hr_max else "—"),
                _t(" bpm at 60/70/80% of max ("),
                _t(f"{_fmt(hr_max, 0)} bpm"),
                _t("); these are prescription targets, not time-in-zone from a wearable."),
            ]
        )

    eff = data.avg_sleep_efficiency_pct
    if eff is not None:
        tone = "good" if eff >= 75 else "bad"
        if eff >= 85:
            gloss = "most time in bed was scored as sleep"
        elif eff >= 75:
            gloss = "acceptable, with some time in bed not scored as sleep"
        else:
            gloss = "a larger share of time in bed was wake or unsettled"
        add(
            [
                _t("Sleep efficiency averaged "),
                _t(f"{_fmt(eff, 1)}%", tone),
                _t(" — "),
                _t(gloss),
                _t("."),
            ]
        )

    sleep_vals: list[float] = []
    for _dow, bars in getattr(data, "sleep_by_dow_wp", None) or []:
        for _wp, h in bars:
            try:
                sleep_vals.append(float(h))
            except (TypeError, ValueError):
                pass
    if not sleep_vals:
        for _lab, h in getattr(data, "sleep_by_dow", None) or []:
            try:
                sleep_vals.append(float(h))
            except (TypeError, ValueError):
                pass
    if sleep_vals:
        avg_sleep = sum(sleep_vals) / len(sleep_vals)
        if avg_sleep < 6:
            tone = "bad"
            gloss = "below the 6 h minimum used on the sleep chart"
        elif avg_sleep <= 8:
            tone = "good"
            gloss = "inside the 6–8 h goal band on the sleep chart"
        else:
            tone = "good"
            gloss = "above the 8 h goal line on the sleep chart"
        add(
            [
                _t("Nightly sleep across wear periods averaged "),
                _t(f"{_fmt(avg_sleep)} h", tone),
                _t(", "),
                _t(gloss),
                _t("."),
            ]
        )

    wps = getattr(data, "wear_periods", None) or []
    if wps:
        mvpa = sum(float(wp.mvpa_h) for wp in wps) / len(wps)
        sed = sum(float(wp.sedentary_h) for wp in wps) / len(wps)
        # ~150 min/week MVPA ≈ 0.36 h/day; wear-day means are usually higher when active.
        if mvpa >= 1.0:
            mvpa_tone: Tone = "good"
            mvpa_gloss = (
                "moderate-to-vigorous activity (brisk effort and above) averaged about an hour "
                "per wear day"
            )
        elif mvpa >= 0.5:
            mvpa_tone = "good"
            mvpa_gloss = (
                "moderate-to-vigorous activity averaged roughly half an hour or more per wear day"
            )
        else:
            mvpa_tone = "bad"
            mvpa_gloss = (
                "moderate-to-vigorous activity was limited on wear days "
                "(under about 30 minutes/day on average)"
            )
        if sed >= 10:
            sed_tone: Tone = "bad"
            sed_gloss = "sedentary time was high (about 10+ hours/day sitting or lying while awake)"
        elif sed >= 8:
            # Common adult range — still mark green (not a red flag).
            sed_tone = "good"
            sed_gloss = "sedentary time was in a common adult range (~8–10 hours/day)"
        else:
            sed_tone = "good"
            sed_gloss = "sedentary time was relatively lower than typical desk-heavy days"
        add(
            [
                _t("On the activity chart, "),
                _t(mvpa_gloss),
                _t(" ("),
                _t(f"{_fmt(mvpa)} h", mvpa_tone),
                _t("/day MVPA), and "),
                _t(sed_gloss),
                _t(" ("),
                _t(f"{_fmt(sed)} h", sed_tone),
                _t("/day)."),
            ]
        )

    if not runs:
        return [
            _t(
                "Summary will populate when VO2, waist, resting heart rate, "
                "adherence, sleep, and activity metrics are available."
            )
        ]
    return runs


def build_debrief_summary(data: "DebriefData") -> str:
    return "".join(r.text for r in build_debrief_summary_runs(data))
