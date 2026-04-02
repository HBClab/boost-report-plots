import * as d3 from 'd3';
import { renderPlot1 } from './plot1.js';
import { renderPlot2 } from './plot2.js';
import { initSaveButton } from './save.js';
import { COLORS } from './constants.js';
import type { Plot1ApiResponse, Plot2ApiResponse } from './types.js';

// ─── Canvas layout (1440×1024px, from docs/plot-specs/act.md v2.1) ──────────
const LAYOUTS = {
  plot1Intervention: { x: 60, y: 40,  w: 1320, h: 296 },
  plot1Observational: { x: 60, y: 375, w: 640,  h: 296 },
  plot2:             { x: 740, y: 375, w: 640,  h: 610 },
} as const;

async function main(): Promise<void> {
  const svg = d3.select<SVGSVGElement, unknown>('#canvas');
  if (svg.empty()) {
    console.error('SVG #canvas not found');
    return;
  }

  // Canvas background
  svg.append('rect')
    .attr('x', 0).attr('y', 0)
    .attr('width', 1440).attr('height', 1024)
    .attr('fill', COLORS.background);

  // Remove loading placeholder
  svg.select('#loading').remove();

  // Fetch all data in parallel
  let intResp: Plot1ApiResponse;
  let obsResp: Plot1ApiResponse;
  let plot2Resp: Plot2ApiResponse;

  try {
    [intResp, obsResp, plot2Resp] = await Promise.all([
      fetch('/api/plot1/intervention').then(r => r.json()) as Promise<Plot1ApiResponse>,
      fetch('/api/plot1/observational').then(r => r.json()) as Promise<Plot1ApiResponse>,
      fetch('/api/plot2').then(r => r.json()) as Promise<Plot2ApiResponse>,
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

  // Render Plot 1 — Intervention (top card)
  renderPlot1(svg, intResp.rows, 'Intervention', LAYOUTS.plot1Intervention);

  // Render Plot 1 — Observational (lower-left card)
  renderPlot1(svg, obsResp.rows, 'Observational', LAYOUTS.plot1Observational);

  // Render Plot 2 — Intervention heatmap (lower-right card)
  renderPlot2(svg, plot2Resp.subjects, LAYOUTS.plot2);

  // Initialize Save SVG button
  const svgEl = document.getElementById('canvas') as SVGSVGElement | null;
  if (svgEl) {
    initSaveButton(svgEl, 'accelerometer-plots.svg');
  }
}

main().catch((err) => {
  console.error('Unhandled error in main:', err);
});
