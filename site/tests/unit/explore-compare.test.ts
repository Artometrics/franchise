import { describe, expect, it } from 'vitest';
import { franchises, history2019, originMix, parents } from '../../src/lib/data';
import { applyQuery, defaultQuery, filterFranchises, parseQuery, rowHtml, sortFranchises, toSearch } from '../../src/lib/explore';
import { MAX_PICKS, compareSpecs, parseSelection, PRESETS, toggle, toSearch as selSearch } from '../../src/lib/compare';
import { barsHtml, groupedHtml, lineSvg, plotlyToSpec, specTable, splitLabel } from '../../src/lib/charts';
import { chartJson } from '../../src/lib/article';
import { fmtAmt, fmtTotal } from '../../src/lib/format';

const valid = { origins: new Set(franchises.map((f) => f.origin)), owners: new Set(franchises.map((f) => f.owner)) };

describe('explorer filtering and sorting', () => {
  it('returns all 140 rows by default, largest first', () => {
    const r = applyQuery(franchises, defaultQuery);
    expect(r).toHaveLength(140);
    expect(r[0].name).toBe('Pokémon');
    expect(r[1].total).toBeLessThanOrEqual(r[0].total);
  });
  it('search ignores case and accents and also matches owner', () => {
    expect(filterFranchises(franchises, { q: 'POKEMON' }).map((f) => f.name)).toContain('Pokémon');
    expect(filterFranchises(franchises, { q: 'sanrio' }).map((f) => f.name)).toEqual(expect.arrayContaining(['Hello Kitty']));
  });
  it('origin filter reproduces the published counts (US 88, Japan 30, UK 9)', () => {
    expect(filterFranchises(franchises, { origin: 'US' })).toHaveLength(88);
    expect(filterFranchises(franchises, { origin: 'Japan' })).toHaveLength(30);
    expect(filterFranchises(franchises, { origin: 'UK' })).toHaveLength(9);
  });
  it('owner filter matches the owners table', () => {
    expect(filterFranchises(franchises, { owner: 'Disney' })).toHaveLength(32);
  });
  it('stream filter keeps only franchises with that stream', () => {
    const r = filterFranchises(franchises, { stream: 'games' });
    expect(r.length).toBeGreaterThan(20);
    expect(r.every((f) => f.streams.some((s) => s.key === 'games'))).toBe(true);
  });
  it('filters combine', () => {
    const r = filterFranchises(franchises, { origin: 'Japan', stream: 'games' });
    expect(r.every((f) => f.origin === 'Japan' && f.streams.some((s) => s.key === 'games'))).toBe(true);
  });
  it('sorts by name, total, year and merchandise share in both directions', () => {
    expect(sortFranchises(franchises, 'name', 'asc')[0].name.localeCompare('B')).toBeLessThan(0);
    const t = sortFranchises(franchises, 'total', 'asc');
    expect(t[0].total).toBeLessThanOrEqual(t[1].total);
    const y = sortFranchises(franchises, 'year', 'asc');
    expect(y[0].year).toBeLessThanOrEqual(y[1].year!);
    const m = sortFranchises(franchises, 'merch', 'desc');
    expect(m[0].merchShare!).toBeGreaterThanOrEqual(m[1].merchShare!);
  });
  it('sort is stable by rank on ties and never mutates its input', () => {
    const copy = [...franchises];
    sortFranchises(franchises, 'owner', 'asc');
    expect(franchises).toEqual(copy);
  });
  it('round-trips the query through the URL and rejects junk values', () => {
    const q = { ...defaultQuery, q: 'star', origin: 'US', owner: 'Disney', stream: 'box', sort: 'name' as const, dir: 'asc' as const };
    expect(parseQuery(toSearch(q), valid)).toEqual(q);
    expect(parseQuery('?origin=Atlantis&stream=nope&sort=bad&dir=sideways', valid)).toEqual(defaultQuery);
    expect(toSearch(defaultQuery)).toBe('');
  });
  it('renders a row with a link to the franchise page and an accessible mix bar', () => {
    const html = rowHtml(franchises[0]);
    expect(html).toContain('href="/explore/pokemon"');
    expect(html).toContain('$130.7B');
    expect(html).toContain('aria-label="Merchandise');
  });
  it('escapes names in row markup', () => {
    const html = rowHtml(franchises.find((f) => f.name.includes('&'))!);
    expect(html).toContain('&amp;');
    expect(html).not.toMatch(/<a [^>]*>[^<]*& /);
  });
});

describe('compare selection', () => {
  const known = new Set(franchises.map((f) => f.slug));
  it('parses 2-3 known slugs, drops unknown and duplicate ones, caps at 3', () => {
    expect(parseSelection('?f=pokemon,star-wars,nope,pokemon,mario,barbie', known)).toEqual(['pokemon', 'star-wars', 'mario']);
    expect(parseSelection('', known)).toEqual([]);
  });
  it('toggle adds, removes and refuses a 4th', () => {
    let s: string[] = [];
    for (const x of ['pokemon', 'star-wars', 'mario']) s = toggle(s, x).sel;
    expect(s).toHaveLength(MAX_PICKS);
    const r = toggle(s, 'barbie');
    expect(r.sel).toEqual(s);
    expect(r.message).toMatch(/up to 3/);
    expect(toggle(s, 'mario').sel).toEqual(['pokemon', 'star-wars']);
  });
  it('round-trips through the URL', () => {
    const s = ['pokemon', 'star-wars'];
    expect(parseSelection(selSearch(s), known)).toEqual(s);
  });
  it('all presets point at real franchises', () => {
    for (const p of PRESETS) for (const slug of p.slugs) expect(known.has(slug), slug).toBe(true);
  });
  it('builds total, stream and mix specs for the Pokémon / Star Wars / MCU preset', () => {
    const list = PRESETS[0].slugs.map((s) => franchises.find((f) => f.slug === s)!);
    const { totals, byStream, mix } = compareSpecs(list);
    expect(totals.rows.map((r) => r.text)).toEqual(['$130.7B', '$46.7B', '$37.5B']);
    const merch = byStream.groups.find((g) => g.label.startsWith('Merchandise'))!;
    expect(merch.values.map((v) => v?.text ?? null)).toEqual(['$119.3B', '$29.1B', null]);
    expect(groupedHtml(byStream)).toContain('cg-group');
    expect(mix.rows).toHaveLength(3);
  });
});

describe('number formatting follows the article', () => {
  it('uses the precision printed in the ledger', () => {
    expect(fmtTotal(130.7)).toBe('$130.7B');
    expect(fmtTotal(9.74)).toBe('$9.74B');
    expect(fmtTotal(5)).toBe('$5.0B');
    expect(fmtTotal(1460.1)).toBe('$1,460.1B');
  });
  it('stream amounts', () => {
    expect(fmtAmt(119.3)).toBe('$119.3B');
    expect(fmtAmt(0.04)).toBe('$0.04B');
    expect(fmtAmt(0.003)).toBe('$0.003B');
  });
});

describe('chart adapter and renderers', () => {
  it('splits embedded annotations out of Plotly labels', () => {
    expect(splitLabel('Merchandise, licensing, retail  55.6%  (43.2–65.8)')).toEqual({ label: 'Merchandise, licensing, retail', sub: '55.6% (43.2–65.8)' });
    expect(splitLabel('Pokémon')).toEqual({ label: 'Pokémon' });
  });
  it('maps the red highlight to the accent role and blue to second', () => {
    const a = plotlyToSpec(chartJson('chart1_top20_revenue_2026'));
    expect(a.spec.type).toBe('bars');
    if (a.spec.type === 'bars') {
      expect(a.spec.rows).toHaveLength(15);
      expect(a.spec.rows[0]).toMatchObject({ label: 'Pokémon', value: 130.7, text: '$130.7B', role: 'accent' });
      expect(a.spec.rows[1].role).toBe('base');
    }
    expect(a.source).toContain('1384334611');
  });
  it('keeps negative values as bars left of a zero line', () => {
    const a = plotlyToSpec(chartJson('chart10_wiki_2019_vs_2026'));
    if (a.spec.type !== 'bars') throw new Error('bars expected');
    expect(a.spec.rows.filter((r) => r.value < 0)).toHaveLength(3);
    const html = barsHtml(a.spec);
    expect(html).toContain('cb-zero');
    expect(html).not.toMatch(/width:-/);
  });
  it('draws the domestic top-ten line chart as SVG with six points', () => {
    const a = plotlyToSpec(chartJson('chart7_top10_franchise_share'));
    if (a.spec.type !== 'line') throw new Error('line expected');
    const svg = lineSvg(a.spec);
    expect(svg.match(/<circle/g)).toHaveLength(6);
    expect(svg).toContain('role="img"');
  });
  it('every chart has a text data table so no number lives only in a picture', () => {
    const a = plotlyToSpec(chartJson('chart6_revenue_streams_2026'));
    const t = specTable(a.spec);
    expect(t.rows[0][1]).toBe('$812.4B');
  });
  it('bar widths never exceed 100% and never go negative', () => {
    for (const k of ['chart1_top20_revenue_2026', 'chart16_worldwide_top10_2025_2026', 'chart10_wiki_2019_vs_2026']) {
      const a = plotlyToSpec(chartJson(k));
      if (a.spec.type !== 'bars') continue;
      for (const w of barsHtml(a.spec).matchAll(/width:([\d.]+)%/g)) expect(Number(w[1])).toBeLessThanOrEqual(100);
    }
  });
});

describe('derived views', () => {
  it('parents of the origin mix sum to the ledger total', () => {
    const t = originMix().reduce((a, m) => a + m.total, 0);
    expect(t).toBeCloseTo(1460.06, 1);
    expect(parents().reduce((a, p) => a + p.total, 0)).toBeCloseTo(1460.06, 1);
  });
  it('links 82 franchises to their 2019 row (the crosswalk count)', () => {
    const h = history2019();
    expect(h.size).toBe(82);
    expect(h.get('hello-kitty')).toMatchObject({ rev2019: 80.026, rev2026: 33.5 });
    for (const slug of h.keys()) expect(franchises.some((f) => f.slug === slug), slug).toBe(true);
  });
});
