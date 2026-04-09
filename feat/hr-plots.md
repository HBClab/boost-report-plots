# Feature Spec -> Heart Rate plots
---

## Requirements
---
**SOURCE DOCUMENTS** 
Plot Specification: [docs/plot-specs/hr.md]
Data: [data/zone_out.csv]

**Specification**
Using the data, build the plot in hr.md

**Modifications to make**
- for the individual adherence heatmap, since there are multiple sessions for each week, use a threshold of at least 75% of sessions for that week meeting adherence.
    - For this plot, make sure to match subjects across supervised and unsupervised (may require more modifications to the plot)
- replace the HR adherence line plot with a toggleable comparison card containing two views:
    - `TRIMP` using `edwards_trimp`
    - `% HR Max` using `mean_hr_pct_max`
    - use the same inline two-button slider/toggle interaction already used by the other dual-view cards
    - compare Supervised vs Unsupervised across matched display weeks 1–6 after groupwise week normalization

**Implementation status**
- Plot specification updated and `plots/hr/` dashboard implementation completed on `004-hr-plots`
- Build verification passed with `npm run build`
- Runtime smoke checks passed for `/`, `/health`, and `/data/zone_out.csv`
- Final browser-based visual validation remains to be recorded in `specs/004-hr-plots/quickstart.md`
