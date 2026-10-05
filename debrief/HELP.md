# Debrief / activity report (stack D)

Post-GGIR **production** step: Ali-style INT activity PDF from GGIR part5 + auto fitness.

**Runtime home (vosslink):** `bahaa tools/pipeline/debrief/`  
**Source repo:** [`HBClab/boost-report-plots`](https://github.com/HBClab/boost-report-plots) -> `debrief/`  
**Edit/sync from HBC workspace:** `repos/boost-report-plots/debrief/` -> `python .cursor/tools/agent/sync_pipeline_debrief.py` (or `bahaa agent dbrf`)

**Layout:** `d_activity_hero` (stack D). PDF via **reportlab only** (HTML path removed).

## Where it sits in the GGIR week

```text
Sun 01:00  bahaa pipeline globus-both
Mon 06:00  boost-act GGIR cron
Tue 08:00  bahaa pipeline debrief --apply --land --study int   ← this
```

Not inside R / `run_gg` (GGIR can run >24h; report failures must not kill GGIR).

```text
0 8 * * 2 DEBRIEF_ENABLE=1 bahaa pipeline debrief --apply --land --study int
```

## Outputs

| Artifact | Where |
|----------|--------|
| PDF (primary) | `{BOOST-I}/auto/Lab{lab}_BOOST{id}_ActivityReport_{date}.pdf` |

No GGIR HTML sidecars. Page 1 = reportlab stack D; page 2 = Ali guidelines PDF.

## Commands

```text
bahaa pipeline debrief                      # dry-run
bahaa pipeline debrief --apply --land       # land PDFs (auto-fitness ON)
bahaa pipeline debrief --no-auto-fitness --apply --land
bahaa pipeline debrief --ids 8080 --apply --land

# Local HBC checkout (needs GGIR part5 on Z:)
python repos/boost-report-plots/debrief/build_debrief.py 8080 --lab-id 8080 --out temp/debrief_8080.pdf
python repos/boost-report-plots/debrief/batch_debrief.py --apply --land

# Visual QA without GGIR (synthetic wear + example fitness)
python repos/boost-report-plots/debrief/build_debrief.py --demo --out temp/debrief_demo_D.pdf
python repos/boost-report-plots/debrief/generate_layout_samples.py --demo
```

## Auto-fitness (default ON)

Joiner: `fitness_manual.py`. Opt out: `--no-auto-fitness`.

| Input | Source |
|-------|--------|
| VO₂ / waist / RHR / dates | Targeting REDCap forms (Submax V2/V4) or CSVs |
| Sessions / adherence | supervised + unsupervised ET forms |
| HR zones / max | `BOOST HR ranges.xlsx` |

kcal/session is **not** on the report (no Polar API). Do not re-add without Michelle + a real Polar path.

Vosslink env (crontab / svc account — secrets stay out of `jobs.txt`):

```bash
# durable (private file, chmod 600) — INT + OBS tokens for 7/8/9xxx future
mkdir -p ~/.config/bahaa
cat > ~/.config/bahaa/debrief.env <<'EOF'
TARGETING_TOKEN=…          # 13038 INT 8xxx+9xxx (fitness today)
DEBRIEF_FITNESS_TOKEN=…    # same as TARGETING
BOOST_TOKEN=…              # 13895 OBS 7xxx (when --study obs/both)
EOF
chmod 600 ~/.config/bahaa/debrief.env
```

Also add the same keys to crontab env lines (preserved by `bahaa cron install`).
Watch: shell `BOOST_TOKEN` sometimes shadows with contact-DB pid 908 — prefer debrief.env / explicit export of OBS 13895.

Conda (`GGIR_CONDA_ENV` / `act`): `pip install reportlab pypdf openpyxl requests`

## Sync to vosslink

```text
# Windows + Z: mounted
python .cursor/tools/agent/sync_pipeline_debrief.py

# On vosslink
bahaa agent dbrf --cron-only    # sync + cron install
bahaa agent dbrf --once-only    # one-shot apply --land
bahaa agent gird --apply        # Globus → GGIR → debrief (auto-fitness on)
```

## Paths

| Role | Path |
|------|------|
| INT GGIR | `…/InterventionStudy/…/output/derivatives/GGIR-3.2.6` |
| Landing | `…/ActivityFiles/BOOST-I/auto` |
| LSS package | `/mnt/nfs/lss/vosslabhpc/Users/bahaa/tools/pipeline/debrief` |
| Cron log | `/home/vosslab-svc/logs/debrief-cron.log` |
