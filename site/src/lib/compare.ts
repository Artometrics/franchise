import { fmtAmt, fmtTotal } from './format';
import { GROUPS, STREAMS, streamByKey, type StreamGroup } from './streams';
import type { Franchise } from './data';
import type { BarsSpec, GroupedSpec, Role, StackedSpec } from './charts';

export const MIN_PICKS = 2;
export const MAX_PICKS = 3;
const SERIES_ROLES: Role[] = ['accent', 'second', 'cream'];

export function shortName(name: string): string {
  const m = name.match(/\(([A-Z0-9]{2,6})\)\s*$/);
  if (m) return m[1];
  return name.length > 13 ? `${name.slice(0, 12).trimEnd()}…` : name;
}

export function parseSelection(search: string, known: Set<string>): string[] {
  const raw = new URLSearchParams(search).get('f') ?? '';
  const out: string[] = [];
  for (const s of raw.split(',').map((x) => x.trim())) {
    if (s && known.has(s) && !out.includes(s)) out.push(s);
    if (out.length === MAX_PICKS) break;
  }
  return out;
}

export function toSearch(sel: string[]): string {
  return sel.length ? `?f=${sel.join(',')}` : '';
}

export function toggle(sel: string[], slug: string): { sel: string[]; message: string } {
  if (sel.includes(slug)) return { sel: sel.filter((s) => s !== slug), message: '' };
  if (sel.length >= MAX_PICKS) return { sel, message: `You can compare up to ${MAX_PICKS} franchises. Remove one first.` };
  return { sel: [...sel, slug], message: '' };
}

export const PRESETS: { label: string; slugs: string[]; note: string }[] = [
  { label: 'Pokémon vs Star Wars vs MCU', slugs: ['pokemon', 'star-wars', 'marvel-cinematic-universe-mcu'], note: 'The comparison behind finding 2.' },
  { label: 'Hello Kitty, Mario, Gundam', slugs: ['hello-kitty', 'mario', 'gundam'], note: 'The three big edits since the 2019 file.' },
  { label: 'Call of Duty vs Paw Patrol', slugs: ['call-of-duty', 'paw-patrol'], note: 'The two rows that moved since October.' },
];

export function seriesRole(i: number): Role {
  return SERIES_ROLES[i] ?? 'base';
}

export function compareSpecs(list: Franchise[]) {
  const series = list.map((f, i) => ({ key: f.slug, label: shortName(f.name), role: seriesRole(i) }));
  const totals: BarsSpec = {
    type: 'bars',
    ariaLabel: `Stated lifetime total: ${list.map((f) => `${f.name} ${fmtTotal(f.total)}`).join('; ')}`,
    rows: list.map((f, i) => ({ label: f.name, value: f.total, text: fmtTotal(f.total), role: seriesRole(i) })),
  };
  const streamKeys = STREAMS.filter((s) => list.some((f) => f.streams.some((x) => x.key === s.key)));
  const byStream: GroupedSpec = {
    type: 'grouped',
    series,
    ariaLabel: `Revenue by stream for ${list.map((f) => f.name).join(', ')}`,
    groups: streamKeys.map((s) => ({
      label: s.label,
      values: list.map((f) => {
        const a = f.streams.find((x) => x.key === s.key)?.amount;
        return a ? { value: a, text: fmtAmt(a) } : null;
      }),
    })),
  };
  const mix: StackedSpec = {
    type: 'stacked',
    ariaLabel: `Revenue mix for ${list.map((f) => f.name).join(', ')}`,
    legend: GROUPS.map((g) => ({ role: g.key as Role, label: g.label })),
    rows: list.map((f) => {
      const acc = new Map<StreamGroup, number>();
      for (const s of f.streams) acc.set(streamByKey.get(s.key)!.group, (acc.get(streamByKey.get(s.key)!.group) ?? 0) + s.amount);
      return {
        label: f.name,
        parts: GROUPS.filter((g) => acc.has(g.key)).map((g) => ({ role: g.key as Role, value: acc.get(g.key)!, label: `${Math.round((acc.get(g.key)! / f.streams.reduce((a, s) => a + s.amount, 0)) * 100)}%` })),
      };
    }),
  };
  return { totals, byStream, mix };
}
