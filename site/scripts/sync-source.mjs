// Fetches the current published FRANCHISE article, its sources sidecar and data files
// from artometrics.com and the public Artometrics/artometrics repo, and records SHA-256 hashes.
// Run: node scripts/sync-source.mjs   (network required; the build itself never needs it)
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const LIVE = 'https://artometrics.com';
const RAW = 'https://raw.githubusercontent.com/Artometrics/artometrics/main';
const D = '/data/articles/franchise';
const OUT = new URL('../src/data/source/', import.meta.url).pathname;

const csv = [
  'clean/franchise_entities_2026-10.csv',
  'clean/franchise_revenue_long_2026-10.csv',
  'clean/category_shares_bootstrap.csv',
  'clean/owner_concentration_bootstrap.csv',
  'clean/region_summary_2026-10.csv',
  'clean/old_vs_new.csv',
  'wikipedia_franchise_revenue_2026.csv',
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
];
const charts = [
  'candidates/c02_pokemon_vs_two', 'chart6_revenue_streams_2026', 'chart1_top20_revenue_2026',
  'candidates/c03_revisions', 'chart10_wiki_2019_vs_2026', 'candidates/c04_what_moved',
  'chart15_region_2026', 'chart5_original_media_revenue', 'chart11_mix_by_original_medium',
  'chart14_box_office_share_top20', 'chart2_revenue_per_year', 'chart3a_disney_non_consolidated',
  'chart3b_disney_consolidated', 'chart12_owner_concentration_2026', 'chart8_disney_acquisitions',
  'chart13_deal_price_vs_revenue', 'chart9_disney_segments_fy2025', 'chart7_top10_franchise_share',
  'candidates/c05_nezha_trackers', 'chart16_worldwide_top10_2025_2026',
  'candidates/c06_parents', 'candidates/c07_us_japan', 'candidates/c08_segments', 'candidates/c16_dc',
  'candidates/c18_2025_count', 'candidates/c19_2026_count', 'candidates/c22_hello_levels',
  'candidates/c24_ledger_total',
];

const jobs = [
  { url: `${RAW}/src/content/blog/franchise.md`, to: 'article/franchise.md' },
  { url: `${RAW}/src/content/blog/franchise.meta.json`, to: 'article/franchise.meta.json' },
  ...csv.map((f) => ({ url: `${LIVE}${D}/${f}`, to: `data/${f.replace('clean/', '')}` })),
  ...charts.map((c) => ({ url: `${LIVE}${D}/charts/${c}.plotly.json`, to: `charts/${c.split('/').pop()}.plotly.json` })),
];

const manifest = [];
for (const j of jobs) {
  const res = await fetch(j.url);
  if (!res.ok) throw new Error(`${res.status} ${j.url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const path = join(OUT, j.to);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, buf);
  manifest.push({ file: j.to, url: j.url, bytes: buf.length, sha256: createHash('sha256').update(buf).digest('hex') });
  console.log('ok', j.to);
}
await writeFile(join(OUT, 'MANIFEST.json'), JSON.stringify({ fetched: new Date().toISOString(), files: manifest }, null, 2) + '\n');
