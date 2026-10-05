#!/usr/bin/env python3
"""Smoke auto-fitness wiring: print source flags only (no metric values)."""
from __future__ import annotations

import sys
from pathlib import Path

TOOL = Path(__file__).resolve().parent
sys.path.insert(0, str(TOOL))

from fitness_manual import build_manual_map, resolve_fitness_paths  # noqa: E402


def main() -> int:
    ids = [a for a in sys.argv[1:] if a.isdigit()] or ["8002", "8080"]
    paths = resolve_fitness_paths()
    print(
        "paths",
        f"fit_csv={bool(paths.fitness_csv)}",
        f"adh_csv={bool(paths.adherence_csv)}",
        f"hr={bool(paths.hr_xlsx)}",
    )
    mmap = build_manual_map(ids, paths=paths)
    for sid in ids:
        m = mmap.get(sid) or {}
        meta = m.get("_meta") or {}
        keys = sorted(k for k in m if not k.startswith("_"))
        print(f"{sid}: keys={keys} sources={meta.get('sources')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
