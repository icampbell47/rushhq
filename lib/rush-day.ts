const RUSH_TIME_ZONE = "America/New_York";
const RUSH_DAY_CUTOFF_HOUR = 6;

function getEasternParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: RUSH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour: Number(lookup.hour)
  };
}

function formatDateValue(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getRushDateForDate(date: Date) {
  const parts = getEasternParts(date);
  const rushDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  if (parts.hour < RUSH_DAY_CUTOFF_HOUR) rushDate.setUTCDate(rushDate.getUTCDate() - 1);
  return formatDateValue(rushDate);
}

export function isRushDate(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  // Round-trip through Date.UTC to reject impossible dates like 2026-02-30.
  const [year, month, day] = value.split("-").map(Number);
  return formatDateValue(new Date(Date.UTC(year, month - 1, day))) === value;
}

export function getDefaultRushDate(now = new Date()) {
  return getRushDateForDate(now);
}

export function getRushDateForTimestamp(value: string | null) {
  if (!value) return null;
  return getRushDateForDate(new Date(value));
}

export function isPnmOnRushDate(
  createdAt: string | null,
  rushDate: string,
  checkIns: Array<{ rush_date: string | null }> = []
) {
  return checkIns.some((checkIn) => checkIn.rush_date === rushDate) || getRushDateForTimestamp(createdAt) === rushDate;
}

export function getLatestPnmRushDate(createdAt: string | null, checkIns: Array<{ rush_date: string | null }> = []) {
  const checkInDates = checkIns
    .map((checkIn) => checkIn.rush_date)
    .filter((rushDate): rushDate is string => isRushDate(rushDate))
    .sort();

  return checkInDates.at(-1) ?? getRushDateForTimestamp(createdAt);
}
