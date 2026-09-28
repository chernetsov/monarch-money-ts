function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** First day of the current local month as YYYY-MM-DD. */
export function startOfCurrentMonth(now: Date = new Date()): string {
  return formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

/** Last day of the current local month as YYYY-MM-DD. */
export function endOfCurrentMonth(now: Date = new Date()): string {
  return formatLocalDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
}
