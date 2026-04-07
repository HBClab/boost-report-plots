import * as d3 from 'd3';
import { renderPlot1, type SessionView } from './plot1.js';
import { getPlot2Height, renderPlot2 } from './plot2.js';
import { renderPlot3 } from './plot3.js';
import { initSaveButton } from './save.js';
import { COLORS } from './constants.js';
import { renderHrPlot1 } from './hr-plot1.js';
import { renderHrAdherenceTrend, renderHrHeatmapCard, getHrHeatmapCardHeight } from './hr-plot2.js';
import { buildHrDashboardData } from './hr-transforms.js';
import type { Plot1ApiResponse, Plot2ApiResponse, Plot3ApiResponse, DayTypeAggregate } from './types.js';
import type { HrDashboardData } from './hr-types.js';

// ─── Canvas & layout ─────────────────────────────────────────────────────────
const CANVAS_W = 1440;

// ACT layouts
const ACT_LAYOUTS = {
  plot1: { x: 60,  y: 40,  w: 1320, h: 560 },
  plot2: { x: 60,  y: 640, w: 640,  h: 640 },
  plot3: { x: 740, y: 640, w: 640,  h: 640 },
} as const;

// HR layouts (matching original HR dashboard proportions)
const HR_LAYOUTS = {
  plot1: { x: 60,  y: 40,  w: 620,  h: 380 },
  trend: { x: 723, y: 40,  w: 660,  h: 390 },
  // heatmap h is computed from roster size at render time
  heatmap: { x: 60, y: 460, w: 1323, h: 0 },
} as const;

// ─── Zoom modal ──────────────────────────────────────────────────────────────
type ZoomPlotId = 'plot1' | 'plot2' | 'plot3' | 'hr-plot1' | 'hr-trend' | 'hr-heatmap';

type ZoomSpec = {
  width: number;
  height: number;
  allowScroll: boolean;
  render: (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) => void;
};

function openZoomModal(spec: ZoomSpec): void {
  const modal   = document.getElementById('zoom-modal');
  const zoomSvg = document.getElementById('zoom-svg') as SVGSVGElement | null;
  const modalInner = modal?.querySelector('.zoom-modal-inner') as HTMLDivElement | null;
  if (!modal || !zoomSvg || !modalInner) return;

  const svg = d3.select<SVGSVGElement, unknown>(zoomSvg);
  svg.selectAll('*').remove();
  svg.attr('viewBox', `0 0 ${spec.width} ${spec.height}`);

  const widthScale = Math.min((window.innerWidth * 0.9) / spec.width, 1.4);
  const heightScale = Math.min((window.innerHeight * 0.82) / spec.height, 1.4);
  const scale = spec.allowScroll ? widthScale : Math.min(widthScale, heightScale);

  zoomSvg.setAttribute('width', String(Math.round(spec.width * scale)));
  zoomSvg.setAttribute('height', String(Math.round(spec.height * scale)));
  modalInner.style.overflowX = spec.allowScroll ? 'auto' : 'hidden';
  modalInner.style.overflowY = spec.allowScroll ? 'auto' : 'hidden';

  spec.render(svg);
  modal.classList.add('active');
}

function buildZoomSpec(
  zoomId: ZoomPlotId,
  actData: {
    intAll: DayTypeAggregate[];
    obsAll: DayTypeAggregate[];
    intBase: DayTypeAggregate[];
    obsBase: DayTypeAggregate[];
    plot2Resp: Plot2ApiResponse;
    plot3Resp: Plot3ApiResponse;
  },
  getSessionView: () => SessionView,
  hrData: HrDashboardData | null
): ZoomSpec | null {
  switch (zoomId) {
    case 'plot1':
      return {
        width: ACT_LAYOUTS.plot1.w,
        height: ACT_LAYOUTS.plot1.h,
        allowScroll: false,
        render: (svg) => {
          const sessionView = getSessionView();
          const intData = sessionView === 'all' ? actData.intAll : actData.intBase;
          const obsData = sessionView === 'all' ? actData.obsAll : actData.obsBase;
          renderPlot1(svg, intData, obsData, { x: 0, y: 0, w: ACT_LAYOUTS.plot1.w, h: ACT_LAYOUTS.plot1.h }, {
            current: sessionView,
            onToggle: () => {},
          });
        },
      };
    case 'plot2': {
      const height = Math.max(ACT_LAYOUTS.plot2.h, getPlot2Height(actData.plot2Resp.subjects.length));
      return {
        width: ACT_LAYOUTS.plot2.w,
        height,
        allowScroll: true,
        render: (svg) => {
          renderPlot2(svg, actData.plot2Resp.subjects, { x: 0, y: 0, w: ACT_LAYOUTS.plot2.w, h: height });
        },
      };
    }
    case 'plot3':
      return {
        width: ACT_LAYOUTS.plot3.w,
        height: ACT_LAYOUTS.plot3.h,
        allowScroll: false,
        render: (svg) => {
          renderPlot3(svg, actData.plot3Resp.rows, { x: 0, y: 0, w: ACT_LAYOUTS.plot3.w, h: ACT_LAYOUTS.plot3.h });
        },
      };
    case 'hr-plot1':
      if (!hrData) return null;
      return {
        width: HR_LAYOUTS.plot1.w,
        height: HR_LAYOUTS.plot1.h,
        allowScroll: false,
        render: (svg) => {
          renderHrPlot1(svg, hrData.zoneSummaries, { x: 0, y: 0, w: HR_LAYOUTS.plot1.w, h: HR_LAYOUTS.plot1.h });
        },
      };
    case 'hr-trend':
      if (!hrData) return null;
      return {
        width: HR_LAYOUTS.trend.w,
        height: HR_LAYOUTS.trend.h,
        allowScroll: false,
        render: (svg) => {
          renderHrAdherenceTrend(svg, hrData.adherenceSummaries, { x: 0, y: 0, w: HR_LAYOUTS.trend.w, h: HR_LAYOUTS.trend.h });
        },
      };
    case 'hr-heatmap':
      if (!hrData) return null;
      return {
        width: HR_LAYOUTS.heatmap.w,
        height: getHrHeatmapCardHeight(hrData.roster.length),
        allowScroll: true,
        render: (svg) => {
          const height = getHrHeatmapCardHeight(hrData.roster.length);
          renderHrHeatmapCard(svg, hrData.subjectSummaries, hrData.roster, { x: 0, y: 0, w: HR_LAYOUTS.heatmap.w, h: height });
        },
      };
    default:
      return null;
  }
}

function addZoomButton(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  layout: { x: number; y: number; w: number; h: number },
  zoomId: ZoomPlotId,
  onOpen: (zoomId: ZoomPlotId) => void
): void {
  svg.selectAll(`[data-zoom="${zoomId}"]`).remove();
  const BW = 22, BH = 22;
  const btnG = svg.append('g')
    .attr('class', 'zoom-btn-group').attr('data-zoom', zoomId)
    .attr('transform', `translate(${layout.x + layout.w - BW - 10},${layout.y + 10})`)
    .style('cursor', 'pointer');

  const bg = btnG.append('rect')
    .attr('width', BW).attr('height', BH).attr('rx', 4)
    .attr('fill', '#1A2440').attr('stroke', '#1E2C44').attr('stroke-width', 1);

  const ic = btnG.append('g').attr('transform', `translate(${BW / 2},${BH / 2})`);
  ic.append('polyline').attr('points', '-5,-5 -5,-2 -2,-5')
    .attr('fill', 'none').attr('stroke', '#6B7A90')
    .attr('stroke-width', 1.4).attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round');
  ic.append('line').attr('x1', -5).attr('y1', -5).attr('x2', -1).attr('y2', -1)
    .attr('stroke', '#6B7A90').attr('stroke-width', 1.4).attr('stroke-linecap', 'round');
  ic.append('polyline').attr('points', '5,5 5,2 2,5')
    .attr('fill', 'none').attr('stroke', '#6B7A90')
    .attr('stroke-width', 1.4).attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round');
  ic.append('line').attr('x1', 5).attr('y1', 5).attr('x2', 1).attr('y2', 1)
    .attr('stroke', '#6B7A90').attr('stroke-width', 1.4).attr('stroke-linecap', 'round');

  btnG
    .on('mouseenter', () => { bg.attr('fill', '#22C4D4').attr('opacity', 0.15); ic.selectAll('polyline,line').attr('stroke', '#22C4D4'); })
    .on('mouseleave', () => { bg.attr('fill', '#1A2440').attr('opacity', 1);    ic.selectAll('polyline,line').attr('stroke', '#6B7A90'); })
    .on('click', () => onOpen(zoomId));
}

// ─── Shared: resize canvas ────────────────────────────────────────────────────
function resizeCanvas(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  bgRect: d3.Selection<SVGRectElement, unknown, null, undefined>,
  h: number
): void {
  svg.attr('width', CANVAS_W).attr('height', h).attr('viewBox', `0 0 ${CANVAS_W} ${h}`);
  bgRect.attr('height', h);
}

// ─── ACT view ─────────────────────────────────────────────────────────────────
async function renderActView(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  bgRect: d3.Selection<SVGRectElement, unknown, null, undefined>,
  actData: {
    intAll: DayTypeAggregate[]; obsAll: DayTypeAggregate[];
    intBase: DayTypeAggregate[]; obsBase: DayTypeAggregate[];
    plot2Resp: Plot2ApiResponse; plot3Resp: Plot3ApiResponse;
  },
  onOpenZoom: (zoomId: ZoomPlotId) => void,
  onSessionViewChange: (view: SessionView) => void
): Promise<void> {
  // Clear all plots from previous view
  svg.selectAll('[data-plot]').remove();
  svg.selectAll('.zoom-btn-group').remove();

  const plot2Height = Math.max(ACT_LAYOUTS.plot2.h, getPlot2Height(actData.plot2Resp.subjects.length));
  const canvasH = Math.max(1300, ACT_LAYOUTS.plot2.y + plot2Height + 40);
  resizeCanvas(svg, bgRect, canvasH);

  // ── Plot 1 with inline session toggle ─────────────────────────────────────
  let sessionView: SessionView = 'all';
  onSessionViewChange(sessionView);

  function renderActPlot1(): void {
    onSessionViewChange(sessionView);
    const intData = sessionView === 'all' ? actData.intAll : actData.intBase;
    const obsData = sessionView === 'all' ? actData.obsAll : actData.obsBase;
    renderPlot1(svg, intData, obsData, { ...ACT_LAYOUTS.plot1 }, {
      current: sessionView,
      onToggle: (v) => {
        sessionView = v;
        renderActPlot1();
        addZoomButton(svg, ACT_LAYOUTS.plot1, 'plot1', onOpenZoom);
      },
    });
  }

  renderActPlot1();

  // ── Plot 2 & 3 ────────────────────────────────────────────────────────────
  renderPlot2(svg, actData.plot2Resp.subjects, { ...ACT_LAYOUTS.plot2, h: plot2Height });
  renderPlot3(svg, actData.plot3Resp.rows, ACT_LAYOUTS.plot3);

  // ── Zoom buttons ──────────────────────────────────────────────────────────
  addZoomButton(svg, ACT_LAYOUTS.plot1, 'plot1', onOpenZoom);
  addZoomButton(svg, ACT_LAYOUTS.plot2, 'plot2', onOpenZoom);
  addZoomButton(svg, { ...ACT_LAYOUTS.plot3 }, 'plot3', onOpenZoom);
}

// ─── HR view ──────────────────────────────────────────────────────────────────
let hrCache: HrDashboardData | null = null;

async function renderHrView(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  bgRect: d3.Selection<SVGRectElement, unknown, null, undefined>,
  onOpenZoom: (zoomId: ZoomPlotId) => void
): Promise<void> {
  // Clear all plots from previous view
  svg.selectAll('[data-plot]').remove();
  svg.selectAll('.zoom-btn-group').remove();

  // Show loading indicator while fetching
  const loading = svg.append('text')
    .attr('x', 720).attr('y', 300)
    .attr('text-anchor', 'middle').attr('font-size', 14)
    .attr('fill', COLORS.textSecondary)
    .attr('font-family', 'DM Mono, monospace')
    .text('Loading HR data…');

  // Lazy-load HR CSV data
  if (!hrCache) {
    try {
      const resp = await fetch('/data/zone_out.csv');
      if (!resp.ok) throw new Error(`CSV fetch failed: ${resp.status}`);
      const csv = await resp.text();
      const records = d3.csvParse(csv) as Array<Record<string, string>>;
      hrCache = buildHrDashboardData(records);
    } catch (err) {
      loading.attr('fill', '#F87171').text(`Failed to load HR data: ${String(err)}`);
      return;
    }
  }

  loading.remove();

  const data = hrCache;
  const heatmapH = getHrHeatmapCardHeight(data.roster.length);
  const hrHeatmapLayout = { ...HR_LAYOUTS.heatmap, h: heatmapH };
  const canvasH = HR_LAYOUTS.heatmap.y + heatmapH + 40;
  resizeCanvas(svg, bgRect, canvasH);

  renderHrPlot1(svg, data.zoneSummaries, HR_LAYOUTS.plot1);
  renderHrAdherenceTrend(svg, data.adherenceSummaries, HR_LAYOUTS.trend);
  renderHrHeatmapCard(svg, data.subjectSummaries, data.roster, hrHeatmapLayout);

  addZoomButton(svg, HR_LAYOUTS.plot1, 'hr-plot1', onOpenZoom);
  addZoomButton(svg, HR_LAYOUTS.trend,  'hr-trend', onOpenZoom);
  addZoomButton(svg, hrHeatmapLayout,   'hr-heatmap', onOpenZoom);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const svg = d3.select<SVGSVGElement, unknown>('#canvas');
  if (svg.empty()) { console.error('SVG #canvas not found'); return; }

  svg.select('#loading').remove();

  const bgRect = svg.append('rect')
    .attr('x', 0).attr('y', 0)
    .attr('width', CANVAS_W).attr('height', 1300)
    .attr('fill', COLORS.background);

  // ── Fetch ACT data upfront ─────────────────────────────────────────────────
  let intAllResp:  Plot1ApiResponse;
  let obsAllResp:  Plot1ApiResponse;
  let intBaseResp: Plot1ApiResponse;
  let obsBaseResp: Plot1ApiResponse;
  let plot2Resp:   Plot2ApiResponse;
  let plot3Resp:   Plot3ApiResponse;

  try {
    [intAllResp, obsAllResp, intBaseResp, obsBaseResp, plot2Resp, plot3Resp] = await Promise.all([
      fetch('/api/plot1/intervention').then(r => r.json())           as Promise<Plot1ApiResponse>,
      fetch('/api/plot1/observational').then(r => r.json())          as Promise<Plot1ApiResponse>,
      fetch('/api/plot1/intervention?session=1').then(r => r.json()) as Promise<Plot1ApiResponse>,
      fetch('/api/plot1/observational?session=1').then(r => r.json()) as Promise<Plot1ApiResponse>,
      fetch('/api/plot2').then(r => r.json())                        as Promise<Plot2ApiResponse>,
      fetch('/api/plot3').then(r => r.json())                        as Promise<Plot3ApiResponse>,
    ]);
  } catch (err) {
    svg.append('text')
      .attr('x', 720).attr('y', 512).attr('text-anchor', 'middle')
      .attr('font-size', 14).attr('fill', '#F87171')
      .attr('font-family', 'DM Sans, Inter, sans-serif')
      .text(`Failed to load ACT data: ${String(err)}`);
    return;
  }

  const actData = {
    intAll:  intAllResp.rows,  obsAll:  obsAllResp.rows,
    intBase: intBaseResp.rows, obsBase: obsBaseResp.rows,
    plot2Resp, plot3Resp,
  };

  // ── Dashboard view state ───────────────────────────────────────────────────
  type DashView = 'act' | 'hr';
  let dashView: DashView = 'act';
  let currentActSessionView: SessionView = 'all';

  function handleOpenZoom(zoomId: ZoomPlotId): void {
    const spec = buildZoomSpec(zoomId, actData, () => currentActSessionView, hrCache);
    if (spec) openZoomModal(spec);
  }

  async function switchView(view: DashView): Promise<void> {
    if (view === dashView && view === 'act') return; // already rendered on load

    dashView = view;

    // Update nav tab active states
    document.querySelectorAll<HTMLButtonElement>('.dash-tab').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.dash === view);
    });

    if (view === 'act') {
      await renderActView(svg, bgRect, actData, handleOpenZoom, (nextView) => {
        currentActSessionView = nextView;
      });
    } else {
      await renderHrView(svg, bgRect, handleOpenZoom);
    }
  }

  // ── Wire global nav tabs ───────────────────────────────────────────────────
  document.querySelectorAll<HTMLButtonElement>('.dash-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.dash as DashView;
      if (target !== dashView) switchView(target).catch(console.error);
    });
  });

  // ── Zoom modal handlers (once, shared across both views) ───────────────────
  const modal = document.getElementById('zoom-modal');
  document.getElementById('zoom-close')?.addEventListener('click', () => modal?.classList.remove('active'));
  modal?.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') modal?.classList.remove('active'); });

  // ── Export button ──────────────────────────────────────────────────────────
  const svgEl = document.getElementById('canvas') as SVGSVGElement | null;
  if (svgEl) initSaveButton(svgEl, 'boost-dashboard.svg');

  // ── Initial render: ACT view ───────────────────────────────────────────────
  await renderActView(svg, bgRect, actData, handleOpenZoom, (nextView) => {
    currentActSessionView = nextView;
  });
}

main().catch((err) => console.error('Unhandled error in main:', err));
