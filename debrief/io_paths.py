#!/usr/bin/env python3
"""Shared paths / permissions for debrief PDF landing (Ali RDSS)."""
from __future__ import annotations

import os
import stat
from datetime import date
from pathlib import Path

# Ali completed-report parent (create auto/ under this)
LANDING_BASE_CANDIDATES = (
    Path(r"W:\Repositories\Accelerometer_Data\ActivityFiles\BOOST-I"),
    Path(r"Y:\Repositories\Accelerometer_Data\ActivityFiles\BOOST-I"),
    Path(
        r"\\iowa.uiowa.edu\shared\ResearchData\rdss_mwvoss\VossLab"
        r"\Repositories\Accelerometer_Data\ActivityFiles\BOOST-I"
    ),
    Path(
        r"\\itf-rs-store24.hpc.uiowa.edu\vosslab"
        r"\Repositories\Accelerometer_Data\ActivityFiles\BOOST-I"
    ),
    Path("/mnt/nfs/rdss/vosslab/Repositories/Accelerometer_Data/ActivityFiles/BOOST-I"),
)

AUTO_SUBDIR = "auto"  # pending Ali rename/split; keep PPTX tree untouched


def group_writable(path: Path) -> None:
    """Best-effort g+rw (files) / g+rwX (dirs) so lab staff can edit/delete on RDSS."""
    try:
        mode = path.stat().st_mode
        if path.is_dir():
            path.chmod(mode | stat.S_IRGRP | stat.S_IWGRP | stat.S_IXGRP)
        else:
            path.chmod(mode | stat.S_IRGRP | stat.S_IWGRP)
    except OSError as exc:
        print(f"WARNING: could not set group-write on {path}: {exc}", flush=True)


def ensure_dir_group_writable(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    group_writable(path)
    return path


def resolve_auto_landing_dir(explicit: str | Path | None = None) -> Path:
    """BOOST-I/auto (create if parent exists), or explicit override."""
    if explicit:
        return ensure_dir_group_writable(Path(explicit))
    for base in LANDING_BASE_CANDIDATES:
        if base.is_dir():
            return ensure_dir_group_writable(base / AUTO_SUBDIR)
    tried = "\n  ".join(str(p / AUTO_SUBDIR) for p in LANDING_BASE_CANDIDATES)
    raise FileNotFoundError(
        "Ali BOOST-I landing not mounted. Tried:\n  " + tried + "\nPass --land-dir."
    )


def ggir_sidecar_html_path(ggir_root: Path, subject_id: str, lab_id: str) -> Path:
    """Legacy path helper (HTML sidecars no longer written)."""
    return (
        ggir_root
        / f"sub-{subject_id}"
        / "debrief"
        / f"Lab{lab_id}_BOOST{subject_id}_ActivityReport.html"
    )


def landing_pdf_name(lab_id: str, subject_id: str, day: str | None = None) -> str:
    stamp = day or date.today().isoformat()
    return f"Lab{lab_id}_BOOST{subject_id}_ActivityReport_{stamp}.pdf"


def land_pdf_group_writable(
    pdf_path: Path,
    lab_id: str,
    subject_id: str,
    land_dir: str | Path | None = None,
) -> Path:
    import shutil

    dest_dir = resolve_auto_landing_dir(land_dir)
    dest = dest_dir / landing_pdf_name(lab_id, subject_id)
    # RDSS/CIFS often denies utime/chmod — copy content only (not copy2).
    shutil.copyfile(pdf_path, dest)
    group_writable(dest)
    return dest


def _iter_part5_personsummary(ggir_root: Path, subject_id: str):
    """Yield part5_personsummary paths without recursive ** globs (slow on SMB)."""
    accel = ggir_root / f"sub-{subject_id}" / "accel"
    if not accel.is_dir():
        return
    try:
        ses_dirs = [p for p in accel.iterdir() if p.is_dir() and p.name.startswith("ses-")]
    except OSError:
        return
    for ses_dir in ses_dirs:
        candidates = [
            ses_dir / f"output_{ses_dir.name}" / "results",
            ses_dir / f"output_{ses_dir.name}" / f"output_{ses_dir.name}" / "results",
            ses_dir / "output_accel" / "results",
        ]
        for results in candidates:
            if not results.is_dir():
                continue
            try:
                for path in results.glob("part5_personsummary_MM*.csv"):
                    yield path
            except OSError:
                continue


def part5_newest_mtime(ggir_root: Path, subject_id: str) -> float | None:
    """Newest mtime among part5_personsummary files for subject; None if none."""
    newest: float | None = None
    for path in _iter_part5_personsummary(ggir_root, subject_id):
        try:
            m = path.stat().st_mtime
        except OSError:
            continue
        if newest is None or m > newest:
            newest = m
    return newest


def needs_html_rebuild(html_path: Path, part5_mtime: float | None) -> bool:
    """True if HTML missing, or part5 newer than HTML."""
    if part5_mtime is None:
        return False
    if not html_path.is_file():
        return True
    try:
        return part5_mtime > html_path.stat().st_mtime
    except OSError:
        return True


def list_part5_subjects(ggir_root: Path) -> list[str]:
    """Subject IDs under ggir_root that have at least one part5 personsummary."""
    if not ggir_root.is_dir():
        return []
    out: list[str] = []
    try:
        subs = sorted(p for p in ggir_root.iterdir() if p.is_dir() and p.name.startswith("sub-"))
    except OSError:
        return []
    for sub in subs:
        sid = sub.name.removeprefix("sub-")
        # Cheap existence: first part5 hit wins
        if next(_iter_part5_personsummary(ggir_root, sid), None) is not None:
            out.append(sid)
    return out


def env_truthy(name: str, default: str = "0") -> bool:
    return os.environ.get(name, default).strip().lower() in {"1", "true", "yes", "on"}
