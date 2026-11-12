import { MAX_PICKS, MIN_PICKS, compareSpecs, parseSelection, seriesRole, toSearch, toggle } from '../lib/compare';
import { chartHtml } from '../lib/charts';
import { escapeHtml, fmtTotal } from '../lib/format';
import { streamByKey } from '../lib/streams';
import type { Franchise } from '../lib/data';
import type { SlimFranchise } from '../lib/slim';

const all = JSON.parse(document.getElementById('franchise-data')!.textContent!) as SlimFranchise[];
const bySlug = new Map(all.map((f) => [f.slug, f]));
const known = new Set(bySlug.keys());
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const picksEl = $('picks');
const msg = $('msg');
const find = $<HTMLInputElement>('find');
const add = $<HTMLSelectElement>('add');
const sorted = [...all].sort((a, b) => a.name.localeCompare(b.name));

let sel = parseSelection(location.search, known);
if (sel.length === 0 && !location.search) sel = ['pokemon', 'star-wars', 'marvel-cinematic-universe-mcu'];

function options() {
  const needle = find.value.trim().toLowerCase();
  const rows = sorted.filter((f) => !sel.includes(f.slug) && (!needle || f.name.toLowerCase().includes(needle) || f.owner.toLowerCase().includes(needle)));
  add.innerHTML = `<option value="">${rows.length ? `Choose a franchise (${rows.length})` : 'No match'}</option>` + rows.map((f) => `<option value="${f.slug}">${escapeHtml(f.name)} (${fmtTotal(f.total)})</option>`).join('');
}

function facts(list: SlimFranchise[]) {
  const row = (k: string, cell: (f: SlimFranchise) => string) => `<tr><th scope="row">${k}</th>${list.map((f) => `<td>${cell(f)}</td>`).join('')}</tr>`;
  return `<table class="facts"><thead><tr><th scope="col"><span class="sr">Fact</span></th>${list.map((f) => `<th scope="col"><a href="/explore/${f.slug}">${escapeHtml(f.name)}</a></th>`).join('')}</tr></thead><tbody>
    ${row('Total', (f) => `<strong>${fmtTotal(f.total)}</strong>`)}
    ${row('Rank', (f) => `${f.rank} of ${all.length}`)}
    ${row('Owner', (f) => escapeHtml(f.owner))}
    ${row('Origin', (f) => escapeHtml(f.originName))}
    ${row('Created', (f) => String(f.year ?? 'n/a'))}
    ${row('First medium', (f) => escapeHtml(f.originalMedia))}
    ${row('Merch share', (f) => (f.merchShare === null ? 'n/a' : `${f.merchShare.toFixed(0)}%`))}
    ${row('Top stream', (f) => (f.topStream ? streamByKey.get(f.topStream)!.short : 'Not itemised'))}
  </tbody></table>`;
}

function render() {
  const list = sel.map((s) => bySlug.get(s)!);
  picksEl.innerHTML = list
    .map((f, i) => `<li class="pick"><i class="sw r-${seriesRole(i)}"></i>${escapeHtml(f.name)}<button type="button" data-remove="${f.slug}" aria-label="Remove ${escapeHtml(f.name)}">&times;</button></li>`)
    .join('');
  const out = $('out');
  if (list.length === 0) {
    out.hidden = true;
    msg.textContent = `Choose ${MIN_PICKS} or ${MAX_PICKS} franchises to compare.`;
  } else {
    out.hidden = false;
    const specs = compareSpecs(list as unknown as Franchise[]);
    $('c-totals').innerHTML = chartHtml(specs.totals);
    $('c-streams').innerHTML = chartHtml(specs.byStream);
    $('c-mix').innerHTML = chartHtml(specs.mix);
    $('c-facts').innerHTML = facts(list);
    if (list.length < MIN_PICKS) msg.textContent = `Add ${MIN_PICKS - list.length} more to compare side by side.`;
    else if (!msg.dataset.keep) msg.textContent = list.length === MAX_PICKS ? `${MAX_PICKS} picked, the most you can compare. Remove one to swap.` : '';
  }
  delete msg.dataset.keep;
  history.replaceState(null, '', `${location.pathname}${toSearch(sel)}`);
  options();
}

function apply(slug: string) {
  const r = toggle(sel, slug);
  sel = r.sel;
  if (r.message) {
    msg.textContent = r.message;
    msg.dataset.keep = '1';
  } else msg.textContent = '';
  render();
}

add.addEventListener('change', () => {
  if (add.value) apply(add.value);
  find.value = '';
});
find.addEventListener('input', options);
picksEl.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-remove]');
  if (b) apply(b.dataset.remove!);
});
document.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((b) =>
  b.addEventListener('click', () => {
    sel = parseSelection(`?f=${b.dataset.preset}`, known);
    msg.textContent = '';
    render();
  }),
);
render();
