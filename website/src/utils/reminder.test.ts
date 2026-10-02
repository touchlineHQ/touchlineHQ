import { describe, expect, it } from 'vitest';
import {
  latestRoundupUrl, nextTuesdayEvening, roundupQuery, weeklyReminderFilename, weeklyReminderIcs,
} from './reminder';

describe('latestRoundupUrl', () => {
  it('names the club and does not pin a week', () => {
    const url = latestRoundupUrl('east-leake');
    expect(url).toBe('https://touchlinehq.co.uk/roundup?club=east-leake');
    expect(new URL(url).searchParams.has('week')).toBe(false);
  });
});

describe('roundupQuery', () => {
  it('leaves the latest week out of the address so the link stays current', () => {
    expect(roundupQuery('east-leake', '2026-09-28', '2026-09-28')).toBe('club=east-leake');
  });

  it('pins an older week', () => {
    expect(roundupQuery('east-leake', '2026-09-21', '2026-09-28')).toBe(
      'club=east-leake&week=2026-09-21',
    );
  });

  it('does not invent a week before the feed has loaded', () => {
    expect(roundupQuery('east-leake', null, null)).toBe('club=east-leake');
  });

  it('is empty when no club is selected', () => {
    expect(roundupQuery(null, '2026-09-28', '2026-09-28')).toBe('');
  });
});

describe('nextTuesdayEvening', () => {
  it('is the coming Tuesday when today is Friday', () => {
    // Friday 2 Oct 2026, 19:01 UK time.
    expect(nextTuesdayEvening(new Date('2026-10-02T18:01:00Z'))).toEqual({
      year: 2026, month: 10, day: 6,
    });
  });

  it('is this evening when Tuesday has not reached 7pm', () => {
    // Tuesday 6 Oct 2026, 18:30 BST.
    expect(nextTuesdayEvening(new Date('2026-10-06T17:30:00Z'))).toEqual({
      year: 2026, month: 10, day: 6,
    });
  });

  it('waits a week once 7pm on Tuesday has arrived', () => {
    // Tuesday 6 Oct 2026, 19:00 BST.
    expect(nextTuesdayEvening(new Date('2026-10-06T18:00:00Z'))).toEqual({
      year: 2026, month: 10, day: 13,
    });
  });

  it('stays at 7pm UK time after the clocks go back', () => {
    // Tuesday 5 Jan 2027, 18:30 GMT.
    expect(nextTuesdayEvening(new Date('2027-01-05T18:30:00Z'))).toEqual({
      year: 2027, month: 1, day: 5,
    });
  });
});

describe('weeklyReminderIcs', () => {
  const ics = weeklyReminderIcs('East Leake', 'east-leake', new Date('2026-10-02T18:01:00Z'));
  const unfolded = ics.replace(/\r\n /g, '');

  it('is a weekly Tuesday 7pm London event with a display alarm', () => {
    expect(ics.endsWith('\r\n')).toBe(true);
    expect(unfolded).toContain('BEGIN:VCALENDAR');
    expect(unfolded).toContain('TZID:Europe/London');
    expect(unfolded).toContain('DTSTART;TZID=Europe/London:20261006T190000');
    expect(unfolded).toContain('DTEND;TZID=Europe/London:20261006T191500');
    expect(unfolded).toContain('RRULE:FREQ=WEEKLY;BYDAY=TU');
    expect(unfolded).toContain('SUMMARY:East Leake weekly roundup');
    expect(unfolded).toContain('BEGIN:VALARM');
    expect(unfolded).toContain('TRIGGER:PT0S');
    expect(unfolded).toContain('UID:weekly-roundup-east-leake@touchlinehq.co.uk');
  });

  it('points at the latest roundup and does not pin a week', () => {
    expect(unfolded).toContain('URL:https://touchlinehq.co.uk/roundup?club=east-leake');
    expect(unfolded).not.toContain('week=');
  });

  it('names the download after the club', () => {
    expect(weeklyReminderFilename('east-leake')).toBe('east-leake-weekly-roundup.ics');
  });
});
