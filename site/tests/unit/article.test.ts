import { describe, expect, it } from 'vitest';
import { blockHtml, chartFigure, chartKeys, citationsBySource, citedIds, findings, firstParagraph, frontmatter, keyFigures, linkCitations, rawBodyText, rewriteHref, segments, sourceById, sources, toc } from '../../src/lib/article';

describe('citation linker', () => {
  it('links every ID in [S017; S005] and keeps the brackets and separators', () => {
    const out = linkCitations('<p>A claim. [S017; S005]</p>');
    expect(out).toContain('[<a class="cite" href="/sources#S017"');
    expect(out).toContain('href="/sources#S005"');
    expect(out).toMatch(/S017<\/a>; <a/);
  });
  it('links both ends of a range like [S009–S012]', () => {
    const out = linkCitations('x [S009–S012] y');
    expect(out).toContain('#S009');
    expect(out).toContain('#S012');
  });
  it('resolves author-year aliases to registry IDs', () => {
    const out = linkCitations('[Jenkins, 2006; Steinberg, 2012; Hernández Hernández, 2018]');
    expect(out).toContain('/sources#S002');
    expect(out).toContain('/sources#S003');
    expect(out).toContain('/sources#HH2018');
  });
  it('leaves other brackets and attribute text alone', () => {
    expect(linkCitations('<a title="[S001]">[see below]</a>')).toBe('<a title="[S001]">[see below]</a>');
  });
  it('every citation in the article resolves to a source in the sidecar', () => {
    const ids = new Set(citedIds(rawBodyText));
    expect(ids.size).toBeGreaterThan(10);
    for (const id of ids) expect(sourceById.has(id), id).toBe(true);
  });
  it('every source in the sidecar has a title, publisher, url and year', () => {
    expect(sources.length).toBe(23);
    for (const s of sources) {
      expect(s.title && s.publisher && s.url && s.year, s.id).toBeTruthy();
      expect(s.url).toMatch(/^https:\/\//);
    }
  });
  it('lists which article sections cite each source', () => {
    const map = citationsBySource();
    expect(map.get('S017')!.length).toBeGreaterThan(5);
  });
});

describe('link rewriting', () => {
  it('keeps the changelog on this site and sends unknown live paths to artometrics.com', () => {
    expect(rewriteHref('/franchise/changelog')).toEqual({ href: '/changelog', external: false });
    expect(rewriteHref('/franchise-data-fix').href).toBe('https://artometrics.com/franchise-data-fix');
  });
  it('serves CSVs this site hosts from /downloads and others from the live site', () => {
    expect(rewriteHref('/data/articles/franchise/wikipedia_franchise_revenue_2026.csv').href).toBe('/downloads/wikipedia_franchise_revenue_2026.csv');
    expect(rewriteHref('/data/articles/franchise/charts/candidates/scores.csv').href).toBe('https://artometrics.com/data/articles/franchise/charts/candidates/scores.csv');
  });
});

describe('article structure', () => {
  it('parses five findings with the article wording', () => {
    expect(findings).toHaveLength(5);
    expect(findings[0].text).toContain('55.6%');
    expect(findings[1].text).toContain('$130.7 billion');
    expect(findings[2].text).toContain('58.3%');
    expect(findings[3].text).toContain('$825.5 billion');
    expect(findings[4].text).toContain('Nine of the ten');
  });
  it('parses six key figures from the frontmatter', () => {
    expect(keyFigures.map((k) => k.value)).toEqual(['$1,460.1B', '55.6%', '$130.7B', '29.5% / 58.3%', '71.4% vs 51.5%', '9 of 10']);
    expect(keyFigures.every((k) => k.cites.length > 0)).toBe(true);
  });
  it('has five FAQ pairs and the live title', () => {
    expect(frontmatter.faq.length).toBeGreaterThanOrEqual(5);
    expect(frontmatter.title).toBe('FRANCHISE: Merchandise Owns the Ledger');
  });
  it('splits into text, 20+ charts and one gallery of 8', () => {
    const charts = segments.filter((s) => s.type === 'chart');
    const gallery = segments.filter((s) => s.type === 'gallery');
    expect(charts.length).toBe(20);
    expect(gallery).toHaveLength(1);
    expect(gallery[0].type === 'gallery' && gallery[0].cards).toHaveLength(8);
  });
  it('removes the narration placeholder that refers to a player this site does not have', () => {
    expect(JSON.stringify(segments)).not.toContain('Narration placeholder');
  });
  it('builds a table of contents from h2 headings including the IP section', () => {
    expect(toc.map((t) => t.id)).toContain('own-or-market-an-ip');
    expect(toc.length).toBeGreaterThan(8);
  });
  it('extracts a heading block up to the next heading of the same level', () => {
    const html = blockHtml('ip-consolidation');
    expect(html).toContain('Ownership is concentrated');
    expect(html).not.toContain('Merchandise is the main engine');
    expect(blockHtml('ip-merchandise')).toContain('71.4%');
  });
  it('finds a lead paragraph by section and phrase', () => {
    expect(firstParagraph('disney', '29.5%')).toContain('$430.7 billion');
  });
});

describe('every chart in the article can be drawn from its JSON', () => {
  it('has 28 chart specs', () => {
    expect(chartKeys).toHaveLength(28);
  });
  it('adapts each one with rows, a headline and a source line', () => {
    for (const key of chartKeys) {
      const f = chartFigure(key);
      expect(f.headline, key).toBeTruthy();
      if (f.spec.type === 'bars') expect(f.spec.rows.length, key).toBeGreaterThan(0);
      else expect(f.spec.type).toBe('line');
      expect(f.sourceLine, key).toBeTruthy();
    }
  });
});
