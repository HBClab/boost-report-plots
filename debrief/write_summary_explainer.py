#!/usr/bin/env python3
"""Build Michelle-facing blank Summary (numbered blanks) + fill table PDF+MD.

Usage (from HBC workspace):
  python repos/boost-report-plots/debrief/write_summary_explainer.py
  python repos/boost-report-plots/debrief/write_summary_explainer.py --out-dir temp

Usage (from this repo):
  python debrief/write_summary_explainer.py --out-dir /path/to/out
"""
from __future__ import annotations

import argparse
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

TOOL_DIR = Path(__file__).resolve().parent
DEFAULT_OUT = TOOL_DIR.parents[3] / "temp"

# Canonical home: HBClab/boost-report-plots
IMPL_GIT = (
    "https://github.com/HBClab/boost-report-plots/blob/main/debrief/summary_text.py"
)
IMPL_REPO_PATH = "debrief/summary_text.py"

# Unicode superscripts (MD). PDF uses <super> via blank_summary_rl().
_SUP = str.maketrans("0123456789", "⁰¹²³⁴⁵⁶⁷⁸⁹")


def _n(i: int) -> str:
    return str(i).translate(_SUP)


def _rl_n(i: int) -> str:
    return f"<super>{i}</super>"


# Blank Summary with small superscript numbers on each blank (maps to table #).
BLANK_SUMMARY = f"""\
VO2 max (overall aerobic fitness) ________{_n(1)} from ____{_n(2)} to ____{_n(3)} ml/kg/min — ________{_n(4)}.

Waist circumference ________{_n(5)} from ____{_n(6)} to ____{_n(7)} cm — ________{_n(8)}.

Resting heart rate ________{_n(9)} from ____{_n(10)} to ____{_n(11)} bpm — ________{_n(12)}.

Of the planned exercise sessions, ____{_n(13)}/60 were completed (____{_n(14)}% adherence) — ________{_n(15)}.

Training heart-rate zones are ____{_n(16)} / ____{_n(17)} / ____{_n(18)} bpm at 60/70/80% of max (____{_n(19)} bpm);
these are prescription targets, not time-in-zone from a wearable.

Sleep efficiency averaged ____{_n(20)}% — ________{_n(21)}.

Nightly sleep across wear periods averaged ____{_n(22)} h, ________{_n(23)}.

On the activity chart, ________{_n(24)} (____{_n(25)} h/day MVPA), and ________{_n(26)} (____{_n(27)} h/day).
"""


def blank_summary_rl() -> str:
    """Same blanks as BLANK_SUMMARY, with reportlab <super> markers (Courier-safe)."""
    return f"""\
VO2 max (overall aerobic fitness) ________{_rl_n(1)} from ____{_rl_n(2)} to ____{_rl_n(3)} ml/kg/min — ________{_rl_n(4)}.<br/><br/>
Waist circumference ________{_rl_n(5)} from ____{_rl_n(6)} to ____{_rl_n(7)} cm — ________{_rl_n(8)}.<br/><br/>
Resting heart rate ________{_rl_n(9)} from ____{_rl_n(10)} to ____{_rl_n(11)} bpm — ________{_rl_n(12)}.<br/><br/>
Of the planned exercise sessions, ____{_rl_n(13)}/60 were completed (____{_rl_n(14)}% adherence) — ________{_rl_n(15)}.<br/><br/>
Training heart-rate zones are ____{_rl_n(16)} / ____{_rl_n(17)} / ____{_rl_n(18)} bpm at 60/70/80% of max (____{_rl_n(19)} bpm);<br/>
these are prescription targets, not time-in-zone from a wearable.<br/><br/>
Sleep efficiency averaged ____{_rl_n(20)}% — ________{_rl_n(21)}.<br/><br/>
Nightly sleep across wear periods averaged ____{_rl_n(22)} h, ________{_rl_n(23)}.<br/><br/>
On the activity chart, ________{_rl_n(24)} (____{_rl_n(25)} h/day MVPA), and ________{_rl_n(26)} (____{_rl_n(27)} h/day).
"""

# # | What fills the blank | Depends on / choices | Green | Red
ROWS: list[list[str]] = [
    [
        "1",
        "Direction verb",
        "increased / decreased / was essentially unchanged "
        "(from pre→post VO2; |Δ| ≤ 0.3 → essentially unchanged)",
        "increased, or unchanged",
        "decreased beyond 0.3",
    ],
    [
        "2",
        "Pre VO2 number (ml/kg/min)",
        "Targeting Submax pre value",
        "toned green only if unchanged case",
        "—",
    ],
    [
        "3",
        "Post VO2 number (ml/kg/min)",
        "Targeting Submax post value",
        "post green if ↑ or unchanged",
        "post red if ↓",
    ],
    [
        "4",
        "Interpretation clause",
        "higher / about the same / lower after training than before",
        "matches green path",
        "matches red path",
    ],
    [
        "5",
        "Direction verb",
        "increased / decreased / was essentially unchanged "
        "(waist; |Δ| ≤ 0.5 cm → unchanged; lower = better)",
        "decreased, or unchanged",
        "increased beyond 0.5 cm",
    ],
    [
        "6",
        "Pre waist (cm)",
        "Targeting Submax pre waist",
        "—",
        "—",
    ],
    [
        "7",
        "Post waist (cm)",
        "Targeting Submax post waist",
        "post green if ↓ or unchanged",
        "post red if ↑",
    ],
    [
        "8",
        "Interpretation clause",
        "a smaller waist / little change / a larger waist after training",
        "green path",
        "red path",
    ],
    [
        "9",
        "Direction verb",
        "increased / decreased / was essentially unchanged "
        "(resting HR; |Δ| ≤ 2 bpm → unchanged; lower = better)",
        "decreased, or unchanged",
        "increased beyond 2 bpm",
    ],
    [
        "10",
        "Pre resting HR (bpm)",
        "Targeting Submax pre RHR",
        "—",
        "—",
    ],
    [
        "11",
        "Post resting HR (bpm)",
        "Targeting Submax post RHR",
        "post green if ↓ or unchanged",
        "post red if ↑",
    ],
    [
        "12",
        "Interpretation clause",
        "heart beat slower at rest / little change / faster at rest after training",
        "green path",
        "red path",
    ],
    [
        "13",
        "Sessions completed (N)",
        "Count of supervised + unsupervised ET sessions (planned dose = 60)",
        "with adherence ≥ 70%",
        "with adherence < 70%",
    ],
    [
        "14",
        "Adherence %",
        "(sup+unsup)/60×100 from Targeting ET forms",
        "≥ 70%",
        "< 70%",
    ],
    [
        "15",
        "Adherence gloss",
        "near the planned training dose (≥90%) / most of the planned sessions "
        "were completed (70–90%) / well below the planned 60-session target (<70%)",
        "≥ 70% glosses",
        "< 70% gloss",
    ],
    [
        "16",
        "60% of max HR (bpm)",
        "round(HR_max × 0.60) from BOOST HR ranges.xlsx",
        "not colored",
        "not colored",
    ],
    [
        "17",
        "70% of max HR (bpm)",
        "round(HR_max × 0.70)",
        "not colored",
        "not colored",
    ],
    [
        "18",
        "80% of max HR (bpm)",
        "round(HR_max × 0.80)",
        "not colored",
        "not colored",
    ],
    [
        "19",
        "HR max (bpm)",
        "Max HR column in BOOST HR ranges.xlsx for that participant",
        "not colored",
        "not colored",
    ],
    [
        "20",
        "Sleep efficiency %",
        "Mean sleep efficiency from GGIR part5 (same as chart)",
        "≥ 75%",
        "< 75%",
    ],
    [
        "21",
        "Sleep-efficiency gloss",
        "≥85%: most time in bed was scored as sleep; "
        "75–85%: acceptable, with some time in bed not scored as sleep; "
        "else: a larger share of time in bed was wake or unsettled",
        "≥ 75% glosses",
        "< 75% gloss",
    ],
    [
        "22",
        "Nightly sleep hours",
        "Mean of wear-period × weekday sleep hours from GGIR part5 daysummary",
        "≥ 6 h (incl. > 8 h)",
        "< 6 h",
    ],
    [
        "23",
        "Sleep-hours gloss",
        "<6 h: below the 6 h minimum on the sleep chart; "
        "6–8 h: inside the 6–8 h goal band; "
        ">8 h: above the 8 h goal line",
        "≥ 6 h glosses",
        "< 6 h gloss",
    ],
    [
        "24",
        "MVPA prose",
        "≥1.0 h/day: ~an hour per wear day; "
        "0.5–1.0: roughly half an hour or more; "
        "<0.5: limited (< ~30 min/day on average)",
        "≥ 0.5 h/day",
        "< 0.5 h/day",
    ],
    [
        "25",
        "MVPA h/day number",
        "Mean MVPA hours across wear periods (GGIR part5)",
        "≥ 0.5",
        "< 0.5",
    ],
    [
        "26",
        "Sedentary prose",
        "≥10 h/day: high (10+ h sitting/lying awake); "
        "8–10: common adult range; "
        "<8: relatively lower than typical desk-heavy days",
        "< 10 h/day",
        "≥ 10 h/day",
    ],
    [
        "27",
        "Sedentary h/day number",
        "Mean sedentary hours across wear periods (GGIR inactivity)",
        "< 10",
        "≥ 10",
    ],
]

SOURCES = [
    [
        "VO2, waist, resting HR (pre/post)",
        "REDCap Targeting project (pid 13038) — forms "
        "Pretraining Submax Test V2 / Posttraining Submax Test V4 "
        "(API via TARGETING_TOKEN or DEBRIEF_FITNESS_TOKEN). "
        "Joined in fitness_manual.py → manual JSON fields used by the Summary.",
    ],
    [
        "Sessions completed + adherence %",
        "Same Targeting REDCap — supervised + unsupervised Exercise Training forms "
        "(count nonzero session fields; adherence = (sup+unsup)/60×100).",
    ],
    [
        "HR max + 60/70/80% zone bpm",
        "LSS workbook (not REDCap): "
        "Z:\\Projects\\BOOST\\InterventionStudy\\1-projectManagement\\participants\\"
        "ExerciseSessionMaterials\\Intervention Materials\\BOOST HR ranges.xlsx "
        "(vosslink: /mnt/nfs/lss/vosslabhpc/Projects/BOOST/…/BOOST HR ranges.xlsx).",
    ],
    [
        "Sleep efficiency, nightly sleep h, MVPA, sedentary",
        "GGIR part5 CSVs under the subject’s derivatives tree, e.g. INT: "
        "Z:\\Projects\\BOOST\\InterventionStudy\\3-experiment\\output\\derivatives\\"
        "GGIR-3.2.6\\sub-<ID>\\…\\results\\part5_personsummary_MM*.csv and "
        "part5_daysummary_MM*.csv "
        "(vosslink: /mnt/nfs/lss/vosslabhpc/Projects/BOOST/…/GGIR-3.2.6/…). "
        "Same numbers drive the sleep/activity charts on page 1.",
    ],
    [
        "Finished PDF land folder",
        "RDSS (not LSS): …/Repositories/Accelerometer_Data/ActivityFiles/BOOST-I/auto/ "
        "(Windows W: or vosslink /mnt/nfs/rdss/vosslab/…). "
        "Built after GGIR by bahaa pipeline debrief --land.",
    ],
]


def _styles():
    ss = getSampleStyleSheet()
    h2 = ParagraphStyle(
        "H2",
        parent=ss["Heading2"],
        fontSize=11,
        spaceBefore=12,
        spaceAfter=6,
        textColor=colors.HexColor("#111111"),
    )
    body = ParagraphStyle(
        "Body2",
        parent=ss["BodyText"],
        fontSize=9.5,
        leading=12,
        spaceAfter=5,
    )
    mono = ParagraphStyle(
        "Mono",
        parent=ss["BodyText"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        leftIndent=2,
        spaceAfter=6,
    )
    cell = ParagraphStyle(
        "Cell",
        parent=ss["BodyText"],
        fontSize=7.5,
        leading=9.5,
    )
    note = ParagraphStyle(
        "Note",
        parent=ss["BodyText"],
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#444444"),
        spaceAfter=8,
    )
    return h2, body, mono, cell, note


def write_md(path: Path) -> None:
    lines = [
        BLANK_SUMMARY.strip(),
        "",
        "Small superscript numbers on each blank match the **#** column below. "
        "In the real participant PDF, only numbers are green/red (prose stays black).",
        "",
        "| # | What fills the blank | Depends on / choices | Green | Red |",
        "|---|---|---|---|---|",
    ]
    for row in ROWS:
        lines.append("| " + " | ".join(c.replace("|", "\\|") for c in row) + " |")
    lines += [
        "",
        "## Sources",
        "",
        "| What | Where |",
        "|---|---|",
    ]
    for row in SOURCES:
        lines.append("| " + " | ".join(c.replace("|", "\\|") for c in row) + " |")
    lines += [
        "",
        f"Implementation (wording + green/red rules): [`{IMPL_REPO_PATH}`]({IMPL_GIT})",
        "",
    ]
    path.write_text("\n".join(lines), encoding="utf-8")


def write_pdf(path: Path) -> None:
    h2, body, mono, cell, note = _styles()
    doc = SimpleDocTemplate(
        str(path),
        pagesize=letter,
        leftMargin=0.55 * inch,
        rightMargin=0.55 * inch,
        topMargin=0.5 * inch,
        bottomMargin=0.5 * inch,
    )
    story = []
    # Start with the summary paragraph (no title banner).
    story.append(Paragraph(blank_summary_rl(), mono))
    story.append(
        Paragraph(
            "Small superscript numbers on each blank match the <b>#</b> column below. "
            "In the real participant PDF, only numbers are green/red (prose stays black).",
            note,
        )
    )

    header = [
        Paragraph("<b>#</b>", cell),
        Paragraph("<b>What fills the blank</b>", cell),
        Paragraph("<b>Depends on / choices</b>", cell),
        Paragraph("<b>Green</b>", cell),
        Paragraph("<b>Red</b>", cell),
    ]
    data = [header]
    for row in ROWS:
        data.append([Paragraph(c, cell) for c in row])

    table = Table(
        data,
        colWidths=[0.35 * inch, 1.25 * inch, 3.55 * inch, 1.15 * inch, 1.0 * inch],
        repeatRows=1,
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#d6e4f0")),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#888888")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 2),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7f7f7")]),
                ("ALIGN", (0, 0), (0, -1), "CENTER"),
            ]
        )
    )
    story.append(table)
    story.append(Spacer(1, 8))
    story.append(Paragraph("Sources", h2))

    src_header = [
        Paragraph("<b>What</b>", cell),
        Paragraph("<b>Where</b>", cell),
    ]
    src_data = [src_header]
    for row in SOURCES:
        src_data.append([Paragraph(c, cell) for c in row])
    src_table = Table(src_data, colWidths=[1.7 * inch, 5.6 * inch])
    src_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8e8e8")),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#888888")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 3),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]
        )
    )
    story.append(src_table)
    story.append(Spacer(1, 8))
    story.append(
        Paragraph(
            f"Implementation (wording + green/red rules): "
            f"<font face='Courier' size='8'>{IMPL_REPO_PATH}</font><br/>"
            f"<font face='Courier' size='7'>{IMPL_GIT}</font>",
            body,
        )
    )
    doc.build(story)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--out-dir", type=Path, default=DEFAULT_OUT)
    args = ap.parse_args()
    out = args.out_dir
    out.mkdir(parents=True, exist_ok=True)
    md = out / "debrief_summary_explainer_for_michelle.md"
    pdf = out / "debrief_summary_explainer_for_michelle.pdf"
    write_md(md)
    write_pdf(pdf)
    print(f"wrote {md}")
    print(f"wrote {pdf}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
