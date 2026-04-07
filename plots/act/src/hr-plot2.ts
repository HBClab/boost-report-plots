// HR Plot 2 — Adherence Trend + Individual Heatmap (dark-themed)
// Adapted from plots/hr/src/plot2.ts
import * as d3 from 'd3';
import type { CardLayout } from './types.js';
import type {
  HrAlignedSubjectRosterEntry,
  HrGroupName,
  HrHeatmapStatus,
  HrWeeklyGroupAdherenceSummary,
  HrWeeklySubjectAdherenceSummary,
} from './hr-types.js';

// ─── Dark palette ─────────────────────────────────────────────────────────────
const C = {
  supervised:    '#4F94EF',
  unsupervised:  '#FB923C',
  met:           '#34D399',
  notMet:        '#F87171',
  noData:        '#161F2F',
  card:          '#131C2E',
  textPrimary:   '#DDE4EF',
  textSecondary: '#6B7A90',
  grid:          '#1E2C44',
  font:          'DM Sans, Inter, -apple-system, sans-serif',
  fontMono:      'DM Mono, monospace',
} as const;

// ─── Tooltip (shared with ACT plots) ─────────────────────────────────────────
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

// ─── Heatmap height helper (exported for canvas sizing) ─────────────────────
export function getHrHeatmapCardHeight(rosterSize: number): number {
  const topPad = 78, botPad = 48, minCellH = 18, gap = 2, legendH = 32;
  return topPad + rosterSize * (minCellH + gap) + legendH + botPad;
}

// ─── Adherence Trend ─────────────────────────────────────────────────────────
export function renderHrAdherenceTrend(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  data: HrWeeklyGroupAdherenceSummary[],
  layout: CardLayout
): void {
  svg.selectAll('[data-plot="hr2"]').remove();
  const card = svg.append('g')
    .attr('data-plot', 'hr2')
    .attr('transform', `translate(${layout.x},${layout.y})`);

  card.append('rect')
    .attr('width', layout.w).attr('height', layout.h)
    .attr('rx', 12).attr('fill', C.card);

  const margins = { top: 62, right: 24, bottom: 28, left: 70 };
  const innerW = layout.w - margins.left - margins.right;
  const innerH = layout.h - margins.top - margins.bottom;

  card.append('text').attr('x', margins.left).attr('y', 26)
    .attr('fill', C.textPrimary).attr('font-size', 14).attr('font-weight', 600)
    .attr('font-family', C.font).attr('letter-spacing', '-0.01em')
    .text('HR Zone Adherence Rate by Week');
  card.append('text').attr('x', margins.left).attr('y', 44)
    .attr('fill', C.textSecondary).attr('font-size', 11).attr('font-family', C.font)
    .text('Weekly session adherence · ±1 SD subject-level variability');

  const g = card.append('g').attr('transform', `translate(${margins.left},${margins.top})`);
  const x = d3.scalePoint<number>().domain([1, 2, 3, 4, 5, 6]).range([0, innerW]).padding(0.1);
  const y = d3.scaleLinear().domain([0, 1]).range([innerH, 0]);

  // Gridlines
  g.selectAll('line.grid').data([0, 0.25, 0.5, 0.75, 1]).enter().append('line')
    .attr('x1', 0).attr('x2', innerW)
    .attr('y1', (v: number) => y(v)).attr('y2', (v: number) => y(v))
    .attr('stroke', C.grid).attr('stroke-width', 1);

  // Y-axis labels
  g.selectAll('text.y-tick').data([0, 0.25, 0.5, 0.75, 1]).enter().append('text')
    .attr('x', -8).attr('y', (v: number) => y(v) + 4)
    .attr('text-anchor', 'end').attr('font-size', 10)
    .attr('fill', C.textSecondary).attr('font-family', C.fontMono)
    .text((v: number) => `${Math.round(v * 100)}%`);

  const area = d3.area<HrWeeklyGroupAdherenceSummary>()
    .defined((d) => d.lowerBound != null && d.upperBound != null)
    .x((d) => x(d.week) ?? 0)
    .y0((d) => y(d.lowerBound ?? 0))
    .y1((d) => y(d.upperBound ?? 0));
  const line = d3.line<HrWeeklyGroupAdherenceSummary>()
    .defined((d) => d.adherenceRate != null)
    .x((d) => x(d.week) ?? 0)
    .y((d) => y(d.adherenceRate ?? 0));

  const tooltip = ensureTooltip();

  (['Supervised', 'Unsupervised'] as HrGroupName[]).forEach((group) => {
    const summaries = data.filter((d) => d.group === group);
    const color = group === 'Supervised' ? C.supervised : C.unsupervised;

    g.append('path').datum(summaries)
      .attr('fill', color).attr('opacity', 0.12).attr('pointer-events', 'none').attr('d', area);
    g.append('path').datum(summaries)
      .attr('fill', 'none').attr('stroke', color).attr('stroke-width', 2.5).attr('pointer-events', 'none').attr('d', line);

    g.selectAll(`circle.${group}`)
      .data(summaries.filter((d) => d.adherenceRate != null))
      .enter().append('circle')
      .attr('cx', (d) => x(d.week) ?? 0)
      .attr('cy', (d) => y(d.adherenceRate ?? 0))
      .attr('r', 5).attr('fill', color)
      .on('mouseover', (event: MouseEvent, d) => {
        const pctStr = `${((d.adherenceRate ?? 0) * 100).toFixed(1)}%`;
        const sdStr = d.subjectRateSd != null ? ` ±${(d.subjectRateSd * 100).toFixed(1)}%` : '';
        tooltip.html(
          `<strong style="color:${color}">${group}</strong> · Wk ${d.week}<br>` +
          `Adherence: <strong>${pctStr}${sdStr}</strong><br>` +
          `<span style="color:#6B7A90">${d.totalSessions} sessions</span>`
        ).style('opacity', '1')
          .style('left', `${event.clientX + 14}px`)
          .style('top', `${event.clientY - 10}px`);
      })
      .on('mousemove', (event: MouseEvent) => {
        tooltip.style('left', `${event.clientX + 14}px`).style('top', `${event.clientY - 10}px`);
      })
      .on('mouseout', () => tooltip.style('opacity', '0'));
  });

  // X-axis labels
  g.selectAll('text.x-tick').data([1, 2, 3, 4, 5, 6]).enter().append('text')
    .attr('x', (w: number) => x(w) ?? 0).attr('y', innerH + 18)
    .attr('text-anchor', 'middle').attr('font-size', 10)
    .attr('fill', C.textSecondary).attr('font-family', C.fontMono)
    .text((w: number) => `Wk ${w}`);

  // Legend top-right
  const legend = card.append('g').attr('transform', `translate(${layout.w - 130},18)`);
  [{ label: 'Supervised', color: C.supervised }, { label: 'Unsupervised', color: C.unsupervised }]
    .forEach((item, i) => {
      const lg = legend.append('g').attr('transform', `translate(0,${i * 20})`);
      lg.append('rect').attr('width', 10).attr('height', 10).attr('rx', 2).attr('fill', item.color);
      lg.append('text').attr('x', 15).attr('y', 9).attr('font-size', 11)
        .attr('fill', C.textSecondary).attr('font-family', C.font).text(item.label);
    });
}

// ─── Individual Adherence Heatmap ────────────────────────────────────────────
export function renderHrHeatmapCard(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  subjectSummaries: HrWeeklySubjectAdherenceSummary[],
  roster: HrAlignedSubjectRosterEntry[],
  layout: CardLayout
): void {
  svg.selectAll('[data-plot="hr3"]').remove();
  const card = svg.append('g')
    .attr('data-plot', 'hr3')
    .attr('transform', `translate(${layout.x},${layout.y})`);

  card.append('rect')
    .attr('width', layout.w).attr('height', layout.h)
    .attr('rx', 12).attr('fill', C.card);

  const margins = { top: 72, right: 36, bottom: 56, left: 120 };
  const labelWidth = 76;
  const gutter = 40;
  const innerWidth = layout.w - margins.left - margins.right;
  const rowGap = 2;
  const availableBodyH = layout.h - margins.top - margins.bottom - 32;
  const cellH = Math.max(16, Math.floor((availableBodyH - rowGap * Math.max(roster.length - 1, 0)) / Math.max(roster.length, 1)));
  const panelW = (innerWidth - labelWidth - gutter) / 2;
  const cellW = (panelW - 10) / 6;
  const panelX: Record<HrGroupName, number> = {
    Supervised: labelWidth,
    Unsupervised: labelWidth + panelW + gutter,
  };
  const statusColor: Record<HrHeatmapStatus, string> = {
    met: C.met, not_met: C.notMet, no_data: C.noData,
  };

  card.append('text').attr('x', margins.left).attr('y', 26)
    .attr('fill', C.textPrimary).attr('font-size', 14).attr('font-weight', 600)
    .attr('font-family', C.font).attr('letter-spacing', '-0.01em')
    .text('Individual Weekly Adherence Heatmaps');
  card.append('text').attr('x', margins.left).attr('y', 44)
    .attr('fill', C.textSecondary).attr('font-size', 11).attr('font-family', C.font)
    .text('50% weekly threshold · shared subject roster · no-data cells preserved');

  const heatmap = card.append('g').attr('transform', `translate(${margins.left},${margins.top})`);
  const tooltip = ensureTooltip();

  (['Supervised', 'Unsupervised'] as HrGroupName[]).forEach((group) => {
    const x0 = panelX[group];
    const color = group === 'Supervised' ? C.supervised : C.unsupervised;
    heatmap.append('text').attr('x', x0).attr('y', -12)
      .attr('font-size', 11).attr('font-weight', 600).attr('font-family', C.font)
      .attr('fill', color).text(group);

    [1, 2, 3, 4, 5, 6].forEach((week, wi) => {
      heatmap.append('text')
        .attr('x', x0 + wi * cellW + cellW / 2).attr('y', 6)
        .attr('text-anchor', 'middle').attr('font-size', 10)
        .attr('fill', C.textSecondary).attr('font-family', C.fontMono)
        .text(`W${week}`);
    });
  });

  roster.forEach((entry, ri) => {
    const rowY = 18 + ri * (cellH + rowGap);
    heatmap.append('text')
      .attr('x', labelWidth - 8).attr('y', rowY + cellH / 2 + 3.5)
      .attr('text-anchor', 'end')
      .attr('font-size', Math.max(8, Math.min(11, cellH * 0.55)))
      .attr('fill', C.textSecondary).attr('font-family', C.fontMono)
      .text(entry.subject);

    (['Supervised', 'Unsupervised'] as HrGroupName[]).forEach((group) => {
      [1, 2, 3, 4, 5, 6].forEach((week, wi) => {
        const summary = subjectSummaries.find(
          (s) => s.group === group && s.subject === entry.subject && s.week === week
        );
        const status = summary?.status ?? 'no_data';
        const color = group === 'Supervised' ? C.supervised : C.unsupervised;
        const rect = heatmap.append('rect')
          .attr('x', panelX[group] + wi * cellW).attr('y', rowY)
          .attr('width', Math.max(12, cellW - 2)).attr('height', cellH)
          .attr('rx', 2).attr('fill', statusColor[status]);

        if (status !== 'no_data' && summary) {
          rect.style('cursor', 'pointer')
            .on('mouseover', (event: MouseEvent) => {
              const pctStr = summary.adherenceRatio != null ? `${(summary.adherenceRatio * 100).toFixed(0)}%` : '—';
              tooltip.html(
                `<strong style="color:${color}">${group}</strong> · Wk ${week}<br>` +
                `${entry.subject}<br>` +
                `<span style="color:${statusColor[status]}">${status === 'met' ? 'Met' : 'Not Met'}</span>` +
                ` · ${pctStr} (${summary.metSessions}/${summary.totalSessions} sessions)`
              ).style('opacity', '1')
                .style('left', `${event.clientX + 14}px`)
                .style('top', `${event.clientY - 10}px`);
            })
            .on('mousemove', (event: MouseEvent) => {
              tooltip.style('left', `${event.clientX + 14}px`).style('top', `${event.clientY - 10}px`);
            })
            .on('mouseout', () => tooltip.style('opacity', '0'));
        }
      });
    });
  });

  // Legend
  const legendY = 18 + roster.length * (cellH + rowGap) + 16;
  [
    { label: 'Met (≥50%)',  color: C.met },
    { label: 'Not Met',     color: C.notMet },
    { label: 'No Data',     color: C.noData, border: C.grid },
  ].forEach((item, i) => {
    const g = heatmap.append('g').attr('transform', `translate(${i * 110},${legendY})`);
    g.append('rect').attr('width', 12).attr('height', 12).attr('rx', 2)
      .attr('fill', item.color)
      .attr('stroke', item.border ?? 'none').attr('stroke-width', item.border ? 1 : 0);
    g.append('text').attr('x', 18).attr('y', 10).attr('font-size', 11)
      .attr('fill', C.textSecondary).attr('font-family', C.font).text(item.label);
  });
}
