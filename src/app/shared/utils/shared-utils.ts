export function normalizeWinProbability(value: number): number {
  if (!Number.isFinite(value)) return value;
  return value > 1 ? value / 100 : value;
} // per definire range per il numero della Win%

export function toBackendDate(value: string): string | null {
  if (!value) return null;
  const dateOnly = value.split('T')[0];
  const [y, m, d] = dateOnly.split('-').map((v) => Number(v));
  if (!y || !m || !d) return value;
  return `${y.toString().padStart(4, '0')}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
} // per gestire i dati delle date (file pipe?)

export function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return NaN;
  const raw = String(value).trim().replace(',', '.');
  const num = Number(raw);
  return Number.isFinite(num) ? num : NaN;
} // Per gestire i numeri decimali e verificare che non ci siano altri caratteri al di fuori di numeri oltre . e ,