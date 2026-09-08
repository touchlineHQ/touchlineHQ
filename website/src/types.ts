// Core club information
export interface ClubSocials {
  github: string;
  twitter: string;
  linkedin: string;
}

export interface AboutItem {
  icon: string;
  title: string;
  text: string;
}

export interface Club {
  name: string;
  tagline: string;
  description: string;
  email: string;
  domain: string;
  socials: ClubSocials;
  primaryColor?: string;
  hero: {
    title: string;
    subtitle: string;
    cta: string;
  };
  about: AboutItem[];
}

// Feature listing
export interface Feature {
  title: string;
  description: string;
  details: string[];
}

// Open source repository
export interface Repo {
  name: string;
  description: string;
  url: string;
  tech: string[];
  features: string[];
}

// Contact information
export interface Contact {
  email: string;
  social: {
    github: string;
    twitter: string;
    linkedin: string;
  };
  message: string;
}

// Live feed types (from fulltimeFeeds)

/**
 * Publication policy a feed was generated under. fulltimeFeeds withholds
 * results for teams at U11 and below; `results_withheld` counts what was left
 * out so the site can say so rather than look empty.
 */
export interface FeedCompliance {
  policy: string;
  restricted_max_age_group: string;
  results_withheld: number;
  fixtures_withheld?: number;
}

export interface LiveFixture {
  id: string;
  date: string;
  time: string;
  home_team: string;
  away_team: string;
  venue: string;
  division: string;
  league: string;
  team: string;
  home_away: 'home' | 'away';
  opponent: string;
  /** Set by the feed on U11-and-below fixtures, where opposition and venue are redacted. */
  publication_restricted?: boolean;
}

export interface LiveResult extends LiveFixture {
  home_score: number | null;
  away_score: number | null;
  goals_for: number | null;
  goals_against: number | null;
}

/**
 * A U11-and-below match that was played. The score is withheld, but the fact of
 * the match is not: the feed sends these so a young team's matches can still be
 * listed rather than vanishing from the record.
 */
export interface ParticipationEntry {
  id: string;
  date: string;
  time: string;
  team: string;
  league: string;
  home_away: 'home' | 'away';
  division: string;
  age_group: string | null;
  played: boolean;
  publication_restricted?: boolean;
}

export interface ClubFeed {
  club: string;
  generated: string;
  compliance?: FeedCompliance;
  fixtures: LiveFixture[];
  results: LiveResult[];
  participation?: ParticipationEntry[];
}

export interface LiveTeam {
  name: string;
  slug: string;
  league: string;
}

export interface TeamFeed {
  team: string;
  league: string;
  generated: string;
  compliance?: FeedCompliance;
  fixtures: Omit<LiveFixture, 'team' | 'home_away' | 'opponent'>[];
  results: Omit<LiveResult, 'team' | 'home_away' | 'opponent' | 'goals_for' | 'goals_against'>[];
  participation?: ParticipationEntry[];
}

// Main app data
export interface AppData {
  club: Club;
  features: Feature[];
  repos: Repo[];
  contact: Contact;
  clubFeed: ClubFeed | null;
  liveTeams: LiveTeam[];
}