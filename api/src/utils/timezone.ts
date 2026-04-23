// Costa Rica is UTC-6 with no DST
const CR_OFFSET_MS = 6 * 60 * 60 * 1000;

// Returns midnight UTC representing the start of "today" in Costa Rica.
// Example: at 10:30 PM CR (= 4:30 AM UTC next day), returns today-CR midnight, NOT tomorrow-UTC midnight.
export function todayCR(): Date {
  const nowUTC = new Date();
  const crDate = new Date(nowUTC.getTime() - CR_OFFSET_MS);
  return new Date(Date.UTC(crDate.getUTCFullYear(), crDate.getUTCMonth(), crDate.getUTCDate()));
}

// "YYYY-MM-DD" for today in Costa Rica
export function todayCRString(): string {
  return todayCR().toISOString().slice(0, 10);
}

// Converts any UTC timestamp to its "YYYY-MM-DD" calendar date in Costa Rica
export function toCRDateString(date: Date): string {
  return new Date(date.getTime() - CR_OFFSET_MS).toISOString().slice(0, 10);
}

// Simple date arithmetic (timezone-safe when d is already a midnight UTC date from todayCR)
export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}
