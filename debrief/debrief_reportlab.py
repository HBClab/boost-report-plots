"""Stack D activity report → PDF via reportlab (no browser).

Uses DebriefData charts (base64 PNG) + fitness text. Page 1 = optimized
d_activity_hero; page 2 is Ali guidelines PDF merged by debrief_pdf.

Usage:
  from debrief_reportlab import render_stack_d_page1, build_native_debrief_pdf
  build_native_debrief_pdf(data, Path("out.pdf"))
"""

from __future__ import annotations

import base64
import io
import re
import tempfile
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from build_debrief import DebriefData

TOOL_DIR = Path(__file__).resolve().parent

# Soft hues — match activity stacked bars (Sleep / Sed / Light / MVPA).
_LEGEND = (
    ("Sleep", (0.682, 0.780, 0.910)),  # #aec7e8
    ("Sedentary", (1.0, 0.733, 0.471)),  # #ffbb78
    ("Light", (0.596, 0.875, 0.541)),  # #98df8a
    ("MVPA", (1.0, 0.596, 0.588)),  # #ff9896
)


def _require_reportlab():
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.units import inch
        from reportlab.lib.utils import ImageReader
        from reportlab.pdfgen import canvas
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
    except ImportError as exc:  # pragma: no cover
        raise ModuleNotFoundError(
            "Need reportlab for native PDF (pip install reportlab)"
        ) from exc
    return letter, inch, ImageReader, canvas, pdfmetrics, TTFont


def _b64_to_image_reader(b64: str, ImageReader):
    if not b64:
        return None
    raw = base64.b64decode(b64)
    return ImageReader(io.BytesIO(raw))


def _draw_image_fit(c, img, x: float, y: float, max_w: float, max_h: float) -> tuple[float, float, float, float]:
    """Draw image inside box without cropping (letterbox). Returns (x0, y0, dw, dh)."""
    if img is None:
        return x, y, 0.0, 0.0
    iw, ih = img.getSize()
    if iw <= 0 or ih <= 0:
        return x, y, 0.0, 0.0
    scale = min(max_w / float(iw), max_h / float(ih))
    dw = float(iw) * scale
    dh = float(ih) * scale
    x0 = x + (max_w - dw) / 2.0
    y0 = y + (max_h - dh) / 2.0
    c.drawImage(img, x0, y0, width=dw, height=dh, mask="auto")
    return x0, y0, dw, dh


def _strip_html(text: str) -> str:
    """Plain text only (drop tags). Prefer _prepare_rich_line when bold must survive."""
    text = text.replace("<sub>", "").replace("</sub>", "")
    text = re.sub(r"</?strong>", "", text)
    text = re.sub(r"<[^>]+>", "", text)
    return text


def _prepare_rich_line(text: str) -> str:
    """Keep <strong> spans; drop other HTML (e.g. sub)."""
    text = text.replace("<sub>", "").replace("</sub>", "")
    text = re.sub(r"<(?!/?strong\b)[^>]+>", "", text)
    return text


def _rich_runs(text: str) -> list[tuple[str, bool]]:
    """Split into (text, bold) runs from optional <strong> markup."""
    runs: list[tuple[str, bool]] = []
    pos = 0
    for m in re.finditer(r"<strong>(.*?)</strong>", text, flags=re.IGNORECASE | re.DOTALL):
        if m.start() > pos:
            runs.append((text[pos : m.start()], False))
        runs.append((m.group(1), True))
        pos = m.end()
    if pos < len(text):
        runs.append((text[pos:], False))
    if not runs:
        runs.append((text, False))
    return [(t, b) for t, b in runs if t]


@dataclass
class _FitnessBlock:
    pre_date: str
    post_date: str
    exercise_range: str
    lines_pre: list[str]
    lines_post: list[str]
    lines_ex: list[str]
    # Plain cells for Pre|Post table (readable over dense prose).
    table_rows: list[tuple[str, str, str]]  # metric, pre, post
    sessions_line: str
    adherence_line: str
    hr_zones_line: str
    hr_max_line: str


def _plain_metric(val: object, suffix: str = "") -> str:
    s = str(val).strip() if val is not None else ""
    if not s or s in {"—", "-", "None"}:
        return "—"
    s = s.replace(" cm", "").replace("cm", "").strip()
    return f"{s}{suffix}" if suffix and not s.endswith(suffix.strip()) else s


def _fitness_block(data: "DebriefData") -> _FitnessBlock:
    from build_debrief import _fitness_placeholders

    ph = _fitness_placeholders(data.manual, data.lab_id)
    m = data.manual or {}
    table_rows = [
        (
            "VO₂ max (ml/kg/min)",
            _plain_metric(m.get("pre_vo2")),
            _plain_metric(m.get("post_vo2")),
        ),
        (
            "Waist (cm)",
            _plain_metric(m.get("waist_pre")),
            _plain_metric(m.get("waist_post")),
        ),
        (
            "Resting HR (bpm)",
            _plain_metric(m.get("resting_hr_pre")),
            _plain_metric(m.get("resting_hr_post")),
        ),
    ]
    return _FitnessBlock(
        pre_date=_strip_html(ph["{{PRE_VO2_DATE}}"]),
        post_date=_strip_html(ph["{{POST_VO2_DATE}}"]),
        exercise_range=_strip_html(ph["{{EXercise_RANGE}}"]),
        lines_pre=[
            _prepare_rich_line(ph["{{PRE_VO2_LINE}}"]),
            _prepare_rich_line(ph["{{WAIST_PRE_LINE}}"]),
            _prepare_rich_line(ph["{{HR_PRE_LINE}}"]),
        ],
        lines_post=[
            _prepare_rich_line(ph["{{POST_VO2_LINE}}"]),
            _prepare_rich_line(ph["{{WAIST_POST_LINE}}"]),
            _prepare_rich_line(ph["{{HR_POST_LINE}}"]),
        ],
        lines_ex=[
            _prepare_rich_line(ph["{{SESSIONS_LINE}}"]),
            _prepare_rich_line(ph["{{ADHERENCE_LINE}}"]),
            _prepare_rich_line(ph["{{HR_ZONES_LINE}}"]),
            _prepare_rich_line(ph["{{HR_MAX_LINE}}"]),
        ],
        table_rows=table_rows,
        sessions_line=_prepare_rich_line(ph["{{SESSIONS_LINE}}"]),
        adherence_line=_prepare_rich_line(ph["{{ADHERENCE_LINE}}"]),
        hr_zones_line=_prepare_rich_line(ph["{{HR_ZONES_LINE}}"]),
        hr_max_line=_prepare_rich_line(ph["{{HR_MAX_LINE}}"]),
    )


def _draw_rounded_rect(c, x, y, w, h, radius=10, stroke=1.2):
    c.setStrokeColorRGB(0.2, 0.2, 0.2)
    c.setFillColorRGB(1, 1, 1)
    c.setLineWidth(stroke)
    c.roundRect(x, y, w, h, radius, stroke=1, fill=1)


def _font_for(bold: bool) -> str:
    return "Helvetica-Bold" if bold else "Helvetica"


def _draw_rich_wrapped(
    c,
    text: str,
    x: float,
    y: float,
    max_width: float,
    *,
    size: float = 9,
    leading: float = 11,
) -> float:
    """Draw HTML-ish line with <strong> runs; wrap on spaces. Returns y after last line."""
    tokens: list[tuple[str, bool]] = []
    for chunk, bold in _rich_runs(text):
        parts = re.split(r"(\s+)", chunk)
        for part in parts:
            if part == "":
                continue
            tokens.append((part, bold))
    if not tokens:
        return y

    def _tok_width(tok: str, bold: bool) -> float:
        return c.stringWidth(tok, _font_for(bold), size)

    line: list[tuple[str, bool]] = []
    line_w = 0.0

    def _flush(yy: float) -> float:
        nonlocal line, line_w
        if not line:
            return yy
        cx = x
        for tok, bold in line:
            c.setFont(_font_for(bold), size)
            c.drawString(cx, yy, tok)
            cx += _tok_width(tok, bold)
        line = []
        line_w = 0.0
        return yy - leading

    for tok, bold in tokens:
        tw = _tok_width(tok, bold)
        if not line and tok.isspace():
            continue
        if line and line_w + tw > max_width and not tok.isspace():
            y = _flush(y)
            if tok.isspace():
                continue
        line.append((tok, bold))
        line_w += tw
    y = _flush(y)
    return y


_TONE_RGB = {
    "good": (0.18, 0.49, 0.20),  # green
    "bad": (0.78, 0.16, 0.16),  # red
}


def _draw_summary_section(c, data: "DebriefData", *, x: float, y: float, w: float, min_y: float) -> float:
    """Unboxed Summary under charts. Returns y after last line."""
    runs = list(getattr(data, "summary_runs", None) or [])
    if not runs:
        plain = (getattr(data, "summary_paragraph", "") or "").strip()
        if not plain:
            return y
        from summary_text import SummaryRun

        runs = [SummaryRun(plain, None)]

    c.setFillColorRGB(0.1, 0.1, 0.1)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(x, y, "Summary")
    y -= 16

    size = 9.5
    leading = 12.5
    font = "Helvetica"
    bold = "Helvetica-Bold"
    first_indent = 18.0
    # Flatten into word tokens retaining tone (split on spaces, keep punctuation on words).
    tokens: list[tuple[str, str | None]] = []
    for run in runs:
        tone = getattr(run, "tone", None)
        text = getattr(run, "text", str(run))
        if text == " ":
            tokens.append((" ", tone))
            continue
        parts = text.split(" ")
        for i, p in enumerate(parts):
            if i:
                tokens.append((" ", tone))
            if p:
                tokens.append((p, tone))

    line: list[tuple[str, str | None]] = []
    line_w = 0.0
    first_line = True

    def flush(yy: float) -> float:
        nonlocal line, line_w, first_line
        if not line:
            return yy
        cx = x + (first_indent if first_line else 0.0)
        for tok, tone in line:
            use_bold = tone is not None
            c.setFont(bold if use_bold else font, size)
            if tone in _TONE_RGB:
                c.setFillColorRGB(*_TONE_RGB[tone])
            else:
                c.setFillColorRGB(0.12, 0.12, 0.12)
            c.drawString(cx, yy, tok)
            cx += c.stringWidth(tok, bold if use_bold else font, size)
        line = []
        line_w = 0.0
        first_line = False
        return yy - leading

    for tok, tone in tokens:
        if tok == " " and not line:
            continue
        tw = c.stringWidth(tok, bold if tone else font, size)
        max_line = w - (first_indent if first_line and not line else 0.0)
        if line and line_w + tw > max_line and tok != " ":
            y = flush(y)
            if y < min_y:
                return y
            max_line = w
        line.append((tok, tone))
        line_w += tw
    y = flush(y)
    return y


def render_stack_d_page1(data: "DebriefData", out_pdf: Path) -> Path:
    """Write page-1 PDF for optimized d_activity_hero layout."""
    letter, inch, ImageReader, canvas_mod, _pdfmetrics, _TTFont = _require_reportlab()
    out_pdf = Path(out_pdf)
    out_pdf.parent.mkdir(parents=True, exist_ok=True)

    page_w, page_h = letter
    margin = 0.32 * inch
    gap = 8
    c = canvas_mod.Canvas(str(out_pdf), pagesize=letter)

    # Header
    y = page_h - margin - 12
    c.setFont("Helvetica-Bold", 13)
    c.drawCentredString(page_w / 2, y, f"Activity Report LabID: {data.lab_id}")
    y -= 14

    content_left = margin
    content_w = page_w - 2 * margin

    # --- Activity card (hero) ---
    activity_h = 2.45 * inch
    act_bottom = y - activity_h
    _draw_rounded_rect(c, content_left, act_bottom, content_w, activity_h, radius=8, stroke=1.0)
    c.setFont("Helvetica-Bold", 10.5)
    c.setFillColorRGB(0.1, 0.1, 0.1)
    c.drawCentredString(
        page_w / 2,
        act_bottom + activity_h - 14,
        "Average Daily Hours of Activity and Sleep per Wear Period",
    )

    chart = _b64_to_image_reader(data.activity_chart_b64, ImageReader)
    chart_left = content_left + 6
    chart_w = content_w - 12
    chart_h = activity_h - 42
    chart_bottom = act_bottom + 22
    drawn = _draw_image_fit(c, chart, chart_left, chart_bottom, chart_w, chart_h)
    # Legend clamped to plot x-span; extra gap so "Sedentary" doesn't sit under Sleep swatch.
    legend_y = act_bottom + 8
    n_leg = len(_LEGEND)
    chart_x0 = drawn[0] if drawn[2] > 0 else chart_left
    chart_draw_w = drawn[2] if drawn[2] > 0 else chart_w
    axis_left = chart_x0 + chart_draw_w * 0.20
    axis_w = chart_draw_w * 0.58
    c.setFont("Helvetica", 8)
    # Fixed item widths (swatch + label + padding) centered in axis span.
    item_gaps = []
    for label, _rgb in _LEGEND:
        item_gaps.append(10 + 4 + c.stringWidth(label, "Helvetica", 8) + 14)
    total_items = sum(item_gaps)
    lx = axis_left + max(0.0, (axis_w - total_items) / 2.0)
    for (label, rgb), item_w in zip(_LEGEND, item_gaps):
        c.setFillColorRGB(*rgb)
        c.rect(lx, legend_y - 1, 9, 9, stroke=1, fill=1)
        c.setFillColorRGB(0.1, 0.1, 0.1)
        c.drawString(lx + 12, legend_y, label)
        lx += item_w

    y = act_bottom - gap

    # --- Bottom row: fitness | sleep ---
    # Leave room below for unbound Summary section + footer.
    summary_reserve = 1.25 * inch
    bottom_h = 3.05 * inch
    bottom_y = max(margin + 10 + summary_reserve, y - bottom_h)
    bottom_h = y - bottom_y
    col_gap = gap
    fit_w = content_w * 0.44
    sleep_w = content_w - fit_w - col_gap

    # Fitness card — Pre|Post table (readable) + adherence / HR
    _draw_rounded_rect(c, content_left, bottom_y, fit_w, bottom_h, radius=8, stroke=1.0)
    c.setFillColorRGB(0.1, 0.1, 0.1)
    c.setFont("Helvetica-Bold", 12.5)
    c.drawCentredString(
        content_left + fit_w / 2, bottom_y + bottom_h - 14, "Exercise Training and Fitness"
    )
    fit = _fitness_block(data)
    fy = bottom_y + bottom_h - 26
    inner_x = content_left + 8
    inner_w = fit_w - 16

    # Pre→post change rows (dates as column headers inside the chart).
    prepost_img = _b64_to_image_reader(getattr(data, "fitness_prepost_b64", "") or "", ImageReader)
    if prepost_img is not None:
        pp_h = min(1.55 * inch, max(fy - bottom_y - 1.55 * inch, 1.0 * inch))
        _draw_image_fit(c, prepost_img, inner_x, fy - pp_h, inner_w, pp_h)
        fy -= pp_h + 4
    else:
        c.setFillColorRGB(0.1, 0.1, 0.1)
        for line in fit.lines_pre[:1] + fit.lines_post[:1]:
            fy = _draw_rich_wrapped(c, line, inner_x, fy, inner_w, size=8, leading=9)

    # Adherence bar (exercise date span is a light caption under the bar in the PNG).
    sess_img = _b64_to_image_reader(getattr(data, "fitness_sessions_b64", "") or "", ImageReader)
    if sess_img is not None:
        sess_h = min(0.58 * inch, max(fy - bottom_y - 1.0 * inch, 0.36 * inch))
        _draw_image_fit(c, sess_img, inner_x, fy - sess_h, inner_w, sess_h)
        fy -= sess_h + 4
    else:
        c.setFillColorRGB(0.1, 0.1, 0.1)
        fy = _draw_rich_wrapped(c, fit.sessions_line, inner_x, fy, inner_w, size=8, leading=9)
        fy = _draw_rich_wrapped(c, fit.adherence_line, inner_x, fy, inner_w, size=8, leading=9)
        fy -= 2

    # HR bar: solid green to resting%, then gradient to 100%
    hr_img = _b64_to_image_reader(getattr(data, "fitness_hr_b64", "") or "", ImageReader)
    if hr_img is not None:
        hr_h = min(1.0 * inch, max(fy - bottom_y - 4, 0.5 * inch))
        _draw_image_fit(c, hr_img, inner_x, fy - hr_h, inner_w, hr_h)
    else:
        c.setFillColorRGB(0.1, 0.1, 0.1)
        fy = _draw_rich_wrapped(c, fit.hr_zones_line, inner_x, fy, inner_w, size=8, leading=9)
        _draw_rich_wrapped(c, fit.hr_max_line, inner_x, fy, inner_w, size=8, leading=9)

    # Sleep card — prefer WP×weekday chart when available
    sleep_left = content_left + fit_w + col_gap
    _draw_rounded_rect(c, sleep_left, bottom_y, sleep_w, bottom_h, radius=8, stroke=1.0)
    c.setFillColorRGB(0.1, 0.1, 0.1)
    eff = data.avg_sleep_efficiency_pct
    title_y = bottom_y + bottom_h - 14
    if eff is not None:
        runs = _rich_runs(f"Average Sleep Efficiency: <strong>{eff}%</strong>")
        total_w = sum(c.stringWidth(t, _font_for(b), 10) for t, b in runs)
        cx = sleep_left + (sleep_w - total_w) / 2.0
        for t, b in runs:
            c.setFont(_font_for(b), 10)
            c.drawString(cx, title_y, t)
            cx += c.stringWidth(t, _font_for(b), 10)
        title_y -= 13
    else:
        title_y -= 2

    use_wp = bool(getattr(data, "sleep_wp_chart_b64", "") and getattr(data, "sleep_by_dow_wp", None))
    sleep_title = (
        "Nightly Sleep Hours by Weekday and Wear Period"
        if use_wp
        else "Average Nightly Hours of Sleep per Day of Week"
    )
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(sleep_left + sleep_w / 2, title_y, sleep_title)

    sleep_b64 = data.sleep_wp_chart_b64 if use_wp else data.sleep_chart_b64
    sleep_img = _b64_to_image_reader(sleep_b64, ImageReader)
    sleep_box_bottom = bottom_y + 6
    sleep_box_h = title_y - sleep_box_bottom - 6
    _draw_image_fit(
        c,
        sleep_img,
        sleep_left + 4,
        sleep_box_bottom,
        sleep_w - 8,
        max(sleep_box_h, 40),
    )

    # --- Summary (under all charts; no box; larger; colored numbers) ---
    y = bottom_y - 22  # extra air between chart cards and Summary
    _draw_summary_section(
        c,
        data,
        x=content_left,
        y=y,
        w=content_w,
        min_y=margin + 14,
    )

    # Footer
    c.setFont("Helvetica", 7.5)
    c.setFillColorRGB(0.35, 0.35, 0.35)
    generated = datetime.now().strftime("%m/%d/%Y")
    c.drawCentredString(
        page_w / 2,
        margin - 6,
        f"BOOST ID {data.subject_id} · {data.cohort.upper()} · generated {generated}",
    )

    c.showPage()
    c.save()
    return out_pdf


def build_native_debrief_pdf(
    data: "DebriefData",
    out_pdf: Path,
    *,
    guidelines_pdf: Path | None = None,
) -> Path:
    """Render stack D page 1 with reportlab and append guidelines page 2."""
    from debrief_pdf import ensure_guidelines_pdf, merge_pdfs

    out_pdf = Path(out_pdf).resolve()
    guidelines = ensure_guidelines_pdf(guidelines_pdf or (TOOL_DIR / "assets" / "guidelines_page.pdf"))

    with tempfile.TemporaryDirectory(prefix="debrief_native_") as tmp:
        page1 = Path(tmp) / "page1.pdf"
        render_stack_d_page1(data, page1)
        merge_pdfs([page1, guidelines], out_pdf)
    return out_pdf
