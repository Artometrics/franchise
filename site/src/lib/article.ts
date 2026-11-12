import { parse as parseYaml } from 'yaml';
import { plotlyToSpec, stripTags, type AdaptedChart } from './charts';

const mdFiles = import.meta.glob('../data/source/article/franchise.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const metaFiles = import.meta.glob('../data/source/article/franchise.meta.json', { import: 'default', eager: true }) as Record<string, ArticleMeta>;
const chartFiles = import.meta.glob('../data/source/charts/*.plotly.json', { import: 'default', eager: true }) as Record<string, Parameters<typeof plotlyToSpec>[0]>;

/* ---------- sidecar ---------- */

export interface Source {
  id: string;
  title: string;
  publisher: string;
  year: number;
  url: string;
  retrieved: string | null;
  retrievedNote?: string;
  revision: string | null;
  note: string;
  moreUrls?: { label: string; url: string }[];
  listed?: boolean;
}

export interface ChartMeta {
  title: string;
  description: string;
  source: string;
  data: { label: string; href: string }[];
}

export interface ArticleMeta {
  updated: string;
  whatChanged: string;
  changelog: { href: string; file: string };
  status: { state: string; label: string; note: string; links: { label: string; href: string }[] };
  aliases: Record<string, string>;
  sources: Record<string, Omit<Source, 'id'>>;
  method: Record<'pulled' | 'cleaned' | 'updated' | 'vintage' | 'caveats', string[]> & { files: { label: string; href: string }[] };
  charts: Record<string, ChartMeta>;
}

export const meta: ArticleMeta = Object.values(metaFiles)[0];
export const sources: Source[] = Object.entries(meta.sources).map(([id, s]) => ({ id, ...s }));
export const sourceById = new Map(sources.map((s) => [s.id, s]));

/* ---------- frontmatter and body ---------- */

const rawMd = Object.values(mdFiles)[0];
const fmMatch = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(rawMd);
if (!fmMatch) throw new Error('Article has no frontmatter');

export interface Faq {
  question: string;
  answer: string;
}

export const frontmatter = parseYaml(fmMatch[1]) as {
  title: string;
  description: string;
  tldr: string;
  keyPoints: string[];
  faq: Faq[];
  pubDate: string | Date;
  updatedDate: string | Date;
  author: string;
};

const LIVE = 'https://artometrics.com';
const DATA_PREFIX = '/data/articles/franchise/';

/** Files this site hosts itself under /downloads; everything else points at the live site. */
export const hostedDownloads = new Set([
  'wikipedia_franchise_revenue_2026.csv',
  'franchise_entities_2026-10.csv',
  'franchise_revenue_long_2026-10.csv',
  'category_shares_bootstrap.csv',
  'owner_concentration_bootstrap.csv',
  'region_summary_2026-10.csv',
  'owner_totals_derived.csv',
  'owner_consolidation_rules.csv',
  'disney_acquisitions.csv',
  'disney_segment_revenue_fy2025.csv',
  'franchise_failures.csv',
  'franchise_revenue_2019_vs_2026.csv',
  'top10_franchise_share_by_year.csv',
  'box_office_top10_snapshot_2026-11-10.csv',
  'sources.csv',
  'verified_numbers.csv',
  'CHANGELOG.md',
]);

export function rewriteHref(href: string): { href: string; external: boolean } {
  if (/^https?:\/\//.test(href)) return { href, external: true };
  if (href.startsWith('#')) return { href, external: false };
  if (href === '/franchise/changelog') return { href: '/changelog', external: false };
  if (href.startsWith(DATA_PREFIX)) {
    const rest = href.slice(DATA_PREFIX.length);
    const file = rest.split('/').pop() ?? '';
    if (rest === file && hostedDownloads.has(file)) return { href: `/downloads/${file}`, external: true };
    return { href: `${LIVE}${href}`, external: true };
  }
  if (href.startsWith('/')) return { href: `${LIVE}${href}`, external: true };
  return { href, external: false };
}

/* ---------- citations ---------- */

const TOKEN = /(S\d{3}|HH2018)|(Jenkins, 2006|Steinberg, 2012|Hernández Hernández, 2018)/g;

function citeLink(id: string, text: string): string {
  const s = sourceById.get(id);
  const title = s ? `${s.title} (${s.publisher}, ${s.year})` : id;
  return `<a class="cite" href="/sources#${id}" title="${title.replace(/"/g, '&quot;')}">${text}</a>`;
}

export function citedIds(text: string): string[] {
  const ids: string[] = [];
  for (const m of text.matchAll(/\[([^\[\]]+)\]/g)) {
    const inner = m[1];
    if (inner.replace(TOKEN, '').replace(/[\s;,–—-]/g, '') !== '') continue;
    for (const t of inner.matchAll(TOKEN)) ids.push(t[1] ?? meta.aliases[t[2]]);
  }
  return ids;
}

/** Turns bracketed citations such as [S017; S005] or [Jenkins, 2006] into links to /sources. Tags are left alone. */
export function linkCitations(html: string): string {
  return html
    .split(/(<[^>]+>)/)
    .map((seg) => {
      if (seg.startsWith('<')) return seg;
      return seg.replace(/\[([^\[\]]+)\]/g, (whole, inner: string) => {
        if (inner.replace(TOKEN, '').replace(/[\s;,–—-]/g, '') !== '') return whole;
        const linked = inner.replace(TOKEN, (t, id, alias) => (id ? citeLink(id, id) : citeLink(meta.aliases[alias], alias)));
        return `[${linked}]`;
      });
    })
    .join('');
}

/* ---------- charts ---------- */

export interface ChartFigureData extends Omit<AdaptedChart, 'source'> {
  source?: string;
  key: string;
  title: string;
  description: string;
  sourceLine: string;
  data: { label: string; href: string; external: boolean }[];
  caption?: string;
}

export function chartJson(key: string) {
  const f = Object.entries(chartFiles).find(([p]) => p.endsWith(`/${key}.plotly.json`));
  if (!f) throw new Error(`Missing chart JSON: ${key}`);
  return f[1];
}

export const chartKeys = Object.keys(chartFiles).map((p) => p.split('/').pop()!.replace('.plotly.json', ''));

export interface GalleryCard {
  key: string;
  title: string;
  description: string;
  source: string;
  alt: string;
}

export function chartFigure(key: string, opts: { ariaLabel?: string; caption?: string; card?: GalleryCard } = {}): ChartFigureData {
  const adapted = plotlyToSpec(chartJson(key), opts.ariaLabel ?? opts.card?.alt);
  const m = meta.charts[key];
  const data = (m?.data ?? [
    { label: 'Chart data (JSON)', href: `${DATA_PREFIX}charts/candidates/${key}.plotly.json` },
  ]).map((d) => ({ label: d.label, ...rewriteHref(d.href) }));
  return {
    ...adapted,
    key,
    title: m?.title ?? opts.card?.title ?? adapted.headline,
    description: m?.description ?? opts.card?.description ?? '',
    sourceLine: m?.source ?? opts.card?.source ?? adapted.source,
    data,
    caption: opts.caption,
  };
}

/* ---------- body ---------- */

export type Segment =
  | { type: 'html'; html: string }
  | { type: 'chart'; key: string; ariaLabel: string; caption: string }
  | { type: 'gallery'; cards: GalleryCard[] };

function cleanBody(body: string): string {
  return body
    .replace(/<div class="art-callout" id="narration-placeholder">[\s\S]*?<\/div>\s*/, '')
    .replace(/<p class="art-github-wrap">[\s\S]*?<\/p>\s*/, '')
    .replace(/<div id="quarto-content">\s*<main[^>]*>\s*/, '')
    .replace(/\s*<\/main>\s*<\/div>\s*$/, '\n');
}

function parseGallery(block: string): GalleryCard[] {
  const cards: GalleryCard[] = [];
  for (const m of block.matchAll(/<figure class="carousel-card">([\s\S]*?)<\/figure>/g)) {
    const c = m[1];
    const img = /<img src="[^"]*\/([a-z0-9_]+)\.png" alt="([^"]*)"/.exec(c);
    cards.push({
      key: img![1],
      alt: img![2],
      title: /<h3 class="chart-frame__title">(.*?)<\/h3>/.exec(c)![1],
      description: /<p class="chart-frame__desc">(.*?)<\/p>/.exec(c)![1],
      source: stripTags(/<span class="chart-frame__label">Source<\/span>\s*(.*?)<\/p>/.exec(c)![1]),
    });
  }
  return cards;
}

function buildSegments(): Segment[] {
  const body = cleanBody(fmMatch![2]);
  const figRe = /<figure class="art-chart">\s*<div class="art-chart-live[^"]*" data-chart="[^"]*\/([a-z0-9_]+)\.plotly\.json"[^>]*?aria-label="([^"]*)"><\/div>\s*<figcaption[^>]*>([\s\S]*?)<\/figcaption>\s*<\/figure>/g;
  const galleryRe = /<div class="carousel"[\s\S]*?<div class="carousel__controls">[\s\S]*?<\/div>\s*<\/div>/;
  const segs: Segment[] = [];
  const pushHtml = (html: string) => {
    if (html.trim()) segs.push({ type: 'html', html });
  };
  const gm = galleryRe.exec(body);
  const parts = gm ? [body.slice(0, gm.index), body.slice(gm.index + gm[0].length)] : [body, ''];
  const walk = (text: string) => {
    let last = 0;
    for (const m of text.matchAll(figRe)) {
      pushHtml(text.slice(last, m.index));
      segs.push({ type: 'chart', key: m[1], ariaLabel: m[2], caption: m[3].trim() });
      last = m.index! + m[0].length;
    }
    pushHtml(text.slice(last));
  };
  walk(parts[0]);
  if (gm) segs.push({ type: 'gallery', cards: parseGallery(gm[0]) });
  walk(parts[1]);
  return segs;
}

function fixLinks(html: string): string {
  return html.replace(/<a ([^>]*?)href="([^"]+)"([^>]*)>/g, (_w, pre: string, href: string, post: string) => {
    const r = rewriteHref(href);
    const target = r.external ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a ${pre}href="${r.href}"${post}${target}>`;
  });
}

export function processHtml(html: string): string {
  return linkCitations(fixLinks(html));
}

export const segments: Segment[] = buildSegments().map((s) => (s.type === 'html' ? { ...s, html: processHtml(s.html) } : s));

export const fullHtml: string = segments.filter((s): s is Extract<Segment, { type: 'html' }> => s.type === 'html').map((s) => s.html).join('\n');

/** Headings (h2) for the table of contents. */
export const toc: { id: string; text: string }[] = [...fullHtml.matchAll(/<h2 id="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => ({ id: m[1], text: stripTags(m[2]) }));

/** Returns the segments from heading `id` up to the next heading of the same or higher level. */
export function blockSegments(id: string): Segment[] {
  const out: Segment[] = [];
  let level = 0;
  let inside = false;
  for (const s of segments) {
    if (s.type !== 'html') {
      if (inside) out.push(s);
      continue;
    }
    const re = /<h([1-6]) id="([^"]+)"/g;
    let pos = 0;
    let chunk = '';
    let m: RegExpExecArray | null;
    let ended = false;
    while ((m = re.exec(s.html))) {
      const lv = Number(m[1]);
      if (inside && lv <= level) {
        chunk += s.html.slice(pos, m.index);
        inside = false;
        ended = true;
        break;
      }
      if (!inside && m[2] === id) {
        inside = true;
        level = lv;
        pos = m.index;
      }
    }
    if (inside) chunk += s.html.slice(pos);
    if (chunk.trim()) out.push({ type: 'html', html: chunk });
    if (ended) break;
  }
  return out;
}

export function blockHtml(id: string): string {
  return blockSegments(id)
    .filter((s): s is Extract<Segment, { type: 'html' }> => s.type === 'html')
    .map((s) => s.html)
    .join('\n');
}

export function paragraphsOf(html: string): string[] {
  return [...html.matchAll(/<p class="art-p">([\s\S]*?)<\/p>/g)].map((m) => m[1].trim());
}

export function firstParagraph(id: string, containing?: string): string {
  const ps = paragraphsOf(blockHtml(id));
  const p = containing ? ps.find((x) => x.includes(containing)) : ps[0];
  if (!p) throw new Error(`No paragraph in #${id}${containing ? ` containing ${containing}` : ''}`);
  return p;
}

/* ---------- findings, key points, faq ---------- */

export interface Finding {
  n: number;
  text: string;
  html: string;
}

export const findings: Finding[] = (() => {
  const m = /<div class="art-callout" id="findings">[\s\S]*?<ol>([\s\S]*?)<\/ol>/.exec(fmMatch![2]);
  if (!m) throw new Error('Findings list not found');
  return [...m[1].matchAll(/<li>([\s\S]*?)<\/li>/g)].map((x, i) => {
    const html = linkCitations(x[1].trim());
    return { n: i + 1, text: stripTags(x[1]).replace(/\s*\[[^\]]+\]\s*$/, ''), html };
  });
})();

export interface KeyFigure {
  value: string;
  label: string;
  cites: string[];
}

export const keyFigures: KeyFigure[] = frontmatter.keyPoints.map((k) => {
  const [value, ...rest] = k.split(' — ');
  const label = rest.join(' — ');
  return { value: value.trim(), label: label.replace(/\s*\[[^\]]+\]\s*$/, '').replace(/\s*\([^)]*;\s*S\d{3}\)\s*$/, '').trim(), cites: citedIds(label).concat([...label.matchAll(/\bS\d{3}\b/g)].map((x) => x[0])).filter((v, i, a) => a.indexOf(v) === i) };
});

export const callout = (() => {
  const m = /<div class="art-callout" id="findings">\s*<p class="art-p">([\s\S]*?)<\/p>/.exec(fmMatch![2]);
  return m ? linkCitations(m[1]) : '';
})();

export const editorsNote = (() => {
  const m = /<div class="art-editorial-note">([\s\S]*?)<\/div>/.exec(fmMatch![2]);
  return m ? processHtml(m[1]) : '';
})();

export function inlineHtml(s: string): string {
  return processHtml(s);
}

/** All S-IDs cited anywhere in the article body, with the h2 sections they appear in. */
export function citationsBySource(): Map<string, { id: string; text: string }[]> {
  const out = new Map<string, { id: string; text: string }[]>();
  const body = cleanBody(fmMatch![2]);
  const parts = body.split(/(?=<h2 id=)/);
  for (const p of parts) {
    const h = /<h2 id="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/.exec(p);
    const sec = h ? { id: h[1], text: stripTags(h[2]) } : { id: 'findings', text: 'Five findings' };
    for (const id of new Set(citedIds(p.replace(/<[^>]+>/g, '')))) {
      const list = out.get(id) ?? [];
      if (!list.some((x) => x.id === sec.id)) list.push(sec);
      out.set(id, list);
    }
  }
  return out;
}

export const rawBodyText = stripTags(fmMatch[2]);
