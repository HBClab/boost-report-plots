import * as d3 from 'd3';

import { initSaveButton } from './export-svg.js';
import { renderPlot1 } from './plot1.js';
import { getHeatmapCardHeight, renderAdherenceTrend, renderHeatmapCard } from './plot2.js';
import { buildDashboardData } from './transforms.js';
import type { CardLayout } from './types.js';

function buildDashboardLayout(rosterSize: number): {
  plot1: CardLayout;
  trend: CardLayout;
  heatmap: CardLayout;
  canvasHeight: number;
} {
  const plot1 = { x: 60, y: 50, width: 620, height: 380 };
  const trend = { x: 723, y: 40, width: 660, height: 390 };
  const heatmapHeight = getHeatmapCardHeight(rosterSize);
  const heatmap = { x: 60, y: 460, width: 1323, height: heatmapHeight };
  const canvasHeight = heatmap.y + heatmap.height + 40;
  return { plot1, trend, heatmap, canvasHeight };
}

async function loadDashboard(): Promise<void> {
  const response = await fetch('/data/zone_out.csv');
  if (!response.ok) {
    throw new Error(`Failed to load CSV: ${response.status}`);
  }

  const csvText = await response.text();
  const records = d3.csvParse(csvText);
  const dashboardData = buildDashboardData(records as Array<Record<string, string>>);
  const layout = buildDashboardLayout(dashboardData.roster.length);

  const svgNode = document.getElementById('dashboard');
  if (!(svgNode instanceof SVGSVGElement)) {
    throw new Error('Dashboard SVG not found');
  }

  svgNode.setAttribute('viewBox', `0 0 1440 ${layout.canvasHeight}`);
  svgNode.setAttribute('height', String(layout.canvasHeight));

  const svg = d3.select<SVGSVGElement, unknown>(svgNode);
  svg.selectAll('*').remove();
  svg
    .append('rect')
    .attr('width', 1440)
    .attr('height', layout.canvasHeight)
    .attr('fill', '#fafafc');

  renderPlot1(svg, dashboardData.zoneSummaries, layout.plot1);
  renderAdherenceTrend(
    svg,
    dashboardData.adherenceSummaries,
    layout.trend
  );
  renderHeatmapCard(
    svg,
    dashboardData.subjectSummaries,
    dashboardData.roster,
    layout.heatmap
  );

  initSaveButton(svgNode, 'hr-zone-analysis-dashboard.svg');
}

loadDashboard().catch((error) => {
  console.error(error);
  const svgNode = document.getElementById('dashboard');
  if (svgNode instanceof SVGSVGElement) {
      const svg = d3.select<SVGSVGElement, unknown>(svgNode);
    svg
      .append('text')
      .attr('x', 80)
      .attr('y', 80)
      .attr('fill', '#f04545')
      .attr('font-size', 16)
      .attr('font-weight', 700)
      .text('Failed to load HR dashboard data');
    svg
      .append('text')
      .attr('x', 80)
      .attr('y', 106)
      .attr('fill', '#80808f')
      .attr('font-size', 12)
      .text(String(error));
  }
});
