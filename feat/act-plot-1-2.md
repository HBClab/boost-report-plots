# Feature Spec -> Accelerometer Plots 1&2
---

## Requirements
---
- use [[../docs/plot-specs/act.md]] as a definitive reference for plot visual identity
- only implement plots 1 & 2 from the above spec
- Utilize D3 library for plotting
- make the viewing of results (localserver, html file, raw svg export from node, etc.) the most intuitive for D3, if on local server then add button for saving
- use the data from the postgres db initialized in this repo (accelerometer data)
- split each into two plots - one for intervention and one for observational
    - observational is 7*** ids, all others are intervention.
    - observational only has 1 session so ignore for session level plot even though it's in the specification


