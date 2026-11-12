/** Constants shared by the build and the browser. No data files are imported here, so client bundles stay small. */
/* ---------- streams ---------- */

export type StreamKey = 'merch' | 'games' | 'box' | 'video' | 'tv' | 'music' | 'books' | 'live' | 'mixed' | 'unalloc';
export type StreamGroup = 'merch' | 'games' | 'box' | 'other' | 'unalloc';

export const STREAMS: { key: StreamKey; source: string; label: string; short: string; group: StreamGroup }[] = [
  { key: 'merch', source: 'Merchandise, Licensing & Retail', label: 'Merchandise, licensing & retail', short: 'Merchandise', group: 'merch' },
  { key: 'games', source: 'Video Games/Games', label: 'Video games', short: 'Video games', group: 'games' },
  { key: 'box', source: 'Box Office', label: 'Box office', short: 'Box office', group: 'box' },
  { key: 'video', source: 'Home Video/Entertainment', label: 'Home video', short: 'Home video', group: 'other' },
  { key: 'tv', source: 'TV', label: 'TV', short: 'TV', group: 'other' },
  { key: 'music', source: 'Music', label: 'Music', short: 'Music', group: 'other' },
  { key: 'books', source: 'Book sales', label: 'Book sales', short: 'Books', group: 'other' },
  { key: 'live', source: 'Live & Other', label: 'Live & other', short: 'Live & other', group: 'other' },
  { key: 'mixed', source: 'Mixed (unsplit)', label: 'Mixed (unsplit)', short: 'Mixed', group: 'other' },
  { key: 'unalloc', source: 'Unallocated', label: 'In the total, not itemised', short: 'Not itemised', group: 'unalloc' },
];

export const streamByKey = new Map(STREAMS.map((s) => [s.key, s]));

export const GROUPS: { key: StreamGroup; label: string }[] = [
  { key: 'merch', label: 'Merchandise, licensing & retail' },
  { key: 'games', label: 'Video games' },
  { key: 'box', label: 'Box office' },
  { key: 'other', label: 'Home video, TV, music, books, other' },
  { key: 'unalloc', label: 'In the total, not itemised' },
];

/* ---------- origins ---------- */

export const ORIGIN_NAMES: Record<string, string> = {
  US: 'United States',
  UK: 'United Kingdom',
  Japan: 'Japan',
  Korea: 'Korea',
  Canada: 'Canada',
  China: 'China',
  Sweden: 'Sweden',
  Finland: 'Finland',
  Belgium: 'Belgium',
  Italy: 'Italy',
  Denmark: 'Denmark',
};

export const NO_OWNER = 'Not stated on the list';

