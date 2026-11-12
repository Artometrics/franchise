import { num, parseCsvRecords } from './csv';
import { slugify } from './slug';

const raw = import.meta.glob('../data/source/data/*', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export function rawFile(name: string): string {
  const key = `../data/source/data/${name}`;
  const v = raw[key];
  if (v === undefined) throw new Error(`Missing source data file: ${name}`);
  return v;
}

export function records(name: string): Record<string, string>[] {
  return parseCsvRecords(rawFile(name));
}

export * from './streams';
import { GROUPS, NO_OWNER, ORIGIN_NAMES, STREAMS, streamByKey, type StreamGroup, type StreamKey } from './streams';
const streamBySource = new Map(STREAMS.map((s) => [s.source, s]));
void GROUPS;

/* ---------- franchises ---------- */

export interface StreamAmount {
  key: StreamKey;
  amount: number;
}

export interface Franchise {
  slug: string;
  name: string;
  year: number | null;
  total: number;
  breakdownSum: number;
  unallocated: number;
  originalMedia: string;
  ownersRaw: string;
  owner: string;
  origin: string;
  originName: string;
  in2019: boolean;
  streams: StreamAmount[];
  itemisedSum: number;
  merchAmount: number;
  merchShare: number | null;
  topStream: StreamKey | null;
  rank: number;
}

function cleanMedia(s: string): string {
  return s.replace(/^\|/, '').trim().replace(/^./, (c) => c.toUpperCase());
}

function buildFranchises(): Franchise[] {
  const ledger = records('franchise_entities_2026-10.csv');
  const long = records('franchise_revenue_long_2026-10.csv');
  const byName = new Map<string, Map<StreamKey, number>>();
  for (const r of long) {
    const s = streamBySource.get(r.category);
    if (!s) throw new Error(`Unknown stream category: ${r.category}`);
    const m = byName.get(r.franchise) ?? new Map<StreamKey, number>();
    m.set(s.key, (m.get(s.key) ?? 0) + Number(r.revenue_usd_b));
    byName.set(r.franchise, m);
  }
  const list = ledger.map((r) => {
    const m = byName.get(r.franchise) ?? new Map<StreamKey, number>();
    const streams: StreamAmount[] = STREAMS.filter((s) => (m.get(s.key) ?? 0) > 0).map((s) => ({ key: s.key, amount: m.get(s.key)! }));
    streams.sort((a, b) => b.amount - a.amount);
    const sum = streams.reduce((a, s) => a + s.amount, 0);
    const merch = m.get('merch') ?? 0;
    const itemised = streams.filter((s) => s.key !== 'unalloc');
    const origin = r.region_origin;
    const owner = r.owner_parent_2026 === 'Unknown' || r.owner_parent_2026 === '' ? NO_OWNER : r.owner_parent_2026;
    return {
      slug: slugify(r.franchise),
      name: r.franchise,
      year: num(r.year_created),
      total: Number(r.total_usd_b),
      breakdownSum: Number(r.breakdown_sum_usd_b),
      unallocated: Number(r.unallocated_usd_b),
      originalMedia: cleanMedia(r.original_media),
      ownersRaw: r.owners_raw,
      owner,
      origin,
      originName: ORIGIN_NAMES[origin] ?? origin,
      in2019: r.in_2019_ledger === 'True',
      streams,
      itemisedSum: itemised.reduce((a, s) => a + s.amount, 0),
      merchAmount: merch,
      merchShare: sum > 0 ? (merch / sum) * 100 : null,
      topStream: itemised[0]?.key ?? null,
      rank: 0,
    } satisfies Franchise;
  });
  const sorted = [...list].sort((a, b) => b.total - a.total);
  sorted.forEach((f, i) => (f.rank = i + 1));
  return list;
}

export const franchises: Franchise[] = buildFranchises();
export const franchiseBySlug = new Map(franchises.map((f) => [f.slug, f]));

export const ledgerTotal = franchises.reduce((a, f) => a + f.total, 0);

/* ---------- published tables (read, not recomputed) ---------- */

export interface CategoryShare {
  vintage: string;
  category: string;
  share: number;
  lo: number;
  hi: number;
}

export function categoryShares(vintage = '2026'): CategoryShare[] {
  return records('category_shares_bootstrap.csv')
    .filter((r) => r.vintage === vintage)
    .map((r) => ({ vintage: r.vintage, category: r.category, share: Number(r.share_pct), lo: Number(r.ci95_lo), hi: Number(r.ci95_hi) }));
}

export interface Concentration {
  ledger: string;
  topK: number;
  share: number;
  lo: number;
  hi: number;
  owners: string[];
}

export function concentration(): Concentration[] {
  return records('owner_concentration_bootstrap.csv').map((r) => ({
    ledger: r.ledger,
    topK: Number(r.top_k),
    share: Number(r.share_pct),
    lo: Number(r.ci95_lo),
    hi: Number(r.ci95_hi),
    owners: r.top_owners.split(';').map((s) => s.trim()),
  }));
}

export interface RegionRow {
  origin: string;
  name: string;
  n: number;
  total: number;
  merchShare: number | null;
}

export function regionSummary(): RegionRow[] {
  return records('region_summary_2026-10.csv')
    .map((r) => ({ origin: r.region_origin, name: ORIGIN_NAMES[r.region_origin] ?? r.region_origin, n: Number(r.n), total: Number(r.total), merchShare: num(r.merch_share_pct) }))
    .sort((a, b) => b.total - a.total);
}

/* ---------- headline figures ---------- */

export function headline() {
  const shares = categoryShares('2026');
  const get = (c: string) => shares.find((s) => s.category === c)!;
  const conc = concentration().filter((c) => c.ledger === '2026 ledger');
  const byKey = (key: StreamKey) => franchises.reduce((a, f) => a + (f.streams.find((s) => s.key === key)?.amount ?? 0), 0);
  const pokemon = franchiseBySlug.get('pokemon')!;
  const starWars = franchiseBySlug.get('star-wars')!;
  const mcu = franchiseBySlug.get('marvel-cinematic-universe-mcu')!;
  return {
    count: franchises.length,
    total: ledgerTotal,
    merch: { share: get('Merchandise, Licensing & Retail'), amount: byKey('merch') },
    games: { share: get('Video Games/Games'), amount: byKey('games') },
    box: { share: get('Box Office'), amount: byKey('box') },
    unalloc: { share: get('Unallocated'), amount: byKey('unalloc') },
    pokemon: pokemon.total,
    starWarsPlusMcu: starWars.total + mcu.total,
    top1: conc.find((c) => c.topK === 1)!,
    top5: conc.find((c) => c.topK === 5)!,
  };
}

/* ---------- owners ---------- */

export interface Parent {
  name: string;
  total: number;
  share: number;
  count: number;
  merchAmount: number;
  merchShare: number | null;
  franchises: Franchise[];
}

export function parents(list: Franchise[] = franchises): Parent[] {
  const grand = list.reduce((a, f) => a + f.total, 0);
  const m = new Map<string, Franchise[]>();
  for (const f of list) m.set(f.owner, [...(m.get(f.owner) ?? []), f]);
  const out: Parent[] = [...m.entries()].map(([name, fs]) => {
    const total = fs.reduce((a, f) => a + f.total, 0);
    const merchAmount = fs.reduce((a, f) => a + f.merchAmount, 0);
    const itemised = fs.reduce((a, f) => a + f.streams.reduce((x, s) => x + s.amount, 0), 0);
    return {
      name,
      total,
      share: (total / grand) * 100,
      count: fs.length,
      merchAmount,
      merchShare: itemised > 0 ? (merchAmount / itemised) * 100 : null,
      franchises: [...fs].sort((a, b) => b.total - a.total),
    };
  });
  return out.sort((a, b) => b.total - a.total);
}

/* ---------- origin stream mix (derived on this site) ---------- */

export interface OriginMix {
  origin: string;
  name: string;
  n: number;
  total: number;
  groups: Record<StreamGroup, number>;
  merchShareOfTotal: number;
}

export function originMix(): OriginMix[] {
  const m = new Map<string, Franchise[]>();
  for (const f of franchises) m.set(f.origin, [...(m.get(f.origin) ?? []), f]);
  return [...m.entries()]
    .map(([origin, fs]) => {
      const total = fs.reduce((a, f) => a + f.total, 0);
      const groups: Record<StreamGroup, number> = { merch: 0, games: 0, box: 0, other: 0, unalloc: 0 };
      for (const f of fs) for (const s of f.streams) groups[streamByKey.get(s.key)!.group] += s.amount;
      return { origin, name: ORIGIN_NAMES[origin] ?? origin, n: fs.length, total, groups, merchShareOfTotal: (groups.merch / total) * 100 };
    })
    .sort((a, b) => b.total - a.total);
}

/* ---------- other tables ---------- */

export interface Deal {
  target: string;
  year: number;
  price: number;
  anchor: string;
  anchor2019: number;
  priceSource: string;
}

export function deals(): Deal[] {
  return records('disney_acquisitions.csv').map((r) => ({
    target: r.target,
    year: Number(r.year_closed),
    price: Number(r.price_usd_b),
    anchor: r.primary_ip_anchor,
    anchor2019: Number(r.franchise_lifetime_revenue_b_mid2019),
    priceSource: r.price_source,
  }));
}

export interface Segment {
  name: string;
  revenue: number;
}

export function disneySegments(): Segment[] {
  return records('disney_segment_revenue_fy2025.csv').map((r) => ({ name: r.segment.replace('Disney ', ''), revenue: Number(r.revenue_usd_b) }));
}

export interface Failure {
  case: string;
  owner: string;
  mode: string;
  what: string;
  url: string;
}

export function failures(): Failure[] {
  return records('franchise_failures.csv').map((r) => ({ case: r.case, owner: r.studio_or_owner, mode: r.failure_mode, what: r.what_happened, url: r.evidence_url }));
}

/* ---------- box office top ten ---------- */

export interface TopTenFilm {
  year: number;
  rank: number;
  title: string;
  tag: string;
  isFranchise: boolean;
  gross: number;
  grossNumbers: number | null;
}

export function topTen(): TopTenFilm[] {
  return records('box_office_top10_snapshot_2026-11-10.csv').map((r) => ({
    year: Number(r.release_year),
    rank: Number(r.rank),
    title: r.title,
    tag: r.franchise_tag,
    isFranchise: r.is_franchise_film === 'True',
    gross: Number(r.worldwide_gross_usd),
    grossNumbers: num(r.thenumbers_worldwide_usd),
  }));
}

export function topTenSummary(year: number) {
  const films = topTen().filter((f) => f.year === year);
  const count = films.filter((f) => f.isFranchise).length;
  const sum = (sel: (f: TopTenFilm) => number | null, only: boolean) => films.filter((f) => !only || f.isFranchise).reduce((a, f) => a + (sel(f) ?? 0), 0);
  return {
    year,
    films: films.length,
    franchiseCount: count,
    shareMojo: (sum((f) => f.gross, true) / sum((f) => f.gross, false)) * 100,
    shareNumbers: (sum((f) => f.grossNumbers, true) / sum((f) => f.grossNumbers, false)) * 100,
  };
}

/* ---------- 2019 file beside the November list ---------- */

export interface History2019 {
  name2019: string;
  rev2019: number;
  rev2026: number;
  pctChange: number;
  note: string;
}

export function history2019(): Map<string, History2019> {
  const m = new Map<string, History2019>();
  for (const r of records('franchise_revenue_2019_vs_2026.csv')) {
    const key = r.wiki_franchise_matched || r.franchise;
    m.set(slugify(key), { name2019: r.franchise, rev2019: Number(r.revenue_2019_b), rev2026: Number(r.revenue_2026_b), pctChange: Number(r.pct_change), note: r.match_note });
  }
  return m;
}
