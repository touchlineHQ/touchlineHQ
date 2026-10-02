/**
 * The roundup link a weekly reminder should keep.
 *
 * No `week` param: the page treats a missing week as "the latest one this club
 * has played", so the same link is still right next Tuesday.
 */
export function latestRoundupUrl(slug: string): string {
  return `https://touchlinehq.co.uk/roundup?club=${encodeURIComponent(slug)}`;
}

/**
 * Address-bar query. The latest week is left unpinned so a saved or shared
 * club link keeps meaning "whatever was just played". An older week stays
 * pinned, because that link is about one weekend and must not move on.
 */
export function roundupQuery(
  club: string | null,
  week: string | null,
  latestWeek: string | null,
): string {
  const params = new URLSearchParams();
  if (!club) return params.toString();
  params.set('club', club);
  if (week && latestWeek && week !== latestWeek) params.set('week', week);
  return params.toString();
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

/** Tuesday, the day coaches have had two days after Sunday to file reports. */
const REMINDER_WEEKDAY = 2;
const REMINDER_MINUTES = 19 * 60;

export interface CivilDate {
  year: number;
  month: number;
  day: number;
}

interface LondonNow extends CivilDate {
  weekday: number;
  minutes: number;
}

function londonNow(now: Date): LondonNow {
  const formatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts: Record<string, string> = {};
  for (const part of formatted.formatToParts(now)) parts[part.type] = part.value;
  const weekday = WEEKDAY_INDEX[parts.weekday];
  if (weekday === undefined) throw new Error(`Unexpected weekday ${parts.weekday}`);
  const hour = Number(parts.hour) % 24;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday,
    minutes: hour * 60 + Number(parts.minute),
  };
}

function addCalendarDays(date: CivilDate, days: number): CivilDate {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

/**
 * The next Tuesday at 7pm UK time. A Tuesday that has not reached 7pm yet is
 * that same evening; 7pm itself waits until the following Tuesday.
 */
export function nextTuesdayEvening(now: Date): CivilDate {
  const civil = londonNow(now);
  let delta = (REMINDER_WEEKDAY - civil.weekday + 7) % 7;
  if (delta === 0 && civil.minutes >= REMINDER_MINUTES) delta = 7;
  return addCalendarDays(civil, delta);
}

function stamp(date: CivilDate, hour: number, minute: number): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.year}${pad(date.month)}${pad(date.day)}T${pad(hour)}${pad(minute)}00`;
}

/**
 * Google Calendar template for a 15-minute reminder, every Tuesday at 7pm
 * UK time. The event location is the unpinned roundup URL.
 */
export function weeklyReminderUrl(clubName: string, slug: string, now: Date): string {
  const date = nextTuesdayEvening(now);
  const page = latestRoundupUrl(slug);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${clubName} weekly roundup`,
    dates: `${stamp(date, 19, 0)}/${stamp(date, 19, 15)}`,
    ctz: 'Europe/London',
    recur: 'RRULE:FREQ=WEEKLY;BYDAY=TU',
    details: `Open the latest roundup. The link has no week, so it always shows the most recent results.\n${page}`,
    location: page,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
