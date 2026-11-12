export function fmtB(n: number, digits?: number): string {
  const d = digits ?? (n >= 100 ? 1 : n >= 10 ? 1 : n >= 1 ? 2 : 3);
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}B`;
}

/** Lifetime totals are printed to one decimal in the article ($130.7B, $9.74B for sub-$10B rows with 2 dp). */
export function fmtTotal(n: number): string {
  const s = String(n);
  const dp = s.includes('.') ? s.split('.')[1].length : 0;
  const d = Math.min(Math.max(dp, 1), 3);
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}B`;
}

export function fmtPct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Stream amounts: 1 dp from $10B, 2 dp above a hundredth of a billion, 3 dp below. */
export function fmtAmt(n: number): string {
  const d = n >= 10 ? 1 : n >= 0.01 ? 2 : 3;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}B`;
}

/** Share label: whole percent, or one decimal below 1%. */
export function pctLabel(part: number, whole: number): string {
  const p = (part / whole) * 100;
  if (p > 0 && p < 0.1) return '<0.1%';
  return `${p.toFixed(p >= 1 ? 0 : 1)}%`;
}

export function ratioPct(part: number, whole: number, digits = 1): string {
  return ((part / whole) * 100).toFixed(digits);
}
