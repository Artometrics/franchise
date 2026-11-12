// Post-build guard: every built HTML page must carry the noindex meta tag, and the
// noindex posture in robots.txt and firebase.json must still be in place.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const problems = [];

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

const files = await walk(dist);
const html = files.filter((f) => f.endsWith('.html'));
for (const f of html) {
  const t = await readFile(f, 'utf8');
  if (!/<meta name="robots" content="[^"]*noindex[^"]*"/.test(t)) problems.push(`missing noindex meta: ${f.replace(dist, '')}`);
  if (!t.includes('artometrics.com/franchise')) problems.push(`missing back-link to artometrics.com/franchise: ${f.replace(dist, '')}`);
  if (/<link[^>]+rel="canonical"/.test(t) && !/<link[^>]+rel="canonical"[^>]+href="https:\/\/artometrics\.com\/franchise"/.test(t)) {
    problems.push(`unexpected canonical: ${f.replace(dist, '')}`);
  }
}

const robots = await readFile(join(dist, 'robots.txt'), 'utf8');
if (!/Disallow:\s*\/\s*$/m.test(robots)) problems.push('robots.txt does not Disallow: /');

const fb = JSON.parse(await readFile(new URL('../firebase.json', import.meta.url), 'utf8'));
const tag = (fb.hosting.headers ?? []).flatMap((h) => h.headers).find((h) => h.key === 'X-Robots-Tag');
if (!tag || !/noindex/.test(tag.value)) problems.push('firebase.json lacks X-Robots-Tag noindex');
if (fb.hosting.site !== 'artometrics-franchise') problems.push('firebase.json hosting site is not artometrics-franchise');

if (problems.length) {
  console.error(`verify-dist: ${problems.length} problem(s)\n - ${problems.join('\n - ')}`);
  process.exit(1);
}
console.log(`verify-dist: ${html.length} HTML pages OK (noindex meta, back-link), robots.txt and firebase.json OK`);
