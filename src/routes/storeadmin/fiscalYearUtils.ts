// Utility to calculate the current fiscal year (April 1 – March 31) based on a given date (defaults to today)

export function getCurrentFiscalYearRange(date: Date = new Date()): { start: Date; end: Date } {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed: 0 = Jan, 3 = Apr
  let start: Date, end: Date;

  if (month >= 3) { // April (3) or later: fiscal year starts this year
    start = new Date(Date.UTC(year, 3, 1, 0, 0, 0, 0)); // April 1, 00:00:00 UTC
    end = new Date(Date.UTC(year + 1, 2, 31, 23, 59, 59, 999)); // March 31 next year, 23:59:59.999 UTC
  } else { // Jan–Mar: fiscal year started last year
    start = new Date(Date.UTC(year - 1, 3, 1, 0, 0, 0, 0));
    end = new Date(Date.UTC(year, 2, 31, 23, 59, 59, 999));
  }
  return { start, end };
}
