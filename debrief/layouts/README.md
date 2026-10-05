# Debrief layout variants (portrait page 1)

**Production (lab): `d_activity_hero` (stack D)** — reportlab PDF only (`debrief_reportlab.py`).

HTML files under `layouts/` are **archival** (older A–G experiments). Do not generate HTML reports in production.

| Layout | File | Status |
|--------|------|--------|
| `d_activity_hero` | `d_activity_hero.html` + reportlab | **Production** — activity hero, Pre\|Post fitness table, WP×weekday sleep |
| `a`–`c`, `e`–`g` | `*.html` | Archived pilots (Bahaa preferred D) |

Generate layout-D sample PDF:

```bash
python repos/boost-report-plots/debrief/generate_layout_samples.py --demo
# or with real GGIR:
python repos/boost-report-plots/debrief/generate_layout_samples.py 8002 --lab-id 1124 --auto-fitness
```

Output: `temp/layout_samples/debrief_{id}_d_activity_hero.pdf`

Production build:

```bash
python repos/boost-report-plots/debrief/build_debrief.py 7222 --lab-id 1417 --out report.pdf --land
python repos/boost-report-plots/debrief/build_debrief.py --demo --out temp/debrief_demo_D.pdf
```

See `../HELP.md` and `../FIELD_MAP.md`.
