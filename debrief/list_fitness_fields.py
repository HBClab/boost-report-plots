#!/usr/bin/env python3
"""Print Targeting field names for submax VO2 + PA session flags (no PHI)."""
from __future__ import annotations

import os
from pathlib import Path

import requests

ROOT = Path(r"D:\work\HBC")
URL = "https://redcap.icts.uiowa.edu/redcap/api/"


def token() -> str:
    for k in ("DEBRIEF_FITNESS_TOKEN", "TARGETING_TOKEN"):
        v = (os.environ.get(k) or "").strip()
        if v:
            return v
    for line in (ROOT / ".env" / ".env").read_text(encoding="utf-8").splitlines():
        if line.startswith("DEBRIEF_FITNESS_TOKEN=") or line.startswith("TARGETING_TOKEN="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("no token")


def main() -> int:
    tok = token()
    r = requests.post(
        URL, data={"token": tok, "content": "metadata", "format": "json"}, timeout=180
    )
    r.raise_for_status()
    for f in r.json():
        n = str(f.get("field_name") or "")
        form = str(f.get("form_name") or "")
        if any(
            x in n
            for x in (
                "sup_pa_ses",
                "unsup_pa_ses",
                "sup_pa_start",
                "sup_pa_end",
                "unsup_pa_start",
                "unsup_pa_end",
                "vo2_stage",
                "submax_vo2",
            )
        ) or n in {
            "pre_submax_date",
            "post_submax_date",
            "pre_submax_waist_circ",
            "post_submax_waist_circ",
            "pre_submax_rest_hr",
            "post_submax_rest_hr",
            "boost_id",
            "record_id",
            "study_id",
        }:
            print(f"{form}|{n}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
