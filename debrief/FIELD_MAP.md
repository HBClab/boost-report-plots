# Ali debrief ↔ GGIR field map

Source templates: `HBC/other/1466_8-24-2026_Report.pptx`, `BOOST-I Graphs.xlsx`.

## Typed numbers (spreadsheet `Accele` sheet)

| Ali label | GGIR source | Notes |
|-----------|-------------|-------|
| Sleep | `dur_spt_min_pla` / 60 | Person summary per wear period (session) |
| Sedentary | `dur_day_total_IN_min_pla` / 60 | Ali label = inactivity |
| Light | `dur_day_total_LIG_min_pla` / 60 | |
| MVPA | (`dur_day_total_MOD_min_pla` + `dur_day_total_VIG_min_pla`) / 60 | Same as `plots.py` / `group.py` |
| Wear period dates | `calendar_date` min–max in `part5_daysummary_MM_*.csv` | One row per session |

Intervention: Ali uses **one row per wear period** (ses-1..3/4). Values are rendered **on the chart segments** (reportlab PDF stack D); no separate typed-values table.

## Sleep chart

| Ali label | On chart |
|-----------|----------|
| Average hours by weekday × wear period | grouped bars (WP1…WP4) with soft activity hues |
| Min / Goal | green band 6–8 h, dashed lines + right-side Goal/Min labels |
| Average sleep efficiency | subtitle under sleep chart title |

Wear-period series colors match the activity stacked-bar pastel family (Sleep `#aec7e8`, Sedentary `#ffbb78`, Light `#98df8a`, MVPA `#ff9896`, plus two soft extras if needed).

## Still manual (not in GGIR)

From Ali slide 1 — filled via `--manual-json` or auto-fitness:

- Pre/post VO₂ max, dates, waist, resting HR
- Exercise session count, adherence, HR zones, HR max

**Not on report:** avg kcal/session (no Polar API; dropped 2026-10).

### Source check (Ali 2026-09-15)

| Field | Canonical home (per Ali) | Exact path / note | Auto? |
|-------|--------------------------|-------------------|-------|
| Pre VO₂ + date, waist, RHR | REDCap **Pretraining Submax Test V2** / report DebriefFitness | Last non-empty `submax_vo2_stage*end_pre`; `pre_submax_date`, waist (`pre_submax_waist_circ` or `…_umbilicus`), RHR. CSV or API. | default (`--no-auto-fitness` to skip) |
| Post VO₂ + date, waist, RHR | REDCap **Posttraining Submax Test V4** / same report | `*end_post` + `post_submax_date`; waist `post_submax_waist_circ` or umbilicus fallback. | default |
| Session count | REDCap report **Exercise Training adherence** (or Ali xlsx) | Count nonzero `sup_pa_ses*` + `unsup_pa_ses*`. | default |
| Adherence % | same | `(sup+unsup)/60*100` | default |
| HR zones string + HR max | Server workbook | `…/BOOST HR ranges.xlsx` — Max HR → `60%/70%/80%` bpm string. | default |

Joiner: `fitness_manual.py`. Env overrides: `DEBRIEF_FITNESS_CSV`, `DEBRIEF_ADHERENCE_CSV`, `DEBRIEF_HR_XLSX`.

REDCap (Targeting / pid 13038): token `DEBRIEF_FITNESS_TOKEN` or `TARGETING_TOKEN`. Prefer **form export** (Submax V2/V4 + supervised/unsupervised ET). Optional report ids `DEBRIEF_FITNESS_REPORT_ID` / `DEBRIEF_ADHERENCE_REPORT_ID` if set.

Windows roots (UNC `\\itf-rs-store24…\Projects\…` same):

- `Z:\Projects\BOOST\InterventionStudy\1-projectManagement\trackingSheets\Exercise Adherence Levels .xlsx`
- `Z:\Projects\BOOST\InterventionStudy\1-projectManagement\participants\ExerciseSessionMaterials\Intervention Materials\BOOST HR ranges.xlsx`
- Submax manual: `…\ExerciseSessionMaterials\Submax Materials\Submax_Manual_BOOST.docx`

### Ali tracking homes (2026-09-17)

| Role | Windows | vosslink |
|------|---------|----------|
| Whole-study tracking (incomplete IDs; many mid-protocol) | `Z:\…\trackingSheets\BOOST_trackingsheet.xlsx` | `/mnt/nfs/lss/vosslabhpc/Projects/BOOST/InterventionStudy/1-projectManagement/trackingSheets/BOOST_trackingsheet.xlsx` |
| Ali personal report / Graphs workbook | `W:\Repositories\Accelerometer_Data\ActivityFiles\BOOST-I\BOOST-I Graphs.xlsx` (also seen as `Y:` on some PCs) | `/mnt/nfs/rdss/vosslab/Repositories/Accelerometer_Data/ActivityFiles/BOOST-I/BOOST-I Graphs.xlsx` |

Same folder also has older `BOOST_Intervention_Tracking_Sheet.xlsx` — prefer **`BOOST_trackingsheet.xlsx`** (newer, Ali’s path).

**RDSS Windows mount (2026-09-17):** UNC `\\iowa.uiowa.edu\shared\ResearchData\rdss_mwvoss\VossLab` → drive **W:** on Bahaa’s PC (`Y:` was the old letter). vosslink: `/mnt/nfs/rdss/vosslab`. Auto debrief PDFs → `…/BOOST-I/auto/`. `BOOST-I Graphs` is an **.xlsx file**, not a subfolder.

GGIR still owns sleep/sedentary/light/MVPA.

## “Healthy / typical” ranges (Michelle asked)

**Answer for Michelle:** the green “typical / target” bands that briefly appeared on pre→post sparkline pilots were **placeholder mid-adult shades** coded in `visual_metrics.py` (`ILLUSTRATIVE_BOUNDS_UNUSED`: VO₂ 20–40 ml/kg/min, waist 70–102 cm, RHR 50–80 bpm, sessions 0–60). They are **not** lab-validated BOOST cutoffs and **not** ACSM (or other) guideline citations — nothing in Ali materials documents those numbers as clinical targets.

**Current behavior:** stack D — Pre→Post change rows in soft bars; adherence bar; HR bar (green→rest, then gradient); sleep Wear Period N + Min/Goal dashes; **Summary** strip from hardcoded templates (`summary_text.py`).

### Voice (participants / average adults)

Reports are read by **typical grown adults**, not clinicians and not children. Summary + labels: plain adult English — explain metrics briefly, avoid jargon stacks (*cardiorespiratory*, *central adiposity*, *submax*) and avoid ELI5 (“how fit your heart and lungs are”). Prefer middle glosses (e.g. VO2 max = “overall aerobic fitness”). Color only the numbers in Summary.

### Layout constants

Chart geometry / colors: `repos/boost-report-plots/debrief/layout_constants.py` (fractions / % / named sizes). `visual_metrics.py` imports that module — do not sprinkle bare floats for pill/legend positions.

### HR zone numbers (what they mean)

From Ali `BOOST HR ranges.xlsx` → Max HR; training targets = `% × max`.

| Field | Meaning |
|-------|---------|
| `hr_max` | Max heart rate (bpm) |
| Resting % | `(resting_hr / hr_max) × 100` — prefer **post** resting from submax, else pre. **Not** a fixed lab %. Typical adult ≈ 60–70 bpm on max ≈ 180–200 → ~**30–40%**; code fallback **35%** if RHR missing |
| Bar color | Solid green 0→resting%; gradient resting→100% (green→yellow→red) |
| `60%/70%/80%` | Target bpm labels on the bar (`round(max × pct)`) |

Sleep Wear Period 5 color = `#c5b0d5` (soft lavender).

If the lab wants clinical or study-specific bands later, Michelle (or Ali) should supply the source and numbers; do not invent citations.

## Cohort paths

| Band | Tree | GGIR derivatives |
|------|------|------------------|
| 7000–7699 BOOST O | Prefer `ObservationalStudy/.../inputs/act-obs-ready` after HBC#10 cutover; legacy `data/act-obs-final-test-2` until merge | Prefer `.../outputs/derivatives/GGIR-3.2.6/sub-####`; legacy co-located under final-test-2 |
| 7700–7999 BOOST OO | **same folders**, different subject IDs | same |
| 8000+ INT UI | `InterventionStudy/.../output/derivatives/GGIR-3.2.6` | `sub-####` |
| 9000+ INT NEU | same INT output tree | `sub-####` |

## Dual enrollment

Example: INT **8079** ↔ OBS **7222** (lab **1417**).

- REDCap report 43327 (2026-09-14): row for `7222`/`1417` only — **no `8079` boost_id** on that report.
- Wear/GGIR on disk under OBS `7222` (`act-obs-final-test-2`); INT `act-int-ready/sub-8079` empty.
- **Policy pending (HBC#3):** A = reports resolve INT→OBS alias; B = mirror into INT ready. Do not assume either until Michelle confirms.
