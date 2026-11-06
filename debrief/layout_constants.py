#!/usr/bin/env python3
"""Named layout constants for debrief matplotlib charts (fractions / %).

Prefer PCT_* (0–1 of axes or figure) over ad-hoc floats in chart code.
"""
from __future__ import annotations

# ---------------------------------------------------------------------------
# Shared colors (activity / wear-period family)
# ---------------------------------------------------------------------------
COLOR_SLEEP = "#aec7e8"
COLOR_SEDENTARY = "#ffbb78"
COLOR_LIGHT = "#98df8a"
COLOR_MVPA = "#ff9896"
COLOR_WP5 = "#c5b0d5"
COLOR_WP6 = "#c49c94"
WP_COLORS = (COLOR_SLEEP, COLOR_SEDENTARY, COLOR_LIGHT, COLOR_MVPA, COLOR_WP5, COLOR_WP6)

COLOR_GOAL_LINE = "#2e7d32"
COLOR_MIN_LINE = "#c62828"
COLOR_GOOD = "#2e7d32"
COLOR_BAD = "#c62828"
COLOR_NEUTRAL = "#424242"
COLOR_TEXT = "#111111"
COLOR_TEXT_MUTED = "#444444"
COLOR_GRID = "#d0d0d0"
COLOR_PILL_FACE = "#f4f7fa"
COLOR_PILL_EDGE = "#c5cdd6"
COLOR_BAR_EDGE = "#555555"
COLOR_SESSIONS_TRACK = "#e8e8e8"
COLOR_SESSIONS_FILL = COLOR_SLEEP

# HR bar: same family, slightly higher saturation
COLOR_HR_GREEN = "#6bc96a"
COLOR_HR_ORANGE = "#ff9f40"
COLOR_HR_RED = "#f0716e"

# ---------------------------------------------------------------------------
# Sleep-by-weekday chart (axes data + figure fractions)
# ---------------------------------------------------------------------------
SLEEP_FIG_W_IN = 8.0
SLEEP_FIG_H_IN = 3.55
SLEEP_GROUP_WIDTH_FRAC = 0.84  # of each weekday slot used by all WP bars
SLEEP_BAR_WIDTH_FRAC = 0.92  # of per-WP slot
SLEEP_XLIM_PAD_LEFT = 0.55  # data units before first weekday index
SLEEP_XLIM_PAD_RIGHT = 0.45
SLEEP_YMAX_PAD_H = 0.6
SLEEP_YMAX_FLOOR = 10.0
SLEEP_GOAL_DEFAULT_H = 8.0
SLEEP_MIN_DEFAULT_H = 6.0
SLEEP_FONT_TICK = 11
SLEEP_FONT_YLABEL = 12
SLEEP_FONT_LEGEND = 12.5
SLEEP_LEGEND1_ANCHOR = (0.50, -0.11)  # axes fraction
SLEEP_LEGEND2_ANCHOR = (0.50, -0.26)
SLEEP_SUBPLOT = dict(bottom=0.34, left=0.09, right=0.98, top=0.94)

# ---------------------------------------------------------------------------
# Pre → post fitness rows (axes = 0–1 normalized)
# ---------------------------------------------------------------------------
PREPOST_FIG_W_IN = 6.8
PREPOST_ROW_FIG_H_IN = 0.72  # inches per metric row
PREPOST_BASE_FIG_H_IN = 0.40
PREPOST_HEADER_FIG_H_IN = 0.55  # when dates present
PREPOST_HEADER_MIN_FIG_H_IN = 0.15

# Horizontal split (% of axes width)
PREPOST_LABEL_WIDTH_PCT = 0.36  # metric name / unit column
PREPOST_RIGHT_MARGIN_PCT = 0.02
PREPOST_PILL_WIDTH_PCT = 0.52  # of full axes; centered in leftover
PREPOST_PILL_SIDE_GAP_PCT = 0.04  # min gap inside leftover before centering

# Vertical layout within a row (fraction of row height in data units = 1.0)
PREPOST_ROW_CENTER = 0.40
PREPOST_PILL_HEIGHT = 0.60
PREPOST_PILL_Y0_OFFSET = 0.30  # center - offset
PREPOST_NAME_DY = 0.12
PREPOST_UNIT_DY = 0.20
PREPOST_DATE_HEADER_DY = 0.18
PREPOST_HEADER_DATA_PAD = 0.37  # extra data-units above rows when dates shown

# Three columns inside pill (fractions of pill width)
PREPOST_COL_PRE_FRAC = 1.0 / 6.0
PREPOST_COL_ARROW_FRAC = 0.5
PREPOST_COL_POST_FRAC = 5.0 / 6.0

PREPOST_FONT_DATE = 13
PREPOST_FONT_NAME = 16
PREPOST_FONT_UNIT = 13
PREPOST_FONT_VALUE = 16
PREPOST_FONT_ARROW = 17
PREPOST_LABEL_X_PCT = 0.02
PREPOST_SUBPLOT = dict(left=0.02, right=0.96, top=0.98, bottom=0.02)

# ---------------------------------------------------------------------------
# Sessions / adherence bar (axes fraction for chrome text)
# ---------------------------------------------------------------------------
SESSIONS_TARGET = 60
SESSIONS_FIG_W_IN = 6.8
SESSIONS_FIG_H_IN = 1.05
SESSIONS_BAR_HEIGHT = 0.45
SESSIONS_FONT_TITLE = 10
SESSIONS_FONT_SPAN = 9
SESSIONS_TITLE_Y_AX = 1.55  # axes fraction above plot
SESSIONS_SPAN_Y_AX = 1.12
SESSIONS_SUBPLOT = dict(left=0.02, right=0.98, top=0.48, bottom=0.28)
SESSIONS_XTICKS = (0, 15, 30, 45, 60)

# ---------------------------------------------------------------------------
# HR training bar (% of max on x; y in relative units)
# ---------------------------------------------------------------------------
HR_FIG_W_IN = 6.8
HR_FIG_H_IN = 1.75
HR_X_MAX_PCT = 100.0
HR_Y_MAX = 22.0
HR_BAR_Y0_FRAC = 6.0 / 22.0  # of y-range
HR_BAR_H_FRAC = 12.0 / 22.0
HR_REST_FALLBACK_PCT = 35.0
HR_REST_CLIP_PCT = (8.0, 55.0)
HR_TRAIN_PCTS = (60, 70, 80)
HR_FONT_TITLE = 10
HR_FONT_MAX = 8
HR_FONT_TICK = 8
HR_FONT_BPM = 13
HR_ROUNDING_SIZE = 5.5
HR_SUBPLOT = dict(left=0.05, right=0.98, top=0.78, bottom=0.26)
