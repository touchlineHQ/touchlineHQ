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
 * An iCalendar reminder any calendar or mail app can open: Apple Calendar,
 * Outlook, Google Calendar, Thunderbird. Tuesday at 7pm UK time, linking the
 * club's latest roundup with no week pinned.
 */
export function weeklyReminderIcs(clubName: string, slug: string, now: Date): string {
  const date = nextTuesdayEvening(now);
  const page = latestRoundupUrl(slug);
  const summary = `${clubName} weekly roundup`;
  const description = [
    'Open the latest roundup. The link has no week, so it always shows the most recent results.',
    page,
  ].join('\n');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//touchlineHQ//Weekly Roundup//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VTIMEZONE',
    'TZID:Europe/London',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:+0000',
    'TZOFFSETTO:+0100',
    'TZNAME:BST',
    'DTSTART:19700329T010000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0000',
    'TZNAME:GMT',
    'DTSTART:19701025T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:weekly-roundup-${slug}@touchlinehq.co.uk`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART;TZID=Europe/London:${stamp(date, 19, 0)}`,
    `DTEND;TZID=Europe/London:${stamp(date, 19, 15)}`,
    'RRULE:FREQ=WEEKLY;BYDAY=TU',
    `SUMMARY:${icsText(summary)}`,
    `DESCRIPTION:${icsText(description)}`,
    `URL:${page}`,
    `LOCATION:${page}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsText(summary)}`,
    'TRIGGER:PT0S',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(foldIcsLine).join('\r\n') + '\r\n';
}

export function weeklyReminderFilename(slug: string): string {
  return `${slug}-weekly-roundup.ics`;
}

/** TEXT values: escape backslash, newline, comma and semicolon. */
function icsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\n|\r/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

/** RFC 5545 folds a content line at 75 octets. Our lines are ASCII. */
function foldIcsLine(line: string): string {
  if (line.length <= 75) return line;
  const parts = [line.slice(0, 75)];
  for (let index = 75; index < line.length; index += 74) {
    parts.push(` ${line.slice(index, index + 74)}`);
  }
  return parts.join('\r\n');
}

function utcStamp(now: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
}
