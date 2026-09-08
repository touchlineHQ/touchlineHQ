import type { AppData, Club, Feature, Repo, Contact, ClubFeed, LiveTeam, TeamFeed } from './types';

const BASE = 'data/';
const FEEDS_BASE = 'https://fixtures.touchlinehq.co.uk/feeds/';
const CALENDARS_BASE = 'https://fixtures.touchlinehq.co.uk/calendars/';
const INDEX_URL = `${FEEDS_BASE}index.json`;
const CLUBS_API_URL = 'https://fixtures.touchlinehq.co.uk/feeds/index.json';

export interface FeedTeamEntry {
  name: string;
  slug: string;
  league: string;
  leagueName?: string;
}

interface IndexPayload {
  clubs: FeedTeamEntry[];
  // If there are other root keys in your index.json (like leagues), you can add them here
}

/** Fetch the list of available club feed slugs from the centralized R2 index. */
export async function loadClubSlugs(): Promise<string[]> {
  try {
    const res = await fetch(CLUBS_API_URL);
    if (!res.ok) return [];
    
    const data = await res.json() as IndexPayload;
    
    // Safety check in case the clubs key is missing or empty
    if (!data || !Array.isArray(data.clubs)) return [];
    
    return data.clubs
      .map(club => club.slug)
      .sort();
  } catch {
    return [];
  }
}

export interface FeedClubEntry {
  name: string;
  slug: string;
}

/**
 * Fetch the list of clubs from the feed index.
 *
 * index.json carries one `clubs[]` entry per club *per league*, so a club that
 * plays both Saturday and Sunday football appears more than once. Entries are
 * de-duplicated on slug here, keeping the club's real name so callers don't have
 * to title-case the slug back into something approximating it.
 */
export async function loadClubIndex(): Promise<FeedClubEntry[]> {
  try {
    const res = await fetch(INDEX_URL);
    if (!res.ok) return [];
    const data = await res.json() as { clubs?: { name?: string; slug?: string }[] };
    if (!Array.isArray(data?.clubs)) return [];

    const bySlug = new Map<string, FeedClubEntry>();
    for (const club of data.clubs) {
      if (!club?.slug || bySlug.has(club.slug)) continue;
      bySlug.set(club.slug, { name: club.name || club.slug, slug: club.slug });
    }
    return [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

/** Fetch the full feed index — every team across all leagues. */
export async function loadAllFeedTeams(): Promise<FeedTeamEntry[]> {
  try {
    const res = await fetch(INDEX_URL);
    if (!res.ok) return [];
    const data = await res.json() as { leagues: { name?: string; slug: string; teams: { name: string; slug: string }[] }[] };
    const teams: FeedTeamEntry[] = [];
    for (const league of data.leagues) {
      for (const team of league.teams) {
        teams.push({ name: team.name, slug: team.slug, league: league.slug, leagueName: league.name });
      }
    }
    return teams;
  } catch {
    return [];
  }
}

export function teamFeedUrl(league: string, slug: string): string {
  return `${FEEDS_BASE}${league}/teams/${slug}.json`;
}

export function teamCalendarUrl(league: string, slug: string): string {
  return `${CALENDARS_BASE}${league}/${slug}.ics`;
}

export function webcalTeamUrl(league: string, slug: string): string {
  return teamCalendarUrl(league, slug).replace(/^https:/, 'webcal:');
}

export function googleCalendarSubscribeUrl(league: string, slug: string): string {
  return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalTeamUrl(league, slug))}`;
}

export async function loadTeamFeed(league: string, slug: string): Promise<TeamFeed | null> {
  try {
    const res = await fetch(teamFeedUrl(league, slug));
    if (!res.ok) return null;
    return res.json() as Promise<TeamFeed>;
  } catch {
    return null;
  }
}

async function load<T>(file: string): Promise<T> {
  const res = await fetch(BASE + file);
  if (!res.ok) throw new Error(`Failed to load ${file}: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function loadClubFeed(feedSlug: string): Promise<ClubFeed | null> {
  try {
    const res = await fetch(`${FEEDS_BASE}clubs/${feedSlug}.json`);
    if (!res.ok) return null;
    return res.json() as Promise<ClubFeed>;
  } catch {
    return null;
  }
}

/** Load all static data for the marketing site */
export async function loadAllData(): Promise<AppData> {
  const [club, features, repos, contact] = await Promise.all([
    load<Club>('club.json'),
    load<Feature[]>('features.json'),
    load<Repo[]>('repos.json'),
    load<Contact>('contact.json'),
  ]);

  // No feeds loaded by default; they are loaded on demand in the demo
  return {
    club,
    features,
    repos,
    contact,
    clubFeed: null,
    liveTeams: [],
  };
}