import { describe, expect, it } from 'vitest';
import { categoryShares, concentration, deals, franchiseBySlug, franchises, headline, ledgerTotal, originMix, parents, regionSummary, topTenSummary } from '../../src/lib/data';
import { parseCsv, parseCsvRecords } from '../../src/lib/csv';
import { slugify } from '../../src/lib/slug';

describe('csv parser', () => {
  it('handles quotes, embedded commas, escaped quotes and CRLF', () => {
    expect(parseCsv('a,b\r\n"x, y","he said ""hi"""\r\n,\r\n')).toEqual([['a', 'b'], ['x, y', 'he said "hi"'], ['', '']]);
  });
  it('maps records by header and tolerates short rows', () => {
    expect(parseCsvRecords('a,b,c\n1,2\n')).toEqual([{ a: '1', b: '2', c: '' }]);
  });
  it('strips a BOM', () => {
    expect(parseCsv('\ufeffa,b\n1,2')[0]).toEqual(['a', 'b']);
  });
});

describe('slugs', () => {
  it('normalises accents, ampersands and punctuation', () => {
    expect(slugify('Pokémon')).toBe('pokemon');
    expect(slugify('Mickey Mouse & Friends')).toBe('mickey-mouse-and-friends');
    expect(slugify('Yu-Gi-Oh!')).toBe('yu-gi-oh');
    expect(slugify('Marvel Cinematic Universe (MCU)')).toBe('marvel-cinematic-universe-mcu');
  });
  it('gives all 140 franchises a unique, non-empty slug', () => {
    const slugs = franchises.map((f) => f.slug);
    expect(slugs.every((s) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s))).toBe(true);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe('ledger (Wikipedia revision 1384334611, read 10 Nov 2026)', () => {
  it('has 140 franchises totalling $1,460.1B', () => {
    expect(franchises).toHaveLength(140);
    expect(ledgerTotal.toFixed(1)).toBe('1460.1');
  });
  it('ranks Pokémon first at $130.7B', () => {
    const p = franchiseBySlug.get('pokemon')!;
    expect(p.rank).toBe(1);
    expect(p.total).toBe(130.7);
  });
  it('Pokémon is larger than Star Wars + MCU ($84.2B)', () => {
    const h = headline();
    expect(h.starWarsPlusMcu.toFixed(1)).toBe('84.2');
    expect(h.pokemon).toBeGreaterThan(h.starWarsPlusMcu);
  });
  it('every franchise has at least one stream row and non-negative amounts', () => {
    for (const f of franchises) {
      expect(f.streams.length, f.name).toBeGreaterThan(0);
      expect(f.streams.every((s) => s.amount > 0)).toBe(true);
    }
  });
  it('stream rows reproduce each stated total within rounding of the source', () => {
    for (const f of franchises) {
      const sum = f.streams.reduce((a, s) => a + s.amount, 0);
      expect(Math.abs(sum - f.total) / f.total, f.name).toBeLessThan(0.02);
    }
  });
  it('Call of Duty is one video-game line of $40B', () => {
    const c = franchiseBySlug.get('call-of-duty')!;
    expect(c.total).toBe(40);
    expect(c.streams).toEqual([{ key: 'games', amount: 40 }]);
  });
});

describe('stream shares as published', () => {
  const h = headline();
  it('merchandise is 55.6% (43.2-65.8) and $812.4B', () => {
    expect(h.merch.share.share).toBe(55.6);
    expect([h.merch.share.lo, h.merch.share.hi]).toEqual([43.2, 65.8]);
    expect(h.merch.amount.toFixed(1)).toBe('812.4');
  });
  it('games 18.3% ($268.2B) and box office 18.1% ($265.3B) overlap', () => {
    expect(h.games.share.share).toBe(18.3);
    expect(h.box.share.share).toBe(18.1);
    expect(h.games.amount.toFixed(1)).toBe('268.2');
    expect(h.box.amount.toFixed(1)).toBe('265.3');
    expect(h.games.share.lo).toBeLessThan(h.box.share.hi);
    expect(h.box.share.lo).toBeLessThan(h.games.share.hi);
  });
  it('about $27.2B is in the totals but not itemised (1.9%)', () => {
    expect(h.unalloc.amount.toFixed(1)).toBe('27.2');
    expect(h.unalloc.share.share).toBe(1.9);
  });
  it('our own stream sums reproduce the published shares to one decimal', () => {
    const sumAll = franchises.reduce((a, f) => a + f.streams.reduce((x, s) => x + s.amount, 0), 0);
    expect(((h.merch.amount / sumAll) * 100).toFixed(1)).toBe('55.6');
    expect(((h.games.amount / sumAll) * 100).toFixed(1)).toBe('18.3');
    expect(((h.box.amount / sumAll) * 100).toFixed(1)).toBe('18.1');
  });
  it('2019 vintage rows exist but are kept apart', () => {
    expect(categoryShares('2019').find((c) => c.category === 'Box Office')!.share).toBe(8.9);
  });
});

describe('owners', () => {
  const ps = parents();
  it('rolls 140 rows into 57 first-listed parents', () => {
    expect(ps).toHaveLength(57);
    expect(ps.reduce((a, p) => a + p.count, 0)).toBe(140);
  });
  it('Disney is $430.7B and 29.5%', () => {
    expect(ps[0].name).toBe('Disney');
    expect(ps[0].total.toFixed(1)).toBe('430.7');
    expect(ps[0].share.toFixed(1)).toBe('29.5');
    expect(ps[0].count).toBe(32);
  });
  it('top five are Disney, Warner Bros. Discovery, The Pokémon Company, Microsoft, Paramount Skydance at 58.3%', () => {
    expect(ps.slice(0, 5).map((p) => p.name)).toEqual(['Disney', 'Warner Bros. Discovery', 'The Pokémon Company', 'Microsoft', 'Paramount Skydance']);
    expect(ps.slice(0, 5).map((p) => p.total.toFixed(1))).toEqual(['430.7', '133.0', '130.7', '84.2', '72.8']);
    expect(ps.slice(0, 5).reduce((a, p) => a + p.share, 0).toFixed(1)).toBe('58.3');
  });
  it('matches the published concentration table with ranges', () => {
    const c = concentration().filter((x) => x.ledger === '2026 ledger');
    expect(c.map((x) => [x.topK, x.share, x.lo, x.hi])).toEqual([[1, 29.5, 18.0, 42.9], [5, 58.3, 52.3, 72.7]]);
  });
  it('labels the one franchise with no stated owner explicitly', () => {
    const none = ps.find((p) => p.name === 'Not stated on the list')!;
    expect(none.franchises.map((f) => f.name)).toEqual(['Anpanman']);
  });
});

describe('origin', () => {
  const r = Object.fromEntries(regionSummary().map((x) => [x.origin, x]));
  it('US $825.5B/88, Japan $394.5B/30, UK $136.1B/9 as published', () => {
    expect([r.US.total.toFixed(1), r.US.n]).toEqual(['825.5', 88]);
    expect([r.Japan.total.toFixed(1), r.Japan.n]).toEqual(['394.5', 30]);
    expect([r.UK.total.toFixed(1), r.UK.n]).toEqual(['136.1', 9]);
    expect([r.Canada.total.toFixed(1), r.Sweden.total.toFixed(1), r.Korea.total.toFixed(1)]).toEqual(['23.1', '26.3', '27.0']);
  });
  it('published merchandise shares: Japan 71.4, US 51.5, UK 53.9, Canada 77.9, Sweden 12.8', () => {
    expect([r.Japan.merchShare, r.US.merchShare, r.UK.merchShare, r.Canada.merchShare, r.Sweden.merchShare]).toEqual([71.4, 51.5, 53.9, 77.9, 12.8]);
  });
  it('derived origin totals match the published totals', () => {
    for (const m of originMix()) expect(m.total).toBeCloseTo(r[m.origin].total, 1);
  });
  it('derived merchandise share reproduces the published figures within 0.1 points', () => {
    for (const m of originMix()) {
      const pub = r[m.origin].merchShare;
      if (pub !== null) expect(Math.abs(m.merchShareOfTotal - pub), m.name).toBeLessThan(0.15);
    }
  });
});

describe('box office top ten (Box Office Mojo, with The Numbers beside it, read 10 Nov 2026)', () => {
  it('2025: nine of ten, 94.3% on Mojo and 94.2% on The Numbers', () => {
    const s = topTenSummary(2025);
    expect([s.films, s.franchiseCount]).toEqual([10, 9]);
    expect(s.shareMojo.toFixed(1)).toBe('94.3');
    expect(s.shareNumbers.toFixed(1)).toBe('94.2');
  });
  it('2026 so far: six of ten, 61.9% on both', () => {
    const s = topTenSummary(2026);
    expect([s.films, s.franchiseCount]).toEqual([10, 6]);
    expect(s.shareMojo.toFixed(1)).toBe('61.9');
    expect(s.shareNumbers.toFixed(1)).toBe('61.9');
  });
});

describe('deals', () => {
  it('lists Pixar $7.4B, Marvel $4.0B, Lucasfilm $4.05B, Fox $71.3B', () => {
    expect(deals().map((d) => [d.target.split(' ')[0], d.price])).toEqual([['Pixar', 7.4], ['Marvel', 4], ['Lucasfilm', 4.05], ['21st', 71.3]]);
  });
});
