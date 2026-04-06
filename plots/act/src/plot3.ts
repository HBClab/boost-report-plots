import * as d3 from 'd3';
import { COLORS } from './constants.js';
import type { SessionHourlyEnmo, CardLayout } from './types.js';

// ─── Session palette (docs/plot-specs/act.md v3.0) ──────────────────────────
const SESSION_COLORS: Record<number, string> = {
  1: '#247F8F',
  2: '#3BA8BD',
  3: '#6EC4D1',
  4: '#A4DCE6',
};

// ─── Layout constants (from docs/plot-specs/act.md v2.1) ─────────────────────
const CARD_PAD = 24;
const TITLE_H = 28;
const CLOCK_OUTER_R = 195;   // px to the 115mg ring
const CLOCK_INNER_R = 44;    // dead-zone center circle
const ENMO_MAX = 115;        // mg at outer ring
const RING_LABELS = [38, 76, 115] as const;
const MVPA_MG = 100;

const HOUR_LABELS: Record<number, string> = {
  0: '12am', 3: '3am', 6: '6am', 9: '9am',
  12: '12pm', 15: '3pm', 18: '6pm', 21: '9pm',
};

// Legend layout
const LEGEND_TOP_GAP = 20;
const LEGEND_ITEM_H = 20;
const LEGEND_SWATCH_W = 20;
const LEGEND_SWATCH_H = 8;
const LEGEND_HIT_W = 250;

// ─── Coordinate helpers ───────────────────────────────────────────────────────

function enmoToRadius(enmo: number): number {
  const t = Math.max(0, enmo) / ENMO_MAX;
  return CLOCK_INNER_R + t * (CLOCK_OUTER_R - CLOCK_INNER_R);
}

/** Hour 0 is at 12-o-clock (top); clockwise. */
function hourAngle(hour: number, fraction: number = 0.5): number {
  return ((hour + fraction) / 24) * 2 * Math.PI - Math.PI / 2;
}

function polar(cx: number, cy: number, r: number, angle: number): [number, number] {
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

// ─── Main renderer ────────────────────────────────────────────────────────────

export function renderPlot3(
  svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, unknown>,
  rows: SessionHourlyEnmo[],
  layout: CardLayout,
): void {
  // Restrict to observational session 1 and intervention sessions 1–4 only
  rows = rows.filter((r) => {
    if (r.group === 'observational') return r.session_number === 1;
    if (r.group === 'intervention') return r.session_number >= 1 && r.session_number <= 4;
    return false;
  });

  const { x, y, w, h } = layout;

  // Card background
  const card = svg.append('g').attr('transform', `translate(${x},${y})`);
  card.append('rect')
    .attr('width', w).attr('height', h)
    .attr('rx', 12).attr('ry', 12)
    .attr('fill', COLORS.card);

  // Title
  card.append('text')
    .attr('x', CARD_PAD).attr('y', CARD_PAD + 14)
    .attr('font-family', 'DM Sans, Inter, -apple-system, sans-serif')
    .attr('font-size', 14).attr('font-weight', 600)
    .attr('fill', COLORS.textPrimary)
    .text('Radial Activity Clock (ENMO by Hour)');

  // Clock center relative to card origin
  const legendRows = _countLegendRows(rows);
  const legendH = legendRows * LEGEND_ITEM_H + LEGEND_TOP_GAP + 24;
  const availableH = h - CARD_PAD - TITLE_H - legendH;
  const cy = CARD_PAD + TITLE_H + availableH / 2;
  const cx = w / 2;

  // clockG is the group that all session paths live in — passed to legend for hover targeting
  const clockG = card.append('g').attr('transform', `translate(${cx},${cy})`);

  _renderRings(clockG);
  _renderHourTicks(clockG);
  _renderLines(clockG, rows);
  _renderLegend(card, clockG, rows, legendH, h);
}

// ─── Rings & ticks ───────────────────────────────────────────────────────────

function _renderRings(g: d3.Selection<SVGGElement, unknown, SVGGElement, unknown>): void {
  for (const mg of RING_LABELS) {
    const r = enmoToRadius(mg);
    g.append('circle')
      .attr('r', r).attr('cx', 0).attr('cy', 0)
      .attr('fill', 'none')
      .attr('stroke', COLORS.missing)
      .attr('stroke-width', 1);
    g.append('text')
      .attr('x', 4).attr('y', -r + 4)
      .attr('font-family', 'DM Sans, Inter, -apple-system, sans-serif')
      .attr('font-size', 9).attr('font-weight', 400)
      .attr('fill', COLORS.textSecondary)
      .text(`${mg}mg`);
  }

  const mvpaR = enmoToRadius(MVPA_MG);
  g.append('circle')
    .attr('r', mvpaR).attr('cx', 0).attr('cy', 0)
    .attr('fill', 'none')
    .attr('stroke', COLORS.textSecondary)
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '4 3');
  g.append('text')
    .attr('x', 4).attr('y', -mvpaR + 4)
    .attr('font-family', 'DM Sans, Inter, -apple-system, sans-serif')
    .attr('font-size', 9).attr('font-weight', 400)
    .attr('fill', COLORS.textSecondary)
    .text('MVPA (100mg)');

  // Center dead-zone (filled with card color)
  g.append('circle')
    .attr('r', CLOCK_INNER_R).attr('cx', 0).attr('cy', 0)
    .attr('fill', COLORS.card);
}

function _renderHourTicks(g: d3.Selection<SVGGElement, unknown, SVGGElement, unknown>): void {
  for (let hour = 0; hour < 24; hour++) {
    const angle = hourAngle(hour, 0);
    const innerR = CLOCK_OUTER_R + 4;
    const outerR = CLOCK_OUTER_R + 10;
    const [x1, y1] = polar(0, 0, innerR, angle);
    const [x2, y2] = polar(0, 0, outerR, angle);
    g.append('line')
      .attr('x1', x1).attr('y1', y1)
      .attr('x2', x2).attr('y2', y2)
      .attr('stroke', COLORS.textSecondary)
      .attr('stroke-width', 1);

    if (HOUR_LABELS[hour] !== undefined) {
      const labelR = CLOCK_OUTER_R + 20;
      const [lx, ly] = polar(0, 0, labelR, angle);
      g.append('text')
        .attr('x', lx).attr('y', ly)
        .attr('font-family', 'DM Sans, Inter, -apple-system, sans-serif')
        .attr('font-size', 11).attr('font-weight', 400)
        .attr('fill', COLORS.textSecondary)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .text(HOUR_LABELS[hour]);
    }
  }
}

// ─── Lines & SD shading ───────────────────────────────────────────────────────

function _renderLines(
  g: d3.Selection<SVGGElement, unknown, SVGGElement, unknown>,
  rows: SessionHourlyEnmo[],
): void {
  const byGroupSession = new Map<string, SessionHourlyEnmo[]>();
  for (const row of rows) {
    const key = `${row.group}__${row.session_number}`;
    const existing = byGroupSession.get(key);
    if (existing) existing.push(row);
    else byGroupSession.set(key, [row]);
  }

  // Sort: observational first (drawn under), then intervention sessions
  const keys = [...byGroupSession.keys()].sort((a, b) => {
    const [ga] = a.split('__');
    const [gb] = b.split('__');
    if (ga === 'observational' && gb !== 'observational') return -1;
    if (gb === 'observational' && ga !== 'observational') return 1;
    return a.localeCompare(b);
  });

  for (const key of keys) {
    const series = byGroupSession.get(key)!.sort((a, b) => a.hour - b.hour);
    const [groupName, sessionStr] = key.split('__');
    const sessionNum = parseInt(sessionStr, 10);

    const isObs = groupName === 'observational';
    const color = isObs ? COLORS.observational : (SESSION_COLORS[sessionNum] ?? SESSION_COLORS[1]);
    const strokeWidth = isObs ? 1.5 : 2.5;

    // Each session lives in its own group — targeted by legend hover
    const sessionG = g.append('g')
      .attr('class', 'session-group')
      .attr('data-session-key', key);

    // SD band drawn first so line sits on top
    const sdRows = series.filter((r) => r.enmo_sd !== null);
    if (sdRows.length >= 2) {
      _renderSdBand(sessionG, sdRows, color);
    }

    _renderMeanLine(sessionG, series, color, strokeWidth);
  }
}

function _renderMeanLine(
  g: d3.Selection<SVGGElement, unknown, SVGGElement, unknown>,
  series: SessionHourlyEnmo[],
  color: string,
  strokeWidth: number,
): void {
  if (series.length === 0) return;

  const lineGenerator = d3.lineRadial<SessionHourlyEnmo>()
    .angle((d) => hourAngle(d.hour))
    .radius((d) => enmoToRadius(d.enmo_mean))
    .curve(d3.curveLinearClosed);

  g.append('path')
    .datum(series)
    .attr('d', lineGenerator)
    .attr('fill', 'none')
    .attr('stroke', color)
    .attr('stroke-width', strokeWidth)
    .attr('stroke-linejoin', 'round');
}

function _renderSdBand(
  g: d3.Selection<SVGGElement, unknown, SVGGElement, unknown>,
  series: SessionHourlyEnmo[],
  color: string,
): void {
  const outerPoints = series.map((d) => {
    const r = enmoToRadius(d.enmo_mean + (d.enmo_sd ?? 0));
    const a = hourAngle(d.hour);
    return polar(0, 0, r, a);
  });
  const innerPoints = [...series].reverse().map((d) => {
    const r = enmoToRadius(Math.max(0, d.enmo_mean - (d.enmo_sd ?? 0)));
    const a = hourAngle(d.hour);
    return polar(0, 0, r, a);
  });

  const allPoints = [...outerPoints, ...innerPoints];
  const pathData =
    allPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ') + ' Z';

  g.append('path')
    .attr('d', pathData)
    .attr('fill', color)
    .attr('fill-opacity', 0.2)
    .attr('stroke', 'none');
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function _countLegendRows(rows: SessionHourlyEnmo[]): number {
  const sessions = new Set(
    rows.filter((r) => r.group === 'intervention').map((r) => r.session_number),
  );
  const hasObs = rows.some((r) => r.group === 'observational');
  return sessions.size + (hasObs ? 1 : 0) + 2;
}

function _renderLegend(
  card: d3.Selection<SVGGElement, unknown, SVGSVGElement, unknown>,
  clockG: d3.Selection<SVGGElement, unknown, SVGGElement, unknown>,
  rows: SessionHourlyEnmo[],
  legendH: number,
  cardH: number,
): void {
  const legendY = cardH - legendH + LEGEND_TOP_GAP;
  const legendX = CARD_PAD;
  const legendG = card.append('g').attr('transform', `translate(${legendX},${legendY})`);

  let itemY = 0;

  // Intervention session lines — interactive
  const sessions = [
    ...new Set(
      rows.filter((r) => r.group === 'intervention').map((r) => r.session_number),
    ),
  ].sort((a, b) => a - b);

  for (const ses of sessions) {
    const color = SESSION_COLORS[ses] ?? SESSION_COLORS[1];
    const maxN = Math.max(
      ...rows
        .filter((r) => r.group === 'intervention' && r.session_number === ses)
        .map((r) => r.n_participants),
    );
    _interactiveLegendLine(
      legendG, clockG,
      `intervention__${ses}`,
      itemY, color, 2.5,
      `Session ${ses} (n=${maxN})`,
    );
    itemY += LEGEND_ITEM_H;
  }

  // Observational line — interactive
  const hasObs = rows.some((r) => r.group === 'observational');
  if (hasObs) {
    const obsN = Math.max(
      ...rows.filter((r) => r.group === 'observational').map((r) => r.n_participants),
    );
    _interactiveLegendLine(
      legendG, clockG,
      'observational__1',
      itemY, COLORS.observational, 1.5,
      `Observational (n=${obsN})`,
    );
    itemY += LEGEND_ITEM_H;
  }

  // Non-interactive: SD band swatch
  _legendSwatch(legendG, itemY, sessions[0] ? SESSION_COLORS[sessions[0]] : COLORS.intervention, '±1 SD band');
  itemY += LEGEND_ITEM_H;

  // Non-interactive: MVPA threshold
  _legendDashed(legendG, itemY, COLORS.textSecondary, 'MVPA threshold (100mg)');
}

// ─── Interactive legend row ───────────────────────────────────────────────────

function _interactiveLegendLine(
  g: d3.Selection<SVGGElement, unknown, SVGGElement, unknown>,
  clockG: d3.Selection<SVGGElement, unknown, SVGGElement, unknown>,
  sessionKey: string,
  y: number,
  color: string,
  strokeWidth: number,
  label: string,
): void {
  const rowG = g.append('g').style('cursor', 'pointer');

  // Hover highlight background (transparent until hover)
  const hitBg = rowG.append('rect')
    .attr('x', -6)
    .attr('y', y - 1)
    .attr('width', LEGEND_HIT_W)
    .attr('height', LEGEND_ITEM_H + 1)
    .attr('rx', 4)
    .attr('fill', 'rgba(255,255,255,0)')
    .attr('stroke', 'none');

  // Swatch line
  rowG.append('line')
    .attr('x1', 0).attr('y1', y + LEGEND_ITEM_H / 2)
    .attr('x2', LEGEND_SWATCH_W).attr('y2', y + LEGEND_ITEM_H / 2)
    .attr('stroke', color).attr('stroke-width', strokeWidth);

  // Label text
  rowG.append('text')
    .attr('x', LEGEND_SWATCH_W + 6).attr('y', y + LEGEND_ITEM_H / 2 + 1)
    .attr('font-family', 'DM Sans, Inter, -apple-system, sans-serif')
    .attr('font-size', 12).attr('font-weight', 400)
    .attr('fill', COLORS.textSecondary)
    .attr('dominant-baseline', 'central')
    .text(label);

  rowG
    .on('mouseover', function () {
      // Highlight background
      hitBg.attr('fill', 'rgba(255,255,255,0.05)');
      // Dim all session groups…
      clockG.selectAll<SVGGElement, unknown>('.session-group')
        .transition().duration(150)
        .attr('opacity', 0.07);
      // …then bring this one back to full
      clockG.select<SVGGElement>(`.session-group[data-session-key="${sessionKey}"]`)
        .transition().duration(150)
        .attr('opacity', 1);
    })
    .on('mouseout', function () {
      hitBg.attr('fill', 'rgba(255,255,255,0)');
      clockG.selectAll<SVGGElement, unknown>('.session-group')
        .transition().duration(200)
        .attr('opacity', 1);
    });
}

// ─── Static legend helpers ────────────────────────────────────────────────────

function _legendSwatch(
  g: d3.Selection<SVGGElement, unknown, SVGGElement, unknown>,
  y: number,
  color: string,
  label: string,
): void {
  g.append('rect')
    .attr('x', 0).attr('y', y + (LEGEND_ITEM_H - LEGEND_SWATCH_H) / 2)
    .attr('width', LEGEND_SWATCH_W).attr('height', LEGEND_SWATCH_H)
    .attr('fill', color).attr('fill-opacity', 0.2)
    .attr('stroke', color).attr('stroke-width', 1);
  g.append('text')
    .attr('x', LEGEND_SWATCH_W + 6).attr('y', y + LEGEND_ITEM_H / 2 + 1)
    .attr('font-family', 'DM Sans, Inter, -apple-system, sans-serif')
    .attr('font-size', 12).attr('font-weight', 400)
    .attr('fill', COLORS.textSecondary)
    .attr('dominant-baseline', 'central')
    .text(label);
}

function _legendDashed(
  g: d3.Selection<SVGGElement, unknown, SVGGElement, unknown>,
  y: number,
  color: string,
  label: string,
): void {
  g.append('line')
    .attr('x1', 0).attr('y1', y + LEGEND_ITEM_H / 2)
    .attr('x2', LEGEND_SWATCH_W).attr('y2', y + LEGEND_ITEM_H / 2)
    .attr('stroke', color).attr('stroke-width', 1)
    .attr('stroke-dasharray', '4 3');
  g.append('text')
    .attr('x', LEGEND_SWATCH_W + 6).attr('y', y + LEGEND_ITEM_H / 2 + 1)
    .attr('font-family', 'DM Sans, Inter, -apple-system, sans-serif')
    .attr('font-size', 12).attr('font-weight', 400)
    .attr('fill', COLORS.textSecondary)
    .attr('dominant-baseline', 'central')
    .text(label);
}
