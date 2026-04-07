import * as d3 from 'd3';
import {
  COLORS,
  SEGMENTS,
  SEGMENT_LABELS,
  SEGMENT_COLORS,
  type Segment,
} from './constants.js';
import type { DayTypeAggregate, CardLayout } from './types.js';

// ─── Layout constants ────────────────────────────────────────────────────────
const LABEL_COL_W    = 88;
const LABEL_GAP      = 14;
const BAR_H          = 40;
const BAR_GAP        = 14;
const CARD_PAD       = 28;
const INLINE_MIN     = 40;
const LEGEND_SPACING = 118;
const LEGEND_SQ      = 12;
const LEGEND_RADIUS  = 3;
const SECTION_LABEL_H = 24;
const SEPARATOR_H    = 28;

// Session toggle
const TOGGLE_BTN_W   = 110;
const TOGGLE_BTN_H   = 24;
const TOGGLE_PAD     = 2;
const TOGGLE_TOTAL_W = 2 * TOGGLE_BTN_W + TOGGLE_PAD * 3;

export type SessionView = 'all' | 'baseline';

// ─── Tooltip ─────────────────────────────────────────────────────────────────
function ensureTooltip(): d3.Selection<HTMLDivElement, unknown, HTMLElement, unknown> {
  let tip = d3.select<HTMLDivElement, unknown>('#d3-tooltip');
  if (tip.empty()) {
    tip = d3.select('body').append('div').attr('id', 'd3-tooltip')
      .style('position', 'fixed').style('background', 'rgba(13,17,23,0.95)')
      .style('color', '#DDE4EF').style('font', '12.5px/1.6 DM Sans, Inter, -apple-system, sans-serif')
      .style('padding', '8px 12px').style('border-radius', '6px')
      .style('border', '1px solid #1E2C44').style('pointer-events', 'none')
      .style('opacity', '0').style('transition', 'opacity 0.1s')
      .style('z-index', '9999').style('max-width', '220px');
  }
  return tip;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function rawMin(d: DayTypeAggregate, seg: Segment): number {
  const map: Record<Segment, keyof DayTypeAggregate> = {
    sleep: 'sleep_min', sed: 'sed_min', light: 'light_min', mod: 'mod_min', vig: 'vig_min',
  };
  return d[map[seg]] as number;
}

function normalizeRows(data: DayTypeAggregate[]) {
  return data.map((d) => {
    const total = SEGMENTS.reduce((s, k) => s + rawMin(d, k), 0);
    const props = {} as Record<Segment, number>;
    for (const k of SEGMENTS) props[k] = total > 0 ? rawMin(d, k) / total : 0;
    return { day_type: d.day_type, props, raw: d };
  });
}

// ─── Renders one group section (3 bars) ──────────────────────────────────────
function renderGroupSection(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  data: DayTypeAggregate[],
  sectionTopY: number,
  barLeft: number,
  xScale: d3.ScaleLinear<number, number>,
  groupColor: string,
  groupLabel: string,
  tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, unknown>
): number {
  const normalized = normalizeRows(data);

  const lx = barLeft - LABEL_COL_W - LABEL_GAP;
  g.append('circle').attr('cx', lx + LABEL_COL_W - 8).attr('cy', sectionTopY + 7)
    .attr('r', 4).attr('fill', groupColor);
  g.append('text')
    .attr('x', lx + LABEL_COL_W).attr('y', sectionTopY + 11)
    .attr('font-size', 10).attr('font-weight', 600).attr('fill', groupColor)
    .attr('font-family', 'DM Mono, monospace').attr('letter-spacing', '0.07em')
    .text(groupLabel.toUpperCase());

  const barsTop = sectionTopY + SECTION_LABEL_H;

  normalized.forEach((row, i) => {
    const rowY = barsTop + i * (BAR_H + BAR_GAP);

    g.append('text')
      .attr('x', barLeft - LABEL_GAP).attr('y', rowY + BAR_H / 2 + 4)
      .attr('text-anchor', 'end').attr('font-size', 13).attr('font-weight', 500)
      .attr('fill', COLORS.textPrimary)
      .attr('font-family', 'DM Sans, Inter, -apple-system, sans-serif')
      .text(row.day_type);

    let cumulative = 0;
    SEGMENTS.forEach((seg, si) => {
      const prop = row.props[seg];
      const segX = xScale(cumulative);
      const segW = xScale(cumulative + prop) - segX;

      const rect = g.append('rect')
        .attr('x', segX).attr('y', rowY)
        .attr('width', segW).attr('height', BAR_H)
        .attr('fill', SEGMENT_COLORS[seg]);

      if (si < SEGMENTS.length - 1 && segW > 0) {
        g.append('line')
          .attr('x1', segX + segW).attr('x2', segX + segW)
          .attr('y1', rowY).attr('y2', rowY + BAR_H)
          .attr('stroke', '#fff').attr('stroke-width', 2);
      }

      if (segW > INLINE_MIN) {
        g.append('text')
          .attr('x', segX + segW / 2).attr('y', rowY + BAR_H / 2 + 4)
          .attr('text-anchor', 'middle').attr('font-size', 11).attr('font-weight', 600)
          .attr('fill', '#fff')
          .attr('font-family', 'DM Sans, Inter, -apple-system, sans-serif')
          .attr('pointer-events', 'none')
          .text(`${Math.round(prop * 100)}%`);
      }

      const mins = Math.round(rawMin(row.raw, seg));
      const pctStr = `${(prop * 100).toFixed(1)}%`;
      rect
        .on('mouseover', (event: MouseEvent) => {
          tooltip.html(
            `<strong style="color:${SEGMENT_COLORS[seg]}">${SEGMENT_LABELS[seg]}</strong><br>` +
            `${mins} min &nbsp;<span style="color:#6B7A90">(${pctStr})</span>`
          ).style('opacity', '1')
            .style('left', `${event.clientX + 14}px`)
            .style('top', `${event.clientY - 10}px`);
        })
        .on('mousemove', (event: MouseEvent) => {
          tooltip.style('left', `${event.clientX + 14}px`).style('top', `${event.clientY - 10}px`);
        })
        .on('mouseout', () => tooltip.style('opacity', '0'));

      cumulative += prop;
    });
  });

  return barsTop + normalized.length * (BAR_H + BAR_GAP) - BAR_GAP;
}

// ─── Inline session toggle ────────────────────────────────────────────────────
function renderSessionToggle(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  layout: CardLayout,
  current: SessionView,
  onToggle: (v: SessionView) => void
): void {
  const opts: { id: SessionView; label: string }[] = [
    { id: 'all',      label: 'All Sessions' },
    { id: 'baseline', label: 'Baseline (S1)' },
  ];
  const containerW = TOGGLE_TOTAL_W + TOGGLE_PAD * 2;
  const containerH = TOGGLE_BTN_H + TOGGLE_PAD * 2;
  const tx = layout.w - CARD_PAD - containerW;
  const ty = 8;

  const toggleG = g.append('g').attr('transform', `translate(${tx},${ty})`);
  toggleG.append('rect')
    .attr('width', containerW).attr('height', containerH).attr('rx', 6)
    .attr('fill', COLORS.background).attr('stroke', '#1E2C44').attr('stroke-width', 1);

  opts.forEach(({ id, label }, i) => {
    const isActive = current === id;
    const bx = TOGGLE_PAD + i * (TOGGLE_BTN_W + TOGGLE_PAD);
    const optG = toggleG.append('g')
      .attr('transform', `translate(${bx},${TOGGLE_PAD})`)
      .style('cursor', isActive ? 'default' : 'pointer');

    const bg = optG.append('rect')
      .attr('width', TOGGLE_BTN_W).attr('height', TOGGLE_BTN_H).attr('rx', 4)
      .attr('fill', isActive ? '#1A2440' : 'transparent');

    optG.append('text')
      .attr('x', TOGGLE_BTN_W / 2).attr('y', TOGGLE_BTN_H / 2 + 4)
      .attr('text-anchor', 'middle').attr('font-size', 11)
      .attr('font-weight', isActive ? 600 : 400)
      .attr('fill', isActive ? COLORS.textPrimary : COLORS.textSecondary)
      .attr('font-family', 'DM Sans, Inter, -apple-system, sans-serif')
      .attr('pointer-events', 'none').text(label);

    if (!isActive) {
      optG
        .on('mouseenter', () => bg.attr('fill', 'rgba(255,255,255,0.04)'))
        .on('mouseleave', () => bg.attr('fill', 'transparent'))
        .on('click', () => onToggle(id));
    }
  });
}

// ─── Main render ─────────────────────────────────────────────────────────────
export function renderPlot1(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  intData: DayTypeAggregate[],
  obsData: DayTypeAggregate[],
  layout: CardLayout,
  viewState: { current: SessionView; onToggle: (v: SessionView) => void }
): void {
  const tooltip = ensureTooltip();
  svg.selectAll('[data-plot="1"]').remove();

  const g = svg.append('g')
    .attr('data-plot', '1')
    .attr('transform', `translate(${layout.x},${layout.y})`);

  g.append('rect')
    .attr('width', layout.w).attr('height', layout.h)
    .attr('rx', 12).attr('fill', COLORS.card);

  g.append('text')
    .attr('x', CARD_PAD).attr('y', CARD_PAD + 14)
    .attr('font-size', 15).attr('font-weight', 600)
    .attr('fill', COLORS.textPrimary)
    .attr('font-family', 'DM Sans, Inter, -apple-system, sans-serif')
    .attr('letter-spacing', '-0.01em')
    .text('24-Hour Activity Composition');

  renderSessionToggle(g, layout, viewState.current, viewState.onToggle);

  const titleH = 34;
  const gridLabelH = 18;
  const chartTop = CARD_PAD + titleH;
  const barLeft = CARD_PAD + LABEL_COL_W + LABEL_GAP;
  const xScale = d3.scaleLinear([0, 1], [barLeft, layout.w - CARD_PAD]);

  const intBarAreaH = intData.length * (BAR_H + BAR_GAP) - BAR_GAP;
  const obsBarAreaH = obsData.length * (BAR_H + BAR_GAP) - BAR_GAP;
  const totalBarsH = SECTION_LABEL_H + intBarAreaH + SEPARATOR_H + SECTION_LABEL_H + obsBarAreaH;
  const gridTopY = chartTop + gridLabelH;

  const gridG = g.append('g');
  for (const pct of [0, 0.25, 0.5, 0.75, 1]) {
    const gx = xScale(pct);
    gridG.append('line')
      .attr('x1', gx).attr('x2', gx)
      .attr('y1', gridTopY).attr('y2', gridTopY + totalBarsH)
      .attr('stroke', '#1E2C44').attr('stroke-width', 1);
    gridG.append('text')
      .attr('x', gx).attr('y', chartTop + gridLabelH - 4)
      .attr('text-anchor', 'middle').attr('font-size', 11)
      .attr('fill', COLORS.textSecondary).attr('font-family', 'DM Mono, monospace')
      .text(`${Math.round(pct * 100)}%`);
  }

  const intBottom = renderGroupSection(
    g, intData, gridTopY, barLeft, xScale, COLORS.intervention, 'Intervention', tooltip
  );

  const sepY = intBottom + Math.round(SEPARATOR_H / 2);
  g.append('line')
    .attr('x1', CARD_PAD).attr('x2', layout.w - CARD_PAD)
    .attr('y1', sepY).attr('y2', sepY)
    .attr('stroke', '#1E2C44').attr('stroke-dasharray', '4 4');

  const obsBottom = renderGroupSection(
    g, obsData, intBottom + SEPARATOR_H, barLeft, xScale, COLORS.observational, 'Observational', tooltip
  );

  const legendY = obsBottom + 18;
  const legendG = g.append('g');
  SEGMENTS.forEach((seg, i) => {
    const lx = barLeft + i * LEGEND_SPACING;
    legendG.append('rect')
      .attr('x', lx).attr('y', legendY)
      .attr('width', LEGEND_SQ).attr('height', LEGEND_SQ)
      .attr('rx', LEGEND_RADIUS).attr('fill', SEGMENT_COLORS[seg]);
    legendG.append('text')
      .attr('x', lx + LEGEND_SQ + 5).attr('y', legendY + LEGEND_SQ - 1)
      .attr('font-size', 12).attr('fill', COLORS.textSecondary)
      .attr('font-family', 'DM Sans, Inter, -apple-system, sans-serif')
      .text(SEGMENT_LABELS[seg]);
  });
}
