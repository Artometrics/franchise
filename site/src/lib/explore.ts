import { escapeHtml, fmtAmt, fmtTotal } from './format';
import { GROUPS, streamByKey, type StreamGroup, type StreamKey } from './streams';
import type { Franchise } from './data';

export type SortKey = 'name' | 'total' | 'owner' | 'origin' | 'year' | 'merch';
export type Dir = 'asc' | 'desc';

export interface ExploreQuery {
  q: string;
  origin: string;
  owner: string;
  stream: string;
  sort: SortKey;
  dir: Dir;
}

export const defaultQuery: ExploreQuery = { q: '', origin: '', owner: '', stream: '', sort: 'total', dir: 'desc' };

const SORTS: SortKey[] = ['name', 'total', 'owner', 'origin', 'year', 'merch'];

function norm(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function filterFranchises(list: Franchise[], q: Partial<ExploreQuery>): Franchise[] {
  const needle = norm((q.q ?? '').trim());
  return list.filter((f) => {
    if (needle && !(norm(f.name).includes(needle) || norm(f.owner).includes(needle) || norm(f.originalMedia).includes(needle))) return false;
    if (q.origin && f.origin !== q.origin) return false;
    if (q.owner && f.owner !== q.owner) return false;
    if (q.stream && !f.streams.some((s) => s.key === q.stream)) return false;
    return true;
  });
}

export function sortFranchises(list: Franchise[], key: SortKey, dir: Dir): Franchise[] {
  const sign = dir === 'asc' ? 1 : -1;
  const val = (f: Franchise): number | string | null => {
    switch (key) {
      case 'name':
        return norm(f.name);
      case 'owner':
        return norm(f.owner);
      case 'origin':
        return norm(f.originName);
      case 'year':
        return f.year;
      case 'merch':
        return f.merchShare;
      default:
        return f.total;
    }
  };
  return [...list].sort((a, b) => {
    const x = val(a);
    const y = val(b);
    if (x === null && y === null) return a.rank - b.rank;
    if (x === null) return 1;
    if (y === null) return -1;
    if (x < y) return -1 * sign;
    if (x > y) return 1 * sign;
    return a.rank - b.rank;
  });
}

export function applyQuery(list: Franchise[], q: Partial<ExploreQuery>): Franchise[] {
  return sortFranchises(filterFranchises(list, q), q.sort ?? defaultQuery.sort, q.dir ?? defaultQuery.dir);
}

export function parseQuery(search: string, valid: { origins: Set<string>; owners: Set<string> }): ExploreQuery {
  const p = new URLSearchParams(search);
  const sort = SORTS.includes(p.get('sort') as SortKey) ? (p.get('sort') as SortKey) : defaultQuery.sort;
  const dirRaw = p.get('dir');
  const dir: Dir = dirRaw === 'asc' || dirRaw === 'desc' ? dirRaw : sort === 'name' || sort === 'owner' || sort === 'origin' ? 'asc' : 'desc';
  const origin = p.get('origin') ?? '';
  const owner = p.get('owner') ?? '';
  const stream = p.get('stream') ?? '';
  return {
    q: (p.get('q') ?? '').slice(0, 80),
    origin: valid.origins.has(origin) ? origin : '',
    owner: valid.owners.has(owner) ? owner : '',
    stream: streamByKey.has(stream as StreamKey) ? stream : '',
    sort,
    dir,
  };
}

export function toSearch(q: ExploreQuery): string {
  const p = new URLSearchParams();
  if (q.q) p.set('q', q.q);
  if (q.origin) p.set('origin', q.origin);
  if (q.owner) p.set('owner', q.owner);
  if (q.stream) p.set('stream', q.stream);
  if (q.sort !== defaultQuery.sort || q.dir !== defaultQuery.dir) {
    p.set('sort', q.sort);
    p.set('dir', q.dir);
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

/* ---------- row markup (shared by the build and the browser) ---------- */

export function mixParts(f: Franchise): { group: StreamGroup; label: string; pct: number }[] {
  const sum = f.streams.reduce((a, s) => a + s.amount, 0) || 1;
  const acc = new Map<StreamGroup, number>();
  for (const s of f.streams) {
    const g = streamByKey.get(s.key)!.group;
    acc.set(g, (acc.get(g) ?? 0) + s.amount);
  }
  return GROUPS.filter((g) => acc.has(g.key)).map((g) => ({ group: g.key, label: g.label, pct: (acc.get(g.key)! / sum) * 100 }));
}

export function mixBarHtml(f: Franchise): string {
  const parts = mixParts(f);
  const aria = parts.map((p) => `${p.label} ${Math.round(p.pct)}%`).join(', ');
  const segs = parts.map((p) => `<i class="r-${p.group}" style="width:${p.pct.toFixed(2)}%"></i>`).join('');
  return `<span class="mix" role="img" aria-label="${escapeHtml(aria)}">${segs}</span>`;
}

export function streamsSummary(f: Franchise): string {
  const sum = f.streams.reduce((a, s) => a + s.amount, 0) || 1;
  const top = f.streams.filter((s) => s.key !== 'unalloc' && s.amount / sum >= 0.01).slice(0, 2);
  if (!top.length) return 'Not itemised';
  return top.map((s) => `${streamByKey.get(s.key)!.short} ${Math.round((s.amount / sum) * 100)}%`).join(' · ');
}

export function rowHtml(f: Franchise): string {
  const owner = f.owner;
  return `<tr data-slug="${f.slug}"><th scope="row" data-label="Franchise"><a href="/explore/${f.slug}">${escapeHtml(f.name)}</a></th><td data-label="Owner">${escapeHtml(owner)}</td><td data-label="Origin">${escapeHtml(f.originName)}</td><td data-label="Created" class="num">${f.year ?? ''}</td><td data-label="Total" class="num"><strong>${fmtTotal(f.total)}</strong></td><td data-label="Revenue streams" class="streams">${mixBarHtml(f)}<span class="mix-text">${escapeHtml(streamsSummary(f))}</span></td></tr>`;
}

export function tbodyHtml(list: Franchise[]): string {
  return list.map(rowHtml).join('');
}

export { fmtAmt };
