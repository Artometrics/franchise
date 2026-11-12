import { line as d3line, scaleLinear } from 'd3';
import { escapeHtml } from './format';

export type Role = 'accent' | 'second' | 'base' | 'merch' | 'games' | 'box' | 'other' | 'unalloc' | 'cream';

export interface BarRow {
  label: string;
  sub?: string;
  value: number;
  text: string;
  role?: Role;
}

export interface BarsSpec {
  type: 'bars';
  rows: BarRow[];
  ariaLabel: string;
  unitLabel?: string;
}

export interface StackedSpec {
  type: 'stacked';
  rows: { label: string; sub?: string; parts: { role: Role; value: number; label: string }[] }[];
  legend: { role: Role; label: string }[];
  ariaLabel: string;
}

export interface GroupedSpec {
  type: 'grouped';
  series: { key: string; label: string; role: Role }[];
  groups: { label: string; values: ({ value: number; text: string } | null)[] }[];
  ariaLabel: string;
}

export interface LineSpec {
  type: 'line';
  points: { x: number; y: number; text: string }[];
  yMax: number;
  ariaLabel: string;
  xLabel?: string;
  yLabel?: string;
}

export type ChartSpec = BarsSpec | StackedSpec | GroupedSpec | LineSpec;

/* ---------- Plotly JSON adapter (article charts are redrawn, not re-keyed) ---------- */

interface PlotlyTrace {
  type: string;
  orientation?: string;
  x: (number | string)[];
  y: (number | string)[];
  text?: string[];
  marker?: { color?: string | string[] };
}

interface PlotlyJson {
  data: PlotlyTrace[];
  layout: {
    title?: { text?: string };
    annotations?: { text?: string }[];
    yaxis?: { title?: { text?: string } };
    xaxis?: { title?: { text?: string } };
  };
}

export function roleFromColor(c: string | undefined): Role {
  const v = (c ?? '').toLowerCase();
  if (v === '#e60000') return 'accent';
  if (v === '#1f4b99') return 'second';
  return 'base';
}

export function stripTags(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

export function splitLabel(raw: string): { label: string; sub?: string } {
  const parts = raw.split(/\s{2,}/).map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return { label: raw.trim() };
  return { label: parts[0], sub: parts.slice(1).join(' ') };
}

export interface AdaptedChart {
  spec: ChartSpec;
  headline: string;
  subtitle: string;
  source: string;
}

export function plotlyToSpec(json: PlotlyJson, ariaLabel?: string): AdaptedChart {
  const [h, ...rest] = stripTags(json.layout.title?.text ?? '').split('\n');
  const headline = h?.trim() ?? '';
  const subtitle = rest.join(' ').trim();
  const source = stripTags(json.layout.annotations?.[0]?.text ?? '');
  const t = json.data[0];
  if (!t) throw new Error('Plotly JSON has no traces');
  if (t.type === 'scatter') {
    const xs = t.x.map(Number);
    const ys = t.y.map(Number);
    const spec: LineSpec = {
      type: 'line',
      points: xs.map((x, i) => ({ x, y: ys[i], text: t.text?.[i] ?? String(ys[i]) })),
      yMax: 100,
      ariaLabel: ariaLabel ?? headline,
    };
    return { spec, headline, subtitle, source };
  }
  const colors = Array.isArray(t.marker?.color) ? t.marker!.color : t.y.map(() => t.marker?.color as string | undefined);
  const rows: BarRow[] = t.y.map((yv, i) => {
    const { label, sub } = splitLabel(String(yv));
    const value = Number(t.x[i]);
    return { label, sub, value, text: t.text?.[i] ?? String(value), role: roleFromColor(colors[i] as string | undefined) };
  });
  return { spec: { type: 'bars', rows, ariaLabel: ariaLabel ?? headline }, headline, subtitle, source };
}

/* ---------- HTML renderers (used at build time and in the browser) ---------- */

function pct(n: number): string {
  return `${Math.round(n * 100) / 100}%`;
}

export function barsHtml(spec: BarsSpec): string {
  const vals = spec.rows.map((r) => r.value);
  const min = Math.min(0, ...vals);
  const max = Math.max(0, ...vals);
  const pad = max > 0 ? max * 0.18 : 0;
  const lo = min < 0 ? min - Math.abs(min) * 0.18 : 0;
  const x = scaleLinear().domain([lo, max + pad]).range([0, 100]);
  const zero = x(0);
  const rows = spec.rows
    .map((r) => {
      const a = Math.min(x(r.value), zero);
      const w = Math.abs(x(r.value) - zero);
      const end = r.value >= 0 ? a + w : a;
      const inside = r.value >= 0 && end > 80;
      const valStyle = r.value < 0 ? `right:${pct(100 - end)};padding-right:6px` : inside ? `right:${pct(100 - end)};padding-right:6px` : `left:${pct(end)};padding-left:6px`;
      const sub = r.sub ? `<span class="cb-sub">${escapeHtml(r.sub)}</span>` : '';
      return `<div class="cb-row"><div class="cb-label"><span class="cb-name">${escapeHtml(r.label)}</span>${sub}</div><div class="cb-track">${
        min < 0 ? `<i class="cb-zero" style="left:${pct(zero)}"></i>` : ''
      }<i class="cb-bar r-${r.role ?? 'accent'}" style="left:${pct(a)};width:${pct(w)}"></i><b class="cb-val${inside ? ' in' : ''}" style="${valStyle}">${escapeHtml(r.text)}</b></div></div>`;
    })
    .join('');
  return `<div class="cbars" role="img" aria-label="${escapeHtml(spec.ariaLabel)}">${rows}</div>`;
}

export function stackedHtml(spec: StackedSpec): string {
  const legend = spec.legend.map((l) => `<li><i class="sw r-${l.role}"></i>${escapeHtml(l.label)}</li>`).join('');
  const rows = spec.rows
    .map((r) => {
      const total = r.parts.reduce((a, p) => a + p.value, 0) || 1;
      const segs = r.parts
        .filter((p) => p.value > 0)
        .map((p) => {
          const w = (p.value / total) * 100;
          return `<i class="cs-seg r-${p.role}" style="width:${pct(w)}" title="${escapeHtml(p.label)}">${w >= 9 ? `<b>${Math.round(w)}%</b>` : ''}</i>`;
        })
        .join('');
      const sub = r.sub ? `<span class="cb-sub">${escapeHtml(r.sub)}</span>` : '';
      return `<div class="cb-row"><div class="cb-label"><span class="cb-name">${escapeHtml(r.label)}</span>${sub}</div><div class="cs-track">${segs}</div></div>`;
    })
    .join('');
  return `<div class="cstack" role="img" aria-label="${escapeHtml(spec.ariaLabel)}"><ul class="legend">${legend}</ul>${rows}</div>`;
}

export function groupedHtml(spec: GroupedSpec): string {
  const all = spec.groups.flatMap((g) => g.values.map((v) => v?.value ?? 0));
  const max = Math.max(1e-9, ...all);
  const x = scaleLinear().domain([0, max * 1.25]).range([0, 100]);
  const legend = spec.series.map((s) => `<li><i class="sw r-${s.role}"></i>${escapeHtml(s.label)}</li>`).join('');
  const groups = spec.groups
    .map((g) => {
      const bars = g.values
        .map((v, i) => {
          const s = spec.series[i];
          const w = v ? x(v.value) : 0;
          const inside = w > 80;
          const valStyle = inside ? `right:${pct(100 - w)};padding-right:6px` : `left:${pct(w)};padding-left:6px`;
          return `<div class="cg-line"><span class="cg-name" title="${escapeHtml(s.label)}">${escapeHtml(s.label)}</span><div class="cb-track">${
            v ? `<i class="cb-bar r-${s.role}" style="left:0;width:${pct(w)}"></i><b class="cb-val${inside ? ' in' : ''}" style="${valStyle}">${escapeHtml(v.text)}</b>` : `<b class="cb-val none" style="left:0;padding-left:6px">none listed</b>`
          }</div></div>`;
        })
        .join('');
      return `<div class="cg-group"><div class="cb-label"><span class="cb-name">${escapeHtml(g.label)}</span></div>${bars}</div>`;
    })
    .join('');
  return `<div class="cgrouped" role="img" aria-label="${escapeHtml(spec.ariaLabel)}"><ul class="legend">${legend}</ul>${groups}</div>`;
}

export function lineSvg(spec: LineSpec): string {
  const W = 360;
  const H = 230;
  const m = { t: 26, r: 18, b: 34, l: 38 };
  const xs = spec.points.map((p) => p.x);
  const x = scaleLinear().domain([Math.min(...xs), Math.max(...xs)]).range([m.l, W - m.r]);
  const y = scaleLinear().domain([0, spec.yMax]).range([H - m.b, m.t]);
  const path = d3line<{ x: number; y: number }>().x((d) => x(d.x)).y((d) => y(d.y))(spec.points) ?? '';
  const grid = [0, 25, 50, 75, 100]
    .filter((v) => v <= spec.yMax)
    .map((v) => `<line class="ln-grid" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/><text class="ln-tick" x="${m.l - 6}" y="${y(v) + 4}" text-anchor="end">${v}%</text>`)
    .join('');
  const pts = spec.points
    .map(
      (p) =>
        `<circle class="ln-dot" cx="${x(p.x)}" cy="${y(p.y)}" r="4.5"/><text class="ln-val" x="${x(p.x)}" y="${y(p.y) - 10}" text-anchor="middle">${escapeHtml(p.text)}</text><text class="ln-tick" x="${x(p.x)}" y="${H - 12}" text-anchor="middle">${p.x}</text>`,
    )
    .join('');
  return `<svg class="cline" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml(spec.ariaLabel)}" preserveAspectRatio="xMidYMid meet">${grid}<path class="ln-path" d="${path}"/>${pts}</svg>`;
}

export function chartHtml(spec: ChartSpec): string {
  switch (spec.type) {
    case 'bars':
      return barsHtml(spec);
    case 'stacked':
      return stackedHtml(spec);
    case 'grouped':
      return groupedHtml(spec);
    case 'line':
      return lineSvg(spec);
  }
}

/* ---------- data table behind every chart ---------- */

export interface DataTable {
  head: string[];
  rows: string[][];
}

export function specTable(spec: ChartSpec): DataTable {
  switch (spec.type) {
    case 'bars':
      return { head: ['Item', 'Value', 'Note'], rows: spec.rows.map((r) => [r.label, r.text, r.sub ?? '']) };
    case 'stacked':
      return {
        head: ['Item', ...spec.legend.map((l) => l.label)],
        rows: spec.rows.map((r) => [r.label, ...spec.legend.map((l) => r.parts.filter((p) => p.role === l.role).map((p) => p.label).join('') || '')]),
      };
    case 'grouped':
      return { head: ['Stream', ...spec.series.map((s) => s.label)], rows: spec.groups.map((g) => [g.label, ...g.values.map((v) => v?.text ?? 'none listed')]) };
    case 'line':
      return { head: [spec.xLabel ?? 'Year', spec.yLabel ?? 'Share'], rows: spec.points.map((p) => [String(p.x), p.text]) };
  }
}

export function tableHtml(t: DataTable): string {
  return `<table><thead><tr>${t.head.map((h) => `<th scope="col">${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${t.rows
    .map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${escapeHtml(c)}</th>` : `<td>${escapeHtml(c)}</td>`)).join('')}</tr>`)
    .join('')}</tbody></table>`;
}
