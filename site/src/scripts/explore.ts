import { applyQuery, defaultQuery, parseQuery, tbodyHtml, toSearch, type ExploreQuery, type SortKey } from '../lib/explore';
import type { Franchise } from '../lib/data';
import type { SlimFranchise } from '../lib/slim';
import { fmtB } from '../lib/format';

const all = JSON.parse(document.getElementById('franchise-data')!.textContent!) as SlimFranchise[];
const list = all as unknown as Franchise[];
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const q = $<HTMLInputElement>('q');
const origin = $<HTMLSelectElement>('origin');
const owner = $<HTMLSelectElement>('owner');
const stream = $<HTMLSelectElement>('stream');
const sort = $<HTMLSelectElement>('sort');
const body = $('explore-body');
const status = $('status');
const empty = $('empty');
const reset = $<HTMLButtonElement>('reset');
const table = $('explore-table');

const valid = { origins: new Set(all.map((f) => f.origin)), owners: new Set(all.map((f) => f.owner)) };
let state: ExploreQuery = parseQuery(location.search, valid);

function writeControls() {
  q.value = state.q;
  origin.value = state.origin;
  owner.value = state.owner;
  stream.value = state.stream;
  const key = `${state.sort}:${state.dir}`;
  if (![...sort.options].some((o) => o.value === key)) sort.add(new Option(`${state.sort}, ${state.dir === 'asc' ? 'ascending' : 'descending'}`, key));
  sort.value = key;
}

const ARROWS = { ascending: '↑', descending: '↓', none: '↕' } as const;

function render() {
  const rows = applyQuery(list, state);
  body.innerHTML = tbodyHtml(rows);
  const filtered = rows.length !== all.length;
  const sum = rows.reduce((a, f) => a + f.total, 0);
  status.textContent = filtered ? `Showing ${rows.length} of ${all.length} franchises · ${fmtB(sum, 1)} combined` : `Showing all ${all.length} franchises`;
  empty.hidden = rows.length > 0;
  table.hidden = rows.length === 0;
  const dirty = state.q || state.origin || state.owner || state.stream;
  reset.hidden = !dirty;
  table.querySelectorAll<HTMLTableCellElement>('thead th').forEach((th) => {
    const col = th.dataset.col as SortKey;
    const active = col === state.sort;
    const val = active ? (state.dir === 'asc' ? 'ascending' : 'descending') : 'none';
    th.setAttribute('aria-sort', val);
    th.querySelector('.arr')!.textContent = ARROWS[val];
  });
  const search = toSearch(state);
  history.replaceState(null, '', `${location.pathname}${search}`);
}

function readControls() {
  const [s, d] = sort.value.split(':') as [SortKey, 'asc' | 'desc'];
  state = { q: q.value.trim(), origin: origin.value, owner: owner.value, stream: stream.value, sort: s, dir: d };
  render();
}

[q, origin, owner, stream, sort].forEach((el) => el.addEventListener(el === q ? 'input' : 'change', readControls));

table.querySelector('thead')!.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-sort]');
  if (!btn) return;
  const key = btn.dataset.sort as SortKey;
  if (state.sort === key) state = { ...state, dir: state.dir === 'asc' ? 'desc' : 'asc' };
  else state = { ...state, sort: key, dir: key === 'name' || key === 'owner' || key === 'origin' ? 'asc' : 'desc' };
  writeControls();
  render();
});

reset.addEventListener('click', () => {
  state = { ...defaultQuery, sort: state.sort, dir: state.dir };
  writeControls();
  render();
  q.focus();
});

writeControls();
render();
