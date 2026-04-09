import * as d3 from 'd3';

import type {
  AlignedSubjectRosterEntry,
  CardLayout,
  HeatmapStatus,
  GroupName,
  WeeklyGroupIntensitySummary,
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

function showTooltip(event: MouseEvent, html: string): void {
  const tooltip = document.getElementById('tooltip');
  if (!tooltip) return;
  tooltip.innerHTML = html;
  tooltip.hidden = false;
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}

function hideTooltip(): void {
  const tooltip = document.getElementById('tooltip');
  if (tooltip) tooltip.hidden = true;
}

function summaryFor(
  summaries: WeeklySubjectAdherenceSummary[],
  group: GroupName,
  subject: string,
  week: number
): WeeklySubjectAdherenceSummary | undefined {
  return summaries.find(
    (s) => s.group === group && s.subject === subject && s.week === week
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

export function renderIntensityTrend(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  trimpSummaries: WeeklyGroupIntensitySummary[],
  hrMaxSummaries: WeeklyGroupIntensitySummary[],
  layout: CardLayout
): void {
  type TrendView = 'trimp' | 'hrmax';

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

  // --- Toggle buttons ---
  const btnW = 74;
  const btnH = 26;
  const btnGap = 4;
  const containerPad = 3;
  const containerW = btnW * 2 + btnGap + containerPad * 2;
  const containerH = btnH + containerPad * 2;
  const toggleX = layout.width - 20 - containerW;

  const toggleG = card.append('g').attr('transform', `translate(${toggleX}, 14)`);
  toggleG
    .append('rect')
    .attr('width', containerW)
    .attr('height', containerH)
    .attr('rx', containerH / 2)
    .attr('fill', '#f0f0f5');

  const trimpBtnG = toggleG
    .append('g')
    .attr('transform', `translate(${containerPad}, ${containerPad})`)
    .style('cursor', 'pointer');
  const trimpBtnRect = trimpBtnG
    .append('rect')
    .attr('width', btnW)
    .attr('height', btnH)
    .attr('rx', btnH / 2)
    .attr('fill', COLORS.supervised);
  const trimpBtnText = trimpBtnG
    .append('text')
    .attr('x', btnW / 2)
    .attr('y', btnH / 2 + 4)
    .attr('text-anchor', 'middle')
    .attr('font-size', 10)
    .attr('font-weight', 600)
    .attr('fill', '#ffffff')
    .attr('pointer-events', 'none')
    .text('TRIMP');

  const hrMaxBtnG = toggleG
    .append('g')
    .attr('transform', `translate(${containerPad + btnW + btnGap}, ${containerPad})`)
    .style('cursor', 'pointer');
  const hrMaxBtnRect = hrMaxBtnG
    .append('rect')
    .attr('width', btnW)
    .attr('height', btnH)
    .attr('rx', btnH / 2)
    .attr('fill', 'transparent');
  const hrMaxBtnText = hrMaxBtnG
    .append('text')
    .attr('x', btnW / 2)
    .attr('y', btnH / 2 + 4)
    .attr('text-anchor', 'middle')
    .attr('font-size', 10)
    .attr('font-weight', 600)
    .attr('fill', COLORS.textSecondary)
    .attr('pointer-events', 'none')
    .text('% HR Max');

  // --- Title blocks (one per view, toggled) ---
  const trimpTitleG = card.append('g');
  trimpTitleG
    .append('text')
    .attr('x', margins.left)
    .attr('y', 24)
    .attr('fill', COLORS.textPrimary)
    .attr('font-size', 14)
    .attr('font-weight', 700)
    .text('Weekly TRIMP by Group');
  trimpTitleG
    .append('text')
    .attr('x', margins.left)
    .attr('y', 42)
    .attr('fill', COLORS.textSecondary)
    .attr('font-size', 10)
    .text('Subject-level weekly mean per session · shaded band = ±1 SD');

  const hrMaxTitleG = card.append('g');
  hrMaxTitleG
    .append('text')
    .attr('x', margins.left)
    .attr('y', 24)
    .attr('fill', COLORS.textPrimary)
    .attr('font-size', 14)
    .attr('font-weight', 700)
    .text('Weekly % HR Max by Group');
  hrMaxTitleG
    .append('text')
    .attr('x', margins.left)
    .attr('y', 42)
    .attr('fill', COLORS.textSecondary)
    .attr('font-size', 10)
    .text('Subject-level weekly mean per session · shaded band = ±1 SD');

  // --- Shared legend (top-right of chart body) ---
  const legendG = card
    .append('g')
    .attr('transform', `translate(${margins.left + innerWidth - 100}, ${margins.top + 6})`);
  ([
    { label: 'Supervised', color: COLORS.supervised },
    { label: 'Unsupervised', color: COLORS.unsupervised }
  ] as const).forEach((item, i) => {
    const g = legendG.append('g').attr('transform', `translate(0, ${i * 18})`);
    g.append('rect').attr('width', 10).attr('height', 10).attr('rx', 2).attr('fill', item.color);
    g.append('text')
      .attr('x', 14)
      .attr('y', 9)
      .attr('font-size', 9)
      .attr('fill', COLORS.textSecondary)
      .text(item.label);
  });

  // --- clipPath shared by both views ---
  const clipId = `intensity-clip-${Math.random().toString(36).slice(2, 9)}`;
  card
    .append('defs')
    .append('clipPath')
    .attr('id', clipId)
    .append('rect')
    .attr('width', innerWidth)
    .attr('height', innerHeight);

  // ===================
  // TRIMP chart
  // ===================
  const trimpChartG = card
    .append('g')
    .attr('transform', `translate(${margins.left}, ${margins.top})`);

  const maxTrimpUpper =
    d3.max(
      trimpSummaries.filter((s) => s.upperBound != null),
      (s) => s.upperBound as number
    ) ?? 8000;
  const trimpYMax = Math.ceil(maxTrimpUpper / 2000) * 2000;

  const trimpX = d3
    .scalePoint<number>()
    .domain([1, 2, 3, 4, 5, 6])
    .range([0, innerWidth])
    .padding(0.1);
  const trimpY = d3.scaleLinear().domain([0, trimpYMax]).range([innerHeight, 0]);

  const trimpTicks = d3.range(0, trimpYMax + 1, 2000);
  trimpChartG
    .selectAll<SVGLineElement, number>('line.grid')
    .data(trimpTicks)
    .enter()
    .append('line')
    .attr('x1', 0)
    .attr('x2', innerWidth)
    .attr('y1', (v) => trimpY(v))
    .attr('y2', (v) => trimpY(v))
    .attr('stroke', COLORS.grid);

  trimpChartG
    .selectAll<SVGTextElement, number>('text.y-tick')
    .data(trimpTicks)
    .enter()
    .append('text')
    .attr('x', -8)
    .attr('y', (v) => trimpY(v) + 3)
    .attr('text-anchor', 'end')
    .attr('font-size', 9)
    .attr('fill', COLORS.textSecondary)
    .text((v) => String(v));

  const trimpClipG = trimpChartG.append('g').attr('clip-path', `url(#${clipId})`);

  const trimpArea = d3
    .area<WeeklyGroupIntensitySummary>()
    .defined((s) => s.lowerBound != null && s.upperBound != null)
    .x((s) => trimpX(s.week) ?? 0)
    .y0((s) => trimpY(s.lowerBound ?? 0))
    .y1((s) => trimpY(s.upperBound ?? 0));
  const trimpLine = d3
    .line<WeeklyGroupIntensitySummary>()
    .defined((s) => s.groupMean != null)
    .x((s) => trimpX(s.week) ?? 0)
    .y((s) => trimpY(s.groupMean ?? 0));

  (['Supervised', 'Unsupervised'] as GroupName[]).forEach((group) => {
    const groupData = trimpSummaries.filter((s) => s.group === group);
    const color = group === 'Supervised' ? COLORS.supervised : COLORS.unsupervised;

    trimpClipG
      .append('path')
      .datum(groupData)
      .attr('fill', color)
      .attr('opacity', 0.15)
      .attr('d', trimpArea);
    trimpClipG
      .append('path')
      .datum(groupData)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 2.5)
      .attr('d', trimpLine);

    groupData
      .filter((s) => s.groupMean != null)
      .forEach((s) => {
        trimpChartG
          .append('circle')
          .attr('cx', trimpX(s.week) ?? 0)
          .attr('cy', trimpY(s.groupMean ?? 0))
          .attr('r', 5)
          .attr('fill', color)
          .style('cursor', 'pointer')
          .on('mousemove', (event: MouseEvent) => {
            showTooltip(
              event,
              `<strong>${group} · Wk ${s.week}</strong><br>` +
                `Mean TRIMP: ${Math.round(s.groupMean ?? 0)}<br>` +
                (s.groupSd != null ? `SD: ${Math.round(s.groupSd)}<br>` : '') +
                `${s.sessionCount} sessions · ${s.subjectCount} subjects`
            );
          })
          .on('mouseout', hideTooltip);
      });
  });

  trimpChartG
    .selectAll<SVGTextElement, number>('text.x-tick')
    .data([1, 2, 3, 4, 5, 6])
    .enter()
    .append('text')
    .attr('x', (w) => trimpX(w) ?? 0)
    .attr('y', innerHeight + 18)
    .attr('text-anchor', 'middle')
    .attr('font-size', 9)
    .attr('fill', COLORS.textSecondary)
    .text((w) => `Wk ${w}`);

  // ===================
  // % HR Max chart
  // ===================
  const hrMaxChartG = card
    .append('g')
    .attr('transform', `translate(${margins.left}, ${margins.top})`);

  const hrMaxX = d3
    .scalePoint<number>()
    .domain([1, 2, 3, 4, 5, 6])
    .range([0, innerWidth])
    .padding(0.1);
  const hrMaxY = d3.scaleLinear().domain([0.5, 0.8]).range([innerHeight, 0]);

  const hrMaxTicks = [0.5, 0.6, 0.7, 0.8];
  hrMaxChartG
    .selectAll<SVGLineElement, number>('line.grid')
    .data(hrMaxTicks)
    .enter()
    .append('line')
    .attr('x1', 0)
    .attr('x2', innerWidth)
    .attr('y1', (v) => hrMaxY(v))
    .attr('y2', (v) => hrMaxY(v))
    .attr('stroke', COLORS.grid);

  hrMaxChartG
    .selectAll<SVGTextElement, number>('text.y-tick')
    .data(hrMaxTicks)
    .enter()
    .append('text')
    .attr('x', -8)
    .attr('y', (v) => hrMaxY(v) + 3)
    .attr('text-anchor', 'end')
    .attr('font-size', 9)
    .attr('fill', COLORS.textSecondary)
    .text((v) => `${Math.round(v * 100)}%`);

  const hrMaxClipG = hrMaxChartG.append('g').attr('clip-path', `url(#${clipId})`);

  const hrMaxArea = d3
    .area<WeeklyGroupIntensitySummary>()
    .defined((s) => s.lowerBound != null && s.upperBound != null)
    .x((s) => hrMaxX(s.week) ?? 0)
    .y0((s) => hrMaxY(s.lowerBound ?? 0.5))
    .y1((s) => hrMaxY(s.upperBound ?? 0.5));
  const hrMaxLine = d3
    .line<WeeklyGroupIntensitySummary>()
    .defined((s) => s.groupMean != null)
    .x((s) => hrMaxX(s.week) ?? 0)
    .y((s) => hrMaxY(s.groupMean ?? 0.5));

  (['Supervised', 'Unsupervised'] as GroupName[]).forEach((group) => {
    const groupData = hrMaxSummaries.filter((s) => s.group === group);
    const color = group === 'Supervised' ? COLORS.supervised : COLORS.unsupervised;

    hrMaxClipG
      .append('path')
      .datum(groupData)
      .attr('fill', color)
      .attr('opacity', 0.15)
      .attr('d', hrMaxArea);
    hrMaxClipG
      .append('path')
      .datum(groupData)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 2.5)
      .attr('d', hrMaxLine);

    groupData
      .filter((s) => s.groupMean != null)
      .forEach((s) => {
        hrMaxChartG
          .append('circle')
          .attr('cx', hrMaxX(s.week) ?? 0)
          .attr('cy', hrMaxY(s.groupMean ?? 0.5))
          .attr('r', 5)
          .attr('fill', color)
          .style('cursor', 'pointer')
          .on('mousemove', (event: MouseEvent) => {
            const meanPct = ((s.groupMean ?? 0) * 100).toFixed(1);
            const sdLine =
              s.groupSd != null ? `SD: ${(s.groupSd * 100).toFixed(1)}%<br>` : '';
            showTooltip(
              event,
              `<strong>${group} · Wk ${s.week}</strong><br>` +
                `Mean % HR Max: ${meanPct}%<br>` +
                sdLine +
                `${s.sessionCount} sessions · ${s.subjectCount} subjects`
            );
          })
          .on('mouseout', hideTooltip);
      });
  });

  hrMaxChartG
    .selectAll<SVGTextElement, number>('text.x-tick')
    .data([1, 2, 3, 4, 5, 6])
    .enter()
    .append('text')
    .attr('x', (w) => hrMaxX(w) ?? 0)
    .attr('y', innerHeight + 18)
    .attr('text-anchor', 'middle')
    .attr('font-size', 9)
    .attr('fill', COLORS.textSecondary)
    .text((w) => `Wk ${w}`);

  // --- Toggle view logic ---
  function updateView(view: TrendView): void {
    trimpTitleG.attr('display', view === 'trimp' ? null : 'none');
    hrMaxTitleG.attr('display', view === 'hrmax' ? null : 'none');
    trimpChartG.attr('display', view === 'trimp' ? null : 'none');
    hrMaxChartG.attr('display', view === 'hrmax' ? null : 'none');

    trimpBtnRect.attr('fill', view === 'trimp' ? COLORS.supervised : 'transparent');
    trimpBtnText.attr('fill', view === 'trimp' ? '#ffffff' : COLORS.textSecondary);
    hrMaxBtnRect.attr('fill', view === 'hrmax' ? COLORS.supervised : 'transparent');
    hrMaxBtnText.attr('fill', view === 'hrmax' ? '#ffffff' : COLORS.textSecondary);
  }

  // Initialise to TRIMP view
  updateView('trimp');

  trimpBtnG.on('click', () => updateView('trimp'));
  hrMaxBtnG.on('click', () => updateView('hrmax'));
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
  const cellHeight = Math.max(
    16,
    Math.floor(
      (availableBodyHeight - rowGap * Math.max(roster.length - 1, 0)) /
        Math.max(roster.length, 1)
    )
  );
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
    .text('75% weekly threshold · shared subject roster · no-data cells preserved');

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
