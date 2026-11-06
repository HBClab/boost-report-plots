#!/usr/bin/env python3
"""List Targeting instruments + probe report ids (names/cols only; no PHI rows)."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import requests

ROOT = Path(r"D:\work\HBC")
URL = "https://redcap.icts.uiowa.edu/redcap/api/"
KEYS = ("DEBRIEF_FITNESS_TOKEN", "TARGETING_TOKEN")


def load_token() -> str:
    for k in KEYS:
        v = (os.environ.get(k) or "").strip()
        if v:
            return v
    p = ROOT / ".env" / ".env"
    if not p.is_file():
        raise SystemExit("no .env")
    found: dict[str, str] = {}
    for line in p.read_text(encoding="utf-8").splitlines():
        raw = line.strip()
        if not raw or raw.startswith("#") or "=" not in raw:
            continue
        key, val = raw.split("=", 1)
        key = key.strip()
        if key in KEYS:
            found[key] = val.strip().strip('"').strip("'")
    for k in KEYS:
        if found.get(k):
            return found[k]
    raise SystemExit("no Targeting/debrief token")


def post(**data):
    r = requests.post(URL, data=data, timeout=180)
    r.raise_for_status()
    return r.json()


def main() -> int:
    tok = load_token()
    print(f"token last4={tok[-4:]}")

    proj = post(token=tok, content="project", format="json")
    print("project:", proj.get("project_title"), "id=", proj.get("project_id"))

    instruments = post(token=tok, content="instrument", format="json")
    print(f"instruments n={len(instruments)}")
    for row in instruments:
        print(f"  {row.get('instrument_name')}\t{row.get('instrument_label')}")

    meta = post(token=tok, content="metadata", format="json")
    interesting = []
    for f in meta:
        name = str(f.get("field_name") or "")
        form = str(f.get("form_name") or "")
        label = str(f.get("field_label") or "")
        blob = f"{name} {form} {label}".lower()
        if any(
            k in blob
            for k in (
                "vo2",
                "submax",
                "waist",
                "rhr",
                "adherence",
                "sup_pa",
                "unsup_pa",
                "exercise",
            )
        ):
            interesting.append((form, name, label[:60]))
    print(f"interesting fields n={len(interesting)}")
    forms = sorted({f for f, _, _ in interesting})
    print("forms:", forms)
    for form, name, label in interesting[:80]:
        print(f"  {form}|{name}|{label}")

    # Probe report ids: look for column signatures (print id + colnames only)
    want_fit = {"submax_vo2", "vo2", "waist", "pre_submax", "post_submax"}
    want_adh = {"sup_pa_ses", "unsup_pa_ses", "adherence"}
    hits = []
    # Iowa report ids often 4–5 digits; scan a modest window + any from env
    candidates = list(range(40000, 45000)) + list(range(1, 200))
    # Too big — instead try known-ish bands around BOOST reports (43327 was OBS)
    candidates = (
        list(range(43000, 43600))
        + list(range(13000, 13500))
        + list(range(25000, 25500))
        + list(range(30000, 30500))
        + list(range(35000, 35500))
        + list(range(40000, 40500))
        + list(range(42000, 42500))
        + list(range(44000, 44500))
    )
    print(f"probing {len(candidates)} report ids (colnames only)...")
    for rid in candidates:
        try:
            data = post(
                token=tok,
                content="report",
                report_id=str(rid),
                format="json",
                rawOrLabel="raw",
            )
        except Exception:
            continue
        if isinstance(data, dict) and data.get("error"):
            continue
        if not isinstance(data, list) or not data:
            # empty report still useful if we can get fields — skip
            continue
        cols = {str(k).lower() for k in data[0].keys()}
        coljoin = " ".join(sorted(cols))
        fit_score = sum(1 for w in want_fit if any(w in c for c in cols))
        adh_score = sum(1 for w in want_adh if any(w in c for c in cols))
        if fit_score >= 2 or adh_score >= 1:
            hits.append(
                {
                    "report_id": rid,
                    "n_rows": len(data),
                    "fit_score": fit_score,
                    "adh_score": adh_score,
                    "cols": sorted(cols)[:40],
                }
            )
            print(
                f"HIT report_id={rid} rows={len(data)} fit={fit_score} adh={adh_score} cols={sorted(cols)[:25]}"
            )
    print(f"hits={len(hits)}")
    print(json.dumps(hits[:20], indent=2)[:4000])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
