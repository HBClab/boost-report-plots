import * as d3 from 'd3';
import { renderPlot1 } from './plot1.js';
import { getPlot2Height, renderPlot2 } from './plot2.js';
import { renderPlot3 } from './plot3.js';
import { initSaveButton } from './save.js';
import { COLORS } from './constants.js';
import type { Plot1ApiResponse, Plot2ApiResponse, Plot3ApiResponse } from './types.js';

// ─── Canvas layout (1440×1024px, from docs/plot-specs/act.md v3.0) ──────────
// Plot 1: x=60, y=40,  w=1320, h=296  (both groups in one stacked bar)
// Plot 2: x=60, y=375, w=640,  h=610  (participant × session heatmap)
// Plot 3: x=740, y=375, w=640, h=610  (radial activity clock, per-session lines)
const CANVAS_W = 1440;
const CANVAS_MIN_H = 1024;
const LAYOUTS = {
  plot1:  { x: 60,  y: 40,  w: 1320, h: 296 },
  plot2:  { x: 60,  y: 375, w: 640,  h: 610 },
  plot3:  { x: 740, y: 375, w: 640,  h: 610 },
} as const;

async function main(): Promise<void> {
  const svg = d3.select<SVGSVGElement, unknown>('#canvas');
  if (svg.empty()) {
    console.error('SVG #canvas not found');
    return;
  }

  // Canvas background
  const background = svg.append('rect')
    .attr('x', 0).attr('y', 0)
    .attr('width', CANVAS_W).attr('height', CANVAS_MIN_H)
    .attr('fill', COLORS.background);

  // Remove loading placeholder
  svg.select('#loading').remove();

  // Fetch all data in parallel
  let intResp: Plot1ApiResponse;
  let plot2Resp: Plot2ApiResponse;
  let plot3Resp: Plot3ApiResponse;

  try {
    [intResp, plot2Resp, plot3Resp] = await Promise.all([
      fetch('/api/plot1/intervention').then(r => r.json()) as Promise<Plot1ApiResponse>,
      fetch('/api/plot2').then(r => r.json()) as Promise<Plot2ApiResponse>,
      fetch('/api/plot3').then(r => r.json()) as Promise<Plot3ApiResponse>,
    ]);
  } catch (err) {
    svg.append('text')
      .attr('x', 720).attr('y', 512)
      .attr('text-anchor', 'middle')
      .attr('font-size', 14)
      .attr('fill', '#DE4545')
      .attr('font-family', 'Inter, -apple-system, sans-serif')
      .text(`Failed to load data: ${String(err)}`);
    return;
  }

  const plot2Height = Math.max(LAYOUTS.plot2.h, getPlot2Height(plot2Resp.subjects.length));
  const canvasHeight = Math.max(CANVAS_MIN_H, LAYOUTS.plot2.y + plot2Height + 40);
  svg
    .attr('width', CANVAS_W)
    .attr('height', canvasHeight)
    .attr('viewBox', `0 0 ${CANVAS_W} ${canvasHeight}`);
  background.attr('height', canvasHeight);

  // Render Plot 1 — Intervention stacked bar (top card)
  renderPlot1(svg, intResp.rows, 'Intervention', LAYOUTS.plot1);

  // Render Plot 2 — Participant × session heatmap (lower-left card)
  renderPlot2(svg, plot2Resp.subjects, { ...LAYOUTS.plot2, h: plot2Height });

  // Render Plot 3 — Radial activity clock, per-session lines (lower-right card)
  renderPlot3(svg, plot3Resp.rows, LAYOUTS.plot3);

  // Initialize Save SVG button
  const svgEl = document.getElementById('canvas') as SVGSVGElement | null;
  if (svgEl) {
    initSaveButton(svgEl, 'accelerometer-plots.svg');
  }
}

main().catch((err) => {
  console.error('Unhandled error in main:', err);
});
