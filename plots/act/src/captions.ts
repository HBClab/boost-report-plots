// ─── Caption module ───────────────────────────────────────────────────────────
// Single source-of-truth for all plot caption text.
// Every plot render file imports from here — no hardcoded caption strings elsewhere.
import * as d3 from 'd3';

// Height added to each card to accommodate the caption zone (see docs/plot-specs/).
export const CAPTION_H = 100;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NumericAnnotation {
  label: string;
  value: number | null; // null → annotation is omitted from render
}

export interface CaptionEntry {
  prose: string;
  annotations: NumericAnnotation[];
  disclaimer?: string;
}

type GSelection = d3.Selection<SVGGElement, unknown, null, undefined>;

// ─── Typography constants (matching existing dark dashboard palette) ──────────
const FONT         = 'DM Sans, Inter, -apple-system, sans-serif';
const TEXT_2ND     = '#6B7A90'; // textSecondary
const TEXT_1ST     = '#DDE4EF'; // textPrimary
const PROSE_FS     = 11;
const PROSE_LH     = 16;
const ANNOT_FS     = 10;
const ANNOT_LH     = 15;
const SECT_GAP     = 8;

// ─── Word-wrap helper ─────────────────────────────────────────────────────────

function wrapText(
  parent: GSelection,
  text: string,
  x: number,
  startY: number,
  maxWidth: number,
): number {
  // Approximate average character width for DM Sans 11px
  const avgCharW = PROSE_FS * 0.56;
  const charsPerLine = Math.max(30, Math.floor(maxWidth / avgCharW));

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (test.length > charsPerLine && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  const textEl = parent.append('text')
    .attr('x', x)
    .attr('y', startY)
    .attr('font-family', FONT)
    .attr('font-size', PROSE_FS)
    .attr('font-weight', 400)
    .attr('fill', TEXT_2ND);

  lines.forEach((l, i) => {
    textEl.append('tspan')
      .attr('x', x)
      .attr('dy', i === 0 ? 0 : PROSE_LH)
      .text(l);
  });

  return startY + (lines.length - 1) * PROSE_LH;
}

// ─── Public render helper ─────────────────────────────────────────────────────

/**
 * Renders a CaptionEntry into `parent`, clearing any previously rendered
 * caption first. Safe to call multiple times (e.g. on toggle).
 *
 * @param parent   Card-level SVGGElement to render into.
 * @param entry    Caption data from actCaptions / hrCaptions.
 * @param layout   { captionTop, width, padding } — position/geometry of caption zone.
 */
export function renderCaption(
  parent: GSelection,
  entry: CaptionEntry,
  layout: { captionTop: number; width: number; padding: number },
): void {
  parent.selectAll('.caption-area').remove();
  const g = parent.append('g').attr('class', 'caption-area') as GSelection;

  const x   = layout.padding;
  const maxW = layout.width - layout.padding * 2;
  let y = layout.captionTop;

  // ── Prose ──
  if (entry.prose) {
    const lastLineY = wrapText(g, entry.prose, x, y, maxW);
    y = lastLineY + PROSE_LH + SECT_GAP;
  }

  // ── Numeric annotations ──
  const valid = entry.annotations.filter((a) => a.value !== null);
  if (valid.length > 0) {
    let ax = x;
    for (const ann of valid) {
      const tag = `${ann.label}: `;
      const val = String(ann.value);
      const tagW = tag.length * ANNOT_FS * 0.52;
      const valW = (val.length + 3) * ANNOT_FS * 0.52;

      g.append('text')
        .attr('x', ax)
        .attr('y', y)
        .attr('font-family', FONT)
        .attr('font-size', ANNOT_FS)
        .attr('font-weight', 400)
        .attr('fill', TEXT_2ND)
        .text(tag);

      g.append('text')
        .attr('x', ax + tagW)
        .attr('y', y)
        .attr('font-family', FONT)
        .attr('font-size', ANNOT_FS)
        .attr('font-weight', 600)
        .attr('fill', TEXT_1ST)
        .text(val);

      ax += tagW + valW;
      if (ax > maxW * 0.55) {
        ax = x;
        y += ANNOT_LH;
      }
    }
    y += ANNOT_LH;
  }

  // ── Disclaimer ──
  if (entry.disclaimer) {
    g.append('text')
      .attr('x', x)
      .attr('y', y + SECT_GAP)
      .attr('font-family', FONT)
      .attr('font-size', 9)
      .attr('font-weight', 400)
      .attr('fill', TEXT_2ND)
      .attr('font-style', 'italic')
      .text(entry.disclaimer);
  }
}

// ─── ACT caption content ──────────────────────────────────────────────────────

export const actCaptions: {
  plot1: { all: CaptionEntry; baseline: CaptionEntry };
  plot2: CaptionEntry;
  plot3: CaptionEntry;
} = {
  plot1: {
    all: {
      prose:
        'Each bar shows the 24-hour day composition (Sleep, Sedentary, Light, Moderate, Vigorous) ' +
        'averaged across all study sessions by day type, normalized to 100% of the full day (1440 min). ' +
        'Higher Moderate and Vigorous segments indicate greater physical activity.',
      annotations: [
        { label: 'Intervention participants', value: 84 },
        { label: 'Observational participants', value: 249 },
      ],
    },
    baseline: {
      prose:
        'Session 1 (Baseline) composition only. Use this view to characterize pre-intervention ' +
        'activity patterns before any program effect. The proportions here reflect ' +
        "participants' habitual behaviour at enrolment.",
      annotations: [
        { label: 'Intervention (S1)', value: 84 },
        { label: 'Observational (S1)', value: 249 },
      ],
    },
  },

  plot2: {
    prose:
      'Each row is one participant; columns are study sessions S1\u2013S4. Cell colour encodes ' +
      'sedentary minutes (left panel, blue scale) and MVPA minutes (right panel, teal scale). ' +
      'Rows are sorted by change in sedentary time from first to last session. The \u0394 column ' +
      'shows group direction (\u25b2\u202f=\u202fless sedentary, \u25bc\u202f=\u202fmore).',
    annotations: [],
  },

  plot3: {
    prose:
      'Mean wrist acceleration (ENMO, mg) by clock hour. Intervention shown per session ' +
      '(S1\u2013S4, teal palette); observational as a single orange line. SD bands collapse ' +
      'to near-zero during sleep (\u223c10\u202fpm\u20136\u202fam) \u2014 a real data feature: ' +
      'participants are uniformly inactive overnight so inter-individual variability approaches zero. ' +
      'Per-session counts shown in legend.',
    annotations: [],
  },
};

// ─── HR caption content ───────────────────────────────────────────────────────

export const hrCaptions: {
  plot1: CaptionEntry;
  plot2: { trimp: CaptionEntry; hrmax: CaptionEntry };
  plot3: { adherence: CaptionEntry; sessions: CaptionEntry };
} = {
  plot1: {
    prose:
      'Mean seconds per session spent below, within, and above the target HR zone for each of ' +
      '6 study weeks. Supervised (blue) and Unsupervised (orange) are shown side by side each week. ' +
      'Green\u202f=\u202fon-target; red\u202f=\u202fabove-zone; light blue\u202f=\u202fbelow-zone.',
    annotations: [
      { label: 'Supervised participants', value: 49 },
      { label: 'Unsupervised participants', value: 49 },
    ],
  },

  plot2: {
    trimp: {
      prose:
        'Weekly Edwards TRIMP (Training Impulse) averaged across subjects with \u00b11\u202fSD band. ' +
        'TRIMP combines session duration and heart rate intensity into a single training-load score. ' +
        'Higher values indicate greater physiological demand. Groups share a matched week axis (Wk\u202f1\u20136).',
      annotations: [
        { label: 'Supervised participants', value: 49 },
        { label: 'Unsupervised participants', value: 49 },
      ],
    },
    hrmax: {
      prose:
        'Weekly mean percent of maximum heart rate per session, averaged across subjects, with ' +
        '\u00b11\u202fSD band. The y-axis is fixed from 50\u201380% to make group differences readable. ' +
        'Values above \u223c85% HR Max indicate vigorous-intensity exercise.',
      annotations: [
        { label: 'Supervised participants', value: 49 },
        { label: 'Unsupervised participants', value: 43 },
      ],
    },
  },

  plot3: {
    adherence: {
      prose:
        'Individual weekly adherence across 6 study weeks. A week is Met (green) when \u226575% ' +
        "of that week's sessions had a sustained in-zone bout (bounded_met\u202f=\u202ftrue). " +
        'Both panels share the same alphabetical subject roster, so rows align between groups.',
      annotations: [],
      disclaimer: '75% weekly adherence threshold applied per subject per week.',
    },
    sessions: {
      prose:
        'Session count per participant per week. Cell fill height shows the proportion of 5 sessions ' +
        'completed; gold outline marks more than 5 sessions. Grey cells indicate no sessions recorded. ' +
        'Both panels share the same subject roster.',
      annotations: [],
    },
  },
};
