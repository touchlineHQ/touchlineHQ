import { describe, it, expect } from 'vitest';
import type { ClubFeed, LiveFixture, LiveResult, ParticipationEntry } from '../types';
import {
  addDays, mondayOf, formatDayShort, formatDayRange, stripClubPrefix, getOutcome,
  weeksWithMatches, defaultWeek, buildRoundup, formatWhatsApp, formatSocial,
  formatEmailSubject, formatEmailBody, SOCIAL_LIMIT, unscoredReason,
  formatKickOff, formatKickOffLabel, unscoredMatches, participationMatches,
  withParticipation, fixtureMatches, withFixtures, hasRecord, scoreline, xWeightedLength,
} from './roundup';

const CLUB = 'East Leake';
const WEEK = '2026-08-31'; // Mon 31 Aug – Sun 6 Sep 2026
// Fixtures are upcoming or awaiting a result depending on the day the roundup is
// built, so every test that cares says which day that is.
const TODAY = '2026-09-01';

function makeResult(over: Partial<LiveResult> & Pick<LiveResult, 'id' | 'date' | 'team'>): LiveResult {
  const homeAway = over.home_away ?? 'home';
  const opponent = over.opponent ?? 'Opponent FC U12';
  return {
    time: '10:00',
    home_team: homeAway === 'home' ? over.team : opponent,
    away_team: homeAway === 'home' ? opponent : over.team,
    venue: 'Lantern Lane',
    division: 'U12 Division 1',
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

function makeParticipation(
  over: Partial<ParticipationEntry> & Pick<ParticipationEntry, 'id' | 'date' | 'team'>,
): ParticipationEntry {
  return {
    time: '12:00',
    league: 'YEL East Midlands Sunday 25/26',
    home_away: 'home',
    division: 'U9 Division 1',
    age_group: 'U9',
    played: true,
    publication_restricted: true,
    ...over,
  };
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
        id: 'r1', date: '2026-09-06', time: '10:00', team: 'East Leake Blue U12',
        opponent: 'Ruddington Village U12',
        home_score: 4, away_score: 1, goals_for: 4, goals_against: 1,
      }),
      makeResult({
        id: 'r2', date: '2026-09-06', time: '10:30', team: 'East Leake Maroon U13',
        opponent: 'Keyworth United U13', division: 'U13 Division 1', home_away: 'away',
        home_score: 2, away_score: 2, goals_for: 2, goals_against: 2,
      }),
      makeResult({
        id: 'r3', date: '2026-09-05', time: '11:00', team: 'East Leake Reds U14',
        opponent: 'Radcliffe Olympic U14', division: 'U14 Division 1',
        home_score: 0, away_score: 3, goals_for: 0, goals_against: 3,
      }),
      // Same match, both perspectives — two teams from this club.
      makeResult({
        id: 'derby', date: '2026-09-06', time: '09:00', team: 'East Leake Blue U12',
        opponent: 'East Leake Greens U12',
        home_team: 'East Leake Blue U12', away_team: 'East Leake Greens U12',
        home_score: 2, away_score: 1, goals_for: 2, goals_against: 1,
      }),
      makeResult({
        id: 'derby', date: '2026-09-06', time: '09:00', team: 'East Leake Greens U12',
        opponent: 'East Leake Blue U12', home_away: 'away',
        home_team: 'East Leake Blue U12', away_team: 'East Leake Greens U12',
        home_score: 2, away_score: 1, goals_for: 1, goals_against: 2,
      }),
      // A friendly — no result recorded regardless of age group.
      makeResult({
        id: 'friendly', date: '2026-09-06', time: '13:00', team: 'East Leake Reds U14',
        opponent: 'Gotham Rangers U14', division: 'U14 Friendly',
        home_score: null, away_score: null, goals_for: null, goals_against: null,
      }),
      // Previous week — must not appear.
      makeResult({ id: 'old', date: '2026-08-30', team: 'East Leake Blue U12' }),
    ],
    participation: [
      // U11 and below: the feed sends no opposition, venue or score.
      makeParticipation({
        id: 'young', date: '2026-09-06', time: '12:00',
        team: 'East Leake Whites U9', division: 'U9 Sun Spring Div 3 Red', age_group: 'U9',
      }),
      // Still to be played — the feed says so, whatever the date reads.
      makeParticipation({
        id: 'upcoming', date: '2026-09-06', time: '15:00',
        team: 'East Leake Tigers U8', division: 'U8 Development', played: false,
      }),
      // Previous week — must not appear.
      makeParticipation({ id: 'oldyoung', date: '2026-08-30', team: 'East Leake Whites U9' }),
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

  it('says kick-off times the way people at the ground do', () => {
    expect(formatKickOff('10:00')).toBe('10am');
    expect(formatKickOff('10:30')).toBe('10:30am');
    expect(formatKickOff('13:00')).toBe('1pm');
    expect(formatKickOff('14:45')).toBe('2:45pm');
    expect(formatKickOff('12:00')).toBe('12pm');
    expect(formatKickOff('00:30')).toBe('12:30am');
  });

  it('keeps a kick-off it cannot parse rather than inventing one', () => {
    expect(formatKickOff('TBC')).toBe('TBC');
    expect(formatKickOff('')).toBe('');
  });

  it('labels a kick-off with its weekday', () => {
    expect(formatKickOffLabel('2026-09-06', '10:00')).toBe('Sun 10am');
    expect(formatKickOffLabel('2026-09-05', '11:30')).toBe('Sat 11:30am');
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

describe('why a score is missing', () => {
  it('blames the competition when it says friendly', () => {
    expect(unscoredReason({ division: 'U14 Friendly' })).toBe('friendly');
    expect(unscoredReason({ division: 'Senior Friendlies' })).toBe('friendly');
  });

  it('does not guess when the match is competitive and unexplained', () => {
    expect(unscoredReason({ division: 'U14 Division 1' })).toBe('withheld');
    expect(unscoredReason({ division: 'Premier Division' })).toBe('withheld');
  });
});

describe('week selection', () => {
  it('offers every week with a match in it, played or not, newest first', () => {
    expect(weeksWithMatches(makeFeed()))
      .toEqual(['2026-09-14', '2026-09-07', '2026-08-31', '2026-08-24']);
  });

  it('counts participation weeks, so an all-U8 club still gets a week', () => {
    const young: ClubFeed = {
      club: CLUB, generated: new Date().toISOString(), fixtures: [], results: [],
      participation: [makeParticipation({ id: 'p', date: '2026-09-06', team: 'Quorn Lions U8' })],
    };
    expect(weeksWithMatches(young)).toEqual(['2026-08-31']);
    expect(defaultWeek(young)).toBe('2026-08-31');
  });

  it('opens on the most recent week with results', () => {
    expect(defaultWeek(makeFeed())).toBe('2026-08-31');
  });

  it('has no week to offer for a club with nothing at all', () => {
    const empty: ClubFeed = { club: CLUB, generated: '', fixtures: [], results: [] };
    expect(defaultWeek(empty)).toBeNull();
  });

  it('opens on the week in hand when nothing has been played yet', () => {
    const preseason: ClubFeed = {
      club: CLUB,
      generated: new Date().toISOString(),
      fixtures: [
        makeFixture({ id: 'f2', date: '2026-09-20', team: 'East Leake Blue U10' }),
        makeFixture({ id: 'f1', date: '2026-09-13', team: 'East Leake Blue U10' }),
      ],
      results: [],
    };
    expect(defaultWeek(preseason, '2026-09-16')).toBe('2026-09-14');
    // Before a ball is kicked there is no week in hand, so it opens on the first.
    expect(defaultWeek(preseason, '2026-09-01')).toBe('2026-09-07');
  });
});

describe('buildRoundup', () => {
  const roundup = buildRoundup(makeFeed(), WEEK);

  it('covers the Mon–Sun window and nothing outside it', () => {
    expect(roundup.weekStart).toBe('2026-08-31');
    expect(roundup.weekEnd).toBe('2026-09-06');
    expect(roundup.matches.map(m => m.id)).not.toContain('old');
  });

  it('puts every match in one list, in kick-off order', () => {
    expect(roundup.matches.map(m => m.id))
      .toEqual(['r3', 'derby', 'r1', 'r2', 'young', 'friendly', 'upcoming']);
  });

  it('takes participation games from the feed, skipping unplayed and other weeks', () => {
    const participation = participationMatches(roundup);
    expect(participation.map(m => m.id)).toEqual(['young']);
    expect(participation[0]).toMatchObject({
      kind: 'participation', team: 'Whites U9', homeAway: 'home', ageGroup: 'U9',
    });
  });

  it('renders a club-v-club match once, neutrally', () => {
    const derby = roundup.matches.filter(m => m.id === 'derby');
    expect(derby).toHaveLength(1);
    expect(derby[0]).toMatchObject({
      kind: 'derby',
      homeTeam: 'Blue U12',
      awayTeam: 'Greens U12',
      homeScore: 2,
      awayScore: 1,
    });
  });

  it('keeps unscored matches in the list but classifies why', () => {
    const unscored = unscoredMatches(roundup);
    expect(unscored.map(m => m.id)).toEqual(['friendly']);
    expect(unscored[0]).toMatchObject({ team: 'Reds U14', reason: 'friendly' });
  });

  it('counts every match as played, including participation and derbies', () => {
    const { played, toCome, won, drawn, lost, goalsFor, goalsAgainst } = roundup.summary;
    // r3, derby, r1, r2, young, friendly — everything but the unplayed fixture.
    expect(played).toBe(roundup.matches.length - toCome);
    expect(played).toBe(6);
    expect(toCome).toBe(1);
    // The record stays narrower: only matches with a result the club can claim.
    expect({ won, drawn, lost, goalsFor, goalsAgainst })
      .toEqual({ won: 1, drawn: 1, lost: 1, goalsFor: 6, goalsAgainst: 6 });
    expect(played).toBeGreaterThan(won + drawn + lost);
  });

  it('drops hidden participation games from played as well as from the list', () => {
    const without = withParticipation(roundup, false);
    expect(without.summary.played).toBe(roundup.summary.played - 1);
    expect(without.summary.won).toBe(roundup.summary.won);
  });

  it('reports a played count but no record when nothing was scored', () => {
    const feed = makeFeed();
    feed.results = [];
    const young = buildRoundup(feed, WEEK);
    expect(young.summary.played).toBe(1);
    expect(hasRecord(young.summary)).toBe(false);
  });

  it('builds an empty roundup for a week with nothing in it', () => {
    const quiet = buildRoundup(makeFeed(), '2026-10-05');
    expect(quiet.matches).toHaveLength(0);
    expect(quiet.summary.played).toBe(0);
    expect(quiet.summary.toCome).toBe(0);
  });

  it('flags a feed that has not refreshed recently', () => {
    const stale = makeFeed();
    stale.generated = '2026-09-01T06:00:00Z';
    expect(buildRoundup(stale, WEEK).stale).toBe(true);
    expect(buildRoundup(makeFeed(), WEEK).stale).toBe(false);
  });

});

describe('fixtures in the roundup', () => {
  /** A week that is half played and half still to come. */
  function makeMidweekFeed(): ClubFeed {
    return {
      club: CLUB,
      generated: new Date().toISOString(),
      fixtures: [
        // Saturday has gone by with no result published.
        makeFixture({
          id: 'awaiting', date: '2026-08-31', time: '19:30', team: 'East Leake Robins',
          opponent: 'Cotgrave Reserves', division: 'Division One', home_away: 'away',
        }),
        // Still to come.
        makeFixture({
          id: 'later', date: '2026-09-05', time: '10:00', team: 'East Leake Blue U12',
          opponent: 'Ruddington Village U12', division: 'U12 Division 1',
        }),
        // U11 and below: no opposition, no venue.
        makeFixture({
          id: 'young', date: '2026-09-06', time: '10:00', team: 'East Leake Bantams U8',
          opponent: 'Opposition', venue: '', division: 'U8 Saturday', home_away: 'away',
          publication_restricted: true,
        }),
        // Two of this club's teams, so the feed holds the fixture from both sides.
        makeFixture({
          id: 'internal', date: '2026-09-05', time: '14:00', team: 'East Leake Blue U14',
          opponent: 'East Leake Greens U14', home_team: 'East Leake Blue U14',
          away_team: 'East Leake Greens U14', division: 'U14 Division 1',
        }),
        makeFixture({
          id: 'internal', date: '2026-09-05', time: '14:00', team: 'East Leake Greens U14',
          opponent: 'East Leake Blue U14', home_team: 'East Leake Blue U14',
          away_team: 'East Leake Greens U14', division: 'U14 Division 1', home_away: 'away',
        }),
        // Already played and scored, so the result is what gets listed.
        makeFixture({
          id: 'r1', date: '2026-09-01', time: '10:00', team: 'East Leake Blue U12',
          opponent: 'Keyworth United U12',
        }),
      ],
      results: [
        makeResult({
          id: 'r1', date: '2026-09-01', time: '10:00', team: 'East Leake Blue U12',
          opponent: 'Keyworth United U12',
          home_score: 3, away_score: 0, goals_for: 3, goals_against: 0,
        }),
      ],
    };
  }

  const roundup = buildRoundup(makeMidweekFeed(), WEEK, TODAY);

  it('lists the whole week — results first, then what is still to come', () => {
    expect(roundup.matches.map(m => m.id))
      .toEqual(['awaiting', 'r1', 'later', 'internal', 'young']);
  });

  it('never lists a fixture whose result has already landed', () => {
    expect(roundup.matches.filter(m => m.id === 'r1')).toHaveLength(1);
    expect(roundup.matches.find(m => m.id === 'r1')?.kind).toBe('result');
  });

  it('drops a fixture the results carry under a different id', () => {
    const feed = makeMidweekFeed();
    feed.results[0].id = 'some-other-id';
    const built = buildRoundup(feed, WEEK, TODAY);
    expect(built.matches.filter(m => m.date === '2026-09-01')).toHaveLength(1);
    expect(built.matches.find(m => m.date === '2026-09-01')?.kind).toBe('result');
  });

  it('separates what is still to come from what was played', () => {
    expect(roundup.summary.played).toBe(1);
    expect(roundup.summary.toCome).toBe(4);
    expect(fixtureMatches(roundup).map(m => m.status))
      .toEqual(['awaiting', 'upcoming', 'upcoming', 'upcoming']);
  });

  it('names a fixture home side first, as it will be played', () => {
    const text = formatWhatsApp(roundup, { includeLink: false });
    expect(text).toContain('📅 Sat 10am · Blue U12 vs Ruddington Village U12 (to play)');
    expect(text).toContain('📅 Mon 7:30pm · Cotgrave Reserves vs Robins (result to come)');
  });

  it('renders a club-v-club fixture once, from the home side', () => {
    const internal = roundup.matches.filter(m => m.id === 'internal');
    expect(internal).toHaveLength(1);
    expect(internal[0]).toMatchObject({
      kind: 'fixture', homeTeam: 'Blue U14', awayTeam: 'Greens U14', homeAway: 'home',
    });
  });

  it('names no opposition or venue for a U11-and-below fixture', () => {
    const text = formatWhatsApp(roundup, { includeLink: false });
    expect(text).toContain('📅 Sun 10am · Bantams U8 play away');
    expect(text).not.toContain('Opposition');
    expect(text).not.toContain('Lantern Lane');
  });

  it('treats a U11-and-below fixture whose day has gone as a game that was played', () => {
    // No score is ever published at these ages, so it would sit in the fixture
    // list for ever waiting for one.
    const past = buildRoundup(makeMidweekFeed(), WEEK, '2026-09-07');
    const young = past.matches.find(m => m.id === 'young');
    expect(young).toMatchObject({ kind: 'participation', team: 'Bantams U8', homeAway: 'away' });
    expect(formatWhatsApp(past, { includeLink: false }))
      .toContain('🔵 Sun 10am · Bantams U8 played away');
  });

  it('leads with the fixtures when the week has not been played yet', () => {
    const feed = makeMidweekFeed();
    feed.results = [];
    feed.fixtures = feed.fixtures.filter(f => f.id !== 'r1');
    const ahead = buildRoundup(feed, WEEK, '2026-08-30');
    expect(ahead.summary.played).toBe(0);
    expect(ahead.summary.toCome).toBe(4);
    expect(formatWhatsApp(ahead, { includeLink: false })).toContain('📊 4 to come');
    expect(formatEmailBody(ahead, { includeLink: false }))
      .toContain('Fixtures, Mon 31 Aug – Sun 6 Sep');
    expect(formatEmailBody(ahead, { includeLink: false })).toContain('Still to come: 4');
  });

  it('counts the still-to-come games in the record line', () => {
    expect(formatWhatsApp(roundup, { includeLink: false }))
      .toContain('Played 1 · W1 D0 L0 · GF 3 GA 0 · 4 to come');
    expect(formatEmailBody(roundup, { includeLink: false })).toContain('Still to come: 4');
  });

  it('drops fixtures from the list and the count when they are turned off', () => {
    const without = withFixtures(roundup, false);
    expect(without.matches.map(m => m.id)).toEqual(['r1']);
    expect(without.summary.toCome).toBe(0);
    expect(without.summary.played).toBe(1);
    const text = formatWhatsApp(without, { includeLink: false });
    expect(text).not.toContain('to play');
    expect(text).toContain('Played 1 · W1 D0 L0 · GF 3 GA 0');
    expect(text).not.toContain('to come');
  });
});

describe('scoreline', () => {
  const roundup = buildRoundup(makeFeed(), WEEK);
  const line = (id: string) => {
    const match = roundup.matches.find(m => m.id === id);
    if (!match || (match.kind !== 'result' && match.kind !== 'derby')) {
      throw new Error(`no scored match ${id}`);
    }
    return scoreline(match);
  };

  it('puts the home team first when the club was at home', () => {
    expect(line('r1')).toBe('Blue U12 4–1 Ruddington Village U12');
  });

  it('puts the opposition first when the club was away', () => {
    // r2 is an away draw: stored as goals_for 2, goals_against 2 from the
    // club's side, and the scoreline still has to read as it was played.
    expect(line('r2')).toBe('Keyworth United U13 2–2 Maroon U13');
  });

  it('keeps an away win reading as an away win', () => {
    const feed = makeFeed();
    feed.results = [makeResult({
      id: 'away', date: '2026-09-01', time: '20:00', team: 'East Leake Robins',
      opponent: 'Quorn Reserves', division: 'Division One', home_away: 'away',
      home_score: 2, away_score: 3, goals_for: 3, goals_against: 2,
    })];
    const built = buildRoundup(feed, WEEK);
    const match = built.matches[0];
    expect(match.kind).toBe('result');
    expect(scoreline(match as never)).toBe('Quorn Reserves 2–3 Robins');
    // The outcome is carried alongside, not by the order of the names.
    expect(match.kind === 'result' && match.outcome).toBe('W');
    expect(formatWhatsApp(built)).toContain('🟢 Tue 8pm · Quorn Reserves 2–3 Robins');
  });

  it('leaves a derby in its own home/away order', () => {
    expect(line('derby')).toBe('Blue U12 2–1 Greens U12');
  });
});

describe('message formats', () => {
  const roundup = buildRoundup(makeFeed(), WEEK);
  const link = 'https://touchlinehq.co.uk/roundup?club=east-leake&week=2026-08-31';

  it('writes a WhatsApp message covering results, record, and what is next', () => {
    const text = formatWhatsApp(roundup, { link });
    expect(text).toContain('East Leake — Weekly Roundup');
    expect(text).toContain('Sat 5 – Sun 6 Sep');
    expect(text).toContain('🟢 Sun 10am · Blue U12 4–1 Ruddington Village U12');
    expect(text).toContain('🔴 Sat 11am · Reds U14 0–3 Radcliffe Olympic U14');
    expect(text).toContain('⚪ Sun 9am · Blue U12 2–1 Greens U12');
    expect(text).toContain('🔵 Sun 12pm · Whites U9 played at home');
    expect(text).toContain('🔵 Sun 1pm · Reds U14 vs Gotham Rangers U14 (friendly)');
    expect(text).toContain('Played 6 · W1 D1 L1 · GF 6 GA 6');
    expect(text).toContain(link);
  });

  it('drops emoji and the link on request', () => {
    const text = formatWhatsApp(roundup, { emoji: false, includeLink: false });
    expect(text).not.toMatch(/[⚽🟢🟡🔴🔵⚪📅📊]/u);
    expect(text).toContain('(W) Sun 10am · Blue U12 4–1 Ruddington Village U12');
    expect(text).not.toContain('http');
  });

  it('keeps the week\'s fixtures in the list, and the weeks either side out of it', () => {
    const text = formatWhatsApp(roundup, { link });
    // The U8 game the feed has not marked played yet is this week's, so it is in.
    expect(text).toContain('📅 Sun 3pm · Tigers U8 play at home');
    // f1 and f2 belong to the following week and must not be dragged in.
    expect(text).not.toContain('Bingham Town U10');
    expect(text).not.toContain('Cotgrave Colts U12');
  });

  it('keeps the social variant inside the character limit', () => {
    const social = formatSocial(roundup, { link });
    expect(social.length).toBeLessThanOrEqual(SOCIAL_LIMIT);
    expect(social.text).toContain('#EastLeake');
    expect(social.length).toBe(xWeightedLength(social.text));
  });

  it('uses X weighted units for emoji and shortened links', () => {
    expect(xWeightedLength('A⚽⚪')).toBe(5);
    expect(xWeightedLength('See https://example.com/a/very/long/path')).toBe(27);

    const social = formatSocial(roundup, { includeLink: false });
    expect(social.text).toContain('⚽');
    expect(social.text).toContain('⚪');
    expect(social.length).toBe(social.text.length + 2);
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
    expect(body).toContain('Played 6  Won 1  Drawn 1  Lost 1');
    expect(body).toContain('Goals for 6, against 6');
    expect(body).toContain('Results from FA Full-Time via touchlineHQ.');
    expect(body).not.toMatch(/[🟢🟡🔴]/u);
  });

  it('keeps unscored matches inline and never calls them pending', () => {
    const text = formatWhatsApp(roundup, { link });
    expect(text).not.toMatch(/awaiting/i);
    expect(text).not.toMatch(/also played/i);
    // They sit in kick-off order among the scored results, not in their own block.
    const lines = text.split('\n');
    expect(lines.findIndex(l => l.includes('Whites U9')))
      .toBeGreaterThan(lines.findIndex(l => l.includes('Ruddington Village')));
  });

  it('never names the opposition or venue of a U11-and-below match', () => {
    const text = formatWhatsApp(roundup, { link });
    expect(text).toContain('Whites U9 played at home');
    // The opposition for the U9 game must appear nowhere in the message.
    expect(text).not.toContain('Sutton Bonington');
    expect(text).not.toContain('Lantern Lane');
    expect(formatEmailBody(roundup, { link })).not.toContain('Sutton Bonington');
  });

  it('drops participation games from the message when they are turned off', () => {
    const without = withParticipation(roundup, false);
    const text = formatWhatsApp(without, { link });
    expect(text).not.toContain('Whites U9');
    expect(text).not.toContain('U11 and below');
    // The competitive results and the record are untouched.
    expect(text).toContain('Blue U12 4–1 Ruddington Village U12');
    // Played drops with them; the record is untouched.
    expect(without.summary.played).toBe(roundup.summary.played - 1);
    expect(without.summary.won).toBe(roundup.summary.won);
    // The friendly is not a participation game and stays.
    expect(text).toContain('Gotham Rangers U14 (friendly)');
  });

  it('treats a U11-and-below friendly as a participation game, not a friendly', () => {
    const feed = makeFeed();
    feed.results = [makeResult({
      id: 'yf', date: '2026-09-06', time: '14:00', team: 'East Leake Blue U10',
      opponent: 'Bunny FC U10', division: 'U10 Friendly',
      home_score: null, away_score: null, goals_for: null, goals_against: null,
    })];
    feed.participation = [];
    const built = buildRoundup(feed, WEEK);
    expect(participationMatches(built).map(m => m.id)).toEqual(['yf']);
    expect(unscoredMatches(built)).toHaveLength(0);
    expect(formatWhatsApp(built)).not.toContain('Bunny FC');
  });

  it('leads with the record and closes with the caveat', () => {
    const lines = formatWhatsApp(roundup, { link }).split('\n');
    const record = lines.findIndex(l => l.includes('Played 6'));
    const first = lines.findIndex(l => l.includes('Reds U14 0–3'));
    const caveat = lines.findIndex(l => l.includes('No score published'));
    expect(record).toBeGreaterThan(-1);
    expect(record).toBeLessThan(first);
    expect(first).toBeLessThan(caveat);
  });

  it('orders the email body the same way', () => {
    const lines = formatEmailBody(roundup, { link }).split('\n');
    const record = lines.findIndex(l => l.includes('Played 6'));
    const first = lines.findIndex(l => l.includes('Reds U14 0–3'));
    const caveat = lines.findIndex(l => l.includes('No score published'));
    expect(record).toBeLessThan(first);
    expect(first).toBeLessThan(caveat);
  });

  it('explains the blue dots from the reasons actually present', () => {
    expect(formatWhatsApp(roundup, { link }))
      .toContain('🔵 No score published — U11 and below, friendlies');

    const feed = makeFeed();
    feed.results = [makeResult({
      id: 'fr', date: '2026-09-06', time: '14:00', team: 'East Leake Reds U14',
      opponent: 'Bunny FC U14', division: 'U14 Friendly',
      home_score: null, away_score: null, goals_for: null, goals_against: null,
    })];
    feed.participation = [];
    const friendlyOnly = formatWhatsApp(buildRoundup(feed, WEEK));
    expect(friendlyOnly).toContain('🔵 No score published — friendlies');
    expect(friendlyOnly).not.toContain('U11 and below');
    // The week was played, so the message must not claim otherwise.
    expect(friendlyOnly).not.toContain('No results published for this week.');
    expect(friendlyOnly).toContain('🔵 Sun 2pm · Reds U14 vs Bunny FC U14 (friendly)');
  });

  it('says so plainly when a week has no results', () => {
    const quiet = buildRoundup(makeFeed(), '2026-10-05');
    expect(unscoredMatches(quiet)).toHaveLength(0);
    expect(formatWhatsApp(quiet)).toContain('No results published for this week.');
    expect(formatSocial(quiet).text).toContain('No results published this week.');
  });
});
