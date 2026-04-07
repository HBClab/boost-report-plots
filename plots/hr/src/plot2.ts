import * as d3 from 'd3';

import type {
  AlignedSubjectRosterEntry,
  CardLayout,
  HeatmapStatus,
  GroupName,
  WeeklyGroupAdherenceSummary,
  WeeklySubjectAdherenceSummary
} from './types.js';

const COLORS = {
  supervised: '#3378de',
  unsupervised: '#f5802e',
  met: '#3bbd8c',
  notMet: '#f04545',
  noData: '#e5e5ed',
  card: '#ffffff',
  textPrimary: '#1a1a26',
  textSecondary: '#80808f',
  grid: '#e5e5ed'
};

function summaryFor(
  summaries: WeeklySubjectAdherenceSummary[],
  group: GroupName,
  subject: string,
  week: number
): WeeklySubjectAdherenceSummary | undefined {
  return summaries.find(
    (summary) => summary.group === group && summary.subject === subject && summary.week === week
  );
}

export function getHeatmapCardHeight(rosterSize: number): number {
  const topPadding = 78;
  const bottomPadding = 48;
  const minCellHeight = 18;
  const minGap = 2;
  const legendHeight = 24;
  const bodyHeight = rosterSize * (minCellHeight + minGap);
  return topPadding + bodyHeight + legendHeight + bottomPadding;
}

export function renderAdherenceTrend(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  adherenceSummaries: WeeklyGroupAdherenceSummary[],
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

  const margins = { top: 60, right: 20, bottom: 28, left: 70 };
  const innerWidth = layout.width - margins.left - margins.right;
  const innerHeight = layout.height - margins.top - margins.bottom;
  const lineHeight = innerHeight;

  card
    .append('text')
    .attr('x', margins.left)
    .attr('y', 24)
    .attr('fill', COLORS.textPrimary)
    .attr('font-size', 14)
    .attr('font-weight', 700)
    .text('bounded_met Adherence Rate Over Weeks');

  card
    .append('text')
    .attr('x', margins.left)
    .attr('y', 42)
    .attr('fill', COLORS.textSecondary)
    .attr('font-size', 10)
    .text('Weekly session adherence with ±1 SD subject-level variability');

  const lineChart = card.append('g').attr('transform', `translate(${margins.left}, ${margins.top})`);
  const x = d3.scalePoint<number>().domain([1, 2, 3, 4, 5, 6]).range([0, innerWidth]).padding(0.1);
  const y = d3.scaleLinear().domain([0, 1]).range([lineHeight, 0]);

  lineChart
    .selectAll('line.grid')
    .data([0, 0.25, 0.5, 0.75, 1])
    .enter()
    .append('line')
    .attr('x1', 0)
    .attr('x2', innerWidth)
    .attr('y1', (value: number) => y(value))
    .attr('y2', (value: number) => y(value))
    .attr('stroke', COLORS.grid);

  lineChart
    .selectAll('text.y-tick')
    .data([0, 0.25, 0.5, 0.75, 1])
    .enter()
    .append('text')
    .attr('x', -8)
    .attr('y', (value: number) => y(value) + 3)
    .attr('text-anchor', 'end')
    .attr('font-size', 9)
    .attr('fill', COLORS.textSecondary)
    .text((value: number) => `${Math.round(value * 100)}%`);

  const area = d3
    .area<WeeklyGroupAdherenceSummary>()
    .defined((entry: WeeklyGroupAdherenceSummary) => entry.lowerBound != null && entry.upperBound != null)
    .x((entry: WeeklyGroupAdherenceSummary) => x(entry.week) ?? 0)
    .y0((entry: WeeklyGroupAdherenceSummary) => y(entry.lowerBound ?? 0))
    .y1((entry: WeeklyGroupAdherenceSummary) => y(entry.upperBound ?? 0));
  const line = d3
    .line<WeeklyGroupAdherenceSummary>()
    .defined((entry: WeeklyGroupAdherenceSummary) => entry.adherenceRate != null)
    .x((entry: WeeklyGroupAdherenceSummary) => x(entry.week) ?? 0)
    .y((entry: WeeklyGroupAdherenceSummary) => y(entry.adherenceRate ?? 0));

  (['Supervised', 'Unsupervised'] as GroupName[]).forEach((group) => {
    const groupSummaries = adherenceSummaries.filter((entry) => entry.group === group);
    const color = group === 'Supervised' ? COLORS.supervised : COLORS.unsupervised;
    lineChart
      .append('path')
      .datum(groupSummaries)
      .attr('fill', color)
      .attr('opacity', 0.15)
      .attr('d', area);

    lineChart
      .append('path')
      .datum(groupSummaries)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 2.5)
      .attr('d', line);

    lineChart
      .selectAll(`circle.${group}`)
      .data(groupSummaries.filter((entry) => entry.adherenceRate != null))
      .enter()
      .append('circle')
      .attr('cx', (entry: WeeklyGroupAdherenceSummary) => x(entry.week) ?? 0)
      .attr('cy', (entry: WeeklyGroupAdherenceSummary) => y(entry.adherenceRate ?? 0))
      .attr('r', 5)
      .attr('fill', color);
  });

  lineChart
    .selectAll('text.x-tick')
    .data([1, 2, 3, 4, 5, 6])
    .enter()
    .append('text')
    .attr('x', (week: number) => x(week) ?? 0)
    .attr('y', lineHeight + 18)
    .attr('text-anchor', 'middle')
      .attr('font-size', 9)
      .attr('fill', COLORS.textSecondary)
      .text((week: number) => `Wk ${week}`);
  const legend = card.append('g').attr('transform', `translate(${layout.width - 120}, 20)`);
  [
    { label: 'Supervised', color: COLORS.supervised },
    { label: 'Unsupervised', color: COLORS.unsupervised }
  ].forEach((item, index) => {
    const g = legend.append('g').attr('transform', `translate(0, ${index * 18})`);
    g.append('rect').attr('width', 10).attr('height', 10).attr('rx', 2).attr('fill', item.color);
    g.append('text')
      .attr('x', 16)
      .attr('y', 9)
      .attr('font-size', 9)
      .attr('fill', COLORS.textSecondary)
      .text(item.label);
  });
}

export function renderHeatmapCard(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  subjectSummaries: WeeklySubjectAdherenceSummary[],
  roster: AlignedSubjectRosterEntry[],
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

  const margins = { top: 72, right: 36, bottom: 44, left: 120 };
  const labelWidth = 76;
  const gutter = 40;
  const innerWidth = layout.width - margins.left - margins.right;
  const topY = margins.top;
  const rowGap = 2;
  const availableBodyHeight = layout.height - margins.top - margins.bottom - 24;
  const cellHeight = Math.max(16, Math.floor((availableBodyHeight - rowGap * Math.max(roster.length - 1, 0)) / Math.max(roster.length, 1)));
  const panelWidth = (innerWidth - labelWidth - gutter) / 2;
  const cellWidth = (panelWidth - 10) / 6;
  const panelX = {
    Supervised: labelWidth,
    Unsupervised: labelWidth + panelWidth + gutter
  };
  const statusColor: Record<HeatmapStatus, string> = {
    met: COLORS.met,
    not_met: COLORS.notMet,
    no_data: COLORS.noData
  };

  card
    .append('text')
    .attr('x', margins.left)
    .attr('y', 26)
    .attr('fill', COLORS.textPrimary)
    .attr('font-size', 14)
    .attr('font-weight', 700)
    .text('Individual Weekly Adherence Heatmaps');

  card
    .append('text')
    .attr('x', margins.left)
    .attr('y', 44)
    .attr('fill', COLORS.textSecondary)
    .attr('font-size', 10)
    .text('50% weekly threshold · shared subject roster · no-data cells preserved');

  const heatmap = card.append('g').attr('transform', `translate(${margins.left}, ${topY})`);

  (['Supervised', 'Unsupervised'] as GroupName[]).forEach((group) => {
    const x0 = panelX[group];
    heatmap
      .append('text')
      .attr('x', x0)
      .attr('y', -10)
      .attr('font-size', 10)
      .attr('font-weight', 700)
      .attr('fill', group === 'Supervised' ? COLORS.supervised : COLORS.unsupervised)
      .text(group);

    [1, 2, 3, 4, 5, 6].forEach((week, index) => {
      heatmap
        .append('text')
        .attr('x', x0 + index * cellWidth + cellWidth / 2)
        .attr('y', 8)
        .attr('text-anchor', 'middle')
        .attr('font-size', 9)
        .attr('fill', COLORS.textSecondary)
        .text(`W${week}`);
    });
  });

  roster.forEach((entry, rowIndex) => {
    const y0 = 18 + rowIndex * (cellHeight + rowGap);
    heatmap
      .append('text')
      .attr('x', labelWidth - 8)
      .attr('y', y0 + cellHeight / 2 + 3)
      .attr('text-anchor', 'end')
      .attr('font-size', Math.max(8, Math.min(10, cellHeight * 0.55)))
      .attr('fill', COLORS.textSecondary)
      .text(entry.subject);

    (['Supervised', 'Unsupervised'] as GroupName[]).forEach((group) => {
      [1, 2, 3, 4, 5, 6].forEach((week, index) => {
        const summary = summaryFor(subjectSummaries, group, entry.subject, week);
        const status = summary?.status ?? 'no_data';
        heatmap
          .append('rect')
          .attr('x', panelX[group] + index * cellWidth)
          .attr('y', y0)
          .attr('width', Math.max(12, cellWidth - 2))
          .attr('height', cellHeight)
          .attr('rx', 2)
          .attr('fill', statusColor[status]);
      });
    });
  });

  const legendY = 24 + roster.length * (cellHeight + rowGap);
  [
    { label: 'Met', color: COLORS.met },
    { label: 'Not Met', color: COLORS.notMet },
    { label: 'No Data', color: COLORS.noData }
  ].forEach((item, index) => {
    const g = heatmap.append('g').attr('transform', `translate(${index * 96}, ${legendY})`);
    g.append('rect').attr('width', 12).attr('height', 12).attr('rx', 2).attr('fill', item.color);
    g.append('text')
      .attr('x', 18)
      .attr('y', 10)
      .attr('font-size', 10)
      .attr('fill', COLORS.textSecondary)
      .text(item.label);
  });
}
