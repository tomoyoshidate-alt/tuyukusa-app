export type TimePeriod = "morning" | "day" | "evening" | "night";

/** Morning 4:00–9:59, Day 10:00–15:59, Evening 16:00–21:59, Night 22:00–3:59 */
export function getTimePeriod(date = new Date()): TimePeriod {
  const hour = date.getHours();
  if (hour >= 4 && hour <= 9) return "morning";
  if (hour >= 10 && hour <= 15) return "day";
  if (hour >= 16 && hour <= 21) return "evening";
  return "night";
}
