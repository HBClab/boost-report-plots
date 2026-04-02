import * as d3 from 'd3';
import {
  COLORS,
  SEGMENTS,
  SEGMENT_LABELS,
  SEGMENT_COLORS,
  type Segment,
} from './constants.js';
import type { DayTypeAggregate, CardLayout } from './types.js';

// ─── Layout constants (from docs/plot-specs/act.md v2.1) ─────────────────────
const LABEL_COL_W = 84;       // px — width of day-type label column
const LABEL_GAP = 12;         // px — gap between label col and bar
const BAR_H = 46;             // px — bar height per row
const BAR_GAP = 20;           // px — gap between bars
const CARD_PAD = 24;          // px — card internal padding
const INLINE_LABEL_MIN = 44;  // px — min segment width to show percentage label
const LEGEND_ITEM_SPACING = 115; // px — between legend items
const LEGEND_SQUARE = 13;     // px — legend swatch size
const LEGEND_RADIUS = 3;      // px — legend swatch corner radius

// ─── Tooltip ─────────────────────────────────────────────────────────────────
function ensureTooltip(): d3.Selection<HTMLDivElement, unknown, HTMLElement, unknown> {
  let tip = d3.select<HTMLDivElement, unknown>('#d3-tooltip');
  if (tip.empty()) {
    tip = d3.select('body')
      .append('div')
      .attr('id', 'd3-tooltip')
      .style('position', 'fixed')
      .style('background', 'rgba(33,33,48,0.92)')
      .style('color', '#fff')
      .style('font', '12px/1.5 Inter, -apple-system, sans-serif')
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

// ─── Main render function ────────────────────────────────────────────────────

export function renderPlot1(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  data: DayTypeAggregate[],
  groupLabel: string,
  layout: CardLayout
): void {
  const tooltip = ensureTooltip();
  const g = svg.append('g').attr('transform', `translate(${layout.x},${layout.y})`);

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
    .attr('font-family', 'Inter, -apple-system, sans-serif')
    .text(`${groupLabel} — 24-Hour Activity Composition`);

  const titleH = 28; // height consumed by title + small gap
  const chartTop = CARD_PAD + titleH;

  // Bar area dimensions
  const barLeft = CARD_PAD + LABEL_COL_W + LABEL_GAP;
  const barRight = layout.w - CARD_PAD;
  const barWidth = barRight - barLeft;

  // Normalize each row to proportions
  const normalized = data.map((d) => {
    const total = SEGMENTS.reduce((s, k) => s + rawMin(d, k), 0);
    const props: Record<Segment, number> = {} as Record<Segment, number>;
    for (const k of SEGMENTS) {
      props[k] = total > 0 ? rawMin(d, k) / total : 0;
    }
    return { day_type: d.day_type, props, raw: d };
  });

  // X scale: 0–1 → barLeft–barRight
  const xScale = d3.scaleLinear([0, 1], [barLeft, barRight]);

  // Gridlines at 0%, 25%, 50%, 75%, 100%
  const gridG = g.append('g').attr('class', 'gridlines');
  for (const pct of [0, 0.25, 0.5, 0.75, 1]) {
    const gx = xScale(pct);
    const gridHeight = normalized.length * (BAR_H + BAR_GAP) - BAR_GAP;
    gridG.append('line')
      .attr('x1', gx).attr('x2', gx)
      .attr('y1', chartTop).attr('y2', chartTop + gridHeight)
      .attr('stroke', COLORS.missing)
      .attr('stroke-width', 1);
    gridG.append('text')
      .attr('x', gx)
      .attr('y', chartTop - 6)
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .attr('fill', COLORS.textSecondary)
      .attr('font-family', 'Inter, -apple-system, sans-serif')
      .text(`${Math.round(pct * 100)}%`);
  }

  // Bars
  normalized.forEach((row, i) => {
    const rowY = chartTop + i * (BAR_H + BAR_GAP);

    // Y-axis label
    g.append('text')
      .attr('x', CARD_PAD + LABEL_COL_W)
      .attr('y', rowY + BAR_H / 2 + 4)
      .attr('text-anchor', 'end')
      .attr('font-size', 13)
      .attr('font-weight', 500)
      .attr('fill', COLORS.textPrimary)
      .attr('font-family', 'Inter, -apple-system, sans-serif')
      .text(row.day_type);

    // Stacked segments
    let cumulative = 0;
    SEGMENTS.forEach((seg, si) => {
      const prop = row.props[seg];
      const segX = xScale(cumulative);
      const segW = xScale(cumulative + prop) - segX;

      // Segment rect
      const rect = g.append('rect')
        .attr('x', segX)
        .attr('y', rowY)
        .attr('width', segW)
        .attr('height', BAR_H)
        .attr('fill', SEGMENT_COLORS[seg]);

      // White divider (except after last segment)
      if (si < SEGMENTS.length - 1 && segW > 0) {
        g.append('line')
          .attr('x1', segX + segW).attr('x2', segX + segW)
          .attr('y1', rowY).attr('y2', rowY + BAR_H)
          .attr('stroke', '#fff')
          .attr('stroke-width', 2);
      }

      // Inline percentage label
      if (segW > INLINE_LABEL_MIN) {
        g.append('text')
          .attr('x', segX + segW / 2)
          .attr('y', rowY + BAR_H / 2 + 4)
          .attr('text-anchor', 'middle')
          .attr('font-size', 11)
          .attr('font-weight', 600)
          .attr('fill', '#fff')
          .attr('font-family', 'Inter, -apple-system, sans-serif')
          .text(`${Math.round(prop * 100)}%`);
      }

      // Tooltip
      const rawMinutes = Math.round(rawMin(row.raw, seg));
      const pctStr = `${(prop * 100).toFixed(1)}%`;
      rect
        .on('mouseover', function (event: MouseEvent) {
          tooltip
            .html(`<strong>${SEGMENT_LABELS[seg]}</strong><br>${rawMinutes} min (${pctStr})`)
            .style('opacity', '1')
            .style('left', `${event.clientX + 12}px`)
            .style('top', `${event.clientY - 8}px`);
        })
        .on('mousemove', function (event: MouseEvent) {
          tooltip
            .style('left', `${event.clientX + 12}px`)
            .style('top', `${event.clientY - 8}px`);
        })
        .on('mouseout', function () {
          tooltip.style('opacity', '0');
        });

      cumulative += prop;
    });
  });

  // Legend
  const legendY = chartTop + normalized.length * (BAR_H + BAR_GAP) + 8;
  const legendG = g.append('g').attr('class', 'legend');

  SEGMENTS.forEach((seg, i) => {
    const lx = barLeft + i * LEGEND_ITEM_SPACING;

    legendG.append('rect')
      .attr('x', lx)
      .attr('y', legendY)
      .attr('width', LEGEND_SQUARE)
      .attr('height', LEGEND_SQUARE)
      .attr('rx', LEGEND_RADIUS)
      .attr('fill', SEGMENT_COLORS[seg]);

    legendG.append('text')
      .attr('x', lx + LEGEND_SQUARE + 5)
      .attr('y', legendY + LEGEND_SQUARE - 1)
      .attr('font-size', 12)
      .attr('fill', COLORS.textSecondary)
      .attr('font-family', 'Inter, -apple-system, sans-serif')
      .text(SEGMENT_LABELS[seg]);
  });

  // CI footnote
  const footnoteY = legendY + LEGEND_SQUARE + 16;
  g.append('text')
    .attr('x', barLeft)
    .attr('y', footnoteY)
    .attr('font-size', 10)
    .attr('fill', COLORS.textSecondary)
    .attr('font-family', 'Inter, -apple-system, sans-serif')
    .text('CI/error bands available in interactive D3 version');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rawMin(d: DayTypeAggregate, seg: Segment): number {
  const map: Record<Segment, keyof DayTypeAggregate> = {
    sleep: 'sleep_min',
    sed: 'sed_min',
    light: 'light_min',
    mod: 'mod_min',
    vig: 'vig_min',
  };
  return d[map[seg]] as number;
}
