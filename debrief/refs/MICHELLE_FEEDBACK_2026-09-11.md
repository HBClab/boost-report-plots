# Michelle feedback — debrief layout (2026-09-11)

Source: Michelle email after debrief-forms discussion (same day).

## Decisions

- **Form D** (`d_activity_hero`) is the **starting point** — visual-first (activity) more inviting than a text block.

## Attachments (filed)

| File | Role |
|------|------|
| `sleep_with-all-wear-periods.png` | Short-term sleep chart sketch |
| `IMG_0769_longer_term_fitness_visuals.JPG` | Whiteboard: page stack + longer-term fitness/HR visuals (+ sleep sketch again) |

## Short-term (target: end of next week ~2026-09-18)

Page structure from whiteboard + email:

1. **Top:** Activity + Rest (keep D opener).
2. **Middle (full width):** Sleep — grouped bars by weekday; under each day **WP1–WP4** (wear periods) as separate bars. Sketch shows Mon cluster labeled WP1…WP4, then Tues… rest of week. Wider mid-row.
3. **Bottom:** Exercise Training and Fitness as **text** for now (so multi-wear sleep can ship first).

### Sleep chart rules (from sketch)

- X: Mon … Sun (sketch shows Mon, Tues, …).
- Per day: up to **4 vertical bars** = wear periods 1–4 (missing WP → omit or zero-gap; prefer omit).
- Y: sleep hours (same metric as today’s weekday sleep chart).
- Legend: WP1–WP4 (or Wear 1–4 / ses-1–ses-4 — confirm label with Ali/Michelle).

## Longer-term (whiteboard `IMG_0769`)

Replace bottom fitness **text** with visuals:

- **Loading bar** — “# sessions completed”
- **HR zone** mini table / % at 60% / 70% / 80%
- **Line graphs** of pre→post fitness metrics (“Ex: in fitness line”)
- Small **stats** tiles; note on board: *“Can these have healthy bounds shaded?”*
- Optional **Week 1** HR summary: below / in / above / target %

Page mock on board already matches short-term stack: Activity+Rest → Sleep → Metrics+Stats.

## Impl notes

- New layout ids: `e_stack3` (text fitness), `f_stack3_visual` / `g_metrics_hero` (visual fitness).
- Sleep data: per wear-period × weekday from part5 daysummary (`visual_metrics.sleep_by_weekday_wear`).
- Keep current D as default until stack-3 / visuals approved; then switch default.
- Automation: reportlab PDF → `BOOST-I/auto` only (HTML sidecars removed 2026-10).
- Samples: `python repos/boost-report-plots/debrief/generate_layout_samples.py --demo`

## Status 2026-10-04

- Production = optimized stack D (reportlab): Pre|Post fitness table, WP×weekday sleep soft hues, no kcal.
- “Healthy” fitness bands were placeholder mid-adult shades — removed from participant PDF; see FIELD_MAP.
- Still open: Week-1 below/in/above HR % (needs Polar session QC) if Michelle still wants it.
