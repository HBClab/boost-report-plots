// HR Plot 1 — Zone Time Allocation (dark-themed)
// Adapted from plots/hr/src/plot1.ts
import * as d3 from 'd3';
import type { CardLayout } from './types.js';
import type { HrGroupName, HrWeeklyGroupZoneSummary } from './hr-types.js';

// ─── Dark palette (matches ACT dashboard) ────────────────────────────────────
const C = {
  supervised:    '#4F94EF',   // bright blue
  unsupervised:  '#FB923C',   // orange — matches ACT observational
  below:         '#7BA8EA',   // muted blue
  inZone:        '#34D399',   // bright green
  above:         '#F87171',   // bright red
  noData:        '#161F2F',   // near-black navy
  card:          '#131C2E',
  textPrimary:   '#DDE4EF',
  textSecondary: '#6B7A90',
  grid:          '#1E2C44',
  font:          'DM Sans, Inter, -apple-system, sans-serif',
  fontMono:      'DM Mono, monospace',
} as const;

const GROUP_STYLE: Record<HrGroupName, { stroke: string; label: string }> = {
  Supervised:   { stroke: C.supervised,   label: 'Supervised' },
  Unsupervised: { stroke: C.unsupervised, label: 'Unsupervised' },
};

const SEGMENTS = [
  { key: 'meanBelowS',  label: 'Below Zone', color: C.below  },
  { key: 'meanInZoneS', label: 'In Zone',    color: C.inZone },
  { key: 'meanAboveS',  label: 'Above Zone', color: C.above  },
] as const;

// ─── Tooltip ─────────────────────────────────────────────────────────────────
function ensureTooltip(): d3.Selection<HTMLDivElement, unknown, HTMLElement, unknown> {
  let tip = d3.select<HTMLDivElement, unknown>('#d3-tooltip');
  if (tip.empty()) {
    tip = d3.select('body').append('div').attr('id', 'd3-tooltip')
      .style('position', 'fixed').style('background', 'rgba(13,17,23,0.95)')
      .style('color', '#DDE4EF').style('font', `12.5px/1.6 ${C.font}`)
      .style('padding', '8px 12px').style('border-radius', '6px')
      .style('border', '1px solid #1E2C44').style('pointer-events', 'none')
      .style('opacity', '0').style('transition', 'opacity 0.1s')
      .style('z-index', '9999').style('max-width', '220px');
  }
  return tip;
}

// ─── Renderer ────────────────────────────────────────────────────────────────
export function renderHrPlot1(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  data: HrWeeklyGroupZoneSummary[],
  layout: CardLayout
): void {
  const tooltip = ensureTooltip();

  svg.selectAll('[data-plot="hr1"]').remove();
  const card = svg.append('g')
    .attr('data-plot', 'hr1')
    .attr('transform', `translate(${layout.x},${layout.y})`);

  card.append('rect')
    .attr('width', layout.w).attr('height', layout.h)
    .attr('rx', 12).attr('fill', C.card);

  const margins = { top: 62, right: 24, bottom: 80, left: 72 };
  const chartW = layout.w - margins.left - margins.right;
  const chartH = layout.h - margins.top - margins.bottom;

  // Title
  card.append('text').attr('x', margins.left).attr('y', 26)
    .attr('fill', C.textPrimary).attr('font-size', 14).attr('font-weight', 600)
    .attr('font-family', C.font).attr('letter-spacing', '-0.01em')
    .text('Zone Time Allocation by Group & Week');
  card.append('text').attr('x', margins.left).attr('y', 44)
    .attr('fill', C.textSecondary).attr('font-size', 11).attr('font-family', C.font)
    .text('Mean seconds per session · Supervised vs Unsupervised');

  const plot = card.append('g').attr('transform', `translate(${margins.left},${margins.top})`);

  const weeks = [1, 2, 3, 4, 5, 6];
  const outer = d3.scaleBand<number>().domain(weeks).range([0, chartW]).paddingInner(0.22).paddingOuter(0.1);
  const inner = d3.scaleBand<HrGroupName>().domain(['Supervised', 'Unsupervised']).range([0, outer.bandwidth()]).paddingInner(0.1);

  const maxTotal = d3.max(data.map((d) => (d.meanBelowS ?? 0) + (d.meanInZoneS ?? 0) + (d.meanAboveS ?? 0))) ?? 2400;
  const yMax = Math.max(2400, Math.ceil(maxTotal / 200) * 200);
  const y = d3.scaleLinear().domain([0, yMax]).range([chartH, 0]).nice();
  const yTicks = y.ticks(5);

  // Gridlines + y-axis labels
  plot.selectAll('line.grid').data(yTicks).enter().append('line')
    .attr('x1', 0).attr('x2', chartW)
    .attr('y1', (v: number) => y(v)).attr('y2', (v: number) => y(v))
    .attr('stroke', C.grid).attr('stroke-width', 1);
  plot.selectAll('text.y-tick').data(yTicks).enter().append('text')
    .attr('x', -8).attr('y', (v: number) => y(v) + 4)
    .attr('text-anchor', 'end').attr('font-size', 10)
    .attr('fill', C.textSecondary).attr('font-family', C.fontMono)
    .text((v: number) => String(v));

  // Y-axis label
  card.append('text')
    .attr('transform', `translate(16,${layout.h / 2 + 20}) rotate(-90)`)
    .attr('font-size', 10).attr('fill', C.textSecondary).attr('font-family', C.font)
    .attr('text-anchor', 'middle')
    .text('Seconds');

  // Bars
  for (const week of weeks) {
    const cluster = plot.append('g').attr('transform', `translate(${outer(week) ?? 0},0)`);

    for (const group of (['Supervised', 'Unsupervised'] as HrGroupName[])) {
      const summary = data.find((d) => d.week === week && d.group === group);
      const bx = inner(group) ?? 0;
      const bw = inner.bandwidth();
      const gs = GROUP_STYLE[group];

      if (!summary || summary.sessionCount === 0 || summary.meanBelowS == null) {
        cluster.append('rect')
          .attr('x', bx).attr('y', 0)
          .attr('width', bw).attr('height', chartH)
          .attr('fill', C.noData).attr('stroke', gs.stroke)
          .attr('stroke-width', 1.5).attr('opacity', 0.4).attr('rx', 2);
      } else {
        let runningTop = 0;
        for (const seg of SEGMENTS) {
          const val = summary[seg.key];
          if (val == null) continue;
          const y0 = y(runningTop + val);
          const y1 = y(runningTop);
          const rectH = Math.max(0, y1 - y0);

          const rect = cluster.append('rect')
            .attr('x', bx).attr('y', y0)
            .attr('width', bw).attr('height', rectH)
            .attr('fill', seg.color)
            .attr('stroke', C.card).attr('stroke-width', 0.5);

          const total = summary.meanBelowS! + summary.meanInZoneS! + summary.meanAboveS!;
          const pct = (val / total) * 100;
          rect
            .on('mouseover', (event: MouseEvent) => {
              tooltip.html(
                `<strong style="color:${gs.stroke}">${group}</strong> · Wk ${week}<br>` +
                `<span style="color:${seg.color}">${seg.label}</span><br>` +
                `${val.toFixed(0)} sec &nbsp;<span style="color:#6B7A90">(${pct.toFixed(1)}%)</span>`
              ).style('opacity', '1')
                .style('left', `${event.clientX + 14}px`)
                .style('top', `${event.clientY - 10}px`);
            })
            .on('mousemove', (event: MouseEvent) => {
              tooltip.style('left', `${event.clientX + 14}px`).style('top', `${event.clientY - 10}px`);
            })
            .on('mouseout', () => tooltip.style('opacity', '0'));

          if (rectH > 20) {
            cluster.append('text')
              .attr('x', bx + bw / 2).attr('y', y0 + rectH / 2 + 4)
              .attr('fill', '#fff').attr('font-size', 9).attr('font-weight', 700)
              .attr('text-anchor', 'middle').attr('font-family', C.font)
              .attr('pointer-events', 'none')
              .text(`${pct.toFixed(0)}%`);
          }
          runningTop += val;
        }
        // Outline rect over bar
        cluster.append('rect')
          .attr('x', bx)
          .attr('y', y(summary.meanBelowS + summary.meanInZoneS! + summary.meanAboveS!))
          .attr('width', bw)
          .attr('height', chartH - y(summary.meanBelowS + summary.meanInZoneS! + summary.meanAboveS!))
          .attr('fill', 'none').attr('stroke', gs.stroke).attr('stroke-width', 2)
          .attr('rx', 2).attr('pointer-events', 'none');
      }

      // Group label below bar
      cluster.append('text')
        .attr('x', bx + bw / 2).attr('y', chartH + 28)
        .attr('text-anchor', 'middle').attr('font-size', 9).attr('font-weight', 600)
        .attr('fill', gs.stroke).attr('font-family', C.font)
        .text(gs.label.slice(0, 3).toUpperCase());
    }

    // Week label
    plot.append('text')
      .attr('x', (outer(week) ?? 0) + outer.bandwidth() / 2)
      .attr('y', chartH + 14)
      .attr('text-anchor', 'middle').attr('font-size', 10)
      .attr('fill', C.textSecondary).attr('font-family', C.fontMono)
      .text(`Wk ${week}`);
  }

  // Legend
  const legendItems = [
    { label: 'In Zone',    color: C.inZone },
    { label: 'Below Zone', color: C.below },
    { label: 'Above Zone', color: C.above },
    { label: 'Supervised',   color: C.supervised },
    { label: 'Unsupervised', color: C.unsupervised },
  ];
  const legendG = card.append('g').attr('transform', `translate(${margins.left},${layout.h - 24})`);
  legendItems.forEach((item, i) => {
    const g = legendG.append('g').attr('transform', `translate(${i * 96},0)`);
    g.append('rect').attr('width', 10).attr('height', 10).attr('rx', 2).attr('fill', item.color);
    g.append('text').attr('x', 15).attr('y', 9).attr('font-size', 11)
      .attr('fill', C.textSecondary).attr('font-family', C.font).text(item.label);
  });
}
