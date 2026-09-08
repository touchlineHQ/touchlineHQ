import { describe, it, expect } from 'vitest';
import type { ClubFeed, LiveFixture, LiveResult } from '../types';
import {
  addDays, mondayOf, formatDayShort, formatDayRange, stripClubPrefix, getOutcome,
  weeksWithResults, defaultWeek, buildRoundup, formatWhatsApp, formatSocial,
  formatEmailSubject, formatEmailBody, SOCIAL_LIMIT,
} from './roundup';

const CLUB = 'East Leake';
const WEEK = '2026-08-31'; // Mon 31 Aug – Sun 6 Sep 2026

function makeResult(over: Partial<LiveResult> & Pick<LiveResult, 'id' | 'date' | 'team'>): LiveResult {
  const homeAway = over.home_away ?? 'home';
  const opponent = over.opponent ?? 'Opponent FC U10';
  return {
    time: '10:00',
    home_team: homeAway === 'home' ? over.team : opponent,
    away_team: homeAway === 'home' ? opponent : over.team,
    venue: 'Lantern Lane',
    division: 'U10 Division 1',
    league: 'YEL East Midlands Sunday 25/26',
    home_away: homeAway,
    opponent,
    home_score: 1,
    away_score: 0,
    goals_for: 1,
    goals_against: 0,
    ...over,
  } as LiveResult;
}

function makeFixture(over: Partial<LiveFixture> & Pick<LiveFixture, 'id' | 'date' | 'team'>): LiveFixture {
  const homeAway = over.home_away ?? 'home';
  const opponent = over.opponent ?? 'Bingham Town U10';
  return {
    time: '10:00',
    home_team: homeAway === 'home' ? over.team : opponent,
    away_team: homeAway === 'home' ? opponent : over.team,
    venue: 'Lantern Lane',
    division: 'U10 Division 1',
    league: 'YEL East Midlands Sunday 25/26',
    home_away: homeAway,
    opponent,
    ...over,
  } as LiveFixture;
}

/** A club week holding a win, a draw, a loss, an internal derby and an unscored match. */
function makeFeed(): ClubFeed {
  return {
    club: CLUB,
    generated: new Date().toISOString(),
    fixtures: [
      makeFixture({ id: 'f1', date: '2026-09-13', time: '10:00', team: 'East Leake Blue U10' }),
      makeFixture({
        id: 'f2', date: '2026-09-13', time: '10:30', team: 'East Leake Maroon U12',
        home_away: 'away', opponent: 'Cotgrave Colts U12', venue: 'Woodview',
      }),
      // Outside the following week — must not appear.
      makeFixture({ id: 'f3', date: '2026-09-20', team: 'East Leake Blue U10' }),
    ],
    results: [
      makeResult({
        id: 'r1', date: '2026-09-06', time: '10:00', team: 'East Leake Blue U10',
        opponent: 'Ruddington Village U10',
        home_score: 4, away_score: 1, goals_for: 4, goals_against: 1,
      }),
      makeResult({
        id: 'r2', date: '2026-09-06', time: '10:30', team: 'East Leake Maroon U12',
        opponent: 'Keyworth United U12', home_away: 'away',
        home_score: 2, away_score: 2, goals_for: 2, goals_against: 2,
      }),
      makeResult({
        id: 'r3', date: '2026-09-05', time: '11:00', team: 'East Leake Reds U14',
        opponent: 'Radcliffe Olympic U14',
        home_score: 0, away_score: 3, goals_for: 0, goals_against: 3,
      }),
      // Same match, both perspectives — two teams from this club.
      makeResult({
        id: 'derby', date: '2026-09-06', time: '09:00', team: 'East Leake Blue U10',
        opponent: 'East Leake Greens U10',
        home_team: 'East Leake Blue U10', away_team: 'East Leake Greens U10',
        home_score: 2, away_score: 1, goals_for: 2, goals_against: 1,
      }),
      makeResult({
        id: 'derby', date: '2026-09-06', time: '09:00', team: 'East Leake Greens U10',
        opponent: 'East Leake Blue U10', home_away: 'away',
        home_team: 'East Leake Blue U10', away_team: 'East Leake Greens U10',
        home_score: 2, away_score: 1, goals_for: 1, goals_against: 2,
      }),
      // Full-Time hasn't published a score yet.
      makeResult({
        id: 'pending', date: '2026-09-06', time: '12:00', team: 'East Leake Whites U9',
        opponent: 'Sutton Bonington U9',
        home_score: null, away_score: null, goals_for: null, goals_against: null,
      }),
      // Previous week — must not appear.
      makeResult({ id: 'old', date: '2026-08-30', team: 'East Leake Blue U10' }),
    ],
  };
}

describe('date helpers', () => {
  it('walks days across a month boundary', () => {
    expect(addDays('2026-08-31', 6)).toBe('2026-09-06');
    expect(addDays('2026-09-01', -1)).toBe('2026-08-31');
  });

  it('anchors a week to its Monday, counting Sunday as the end', () => {
    expect(mondayOf('2026-08-31')).toBe('2026-08-31'); // Monday itself
    expect(mondayOf('2026-09-05')).toBe('2026-08-31'); // Saturday
    expect(mondayOf('2026-09-06')).toBe('2026-08-31'); // Sunday closes the same week
    expect(mondayOf('2026-09-07')).toBe('2026-09-07'); // next Monday opens a new one
  });

  it('anchors a week that spans new year', () => {
    expect(mondayOf('2027-01-03')).toBe('2026-12-28');
  });

  it('formats days and ranges without locale drift', () => {
    expect(formatDayShort('2026-09-06')).toBe('Sun 6 Sep');
    expect(formatDayRange('2026-09-05', '2026-09-06')).toBe('Sat 5 – Sun 6 Sep');
    expect(formatDayRange('2026-09-06', '2026-09-06')).toBe('Sun 6 Sep');
    expect(formatDayRange('2026-08-31', '2026-09-06')).toBe('Mon 31 Aug – Sun 6 Sep');
  });
});

describe('stripClubPrefix', () => {
  it('drops the club name from the front of a team name', () => {
    expect(stripClubPrefix('East Leake Blue U10', 'East Leake')).toBe('Blue U10');
  });

  it('is case insensitive but leaves unrelated names alone', () => {
    expect(stripClubPrefix('EAST LEAKE Reds U14', 'East Leake')).toBe('Reds U14');
    expect(stripClubPrefix('Ruddington Village U10', 'East Leake')).toBe('Ruddington Village U10');
  });

  it('keeps the full name rather than returning nothing', () => {
    expect(stripClubPrefix('East Leake', 'East Leake')).toBe('East Leake');
    expect(stripClubPrefix('East Leake Blue U10', '')).toBe('East Leake Blue U10');
  });
});

describe('getOutcome', () => {
  it('reads the result from the club side of the scoreline', () => {
    expect(getOutcome({ goals_for: 3, goals_against: 1 })).toBe('W');
    expect(getOutcome({ goals_for: 2, goals_against: 2 })).toBe('D');
    expect(getOutcome({ goals_for: 0, goals_against: 1 })).toBe('L');
  });

  it('has no opinion when the score is unpublished', () => {
    expect(getOutcome({ goals_for: null, goals_against: 2 })).toBeNull();
    expect(getOutcome({ goals_for: 1, goals_against: null })).toBeNull();
  });

  it('treats 0-0 as a draw rather than as missing', () => {
    expect(getOutcome({ goals_for: 0, goals_against: 0 })).toBe('D');
  });
});

describe('week selection', () => {
  it('offers only weeks that hold results, newest first', () => {
    expect(weeksWithResults(makeFeed())).toEqual(['2026-08-31', '2026-08-24']);
  });

  it('opens on the most recent week with results', () => {
    expect(defaultWeek(makeFeed())).toBe('2026-08-31');
  });

  it('has no week to offer for a club with no results', () => {
    const empty: ClubFeed = { club: CLUB, generated: '', fixtures: [], results: [] };
    expect(defaultWeek(empty)).toBeNull();
  });
});

describe('buildRoundup', () => {
  const roundup = buildRoundup(makeFeed(), WEEK);

  it('covers the Mon–Sun window and nothing outside it', () => {
    expect(roundup.weekStart).toBe('2026-08-31');
    expect(roundup.weekEnd).toBe('2026-09-06');
    expect(roundup.results.map(l => l.id)).not.toContain('old');
  });

  it('orders lines by kick-off', () => {
    expect(roundup.results.map(l => l.id)).toEqual(['r3', 'derby', 'r1', 'r2']);
  });

  it('renders a club-v-club match once, neutrally', () => {
    const derby = roundup.results.filter(l => l.id === 'derby');
    expect(derby).toHaveLength(1);
    expect(derby[0]).toMatchObject({
      kind: 'derby',
      homeTeam: 'Blue U10',
      awayTeam: 'Greens U10',
      homeScore: 2,
      awayScore: 1,
    });
  });

  it('holds unscored matches back from the results', () => {
    expect(roundup.results.map(l => l.id)).not.toContain('pending');
    expect(roundup.pending).toHaveLength(1);
    expect(roundup.pending[0]).toMatchObject({ team: 'Whites U9', opponent: 'Sutton Bonington U9' });
  });

  it('counts only scored, non-derby matches, so P equals W+D+L', () => {
    const { played, won, drawn, lost, goalsFor, goalsAgainst } = roundup.summary;
    expect({ played, won, drawn, lost, goalsFor, goalsAgainst })
      .toEqual({ played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 6, goalsAgainst: 6 });
    expect(played).toBe(won + drawn + lost);
  });

  it('looks a week ahead for fixtures', () => {
    expect(roundup.fixtures.map(f => f.id)).toEqual(['f1', 'f2']);
    expect(roundup.fixtures[0].team).toBe('Blue U10');
  });

  it('flags a feed that has not refreshed recently', () => {
    const stale = makeFeed();
    stale.generated = '2026-09-01T06:00:00Z';
    expect(buildRoundup(stale, WEEK).stale).toBe(true);
    expect(buildRoundup(makeFeed(), WEEK).stale).toBe(false);
  });

  it('builds an empty roundup for a week with nothing in it', () => {
    const quiet = buildRoundup(makeFeed(), '2026-10-05');
    expect(quiet.results).toHaveLength(0);
    expect(quiet.summary.played).toBe(0);
  });
});

describe('message formats', () => {
  const roundup = buildRoundup(makeFeed(), WEEK);
  const link = 'https://touchlinehq.co.uk/roundup?club=east-leake&week=2026-08-31';

  it('writes a WhatsApp message covering results, record, and what is next', () => {
    const text = formatWhatsApp(roundup, { link });
    expect(text).toContain('East Leake — Weekly Roundup');
    expect(text).toContain('Sat 5 – Sun 6 Sep');
    expect(text).toContain('🟢 Blue U10 4–1 Ruddington Village U10');
    expect(text).toContain('🔴 Reds U14 0–3 Radcliffe Olympic U14');
    expect(text).toContain('⚪ Blue U10 2–1 Greens U10');
    expect(text).toContain('P3 · W1 D1 L1 · GF 6 GA 6');
    expect(text).toContain('Awaiting result:');
    expect(text).toContain('Maroon U12 away to Cotgrave Colts U12');
    expect(text).toContain(link);
  });

  it('drops emoji and the fixtures block on request', () => {
    const text = formatWhatsApp(roundup, { emoji: false, includeFixtures: false, includeLink: false });
    expect(text).not.toMatch(/[⚽🟢🟡🔴📅📊]/u);
    expect(text).toContain('(W) Blue U10 4–1 Ruddington Village U10');
    expect(text).not.toContain('Next up');
    expect(text).not.toContain('http');
  });

  it('keeps the social variant inside the character limit', () => {
    const social = formatSocial(roundup, { link });
    expect(social.length).toBeLessThanOrEqual(SOCIAL_LIMIT);
    expect(social.text).toContain('#EastLeake');
    expect(social.length).toBe(social.text.length);
  });

  it('trims lines rather than overflowing when there is too much to say', () => {
    const busy = makeFeed();
    busy.results = Array.from({ length: 14 }, (_, i) => makeResult({
      id: `many${i}`,
      date: '2026-09-06',
      time: `1${i % 10}:00`,
      team: `East Leake Team Number ${i} U12`,
      opponent: `A Rather Long Opponent Name ${i} U12`,
      home_score: 3, away_score: 1, goals_for: 3, goals_against: 1,
    }));
    const social = formatSocial(buildRoundup(busy, WEEK), { link });
    expect(social.truncated).toBe(true);
    expect(social.length).toBeLessThanOrEqual(SOCIAL_LIMIT);
    expect(social.text).toMatch(/\+\d+ more/);
  });

  it('writes an email subject and a plain-text body', () => {
    expect(formatEmailSubject(roundup)).toBe('East Leake results — week ending Sun 6 Sep');
    const body = formatEmailBody(roundup, { link });
    expect(body).toContain('Played 3  Won 1  Drawn 1  Lost 1');
    expect(body).toContain('Goals for 6, against 6');
    expect(body).toContain("Next week's fixtures");
    expect(body).toContain('Results from FA Full-Time via touchlineHQ.');
    expect(body).not.toMatch(/[🟢🟡🔴]/u);
  });

  it('says so plainly when a week has no results', () => {
    const quiet = buildRoundup(makeFeed(), '2026-10-05');
    expect(formatWhatsApp(quiet)).toContain('No results published for this week.');
    expect(formatSocial(quiet).text).toContain('No results published this week.');
  });
});
