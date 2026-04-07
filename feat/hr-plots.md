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

**Implementation status**
- Plot specification updated and `plots/hr/` dashboard implementation completed on `004-hr-plots`
- Build verification passed with `npm run build`
- Runtime smoke checks passed for `/`, `/health`, and `/data/zone_out.csv`
- Final browser-based visual validation remains to be recorded in `specs/004-hr-plots/quickstart.md`
