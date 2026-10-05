#!/usr/bin/env python3
"""Debrief PDF helpers: guidelines page extract + merge.

Production page-1 is reportlab (debrief_reportlab). Legacy HTML→browser print
is kept for emergency recovery only — build_debrief_pdf_from_data rejects html.
"""
from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

TOOL_DIR = Path(__file__).resolve().parent
DEFAULT_GUIDELINES_PDF = TOOL_DIR / "assets" / "guidelines_page.pdf"
READABLE_PDF = TOOL_DIR.parents[2] / "other" / "readable.pdf"


def _pdf_io():
    """Lazy import so dry-run debrief listing works without pypdf installed."""
    try:
        from pypdf import PdfReader, PdfWriter  # type: ignore
    except ImportError:
        try:
            from PyPDF2 import PdfReader, PdfWriter  # type: ignore
        except ImportError as exc:
            raise ModuleNotFoundError(
                "Need pypdf for PDF merge (vosslink: conda activate act && pip install pypdf)"
            ) from exc
    return PdfReader, PdfWriter


_CHROMIUM_NAMES = (
    "chromium",
    "chromium-browser",
    "google-chrome",
    "google-chrome-stable",
    "chrome",
)


def find_edge() -> Path | None:
    for p in (
        Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
        Path(r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"),
    ):
        if p.exists():
            return p
    return None


def find_chromium() -> Path | None:
    for name in _CHROMIUM_NAMES:
        found = shutil.which(name)
        if found:
            return Path(found)
    return None


def find_html_to_pdf_engine() -> tuple[str, Path]:
    """Return (engine_name, binary). Prefer Edge on Windows, else Chromium."""
    edge = find_edge()
    if edge is not None:
        return "edge", edge
    chrome = find_chromium()
    if chrome is not None:
        return "chromium", chrome
    raise FileNotFoundError(
        "No PDF engine: install Microsoft Edge (Windows) or chromium/google-chrome (Linux)"
    )


def ensure_guidelines_pdf(path: Path = DEFAULT_GUIDELINES_PDF) -> Path:
    """Return path to static page-2 PDF (extract from readable.pdf if missing)."""
    if path.is_file():
        return path
    if not READABLE_PDF.is_file():
        raise FileNotFoundError(
            f"Guidelines PDF missing at {path} and source not found: {READABLE_PDF}"
        )
    path.parent.mkdir(parents=True, exist_ok=True)
    PdfReader, PdfWriter = _pdf_io()
    reader = PdfReader(READABLE_PDF)
    if len(reader.pages) < 2:
        raise ValueError(f"Expected >=2 pages in {READABLE_PDF}, got {len(reader.pages)}")
    writer = PdfWriter()
    writer.add_page(reader.pages[1])
    with path.open("wb") as fh:
        writer.write(fh)
    return path



def html_to_pdf(html_path: Path, pdf_path: Path) -> None:
    """Print local HTML to PDF (Edge or Chromium headless)."""
    html_path = html_path.resolve()
    pdf_path = pdf_path.resolve()
    pdf_path.parent.mkdir(parents=True, exist_ok=True)
    if pdf_path.exists():
        pdf_path.unlink()

    engine, binary = find_html_to_pdf_engine()
    uri = html_path.as_uri()
    if engine == "edge":
        cmd = [
            str(binary),
            "--headless",
            "--disable-gpu",
            "--no-pdf-header-footer",
            f"--print-to-pdf={pdf_path}",
            uri,
        ]
    else:
        cmd = [
            str(binary),
            "--headless",
            "--disable-gpu",
            "--no-pdf-header-footer",
            "--no-sandbox",
            f"--print-to-pdf={pdf_path}",
            uri,
        ]

    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0 or not pdf_path.is_file():
        err = (proc.stderr or proc.stdout or "").strip()
        raise RuntimeError(f"{engine} print failed (code {proc.returncode}): {err}")


def merge_pdfs(parts: list[Path], out_pdf: Path) -> None:
    PdfReader, PdfWriter = _pdf_io()
    writer = PdfWriter()
    for part in parts:
        reader = PdfReader(part)
        for page in reader.pages:
            writer.add_page(page)
    out_pdf.parent.mkdir(parents=True, exist_ok=True)
    with out_pdf.open("wb") as fh:
        writer.write(fh)



def build_debrief_pdf(
    html_path: Path,
    out_pdf: Path,
    *,
    guidelines_pdf: Path | None = None,
    keep_intermediate: bool = False,
) -> Path:
    """Print HTML report (page 1) and append original guidelines page (page 2).

    Prefer build_debrief_pdf_from_data() (reportlab) on vosslink — no browser.
    """
    html_path = html_path.resolve()
    out_pdf = out_pdf.resolve()
    if not html_path.is_file():
        raise FileNotFoundError(html_path)

    guidelines = ensure_guidelines_pdf(guidelines_pdf or DEFAULT_GUIDELINES_PDF)

    with tempfile.TemporaryDirectory(prefix="debrief_pdf_") as tmp:
        tmp_dir = Path(tmp)
        report_pdf = tmp_dir / "report_page1.pdf"
        html_to_pdf(html_path, report_pdf)

        PdfReader, PdfWriter = _pdf_io()
        reader = PdfReader(report_pdf)
        if len(reader.pages) != 1:
            print(
                f"WARNING: report HTML printed as {len(reader.pages)} pages; using page 1 only",
                file=sys.stderr,
            )
            single = tmp_dir / "report_page1_trimmed.pdf"
            w = PdfWriter()
            w.add_page(reader.pages[0])
            with single.open("wb") as fh:
                w.write(fh)
            report_pdf = single

        merge_pdfs([report_pdf, guidelines], out_pdf)


    if keep_intermediate:
        sidecar = out_pdf.with_suffix(".page1.pdf")
        html_to_pdf(html_path, sidecar)

    return out_pdf


def build_debrief_pdf_from_data(
    data,
    out_pdf: Path,
    *,
    guidelines_pdf: Path | None = None,
    engine: str | None = None,
    html_path: Path | None = None,
) -> Path:
    """Build full debrief PDF from DebriefData.

    engine:
      - reportlab (default / only supported): native stack-D PDF
      - html: hard-disabled (raises)
    """
    import os

    chosen = (engine or os.environ.get("DEBRIEF_PDF_ENGINE") or "reportlab").strip().lower()
    out_pdf = Path(out_pdf)

    if chosen in {"html", "browser", "chromium", "edge"}:
        raise RuntimeError(
            "HTML PDF engine disabled — use reportlab (default). "
            "See repos/boost-report-plots/debrief/HELP.md."
        )

    from debrief_reportlab import build_native_debrief_pdf

    return build_native_debrief_pdf(data, out_pdf, guidelines_pdf=guidelines_pdf)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("html", type=Path, help="Debrief HTML from build_debrief.py")
    ap.add_argument("--out", type=Path, default=None, help="Output PDF (default: same stem as HTML)")
    ap.add_argument(
        "--guidelines-pdf",
        type=Path,
        default=None,
        help=f"Override guidelines page (default: {DEFAULT_GUIDELINES_PDF})",
    )
    args = ap.parse_args(argv)

    html_path = args.html.resolve()
    out_pdf = (args.out or html_path.with_suffix(".pdf")).resolve()
    try:
        build_debrief_pdf(html_path, out_pdf, guidelines_pdf=args.guidelines_pdf)
    except (FileNotFoundError, RuntimeError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    print(f"wrote {out_pdf} ({out_pdf.stat().st_size} bytes)")
    PdfReader, _PdfWriter = _pdf_io()
    reader = PdfReader(out_pdf)
    print(f"pages={len(reader.pages)}")
    return 0



if __name__ == "__main__":
    raise SystemExit(main())
