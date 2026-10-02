import { describe, expect, it } from 'vitest';
import { latestRoundupUrl, nextTuesdayEvening, roundupQuery, weeklyReminderUrl } from './reminder';

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

describe('weeklyReminderUrl', () => {
  it('repeats Tuesday at 7pm London and links the unpinned roundup', () => {
    const url = new URL(weeklyReminderUrl('East Leake', 'east-leake', new Date('2026-10-02T18:01:00Z')));
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('text')).toBe('East Leake weekly roundup');
    expect(url.searchParams.get('dates')).toBe('20261006T190000/20261006T191500');
    expect(url.searchParams.get('ctz')).toBe('Europe/London');
    expect(url.searchParams.get('recur')).toBe('RRULE:FREQ=WEEKLY;BYDAY=TU');
    expect(url.searchParams.get('location')).toBe('https://touchlinehq.co.uk/roundup?club=east-leake');
    expect(url.searchParams.get('details')).toContain('https://touchlinehq.co.uk/roundup?club=east-leake');
    expect(url.searchParams.get('location')).not.toContain('week=');
  });
});
