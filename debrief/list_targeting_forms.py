#!/usr/bin/env python3
"""List TargetingCognitiveCo instruments/forms (no PHI)."""
from __future__ import annotations

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


def main() -> int:
    tok = load_token()
    print(f"token last4={tok[-4:]}")
    r = requests.post(
        URL,
        data={"token": tok, "content": "project", "format": "json"},
        timeout=60,
    )
    r.raise_for_status()
    proj = r.json()
    print("project:", proj.get("project_title"), "id=", proj.get("project_id"))

    r = requests.post(
        URL,
        data={"token": tok, "content": "instrument", "format": "json"},
        timeout=120,
    )
    r.raise_for_status()
    instruments = r.json()
    print(f"instruments n={len(instruments)}")
    for row in instruments:
        print(f"  {row.get('instrument_name')}\t{(row.get('instrument_label') or '')[:80]}")

    r = requests.post(
        URL,
        data={"token": tok, "content": "metadata", "format": "json"},
        timeout=180,
    )
    r.raise_for_status()
    meta = r.json()
    keys = (
        "vo2",
        "submax",
        "waist",
        "rhr",
        "resting",
        "sup_pa",
        "unsup_pa",
        "adherence",
        "exercise",
    )
    print("--- matching fields ---")
    for f in meta:
        name = str(f.get("field_name") or "")
        form = str(f.get("form_name") or "")
        label = str(f.get("field_label") or "")
        blob = f"{name} {form} {label}".lower()
        if any(k in blob for k in keys):
            print(f"  {form}|{name}|{label[:70]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
