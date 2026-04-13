// HR Plot 2 — Intensity Trend + Individual Heatmap (dark-themed)
// Adapted from plots/hr/src/plot2.ts
import * as d3 from 'd3';
import type { CardLayout } from './types.js';
import type {
  HrAlignedSubjectRosterEntry,
  HrGroupName,
  HrHeatmapView,
  HrWeeklyGroupIntensitySummary,
  HrWeeklySubjectAdherenceSummary,
} from './hr-types.js';
import { renderCaption, CAPTION_H, hrCaptions } from './captions.js';

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
  return topPad + rosterSize * (minCellH + gap) + legendH + botPad + CAPTION_H;
}

function adherenceColor(adherenceRatio: number | null): string {
  if (adherenceRatio == null) return C.noData;
  return d3.interpolateRgb(C.notMet, C.met)(clamp(adherenceRatio, 0, 1));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getSummaryExtent(
  summaries: HrWeeklyGroupIntensitySummary[],
  fallback: [number, number],
  opts: { min?: number; max?: number; minSpan?: number; padRatio?: number } = {}
): [number, number] {
  const values = summaries.flatMap((summary) =>
    [summary.lowerBound, summary.upperBound, summary.groupMean].filter((value): value is number => value != null)
  );
  if (values.length === 0) return fallback;

  let minValue = d3.min(values) ?? fallback[0];
  let maxValue = d3.max(values) ?? fallback[1];
  const span = maxValue - minValue;
  const minSpan = opts.minSpan ?? 1;
  const padRatio = opts.padRatio ?? 0.08;
  const padding = Math.max(span * padRatio, minSpan / 2);

  minValue -= padding;
  maxValue += padding;

  if (opts.min != null) minValue = Math.max(opts.min, minValue);
  if (opts.max != null) maxValue = Math.min(opts.max, maxValue);

  if (maxValue - minValue < minSpan) {
    const mid = (minValue + maxValue) / 2;
    minValue = mid - minSpan / 2;
    maxValue = mid + minSpan / 2;
    if (opts.min != null && minValue < opts.min) {
      minValue = opts.min;
      maxValue = Math.max(maxValue, minValue + minSpan);
    }
    if (opts.max != null && maxValue > opts.max) {
      maxValue = opts.max;
      minValue = Math.min(minValue, maxValue - minSpan);
    }
  }

  return [minValue, maxValue];
}

// ─── Heatmap view toggle constants ───────────────────────────────────────────
const TOGGLE_BTN_W   = 110;
const TOGGLE_BTN_H   = 24;
const TOGGLE_PAD     = 2;
const TOGGLE_TOTAL_W = 2 * TOGGLE_BTN_W + TOGGLE_PAD * 3;
const CARD_PAD       = 16;

// ─── Intensity Trend ─────────────────────────────────────────────────────────
export function renderHrIntensityTrend(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  trimpSummaries: HrWeeklyGroupIntensitySummary[],
  hrMaxSummaries: HrWeeklyGroupIntensitySummary[],
  layout: CardLayout
): void {
  type TrendView = 'trimp' | 'hrmax';

  svg.selectAll('[data-plot="hr2"]').remove();
  const card = svg.append('g')
    .attr('data-plot', 'hr2')
    .attr('transform', `translate(${layout.x},${layout.y})`);

  card.append('rect')
    .attr('width', layout.w).attr('height', layout.h)
    .attr('rx', 12).attr('fill', C.card);

  // contentH = chart zone; caption occupies the remaining CAPTION_H at the bottom.
  const contentH = layout.h - CAPTION_H;
  const margins = { top: 84, right: 24, bottom: 28, left: 70 };
  const innerW = layout.w - margins.left - margins.right;
  const innerH = contentH - margins.top - margins.bottom;

  const btnW = 84;
  const btnH = 24;
  const btnGap = 2;
  const containerPad = 2;
  const containerW = btnW * 2 + btnGap + containerPad * 2;
  const containerH = btnH + containerPad * 2;
  const toggleX = layout.w - CARD_PAD - containerW;
  const toggleY = 8;

  const toggleG = card.append('g').attr('transform', `translate(${toggleX}, ${toggleY})`);
  toggleG.append('rect')
    .attr('width', containerW)
    .attr('height', containerH)
    .attr('rx', 6)
    .attr('fill', C.card)
    .attr('stroke', C.grid)
    .attr('stroke-width', 1);

  const trimpBtnG = toggleG.append('g')
    .attr('transform', `translate(${containerPad}, ${containerPad})`)
    .style('cursor', 'pointer');
  const trimpBtnRect = trimpBtnG.append('rect')
    .attr('width', btnW)
    .attr('height', btnH)
    .attr('rx', 4)
    .attr('fill', '#1A2440');
  const trimpBtnText = trimpBtnG.append('text')
    .attr('x', btnW / 2)
    .attr('y', btnH / 2 + 4)
    .attr('text-anchor', 'middle')
    .attr('font-size', 10)
    .attr('font-weight', 600)
    .attr('fill', C.textPrimary)
    .attr('font-family', C.font)
    .attr('pointer-events', 'none')
    .text('TRIMP');

  const hrMaxBtnG = toggleG.append('g')
    .attr('transform', `translate(${containerPad + btnW + btnGap}, ${containerPad})`)
    .style('cursor', 'pointer');
  const hrMaxBtnRect = hrMaxBtnG.append('rect')
    .attr('width', btnW)
    .attr('height', btnH)
    .attr('rx', 4)
    .attr('fill', 'transparent');
  const hrMaxBtnText = hrMaxBtnG.append('text')
    .attr('x', btnW / 2)
    .attr('y', btnH / 2 + 4)
    .attr('text-anchor', 'middle')
    .attr('font-size', 10)
    .attr('font-weight', 600)
    .attr('fill', C.textSecondary)
    .attr('font-family', C.font)
    .attr('pointer-events', 'none')
    .text('% HR Max');

  const trimpTitleG = card.append('g');
  trimpTitleG.append('text').attr('x', margins.left).attr('y', 26)
    .attr('fill', C.textPrimary).attr('font-size', 14).attr('font-weight', 600)
    .attr('font-family', C.font).attr('letter-spacing', '-0.01em')
    .text('Weekly TRIMP by Group');
  trimpTitleG.append('text').attr('x', margins.left).attr('y', 44)
    .attr('fill', C.textSecondary).attr('font-size', 11).attr('font-family', C.font)
    .text('Subject-level weekly mean per session · shaded band = ±1 SD');

  const hrMaxTitleG = card.append('g');
  hrMaxTitleG.append('text').attr('x', margins.left).attr('y', 26)
    .attr('fill', C.textPrimary).attr('font-size', 14).attr('font-weight', 600)
    .attr('font-family', C.font).attr('letter-spacing', '-0.01em')
    .text('Weekly % HR Max by Group');
  hrMaxTitleG.append('text').attr('x', margins.left).attr('y', 44)
    .attr('fill', C.textSecondary).attr('font-size', 11).attr('font-family', C.font)
    .text('Subject-level weekly mean per session · shaded band = ±1 SD');

  const legend = card.append('g').attr('transform', `translate(${layout.w - CARD_PAD - 118},56)`);
  [{ label: 'Supervised', color: C.supervised }, { label: 'Unsupervised', color: C.unsupervised }]
    .forEach((item, i) => {
      const lg = legend.append('g').attr('transform', `translate(0,${i * 18})`);
      lg.append('rect').attr('width', 10).attr('height', 10).attr('rx', 2).attr('fill', item.color);
      lg.append('text').attr('x', 15).attr('y', 9).attr('font-size', 10)
        .attr('fill', C.textSecondary).attr('font-family', C.font).text(item.label);
    });

  const clipId = `intensity-clip-${Math.random().toString(36).slice(2, 9)}`;
  card.append('defs')
    .append('clipPath')
    .attr('id', clipId)
    .append('rect')
    .attr('width', innerW)
    .attr('height', innerH);

  const tooltip = ensureTooltip();

  const trimpChartG = card.append('g').attr('transform', `translate(${margins.left},${margins.top})`);
  const trimpDomain = getSummaryExtent(trimpSummaries, [0, 8000], { min: 0, minSpan: 500, padRatio: 0.1 });
  const trimpX = d3.scalePoint<number>().domain([1, 2, 3, 4, 5, 6]).range([0, innerW]).padding(0.1);
  const trimpY = d3.scaleLinear().domain(trimpDomain).nice(5).range([innerH, 0]);
  const trimpTicks = trimpY.ticks(5);
  trimpChartG.selectAll('line.grid').data(trimpTicks).enter().append('line')
    .attr('x1', 0).attr('x2', innerW)
    .attr('y1', (v) => trimpY(v)).attr('y2', (v) => trimpY(v))
    .attr('stroke', C.grid).attr('stroke-width', 1);
  trimpChartG.selectAll('text.y-tick').data(trimpTicks).enter().append('text')
    .attr('x', -8).attr('y', (v) => trimpY(v) + 3)
    .attr('text-anchor', 'end').attr('font-size', 10)
    .attr('fill', C.textSecondary).attr('font-family', C.fontMono)
    .text((v) => d3.format(',.0f')(v));
  const trimpClipG = trimpChartG.append('g').attr('clip-path', `url(#${clipId})`);
  const trimpArea = d3.area<HrWeeklyGroupIntensitySummary>()
    .defined((s) => s.lowerBound != null && s.upperBound != null)
    .x((s) => trimpX(s.week) ?? 0)
    .y0((s) => trimpY(s.lowerBound ?? 0))
    .y1((s) => trimpY(s.upperBound ?? 0));
  const trimpLine = d3.line<HrWeeklyGroupIntensitySummary>()
    .defined((s) => s.groupMean != null)
    .x((s) => trimpX(s.week) ?? 0)
    .y((s) => trimpY(s.groupMean ?? 0));

  (['Supervised', 'Unsupervised'] as HrGroupName[]).forEach((group) => {
    const summaries = trimpSummaries.filter((d) => d.group === group);
    const color = group === 'Supervised' ? C.supervised : C.unsupervised;
    trimpClipG.append('path').datum(summaries)
      .attr('fill', color).attr('opacity', 0.12).attr('pointer-events', 'none').attr('d', trimpArea);
    trimpClipG.append('path').datum(summaries)
      .attr('fill', 'none').attr('stroke', color).attr('stroke-width', 2.5).attr('pointer-events', 'none').attr('d', trimpLine);
    trimpChartG.selectAll(`circle.trimp-${group}`)
      .data(summaries.filter((d) => d.groupMean != null))
      .enter().append('circle')
      .attr('cx', (d) => trimpX(d.week) ?? 0)
      .attr('cy', (d) => trimpY(d.groupMean ?? 0))
      .attr('r', 5).attr('fill', color)
      .on('mouseover', (event: MouseEvent, d) => {
        const sdStr = d.groupSd != null ? ` ±${Math.round(d.groupSd)}` : '';
        tooltip.html(
          `<strong style="color:${color}">${group}</strong> · Wk ${d.week}<br>` +
          `Mean TRIMP: <strong>${Math.round(d.groupMean ?? 0)}${sdStr}</strong><br>` +
          `<span style="color:#6B7A90">${d.subjectCount} subjects · ${d.sessionCount} sessions</span>`
        ).style('opacity', '1')
          .style('left', `${event.clientX + 14}px`)
          .style('top', `${event.clientY - 10}px`);
      })
      .on('mousemove', (event: MouseEvent) => {
        tooltip.style('left', `${event.clientX + 14}px`).style('top', `${event.clientY - 10}px`);
      })
      .on('mouseout', () => tooltip.style('opacity', '0'));
  });

  trimpChartG.selectAll('text.x-tick').data([1, 2, 3, 4, 5, 6]).enter().append('text')
    .attr('x', (w) => trimpX(w) ?? 0).attr('y', innerH + 18)
    .attr('text-anchor', 'middle').attr('font-size', 10)
    .attr('fill', C.textSecondary).attr('font-family', C.fontMono)
    .text((w) => `Wk ${w}`);

  const hrMaxChartG = card.append('g').attr('transform', `translate(${margins.left},${margins.top})`);
  const hrMaxDomain = getSummaryExtent(hrMaxSummaries, [0.5, 0.8], { min: 0, max: 1, minSpan: 0.08, padRatio: 0.1 });
  const hrMaxX = d3.scalePoint<number>().domain([1, 2, 3, 4, 5, 6]).range([0, innerW]).padding(0.1);
  const hrMaxY = d3.scaleLinear().domain(hrMaxDomain).nice(5).range([innerH, 0]);
  const hrMaxTicks = hrMaxY.ticks(5);
  hrMaxChartG.selectAll('line.grid').data(hrMaxTicks).enter().append('line')
    .attr('x1', 0).attr('x2', innerW)
    .attr('y1', (v) => hrMaxY(v)).attr('y2', (v) => hrMaxY(v))
    .attr('stroke', C.grid).attr('stroke-width', 1);
  hrMaxChartG.selectAll('text.y-tick').data(hrMaxTicks).enter().append('text')
    .attr('x', -8).attr('y', (v) => hrMaxY(v) + 3)
    .attr('text-anchor', 'end').attr('font-size', 10)
    .attr('fill', C.textSecondary).attr('font-family', C.fontMono)
    .text((v) => `${Math.round(v * 100)}%`);
  const hrMaxClipG = hrMaxChartG.append('g').attr('clip-path', `url(#${clipId})`);
  const hrMaxArea = d3.area<HrWeeklyGroupIntensitySummary>()
    .defined((s) => s.lowerBound != null && s.upperBound != null)
    .x((s) => hrMaxX(s.week) ?? 0)
    .y0((s) => hrMaxY(s.lowerBound ?? 0.5))
    .y1((s) => hrMaxY(s.upperBound ?? 0.5));
  const hrMaxLine = d3.line<HrWeeklyGroupIntensitySummary>()
    .defined((s) => s.groupMean != null)
    .x((s) => hrMaxX(s.week) ?? 0)
    .y((s) => hrMaxY(s.groupMean ?? 0.5));

  (['Supervised', 'Unsupervised'] as HrGroupName[]).forEach((group) => {
    const summaries = hrMaxSummaries.filter((d) => d.group === group);
    const color = group === 'Supervised' ? C.supervised : C.unsupervised;
    hrMaxClipG.append('path').datum(summaries)
      .attr('fill', color).attr('opacity', 0.12).attr('pointer-events', 'none').attr('d', hrMaxArea);
    hrMaxClipG.append('path').datum(summaries)
      .attr('fill', 'none').attr('stroke', color).attr('stroke-width', 2.5).attr('pointer-events', 'none').attr('d', hrMaxLine);
    hrMaxChartG.selectAll(`circle.hrmax-${group}`)
      .data(summaries.filter((d) => d.groupMean != null))
      .enter().append('circle')
      .attr('cx', (d) => hrMaxX(d.week) ?? 0)
      .attr('cy', (d) => hrMaxY(d.groupMean ?? 0.5))
      .attr('r', 5).attr('fill', color)
      .on('mouseover', (event: MouseEvent, d) => {
        const meanPct = `${((d.groupMean ?? 0) * 100).toFixed(1)}%`;
        const sdStr = d.groupSd != null ? ` ±${(d.groupSd * 100).toFixed(1)}%` : '';
        tooltip.html(
          `<strong style="color:${color}">${group}</strong> · Wk ${d.week}<br>` +
          `Mean % HR Max: <strong>${meanPct}${sdStr}</strong><br>` +
          `<span style="color:#6B7A90">${d.subjectCount} subjects · ${d.sessionCount} sessions</span>`
        ).style('opacity', '1')
          .style('left', `${event.clientX + 14}px`)
          .style('top', `${event.clientY - 10}px`);
      })
      .on('mousemove', (event: MouseEvent) => {
        tooltip.style('left', `${event.clientX + 14}px`).style('top', `${event.clientY - 10}px`);
      })
      .on('mouseout', () => tooltip.style('opacity', '0'));
  });

  hrMaxChartG.selectAll('text.x-tick').data([1, 2, 3, 4, 5, 6]).enter().append('text')
    .attr('x', (w) => hrMaxX(w) ?? 0).attr('y', innerH + 18)
    .attr('text-anchor', 'middle').attr('font-size', 10)
    .attr('fill', C.textSecondary).attr('font-family', C.fontMono)
    .text((w) => `Wk ${w}`);

  // Caption group — updated on every toggle via updateView.
  const captionG = card.append('g');

  function updateView(view: TrendView): void {
    trimpTitleG.attr('display', view === 'trimp' ? null : 'none');
    hrMaxTitleG.attr('display', view === 'hrmax' ? null : 'none');
    trimpChartG.attr('display', view === 'trimp' ? null : 'none');
    hrMaxChartG.attr('display', view === 'hrmax' ? null : 'none');
    trimpBtnRect.attr('fill', view === 'trimp' ? '#1A2440' : 'transparent');
    trimpBtnText.attr('fill', view === 'trimp' ? C.textPrimary : C.textSecondary);
    hrMaxBtnRect.attr('fill', view === 'hrmax' ? '#1A2440' : 'transparent');
    hrMaxBtnText.attr('fill', view === 'hrmax' ? C.textPrimary : C.textSecondary);
    // Swap caption to match the active view (renderCaption clears previous content first).
    renderCaption(captionG, hrCaptions.plot2[view], {
      captionTop: contentH + 12,
      width: layout.w,
      padding: 24,
    });
  }

  updateView('trimp');
  trimpBtnG.on('click', () => updateView('trimp'));
  hrMaxBtnG.on('click', () => updateView('hrmax'));
}

// ─── Individual Adherence Heatmap ────────────────────────────────────────────
export function renderHrHeatmapCard(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  subjectSummaries: HrWeeklySubjectAdherenceSummary[],
  roster: HrAlignedSubjectRosterEntry[],
  layout: CardLayout,
  opts: { view: HrHeatmapView; onToggle: (v: HrHeatmapView) => void }
): void {
  svg.selectAll('[data-plot="hr3"]').remove();
  const card = svg.append('g')
    .attr('data-plot', 'hr3')
    .attr('transform', `translate(${layout.x},${layout.y})`);

  card.append('rect')
    .attr('width', layout.w).attr('height', layout.h)
    .attr('rx', 12).attr('fill', C.card);

  // contentH = heatmap + legend zone; caption occupies the remaining CAPTION_H at the bottom.
  const contentH = layout.h - CAPTION_H;
  const margins = { top: 72, right: 36, bottom: 56, left: 120 };
  const labelWidth = 76;
  const gutter = 40;
  const innerWidth = layout.w - margins.left - margins.right;
  const rowGap = 2;
  const availableBodyH = contentH - margins.top - margins.bottom - 32;
  const cellH = Math.max(16, Math.floor((availableBodyH - rowGap * Math.max(roster.length - 1, 0)) / Math.max(roster.length, 1)));
  const panelW = (innerWidth - labelWidth - gutter) / 2;
  const cellW = (panelW - 10) / 6;
  const panelX: Record<HrGroupName, number> = {
    Supervised: labelWidth,
    Unsupervised: labelWidth + panelW + gutter,
  };
  card.append('text').attr('x', margins.left).attr('y', 26)
    .attr('fill', C.textPrimary).attr('font-size', 14).attr('font-weight', 600)
    .attr('font-family', C.font).attr('letter-spacing', '-0.01em')
    .text(opts.view === 'adherence' ? 'Individual Weekly Adherence Heatmaps' : 'Individual Weekly Sessions Completed');
  card.append('text').attr('x', margins.left).attr('y', 44)
    .attr('fill', C.textSecondary).attr('font-size', 11).attr('font-family', C.font)
    .text(opts.view === 'adherence'
      ? 'Continuous weekly adherence percentage · shared subject roster · no-data cells preserved'
      : 'Sessions completed per week (out of 5) · gold outline = more than 5 sessions');

  // ── View toggle ──────────────────────────────────────────────────────────
  const toggleOpts: { id: HrHeatmapView; label: string }[] = [
    { id: 'sessions',  label: 'Sessions'  },
    { id: 'adherence', label: 'Adherence' },
  ];
  const containerW = TOGGLE_TOTAL_W + TOGGLE_PAD * 2;
  const containerH = TOGGLE_BTN_H + TOGGLE_PAD * 2;
  const tx = layout.w - CARD_PAD - containerW;
  const ty = 8;
  const toggleG = card.append('g').attr('transform', `translate(${tx},${ty})`);
  toggleG.append('rect')
    .attr('width', containerW).attr('height', containerH).attr('rx', 6)
    .attr('fill', C.card).attr('stroke', '#1E2C44').attr('stroke-width', 1);
  toggleOpts.forEach(({ id, label }, i) => {
    const isActive = opts.view === id;
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
      .attr('fill', isActive ? C.textPrimary : C.textSecondary)
      .attr('font-family', C.font)
      .attr('pointer-events', 'none').text(label);
    if (!isActive) {
      optG
        .on('mouseenter', () => bg.attr('fill', 'rgba(255,255,255,0.04)'))
        .on('mouseleave', () => bg.attr('fill', 'transparent'))
        .on('click', () => opts.onToggle(id));
    }
  });

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
        const cx = panelX[group] + wi * cellW;
        const cw = Math.max(12, cellW - 2);

        if (opts.view === 'adherence') {
          const fillColor = adherenceColor(summary?.adherenceRatio ?? null);
          const rect = heatmap.append('rect')
            .attr('x', cx).attr('y', rowY)
            .attr('width', cw).attr('height', cellH)
            .attr('rx', 2)
            .attr('fill', fillColor)
            .attr('stroke', status === 'no_data' ? C.grid : 'none')
            .attr('stroke-width', status === 'no_data' ? 1 : 0);

          if (status !== 'no_data' && summary) {
            rect.style('cursor', 'pointer')
              .on('mouseover', (event: MouseEvent) => {
                const pctStr = summary.adherenceRatio != null ? `${(summary.adherenceRatio * 100).toFixed(0)}%` : '—';
                tooltip.html(
                  `<strong style="color:${color}">${group}</strong> · Wk ${week}<br>` +
                  `${entry.subject}<br>` +
                  `<span style="color:${fillColor}">${pctStr} adherence</span>` +
                  ` (${summary.metSessions}/${summary.totalSessions} sessions)`
                ).style('opacity', '1')
                  .style('left', `${event.clientX + 14}px`)
                  .style('top', `${event.clientY - 10}px`);
              })
              .on('mousemove', (event: MouseEvent) => {
                tooltip.style('left', `${event.clientX + 14}px`).style('top', `${event.clientY - 10}px`);
              })
              .on('mouseout', () => tooltip.style('opacity', '0'));
          }
        } else {
          // Sessions view — battery-bar style
          const totalSessions = summary?.totalSessions ?? 0;
          const hasData = status !== 'no_data';
          const isOver5 = hasData && totalSessions > 5;
          const fillRatio = hasData ? clamp(totalSessions, 0, 5) / 5 : 0;
          const fillW = fillRatio * cw;

          // Background rect
          heatmap.append('rect')
            .attr('x', cx).attr('y', rowY)
            .attr('width', cw).attr('height', cellH)
            .attr('rx', 2)
            .attr('fill', C.noData)
            .attr('stroke', hasData ? (isOver5 ? '#F59E0B' : 'none') : C.grid)
            .attr('stroke-width', hasData ? (isOver5 ? 1.5 : 0) : 1);

          // Fill bar
          if (hasData && fillW > 0) {
            heatmap.append('rect')
              .attr('x', cx).attr('y', rowY)
              .attr('width', fillW).attr('height', cellH)
              .attr('rx', 2)
              .attr('fill', color)
              .attr('pointer-events', 'none');
          }

          // Invisible hit target for tooltip
          if (hasData && summary) {
            heatmap.append('rect')
              .attr('x', cx).attr('y', rowY)
              .attr('width', cw).attr('height', cellH)
              .attr('rx', 2)
              .attr('fill', 'transparent')
              .style('cursor', 'pointer')
              .on('mouseover', (event: MouseEvent) => {
                tooltip.html(
                  `<strong style="color:${color}">${group}</strong> · Wk ${week}<br>` +
                  `${entry.subject}<br>` +
                  `<span style="color:${color}">${totalSessions} session${totalSessions !== 1 ? 's' : ''}</span>` +
                  (isOver5 ? ' <span style="color:#F59E0B">★ 5+</span>' : ` / 5`)
                ).style('opacity', '1')
                  .style('left', `${event.clientX + 14}px`)
                  .style('top', `${event.clientY - 10}px`);
              })
              .on('mousemove', (event: MouseEvent) => {
                tooltip.style('left', `${event.clientX + 14}px`).style('top', `${event.clientY - 10}px`);
              })
              .on('mouseout', () => tooltip.style('opacity', '0'));
          }
        }
      });
    });
  });

  // Legend
  const legendY = 18 + roster.length * (cellH + rowGap) + 16;

  if (opts.view === 'adherence') {
    const defs = svg.select<SVGDefsElement>('defs').empty()
      ? svg.append<SVGDefsElement>('defs' as 'defs')
      : svg.select<SVGDefsElement>('defs');
    const gradientId = 'hr-adherence-gradient';
    defs.select(`#${gradientId}`).remove();
    const gradient = defs.append('linearGradient')
      .attr('id', gradientId)
      .attr('x1', '0%')
      .attr('x2', '100%');
    gradient.append('stop').attr('offset', '0%').attr('stop-color', C.notMet);
    gradient.append('stop').attr('offset', '100%').attr('stop-color', C.met);

    heatmap.append('text')
      .attr('x', 0).attr('y', legendY - 6)
      .attr('font-size', 11).attr('fill', C.textSecondary).attr('font-family', C.font)
      .text('Weekly adherence');
    heatmap.append('rect')
      .attr('x', 0).attr('y', legendY)
      .attr('width', 160).attr('height', 12).attr('rx', 2)
      .attr('fill', `url(#${gradientId})`);
    heatmap.append('text')
      .attr('x', 0).attr('y', legendY + 26)
      .attr('font-size', 10).attr('fill', C.textSecondary).attr('font-family', C.fontMono)
      .text('0%');
    heatmap.append('text')
      .attr('x', 80).attr('y', legendY + 26)
      .attr('text-anchor', 'middle').attr('font-size', 10)
      .attr('fill', C.textSecondary).attr('font-family', C.fontMono)
      .text('50%');
    heatmap.append('text')
      .attr('x', 160).attr('y', legendY + 26)
      .attr('text-anchor', 'end').attr('font-size', 10)
      .attr('fill', C.textSecondary).attr('font-family', C.fontMono)
      .text('100%');

    const noDataLegend = heatmap.append('g').attr('transform', 'translate(210,0)');
    noDataLegend.append('rect')
      .attr('x', 0).attr('y', legendY)
      .attr('width', 12).attr('height', 12).attr('rx', 2)
      .attr('fill', C.noData).attr('stroke', C.grid).attr('stroke-width', 1);
    noDataLegend.append('text')
      .attr('x', 18).attr('y', legendY + 10)
      .attr('font-size', 11).attr('fill', C.textSecondary).attr('font-family', C.font)
      .text('No Data');
  } else {
    // Sessions legend — 5 segmented bar swatches
    heatmap.append('text')
      .attr('x', 0).attr('y', legendY - 6)
      .attr('font-size', 11).attr('fill', C.textSecondary).attr('font-family', C.font)
      .text('Sessions per week');

    const swatchW = 28, swatchH = 12, swatchGap = 4;
    const labels = ['1', '2', '3', '4', '5'];
    labels.forEach((lbl, i) => {
      const sx = i * (swatchW + swatchGap);
      const fillRatio = (i + 1) / 5;
      // background
      heatmap.append('rect')
        .attr('x', sx).attr('y', legendY)
        .attr('width', swatchW).attr('height', swatchH).attr('rx', 2)
        .attr('fill', C.noData);
      // fill bar
      heatmap.append('rect')
        .attr('x', sx).attr('y', legendY)
        .attr('width', swatchW * fillRatio).attr('height', swatchH).attr('rx', 2)
        .attr('fill', C.supervised);
      // label
      heatmap.append('text')
        .attr('x', sx + swatchW / 2).attr('y', legendY + swatchH + 14)
        .attr('text-anchor', 'middle').attr('font-size', 10)
        .attr('fill', C.textSecondary).attr('font-family', C.fontMono)
        .text(lbl);
    });

    // Gold outline indicator
    const goldX = labels.length * (swatchW + swatchGap) + 16;
    heatmap.append('rect')
      .attr('x', goldX).attr('y', legendY)
      .attr('width', swatchW).attr('height', swatchH).attr('rx', 2)
      .attr('fill', C.noData).attr('stroke', '#F59E0B').attr('stroke-width', 1.5);
    heatmap.append('rect')
      .attr('x', goldX).attr('y', legendY)
      .attr('width', swatchW).attr('height', swatchH).attr('rx', 2)
      .attr('fill', C.supervised).attr('pointer-events', 'none');
    heatmap.append('text')
      .attr('x', goldX + swatchW + 6).attr('y', legendY + 9)
      .attr('font-size', 11).attr('fill', C.textSecondary).attr('font-family', C.font)
      .text('5+ sessions');

    // No-data swatch
    const ndX = goldX + swatchW + 80;
    heatmap.append('rect')
      .attr('x', ndX).attr('y', legendY)
      .attr('width', 12).attr('height', 12).attr('rx', 2)
      .attr('fill', C.noData).attr('stroke', C.grid).attr('stroke-width', 1);
    heatmap.append('text')
      .attr('x', ndX + 18).attr('y', legendY + 10)
      .attr('font-size', 11).attr('fill', C.textSecondary).attr('font-family', C.font)
      .text('No Data');
  }

  // Caption — view-specific text, re-rendered on each full card re-render (triggered by toggle).
  renderCaption(card, hrCaptions.plot3[opts.view], {
    captionTop: contentH + 12,
    width: layout.w,
    padding: 24,
  });
}
