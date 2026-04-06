# Feature Spec -> Accelerometer Time Series Plot
**Status: Implemented** — see `specs/003-act-time-series/` for full plan, research, data model, and contracts.
Storage recommendation: DB-stored aggregates (`session_hourly_enmo` table). See `specs/003-act-time-series/spec.md`.
---

## Premise
---
- Plot specification in [docs/plot-specs/act-data.md]
- Creates radial clock-like time series of mean ENMO extracted from time series of all participants
- Separate lines for each session of intervention participants.
- Goal is to find the most optimal way for compute and storage of data options defined below, give a recommendation

## Requirements
---
- Original plot specification does not separate each intervention session into a new line, this MUST occur
    - All error bars // ci bands must conform in the most visually intuitive way to fit this
- Recommendation on storage or retrieval

## Contextual information
---
**Where data is found**
Path pattern: `/mnt/lss/Projects/BOOST/InterventionStudy/3-experiment/data/act-int-final-test-2/derivatives/GGIR-3.2.6/sub-****/accel/ses-*/output_ses-*/meta/csv/sub-****_ses-*_accel.csv.RData.csv`
With the columns: `timestamp, anglez, ENMO` - EXTRACT ENMO ONLY IGNORE ANGLEZ

**Data storage // retrieval ideas**
Problem: Files are 10's of thousands of lines long ~10M in size (as of `du -h`)
Idea 1: Store in a compressed format in DB attached to `public.session_days`
Idea 2: Only retrieve data from source files, do not store them
