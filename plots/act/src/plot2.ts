import * as d3 from 'd3';
import { COLORS } from './constants.js';
import type { SubjectSessionData, CardLayout } from './types.js';
import { renderCaption, CAPTION_H, actCaptions } from './captions.js';

function ensureTooltip(): d3.Selection<HTMLDivElement, unknown, HTMLElement, unknown> {
  let tip = d3.select<HTMLDivElement, unknown>('#d3-tooltip');
  if (tip.empty()) {
    tip = d3.select('body')
      .append('div')
      .attr('id', 'd3-tooltip')
      .style('position', 'fixed')
      .style('background', 'rgba(33,33,48,0.92)')
      .style('color', '#fff')
      .style('font', '12px/1.5 DM Sans, Inter, -apple-system, sans-serif')
      .style('padding', '6px 10px')
      .style('border-radius', '4px')
      .style('pointer-events', 'none')
      .style('opacity', '0')
      .style('transition', 'opacity 0.1s')
      .style('z-index', '9999')
      .style('max-width', '220px');
  }
  return tip;
}

// ─── Layout constants (from docs/plot-specs/act.md v2.1) ─────────────────────
const CARD_PAD = 24;
const CELL_W = 66;       // px per session column
const CELL_H = 7;        // px per participant row
const CELL_GAP = 1;      // px gap between rows
const ROW_STRIDE = CELL_H + CELL_GAP;  // 8px
const DELTA_COL_W = 14;  // px delta separator column
const SESSION_LABEL_H = 20; // px above cells for S1-S4 labels
const MAX_SESSIONS = 4;
const MAX_DELTA_MARKER_H = 12; // px max triangle height
const TITLE_H = 28;
const LEGEND_TOP_GAP = 16;
const LEGEND_H = 10;
const LEGEND_LABEL_GAP = 4;
const CARD_BOTTOM_PAD = 20;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeDelta(subject: SubjectSessionData): number {
  if (subject.sessions.length < 2) return 0;
  const sorted = [...subject.sessions].sort((a, b) => a.session_number - b.session_number);
  return sorted[sorted.length - 1].avg_sed_min - sorted[0].avg_sed_min;
}

function getSession(subject: SubjectSessionData, n: number) {
  return subject.sessions.find((s) => s.session_number === n) ?? null;
}

export function getPlot2Height(subjectCount: number): number {
  return CARD_PAD
    + TITLE_H
    + SESSION_LABEL_H
    + subjectCount * ROW_STRIDE
    + LEGEND_TOP_GAP
    + LEGEND_H
    + LEGEND_LABEL_GAP
    + CARD_BOTTOM_PAD
    + CAPTION_H;
}

// ─── Main render function ────────────────────────────────────────────────────

export function renderPlot2(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  rawData: SubjectSessionData[],
  layout: CardLayout
): void {
  // Sort by delta_sed ascending (most decrease at top)
  const data = [...rawData].sort((a, b) => computeDelta(a) - computeDelta(b));

  const g = svg.append('g').attr('transform', `translate(${layout.x},${layout.y})`);
  g.attr('data-plot', '2');

  // Card background
  g.append('rect')
    .attr('width', layout.w)
    .attr('height', layout.h)
    .attr('rx', 12)
    .attr('fill', COLORS.card);

  // Card title
  g.append('text')
    .attr('x', CARD_PAD)
    .attr('y', CARD_PAD + 4)
    .attr('font-size', 14)
    .attr('font-weight', 600)
    .attr('fill', COLORS.textPrimary)
    .attr('font-family', 'DM Sans, Inter, -apple-system, sans-serif')
    .text('Intervention — Sedentary & MVPA by Participant × Session');

  const chartTop = CARD_PAD + TITLE_H;

  // Layout within card (using spec positions relative to card origin)
  // Left panel starts at card-relative x = 24 (pad)
  const leftPanelX = CARD_PAD;
  const deltaPanelX = leftPanelX + MAX_SESSIONS * CELL_W + 8;
  const rightPanelX = deltaPanelX + DELTA_COL_W + 8;
  const cellsTop = chartTop + SESSION_LABEL_H;

  // Color scales
  const sedValues = data.flatMap((d) =>
    d.sessions.map((s) => s.avg_sed_min).filter(Boolean)
  );
  const mvpaValues = data.flatMap((d) =>
    d.sessions.map((s) => s.avg_mvpa_min).filter(Boolean)
  );
  const maxDeltaAbs = Math.max(1, ...data.map((d) => Math.abs(computeDelta(d))));

  // High-contrast scales: near-black low → vivid color high for dark-mode readability
  const sedScale = d3.scaleSequential(
    [d3.min(sedValues) ?? 0, d3.max(sedValues) ?? 1000],
    d3.interpolate('#0B1320', '#5B9EF5')
  );
  const mvpaScale = d3.scaleSequential(
    [d3.min(mvpaValues) ?? 0, d3.max(mvpaValues) ?? 200],
    d3.interpolate('#0B1320', '#10D4E6')
  );

  // Session labels S1–S4
  for (let sn = 1; sn <= MAX_SESSIONS; sn++) {
    const sx = (sn - 1) * CELL_W;
    // Left panel label
    g.append('text')
      .attr('x', leftPanelX + sx + CELL_W / 2)
      .attr('y', chartTop + SESSION_LABEL_H - 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', 10)
      .attr('fill', COLORS.textSecondary)
      .attr('font-family', 'DM Sans, Inter, -apple-system, sans-serif')
      .text(`S${sn}`);
    // Right panel label
    g.append('text')
      .attr('x', rightPanelX + sx + CELL_W / 2)
      .attr('y', chartTop + SESSION_LABEL_H - 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', 10)
      .attr('fill', COLORS.textSecondary)
      .attr('font-family', 'DM Sans, Inter, -apple-system, sans-serif')
      .text(`S${sn}`);
  }

  const tooltip = ensureTooltip();

  function attachTooltip(
    rect: d3.Selection<SVGRectElement, unknown, null, undefined>,
    subject: SubjectSessionData,
    sn: number,
    label: string,
    value: number | null
  ): void {
    const html = value !== null
      ? `<strong>${subject.subject_code}</strong> · S${sn}<br>${label}: <strong>${Math.round(value)} min</strong>`
      : `<strong>${subject.subject_code}</strong> · S${sn}<br>${label}: <em>no data</em>`;

    rect
      .on('mouseover', (event: MouseEvent) => {
        tooltip.html(html)
          .style('opacity', '1')
          .style('left', `${event.clientX + 12}px`)
          .style('top', `${event.clientY - 8}px`);
      })
      .on('mousemove', (event: MouseEvent) => {
        tooltip
          .style('left', `${event.clientX + 12}px`)
          .style('top', `${event.clientY - 8}px`);
      })
      .on('mouseout', () => tooltip.style('opacity', '0'));
  }

  // Participant rows
  data.forEach((subject, ri) => {
    const ry = cellsTop + ri * ROW_STRIDE;
    const delta = computeDelta(subject);

    for (let sn = 1; sn <= MAX_SESSIONS; sn++) {
      const session = getSession(subject, sn);
      const sx = (sn - 1) * CELL_W;

      // Sedentary cell
      const missingColor = '#0B1320';
      const sedRect = g.append('rect')
        .attr('x', leftPanelX + sx)
        .attr('y', ry)
        .attr('width', CELL_W)
        .attr('height', CELL_H)
        .attr('fill', session ? sedScale(session.avg_sed_min) : missingColor);
      attachTooltip(sedRect, subject, sn, 'Sedentary', session?.avg_sed_min ?? null);

      // MVPA cell
      const mvpaRect = g.append('rect')
        .attr('x', rightPanelX + sx)
        .attr('y', ry)
        .attr('width', CELL_W)
        .attr('height', CELL_H)
        .attr('fill', session ? mvpaScale(session.avg_mvpa_min) : missingColor);
      attachTooltip(mvpaRect, subject, sn, 'MVPA', session?.avg_mvpa_min ?? null);
    }

    // Delta marker in separator column
    const markerH = Math.max(
      2,
      Math.round((Math.abs(delta) / maxDeltaAbs) * MAX_DELTA_MARKER_H)
    );
    const markerColor = delta <= 0 ? COLORS.intervention : COLORS.observational;
    const markerCx = deltaPanelX + DELTA_COL_W / 2;
    const markerCy = ry + CELL_H / 2;

    if (delta <= 0) {
      // Decrease in sedentary → upward triangle ▲ (teal)
      const pts = [
        [markerCx, markerCy - markerH / 2],
        [markerCx - 4, markerCy + markerH / 2],
        [markerCx + 4, markerCy + markerH / 2],
      ];
      g.append('polygon')
        .attr('points', pts.map((p) => p.join(',')).join(' '))
        .attr('fill', markerColor);
    } else {
      // Increase in sedentary → downward triangle ▼ (orange)
      const pts = [
        [markerCx, markerCy + markerH / 2],
        [markerCx - 4, markerCy - markerH / 2],
        [markerCx + 4, markerCy - markerH / 2],
      ];
      g.append('polygon')
        .attr('points', pts.map((p) => p.join(',')).join(' '))
        .attr('fill', markerColor);
    }
  });

  // Color scale legends below heatmap
  const legendTop = cellsTop + data.length * ROW_STRIDE + LEGEND_TOP_GAP;
  const gradW = MAX_SESSIONS * CELL_W;
  const gradH = LEGEND_H;

  renderGradientLegend(g, leftPanelX, legendTop, gradW, gradH, '#0B1320', '#5B9EF5', 'Sedentary');
  renderGradientLegend(g, rightPanelX, legendTop, gradW, gradH, '#0B1320', '#10D4E6', 'MVPA');

  const contentH = layout.h - CAPTION_H;
  renderCaption(g, actCaptions.plot2, {
    captionTop: contentH + 12,
    width: layout.w,
    padding: CARD_PAD,
  });
}

function renderGradientLegend(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  x: number,
  y: number,
  w: number,
  h: number,
  colorLow: string,
  colorHigh: string,
  label: string
): void {
  const gradId = `grad-${label.toLowerCase()}-${Math.random().toString(36).slice(2, 6)}`;

  // Define gradient in defs
  const defs = g.select<SVGDefsElement>('defs');
  const defsEl = defs.empty()
    ? g.append<SVGDefsElement>('defs' as 'defs')
    : defs;

  const grad = defsEl.append('linearGradient')
    .attr('id', gradId)
    .attr('x1', '0%').attr('x2', '100%');
  grad.append('stop').attr('offset', '0%').attr('stop-color', colorLow);
  grad.append('stop').attr('offset', '100%').attr('stop-color', colorHigh);

  g.append('rect')
    .attr('x', x).attr('y', y)
    .attr('width', w).attr('height', h)
    .attr('fill', `url(#${gradId})`);

  g.append('text')
    .attr('x', x).attr('y', y - 4)
    .attr('font-size', 10)
    .attr('fill', COLORS.textSecondary)
    .attr('font-family', 'DM Sans, Inter, -apple-system, sans-serif')
    .text(`${label}  Low`);

  g.append('text')
    .attr('x', x + w).attr('y', y - 4)
    .attr('text-anchor', 'end')
    .attr('font-size', 10)
    .attr('fill', COLORS.textSecondary)
    .attr('font-family', 'DM Sans, Inter, -apple-system, sans-serif')
    .text('High');
}
