/**
 * Publication rules for youth football data.
 *
 * The FA prohibits publishing match results and league tables for teams playing
 * at Under-11 and below, and the league's guidance extends that to naming the
 * opposition or the venue in anything published online.
 *
 * fulltimeFeeds already redacts its feeds at source, so in the normal case
 * nothing restricted ever reaches this code. These helpers are the second line:
 * a browser can be holding a cached copy of a feed published before the rules
 * landed, and a club may point the site at a feed we do not control. Anything
 * rendered goes through here first.
 *
 * Mirrors `scraper/compliance.py` in the fulltimeFeeds repo — keep the two in
 * step.
 */

/** Teams at this age group and below must not have results or tables published. */
export const RESTRICTED_MAX_AGE = 11;

/** What is shown in place of an opposition name. */
export const OPPONENT_LABEL = 'Opposition';

/**
 * "U10", "U 10", "Under 10", "Under-10". The trailing (?!\d) stops "U1" from
 * matching the front of "U11".
 */
const AGE_PATTERN = /\b(?:u|under)[\s-]?(\d{1,2})(?!\d)/gi;

/** The youngest age group named across the given texts, or null if none is. */
export function ageGroup(...texts: (string | null | undefined)[]): number | null {
  let youngest: number | null = null;
  for (const text of texts) {
    if (!text) continue;
    // A global regex carries lastIndex between calls, so reset before each use.
    AGE_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = AGE_PATTERN.exec(text)) !== null) {
      const age = Number(match[1]);
      if (youngest === null || age < youngest) youngest = age;
    }
  }
  return youngest;
}

/** True when the named age group is U11 or below, so publication is limited. */
export function isRestricted(...texts: (string | null | undefined)[]): boolean {
  const age = ageGroup(...texts);
  return age !== null && age <= RESTRICTED_MAX_AGE;
}

/** A fixture or result row as it arrives from a feed. */
interface MatchRow {
  home_team?: string;
  away_team?: string;
  team?: string;
  opponent?: string;
  division?: string;
  publication_restricted?: boolean;
}

/**
 * True when a row belongs to a U11-or-below match.
 *
 * The league name is deliberately not consulted: it covers every age group at
 * once, so a league whose title mentions U11 would drag its U18 teams down too.
 */
export function isRowRestricted(row: MatchRow): boolean {
  if (row.publication_restricted) return true;
  return isRestricted(row.home_team, row.away_team, row.team, row.opponent, row.division);
}

/** The opposition's name, or the placeholder when it must not be shown. */
export function safeOpponent(row: MatchRow, opponent: string | undefined): string {
  return isRowRestricted(row) ? OPPONENT_LABEL : (opponent ?? '');
}

/** The venue, or an empty string when it must not be named. */
export function safeVenue(row: MatchRow, venue: string | undefined): string {
  return isRowRestricted(row) ? '' : (venue ?? '');
}

/**
 * The two team names to show for a restricted match.
 *
 * The club's own team is kept — a club naming its own side is fine; it is the
 * opposition that must not be identified. Without a known subject team there is
 * nothing safe to keep, so both sides are anonymised.
 */
export function restrictedSides(
  team: string | undefined,
  homeAway: 'home' | 'away' | undefined,
): { home: string; away: string } {
  if (!team || !homeAway) return { home: OPPONENT_LABEL, away: OPPONENT_LABEL };
  return homeAway === 'home'
    ? { home: team, away: OPPONENT_LABEL }
    : { home: OPPONENT_LABEL, away: team };
}

/** Shown in place of a score that must not be published. */
export const SCORE_WITHHELD_LABEL = 'Not published';

/** Explains to a visitor why a young team's matches carry no score. */
export const RESTRICTED_RESULTS_NOTICE =
  'Matches for teams at Under-11 and below are listed without a score, opposition ' +
  'or venue, and no league table is shown. This follows The FA’s youth football ' +
  'guidance. Results are still submitted to the league privately.';
