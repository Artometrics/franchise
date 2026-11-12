import type { Franchise } from './data';

export type SlimFranchise = Pick<Franchise, 'slug' | 'name' | 'year' | 'total' | 'owner' | 'origin' | 'originName' | 'streams' | 'merchShare' | 'rank' | 'originalMedia'> & { itemisedSum: number; merchAmount: number; topStream: Franchise['topStream']; breakdownSum: number; unallocated: number; ownersRaw: string; in2019: boolean };

/** Everything the browser needs to rebuild rows and compare charts, without shipping the CSV files. */
export function slim(list: Franchise[]): SlimFranchise[] {
  return list.map((f) => ({
    slug: f.slug,
    name: f.name,
    year: f.year,
    total: f.total,
    owner: f.owner,
    origin: f.origin,
    originName: f.originName,
    streams: f.streams,
    merchShare: f.merchShare,
    rank: f.rank,
    originalMedia: f.originalMedia,
    itemisedSum: f.itemisedSum,
    merchAmount: f.merchAmount,
    topStream: f.topStream,
    breakdownSum: f.breakdownSum,
    unallocated: f.unallocated,
    ownersRaw: f.ownersRaw,
    in2019: f.in2019,
  }));
}
