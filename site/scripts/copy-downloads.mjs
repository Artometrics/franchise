// Copies the verbatim source data files into public/downloads so they ship with the site.
import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const from = new URL('../src/data/source/data/', import.meta.url).pathname;
const to = new URL('../public/downloads/', import.meta.url).pathname;
await mkdir(to, { recursive: true });
for (const f of await readdir(from)) {
  if (/\.(csv|md)$/.test(f)) await copyFile(join(from, f), join(to, f));
}
