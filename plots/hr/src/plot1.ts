import * as d3 from 'd3';

import type { CardLayout, GroupName, WeeklyGroupZoneSummary } from './types.js';

const COLORS = {
  supervised: '#3378de',
  unsupervised: '#f5802e',
  below: '#8cb8f5',
  inZone: '#3bbd8c',
  above: '#f04545',
  card: '#ffffff',
  textPrimary: '#1a1a26',
  textSecondary: '#80808f',
  grid: '#e5e5ed',
  shadow: 'rgba(0,0,0,0.07)',
  noData: '#e5e5ed'
};

const GROUP_STYLES: Record<GroupName, { stroke: string; label: string }> = {
  Supervised: { stroke: COLORS.supervised, label: 'Sup' },
  Unsupervised: { stroke: COLORS.unsupervised, label: 'Unsup' }
};

const SEGMENTS = [
  { key: 'meanBelowS', label: 'Below', color: COLORS.below },
  { key: 'meanInZoneS', label: 'In Zone', color: COLORS.inZone },
  { key: 'meanAboveS', label: 'Above', color: COLORS.above }
] as const;

function showTooltip(event: MouseEvent, html: string): void {
  const tooltip = document.getElementById('tooltip');
  if (!tooltip) {
    return;
  }
  tooltip.innerHTML = html;
  tooltip.hidden = false;
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}

function hideTooltip(): void {
  const tooltip = document.getElementById('tooltip');
  if (tooltip) {
    tooltip.hidden = true;
  }
}

export function renderPlot1(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  data: WeeklyGroupZoneSummary[],
  layout: CardLayout
): void {
  const card = svg.append('g').attr('transform', `translate(${layout.x}, ${layout.y})`);
  card
    .append('rect')
    .attr('width', layout.width)
    .attr('height', layout.height)
    .attr('rx', 12)
    .attr('fill', COLORS.card)
    .style('filter', 'drop-shadow(0 2px 16px rgba(0,0,0,0.07))');

  const margins = { top: 60, right: 20, bottom: 84, left: 80 };
  const chartWidth = layout.width - margins.left - margins.right;
  const chartHeight = layout.height - margins.top - margins.bottom;

  card
    .append('text')
    .attr('x', margins.left)
    .attr('y', 24)
    .attr('fill', COLORS.textPrimary)
    .attr('font-size', 14)
    .attr('font-weight', 700)
    .text('Zone Time Allocation by Group & Week');

  card
    .append('text')
    .attr('x', margins.left)
    .attr('y', 42)
    .attr('fill', COLORS.textSecondary)
    .attr('font-size', 10)
    .text('Mean seconds per session · Supervised vs Unsupervised');

  const plot = card.append('g').attr('transform', `translate(${margins.left}, ${margins.top})`);

  const weeks = [1, 2, 3, 4, 5, 6];
  const outer = d3.scaleBand<number>().domain(weeks).range([0, chartWidth]).paddingInner(0.2).paddingOuter(0.1);
  const inner = d3
    .scaleBand<GroupName>()
    .domain(['Supervised', 'Unsupervised'])
    .range([0, outer.bandwidth()])
    .paddingInner(0.1);
  const maxStackedTotal = d3.max(
    data.map((summary) => (summary.meanBelowS ?? 0) + (summary.meanInZoneS ?? 0) + (summary.meanAboveS ?? 0))
  ) ?? 2401;
  const yMax = Math.max(2401, Math.ceil(maxStackedTotal / 200) * 200);
  const y = d3.scaleLinear().domain([0, yMax]).range([chartHeight, 0]).nice();
  const yTicks = y.ticks(5);

  plot
    .selectAll('line.grid')
    .data(yTicks)
    .enter()
    .append('line')
    .attr('class', 'grid')
    .attr('x1', 0)
    .attr('x2', chartWidth)
    .attr('y1', (value: number) => y(value))
    .attr('y2', (value: number) => y(value))
    .attr('stroke', COLORS.grid);

  plot
    .selectAll('text.y-tick')
    .data(yTicks)
    .enter()
    .append('text')
    .attr('x', -6)
    .attr('y', (value: number) => y(value) + 3)
    .attr('text-anchor', 'end')
    .attr('font-size', 9)
    .attr('fill', COLORS.textSecondary)
    .text((value: number) => `${value}`);

  card
    .append('text')
    .attr('transform', `translate(18, ${layout.height / 2 + 22}) rotate(-90)`)
    .attr('font-size', 9)
    .attr('fill', COLORS.textSecondary)
    .text('Seconds');

  for (const week of weeks) {
    const cluster = plot
      .append('g')
      .attr('transform', `translate(${outer(week) ?? 0}, 0)`);

    for (const group of inner.domain()) {
      const summary = data.find((entry) => entry.week === week && entry.group === group);
      const x = inner(group) ?? 0;
      const width = inner.bandwidth();
      const groupStyle = GROUP_STYLES[group];

      if (!summary || summary.sessionCount === 0 || summary.meanBelowS == null || summary.meanInZoneS == null || summary.meanAboveS == null) {
        cluster
          .append('rect')
          .attr('x', x)
          .attr('y', y(yMax))
          .attr('width', width)
          .attr('height', chartHeight - y(yMax))
          .attr('fill', COLORS.noData)
          .attr('stroke', groupStyle.stroke)
          .attr('stroke-width', 1.5)
          .attr('opacity', 0.5);
      } else {
        let runningTop = 0;
        for (const segment of SEGMENTS) {
          const value = summary[segment.key];
          if (value == null) {
            continue;
          }
          const y0 = y(runningTop + value);
          const y1 = y(runningTop);
          const rect = cluster
            .append('rect')
            .attr('x', x)
            .attr('y', y0)
            .attr('width', width)
            .attr('height', Math.max(0, y1 - y0))
            .attr('fill', segment.color)
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 1);

          rect
            .on('mousemove', (event: MouseEvent) => {
              const pct = (value / (summary.meanBelowS! + summary.meanInZoneS! + summary.meanAboveS!)) * 100;
              showTooltip(
                event,
                `<strong>${group}</strong><br />Wk ${week} · ${segment.label}<br />${value.toFixed(1)} sec (${pct.toFixed(1)}%)`
              );
            })
            .on('mouseout', hideTooltip);

          const rectHeight = y1 - y0;
          if (rectHeight > 22) {
            const pct = (value / (summary.meanBelowS + summary.meanInZoneS + summary.meanAboveS)) * 100;
            cluster
              .append('text')
              .attr('x', x + width / 2)
              .attr('y', y0 + rectHeight / 2 + 4)
              .attr('fill', '#ffffff')
              .attr('font-size', 8)
              .attr('font-weight', 700)
              .attr('text-anchor', 'middle')
              .text(`${pct.toFixed(0)}%`);
          }
          runningTop += value;
        }

        cluster
          .append('rect')
          .attr('x', x)
          .attr('y', y(summary.meanBelowS + summary.meanInZoneS + summary.meanAboveS))
          .attr('width', width)
          .attr('height', chartHeight - y(summary.meanBelowS + summary.meanInZoneS + summary.meanAboveS))
          .attr('fill', 'none')
          .attr('stroke', groupStyle.stroke)
          .attr('stroke-width', 2)
          .attr('pointer-events', 'none');
      }

      cluster
        .append('text')
        .attr('x', x + width / 2)
        .attr('y', chartHeight + 34)
        .attr('text-anchor', 'middle')
        .attr('font-size', 8)
        .attr('font-weight', 700)
        .attr('fill', groupStyle.stroke)
        .text(groupStyle.label);
    }

    plot
      .append('text')
      .attr('x', (outer(week) ?? 0) + outer.bandwidth() / 2)
      .attr('y', chartHeight + 18)
      .attr('text-anchor', 'middle')
      .attr('font-size', 9)
      .attr('fill', COLORS.textSecondary)
      .text(`Wk ${week}`);
  }

  const legend = card
    .append('g')
    .attr('transform', `translate(${margins.left}, ${layout.height - 28})`);
  const legendItems = [
    { label: 'In Zone', color: COLORS.inZone },
    { label: 'Above', color: COLORS.above },
    { label: 'Below', color: COLORS.below },
    { label: 'Supervised', color: COLORS.supervised },
    { label: 'Unsupervised', color: COLORS.unsupervised }
  ];
  legendItems.forEach((item, index) => {
    const g = legend.append('g').attr('transform', `translate(${index * 90}, 0)`);
    g.append('rect').attr('width', 10).attr('height', 10).attr('rx', 2).attr('fill', item.color);
    g.append('text')
      .attr('x', 16)
      .attr('y', 9)
      .attr('font-size', 9)
      .attr('fill', COLORS.textSecondary)
      .text(item.label);
  });
}
