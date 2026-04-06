from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from .parser import parse_epoch_file


@dataclass(frozen=True)
class HourlyEnmoRow:
    group: str          # 'intervention' or 'observational'
    session_number: int
    hour: int           # 0–23
    enmo_mean: float    # group mean of participant-level hourly means (mg)
    enmo_sd: float | None  # sample SD; None when n_participants == 1
    n_participants: int


def _extract_subject_code(path: Path) -> str:
    for part in path.parts:
        if part.startswith("sub-"):
            return part
    raise ValueError("could not derive subject_code from path")


def _extract_session_number(path: Path) -> int:
    for part in path.parts:
        if part.startswith("ses-"):
            suffix = part.removeprefix("ses-")
            digits = "".join(ch for ch in suffix if ch.isdigit())
            if digits:
                return int(digits)
    raise ValueError("could not derive session_number from path")


def discover_epoch_files(root: Path) -> list[Path]:
    """Return all GGIR epoch CSV files under *root* sorted by path.

    Matches the path pattern from FR-008:
    ``sub-****/accel/ses-*/output_ses-*/meta/csv/sub-****_ses-*_accel.csv.RData.csv``
    """
    return sorted(
        p
        for p in root.rglob("*_accel.csv.RData.csv")
        if _looks_like_epoch_path(p)
    )


def aggregate_hourly_enmo(
    epoch_files: Iterable[Path],
    *,
    group_for: dict[str, str] | None = None,
    default_group: str = "intervention",
    issues_out: list[str] | None = None,
) -> list[HourlyEnmoRow]:
    """Aggregate epoch files into hour-level ENMO statistics per group/session.

    Parameters
    ----------
    epoch_files:
        Paths to individual GGIR epoch CSV files.
    group_for:
        Optional mapping of ``subject_code → group`` (``'intervention'`` or
        ``'observational'``).  When *None*, *default_group* is used for all
        subjects.
    default_group:
        Fallback group when *group_for* does not contain a subject code.
    issues_out:
        If provided, parse warnings are appended here rather than printed.

    Returns
    -------
    list[HourlyEnmoRow]
        One row per ``(group, session_number, hour)``; sorted by group,
        session, hour.
    """
    if issues_out is None:
        issues_out = []

    # participant_means[(group, session, hour)] = [mean_p1, mean_p2, ...]
    participant_means: dict[tuple[str, int, int], list[float]] = {}

    for path in epoch_files:
        try:
            subject_code = _extract_subject_code(path)
            session_number = _extract_session_number(path)
        except ValueError as exc:
            issues_out.append(f"{path}: {exc}")
            continue

        group = (group_for or {}).get(subject_code, default_group)

        records, parse_issues = parse_epoch_file(path)
        for issue in parse_issues:
            issues_out.append(f"{path}: {issue}")

        if not records:
            continue

        # Group this participant's epochs by hour
        hour_enmo: dict[int, list[float]] = {}
        for rec in records:
            hour_enmo.setdefault(rec.hour, []).append(rec.enmo)

        # Compute participant-level mean per hour and accumulate
        for hour, enmo_values in hour_enmo.items():
            participant_mean = sum(enmo_values) / len(enmo_values)
            key = (group, session_number, hour)
            participant_means.setdefault(key, []).append(participant_mean)

    # Aggregate participant-level means into group-level statistics
    rows: list[HourlyEnmoRow] = []
    for (group, session_number, hour), means in sorted(participant_means.items()):
        n = len(means)
        group_mean = sum(means) / n
        if n > 1:
            variance = sum((m - group_mean) ** 2 for m in means) / (n - 1)
            group_sd: float | None = math.sqrt(variance)
        else:
            group_sd = None

        rows.append(
            HourlyEnmoRow(
                group=group,
                session_number=session_number,
                hour=hour,
                enmo_mean=group_mean,
                enmo_sd=group_sd,
                n_participants=n,
            )
        )

    return rows


def _looks_like_epoch_path(path: Path) -> bool:
    parts = path.parts
    return any(p.startswith("sub-") for p in parts) and any(p.startswith("ses-") for p in parts)
