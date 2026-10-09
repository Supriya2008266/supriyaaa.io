// charts.js — tiny inline-SVG chart helpers (no libraries, no network).
// Each helper returns an HTML string. Colours come from CSS classes in style.css so
// the charts follow light/dark mode. Every chart has a text alternative.

import { esc } from './util.js';

/** Horizontal bar chart. items: [{ label, value, cls }] */
export function barChart(items, { ariaLabel = 'Bar chart' } = {}) {
  if (!items.length || items.every((i) => !i.value)) return emptyChart('No data yet');
  const rowH = 36;
  const labelW = 150;
  const W = 440;
  const barMax = W - labelW - 44;
  const max = Math.max(1, ...items.map((i) => i.value));
  const rows = items.map((it, i) => {
    const w = Math.max(it.value ? 6 : 0, Math.round((it.value / max) * barMax));
    return `<g transform="translate(0 ${i * rowH})">
      <text class="ch-label" x="0" y="23">${esc(it.label)}</text>
      <rect class="ch-track" x="${labelW}" y="8" width="${barMax}" height="20" rx="8"/>
      <rect class="ch-bar ${it.cls || 'c1'}" x="${labelW}" y="8" width="${w}" height="20" rx="8" style="animation-delay:${i * 70}ms"/>
      <text class="ch-val" x="${labelW + barMax + 10}" y="23">${it.value}</text>
    </g>`;
  }).join('');
  const summary = items.map((i) => `${i.label}: ${i.value}`).join(', ');
  return `<svg class="chart" viewBox="0 0 ${W} ${items.length * rowH}" role="img" aria-label="${esc(ariaLabel)}. ${esc(summary)}">${rows}</svg>`;
}

/** Donut chart with a legend. items: [{ label, value, cls }] */
export function donutChart(items, { ariaLabel = 'Donut chart', centerLabel = 'total' } = {}) {
  const total = items.reduce((s, i) => s + i.value, 0);
  if (!total) return emptyChart('No data yet');
  const r = 52;
  const C = 2 * Math.PI * r;
  const visible = items.filter((i) => i.value > 0);
  let offset = 0;
  const segs = visible.map((it) => {
    const len = (it.value / total) * C;
    const gap = visible.length > 1 ? 2.5 : 0;
    const dash = Math.max(len - gap, 0.5);
    const seg = `<circle class="ch-seg ${it.cls || 'c1'}" cx="70" cy="70" r="${r}" fill="none" stroke-width="20"
      stroke-dasharray="${dash.toFixed(2)} ${(C - dash).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 70 70)"/>`;
    offset += len;
    return seg;
  }).join('');
  const legend = items.map((it) => `<li><span class="sw ${it.cls || 'c1'}"></span><span class="lg-label">${esc(it.label)}</span><strong>${it.value}</strong></li>`).join('');
  const summary = items.map((i) => `${i.label}: ${i.value}`).join(', ');
  return `<div class="donut-wrap">
    <svg class="chart donut" viewBox="0 0 140 140" role="img" aria-label="${esc(ariaLabel)}. ${esc(summary)}">
      <circle class="ch-track-ring" cx="70" cy="70" r="${r}" fill="none" stroke-width="20"/>
      ${segs}
      <text class="ch-center" x="70" y="68" text-anchor="middle">${total}</text>
      <text class="ch-center-sub" x="70" y="86" text-anchor="middle">${esc(centerLabel)}</text>
    </svg>
    <ul class="legend">${legend}</ul>
  </div>`;
}

/** Progress meter, e.g. reward spend vs the monthly limit. */
export function meterChart({ value, max, prefix = '', ariaLabel = 'Meter' }) {
  const safeMax = Math.max(0, Number(max) || 0);
  const pct = safeMax ? Math.min(100, (value / safeMax) * 100) : (value > 0 ? 100 : 0);
  const state = pct >= 100 ? 'over' : pct >= 80 ? 'warn' : 'ok';
  return `<div class="meter ${state}">
    <div class="meter-top"><span class="meter-big">${prefix}<span class="countup" data-to="${value}">${value}</span></span>
      <span class="meter-of">of ${prefix}${safeMax} monthly limit</span></div>
    <svg class="chart meter-svg" viewBox="0 0 300 16" role="img" aria-label="${esc(ariaLabel)}: ${prefix}${value} of ${prefix}${safeMax}">
      <rect class="m-track" width="300" height="16" rx="8"/>
      <rect class="m-fill" width="${Math.max(pct ? 8 : 0, pct * 3).toFixed(1)}" height="16" rx="8"/>
    </svg>
    <p class="meter-note">${Math.round(pct)}% of the budget used${state === 'over' ? ' — the limit is reached, so new rewards are blocked.' : state === 'warn' ? ' — nearly at the limit.' : '.'}</p>
  </div>`;
}

function emptyChart(msg) {
  return `<p class="chart-empty">${esc(msg)}</p>`;
}
