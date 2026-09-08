import type { ClubFeed, LiveResult } from '../types';

// Feed dates are plain "YYYY-MM-DD" strings. Every window/selection decision below
// works on those strings or on UTC-parsed parts, never on a local-time Date — a
// local Date shifts the day for anyone east of UTC and silently moves a Sunday
// fixture into the wrong week.

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Treat a feed as stale once its `generated` stamp is older than this. */
const STALE_AFTER_HOURS = 36;

/** X/Twitter's hard limit — the social variant is trimmed to fit it. */
export const SOCIAL_LIMIT = 280;

export interface RoundupResultLine {
  kind: 'result';
  id: string;
  date: string;
  time: string;
  team: string;
  opponent: string;
  homeAway: 'home' | 'away';
  goalsFor: number;
  goalsAgainst: number;
  outcome: 'W' | 'D' | 'L';
  division: string;
}

/**
 * Two teams from the same club playing each other. The club feed holds the match
 * twice — once from each side — so it is rendered once, neutrally, with no outcome.
 */
export interface RoundupDerbyLine {
  kind: 'derby';
  id: string;
  date: string;
  time: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  division: string;
}

export type RoundupLine = RoundupResultLine | RoundupDerbyLine;

/**
 * Why a played match has no score.
 *
 * `friendly`  — the competition is a friendly, so nobody records a result.
 * `age-group` — the league withholds scores at this age (see below).
 * `withheld`  — redacted for a reason the feed doesn't explain.
 */
export type UnscoredReason = 'friendly' | 'age-group' | 'withheld';

/**
 * A match that was played but carries no score.
 *
 * These are never "results still to come": the scraper drops a results row
 * outright when Full-Time shows no score element at all (postponed, not yet
 * played), and only emits null scores when the page literally prints "X - X"
 * — the league deliberately withholding the score.
 */
export interface RoundupUnscoredLine {
  id: string;
  date: string;
  time: string;
  team: string;
  opponent: string;
  homeAway: 'home' | 'away';
  division: string;
  reason: UnscoredReason;
}

export interface RoundupSummary {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
}

export interface Roundup {
  club: string;
  /** Monday of the roundup week, "YYYY-MM-DD". */
  weekStart: string;
  /** Sunday of the roundup week, "YYYY-MM-DD". */
  weekEnd: string;
  results: RoundupLine[];
  /** Played, but the league publishes no score for them. */
  unscored: RoundupUnscoredLine[];
  summary: RoundupSummary;
  generated: string;
  stale: boolean;
}

export interface FormatOptions {
  includeLink?: boolean;
  emoji?: boolean;
  link?: string;
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const date = parseIso(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toIso(date);
}

/**
 * The Monday of the Mon–Sun week containing `iso`. Grassroots plays Saturday and
 * Sunday, so a Mon–Sun window keeps a whole weekend in one roundup.
 */
export function mondayOf(iso: string): string {
  const date = parseIso(iso);
  const dayOfWeek = date.getUTCDay();
  return addDays(iso, dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
}

/** "Sat 5 Sep" — built by hand so it doesn't drift with locale or timezone. */
export function formatDayShort(iso: string): string {
  const date = parseIso(iso);
  return `${DAY_NAMES[date.getUTCDay()]} ${date.getUTCDate()} ${MONTH_NAMES[date.getUTCMonth()]}`;
}

/** "Sat 5 – Sun 6 Sep", collapsing the repeated month, or a single day. */
export function formatDayRange(startIso: string, endIso: string): string {
  if (startIso === endIso) return formatDayShort(startIso);
  const start = parseIso(startIso);
  const end = parseIso(endIso);
  const startLabel = start.getUTCMonth() === end.getUTCMonth()
    ? `${DAY_NAMES[start.getUTCDay()]} ${start.getUTCDate()}`
    : formatDayShort(startIso);
  return `${startLabel} – ${formatDayShort(endIso)}`;
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

export function getOutcome(result: Pick<LiveResult, 'goals_for' | 'goals_against'>): 'W' | 'D' | 'L' | null {
  if (result.goals_for === null || result.goals_against === null) return null;
  if (result.goals_for > result.goals_against) return 'W';
  if (result.goals_for === result.goals_against) return 'D';
  return 'L';
}

function inWeek(iso: string, weekStart: string): boolean {
  return iso >= weekStart && iso <= addDays(weekStart, 6);
}

/**
 * Strip the club name off the front of a team name — "East Leake Blue U10" reads
 * as "Blue U10" once the club is named in the message header. Falls back to the
 * full name when stripping would leave nothing.
 */
export function stripClubPrefix(teamName: string, clubName: string): string {
  const prefix = clubName.trim();
  if (!prefix) return teamName;
  if (!teamName.toLowerCase().startsWith(`${prefix.toLowerCase()} `)) return teamName;
  return teamName.slice(prefix.length).trim() || teamName;
}

const FRIENDLY_RE = /\bfriendl(?:y|ies)\b/i;
const AGE_GROUP_RE = /\bU(\d{1,2})\b/i;

/**
 * Under FA youth rules, football below U12 is non-competitive: leagues publish
 * the fixtures but not the scores, and keep no league table.
 */
const YOUNGEST_COMPETITIVE_AGE = 12;

/** The age group named in any of these labels, e.g. "U10 Division 1" -> 10. */
export function ageGroupOf(...labels: (string | undefined)[]): number | null {
  let youngest: number | null = null;
  for (const label of labels) {
    const match = label?.match(AGE_GROUP_RE);
    if (!match) continue;
    const age = Number(match[1]);
    if (age >= 6 && age <= 21 && (youngest === null || age < youngest)) youngest = age;
  }
  return youngest;
}

/**
 * Explain a withheld score. The competition name is an explicit signal so it
 * wins; the age group is inferred from the division and team names, and is only
 * consulted when nothing says "friendly".
 */
export function unscoredReason(
  row: Pick<LiveResult, 'division' | 'team' | 'opponent'>,
): UnscoredReason {
  if (FRIENDLY_RE.test(row.division)) return 'friendly';
  const age = ageGroupOf(row.division, row.team, row.opponent);
  if (age !== null && age < YOUNGEST_COMPETITIVE_AGE) return 'age-group';
  return 'withheld';
}

/** Group rows sharing a fixture id — two rows means both sides are this club's. */
function groupById<T extends { id: string }>(rows: T[]): T[][] {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const existing = groups.get(row.id);
    if (existing) existing.push(row);
    else groups.set(row.id, [row]);
  }
  return [...groups.values()];
}

function byKickOff(a: { date: string; time: string }, b: { date: string; time: string }): number {
  return a.date.localeCompare(b.date) || a.time.localeCompare(b.time);
}

/**
 * Mondays of every week holding at least one result, newest first. Only weeks
 * that actually have results are offered — an empty week is never a useful pick.
 */
export function weeksWithResults(feed: ClubFeed): string[] {
  const weeks = new Set<string>();
  for (const result of feed.results) weeks.add(mondayOf(result.date));
  return [...weeks].sort((a, b) => b.localeCompare(a));
}

/** The week the roundup opens on: the most recent one holding results. */
export function defaultWeek(feed: ClubFeed): string | null {
  return weeksWithResults(feed)[0] ?? null;
}

function isStale(generated: string): boolean {
  const stamp = Date.parse(generated);
  if (Number.isNaN(stamp)) return false;
  return Date.now() - stamp > STALE_AFTER_HOURS * 60 * 60 * 1000;
}

export function buildRoundup(feed: ClubFeed, weekStart: string): Roundup {
  const club = feed.club;
  const strip = (name: string) => stripClubPrefix(name, club);

  const results: RoundupLine[] = [];
  const unscored: RoundupUnscoredLine[] = [];

  for (const group of groupById(feed.results.filter(r => inWeek(r.date, weekStart)))) {
    const [row] = group;

    if (group.length > 1) {
      // Both sides belong to this club. Use the neutral home/away scores rather
      // than either row's club-side perspective, and award no outcome.
      if (row.home_score === null || row.away_score === null) {
        unscored.push(toUnscored(row, strip));
        continue;
      }
      results.push({
        kind: 'derby',
        id: row.id,
        date: row.date,
        time: row.time,
        homeTeam: strip(row.home_team),
        awayTeam: strip(row.away_team),
        homeScore: row.home_score,
        awayScore: row.away_score,
        division: row.division,
      });
      continue;
    }

    const outcome = getOutcome(row);
    if (outcome === null) {
      unscored.push(toUnscored(row, strip));
      continue;
    }
    results.push({
      kind: 'result',
      id: row.id,
      date: row.date,
      time: row.time,
      team: strip(row.team),
      opponent: row.opponent,
      homeAway: row.home_away,
      goalsFor: row.goals_for as number,
      goalsAgainst: row.goals_against as number,
      outcome,
      division: row.division,
    });
  }

  results.sort(byKickOff);
  unscored.sort(byKickOff);

  return {
    club,
    weekStart,
    weekEnd: addDays(weekStart, 6),
    results,
    unscored,
    summary: summarise(results),
    generated: feed.generated,
    stale: isStale(feed.generated),
  };
}

function toUnscored(
  row: LiveResult,
  strip: (name: string) => string,
): RoundupUnscoredLine {
  return {
    id: row.id,
    date: row.date,
    time: row.time,
    team: strip(row.team),
    opponent: row.opponent,
    homeAway: row.home_away,
    division: row.division,
    reason: unscoredReason(row),
  };
}

/**
 * Played/W/D/L and goals over the scored, non-derby lines. Derbies are left out
 * on purpose: a club-v-club match is simultaneously a win and a loss for the
 * club, so counting it would make the record say something untrue. Keeping them
 * out also keeps played === won + drawn + lost.
 */
function summarise(lines: RoundupLine[]): RoundupSummary {
  const summary: RoundupSummary = {
    played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0,
  };
  for (const line of lines) {
    if (line.kind !== 'result') continue;
    summary.played += 1;
    if (line.outcome === 'W') summary.won += 1;
    else if (line.outcome === 'D') summary.drawn += 1;
    else summary.lost += 1;
    summary.goalsFor += line.goalsFor;
    summary.goalsAgainst += line.goalsAgainst;
  }
  return summary;
}

// ---------------------------------------------------------------------------
// Message composition
// ---------------------------------------------------------------------------

const OUTCOME_EMOJI: Record<'W' | 'D' | 'L', string> = { W: '🟢', D: '🟡', L: '🔴' };

/**
 * The span the matches actually cover, which reads better than the full week.
 * Unscored matches count: a club playing only age-group football has no scored
 * results at all, and its header should still name the day everyone played.
 */
function resultsRange(roundup: Roundup): string {
  const dates = [...roundup.results, ...roundup.unscored].map(line => line.date).sort();
  if (dates.length === 0) return formatDayRange(roundup.weekStart, roundup.weekEnd);
  return formatDayRange(dates[0], dates[dates.length - 1]);
}

function scoreLine(line: RoundupLine, emoji: boolean): string {
  if (line.kind === 'derby') {
    const marker = emoji ? '⚪ ' : '';
    return `${marker}${line.homeTeam} ${line.homeScore}–${line.awayScore} ${line.awayTeam}`;
  }
  const marker = emoji ? `${OUTCOME_EMOJI[line.outcome]} ` : `(${line.outcome}) `;
  return `${marker}${line.team} ${line.goalsFor}–${line.goalsAgainst} ${line.opponent}`;
}

/**
 * A friendly is worth naming on the line itself; the age-group and withheld
 * cases are covered by the block heading, so the line stays clean.
 */
function unscoredLine(line: RoundupUnscoredLine): string {
  const suffix = line.reason === 'friendly' ? ' (friendly)' : '';
  return `${line.team} vs ${line.opponent}${suffix}`;
}

/**
 * "Friendlies" when that is all they are, otherwise say why there is no score.
 * "Also played" only makes sense alongside scored results; a club playing purely
 * age-group football has none, so the block speaks for the whole week instead.
 */
function unscoredHeading(roundup: Roundup, emoji: boolean): string {
  const label = roundup.unscored.every(line => line.reason === 'friendly')
    ? 'Friendlies'
    : roundup.results.length > 0
      ? 'Also played — no score published'
      : 'Played this week — no score published';
  return `${emoji ? '🤝 ' : ''}${label}`;
}

function summaryLine(summary: RoundupSummary): string {
  const { played, won, drawn, lost, goalsFor, goalsAgainst } = summary;
  return `P${played} · W${won} D${drawn} L${lost} · GF ${goalsFor} GA ${goalsAgainst}`;
}

export function formatWhatsApp(roundup: Roundup, options: FormatOptions = {}): string {
  const { includeLink = true, emoji = true, link = '' } = options;
  const blocks: string[] = [];

  blocks.push(
    `${emoji ? '⚽ ' : ''}${roundup.club} — Weekly Roundup\n${resultsRange(roundup)}`,
  );

  if (roundup.results.length > 0) {
    blocks.push(roundup.results.map(line => scoreLine(line, emoji)).join('\n'));
  } else if (roundup.unscored.length === 0) {
    // With unscored matches the block below carries the week, so saying
    // nothing was played would contradict the list right underneath it.
    blocks.push('No results published for this week.');
  }

  if (roundup.summary.played > 0) {
    blocks.push(`${emoji ? '📊 ' : ''}${summaryLine(roundup.summary)}`);
  }

  if (roundup.unscored.length > 0) {
    blocks.push(
      `${unscoredHeading(roundup, emoji)}\n${roundup.unscored
        .map(line => `• ${unscoredLine(line)}`)
        .join('\n')}`,
    );
  }

  if (includeLink && link) blocks.push(`Full results:\n${link}`);

  return blocks.join('\n\n');
}

/** A hashtag from the club name: "East Leake FC" -> "#EastLeakeFC". */
function clubHashtag(club: string): string {
  const words = club.replace(/[^\p{L}\p{N} ]/gu, '').split(/\s+/).filter(Boolean);
  return words.length > 0 ? `#${words.join('')}` : '';
}

export interface SocialMessage {
  text: string;
  length: number;
  /** Lines were dropped to fit SOCIAL_LIMIT. */
  truncated: boolean;
}

/**
 * The social variant has to fit X's 280 characters, so it is composed at
 * decreasing levels of detail and the longest version that fits wins.
 */
export function formatSocial(roundup: Roundup, options: FormatOptions = {}): SocialMessage {
  const { includeLink = true, emoji = true, link = '' } = options;
  const { summary } = roundup;

  const header = `${emoji ? '⚽ ' : ''}${roundup.club} weekend roundup`;
  const record = summary.played > 0 ? `W${summary.won} D${summary.drawn} L${summary.lost}` : '';
  const tags = [clubHashtag(roundup.club), '#GrassrootsFootball'].filter(Boolean).join(' ');
  const tail = includeLink && link ? link : '';

  const compose = (shown: number, withTags: boolean): string => {
    const blocks: string[] = [record ? `${header}\n${record}` : header];

    if (roundup.results.length === 0) {
      blocks.push('No results published this week.');
    } else {
      const lines = roundup.results.slice(0, shown).map(line => scoreLine(line, emoji));
      const hidden = roundup.results.length - shown;
      if (hidden > 0) lines.push(`+${hidden} more`);
      blocks.push(lines.join('\n'));
    }

    if (withTags && tags) blocks.push(tags);
    if (tail) blocks.push(tail);
    return blocks.join('\n\n');
  };

  const total = roundup.results.length;
  for (const withTags of [true, false]) {
    for (let shown = total; shown >= 1; shown--) {
      const text = compose(shown, withTags);
      if (text.length <= SOCIAL_LIMIT) {
        return { text, length: text.length, truncated: shown < total };
      }
    }
  }

  // Nothing fits — hand back the shortest form and let the UI show it over budget.
  const text = compose(1, false);
  return { text, length: text.length, truncated: total > 1 };
}

export function formatEmailSubject(roundup: Roundup): string {
  return `${roundup.club} results — week ending ${formatDayShort(roundup.weekEnd)}`;
}

export function formatEmailBody(roundup: Roundup, options: FormatOptions = {}): string {
  const { includeLink = true, emoji = false, link = '' } = options;
  const blocks: string[] = [];

  blocks.push(`Results, ${resultsRange(roundup)}`);

  if (roundup.results.length > 0) {
    blocks.push(roundup.results.map(line => `  ${scoreLine(line, emoji)}`).join('\n'));
  } else if (roundup.unscored.length === 0) {
    blocks.push('  No results published for this week.');
  }

  if (roundup.summary.played > 0) {
    const { played, won, drawn, lost, goalsFor, goalsAgainst } = roundup.summary;
    blocks.push(
      `Played ${played}  Won ${won}  Drawn ${drawn}  Lost ${lost}\n` +
      `Goals for ${goalsFor}, against ${goalsAgainst}`,
    );
  }

  if (roundup.unscored.length > 0) {
    blocks.push(
      `${unscoredHeading(roundup, emoji)}\n${roundup.unscored
        .map(line => `  ${unscoredLine(line)}`)
        .join('\n')}`,
    );
  }

  if (includeLink && link) blocks.push(`Full results: ${link}`);
  blocks.push('Results from FA Full-Time via touchlineHQ.');

  return blocks.join('\n\n');
}
