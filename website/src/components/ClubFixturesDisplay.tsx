import { useState, useMemo } from 'react';
import {
  Title, Text, Stack, Paper, Badge, Group, Select, Tabs,
  Table, Alert,
} from '@mantine/core';
import { IconCalendar, IconTrophy, IconAlertCircle, IconShieldLock } from '@tabler/icons-react';
import type { ClubFeed, LiveResult, LiveFixture, ParticipationEntry } from '../types';
import {
  OPPONENT_LABEL, RESTRICTED_RESULTS_NOTICE, SCORE_WITHHELD_LABEL,
  isRowRestricted, restrictedSides,
} from '../utils/compliance';
import { getOutcome } from '../utils/roundup';

const FORM_GAMES = 5;

const outcomeColor: Record<'W' | 'D' | 'L', string> = { W: 'green', D: 'yellow', L: 'red' };

function ResultsStats({ results }: { results: LiveResult[] }) {
  const outcomes = results.map(getOutcome).filter((o): o is 'W' | 'D' | 'L' => o !== null);
  if (outcomes.length === 0) return null;

  const w = outcomes.filter((o) => o === 'W').length;
  const d = outcomes.filter((o) => o === 'D').length;
  const l = outcomes.filter((o) => o === 'L').length;
  const form = outcomes.slice(0, FORM_GAMES);

  return (
    <Paper p="sm" withBorder radius="md">
      <Group gap="lg" wrap="wrap">
        <Group gap="xs">
          <Text size="xs" c="dimmed" fw={500}>P</Text>
          <Text size="sm" fw={700}>{outcomes.length}</Text>
          <Text size="xs" c="green" fw={500} ml={4}>W</Text>
          <Text size="sm" fw={700} c="green">{w}</Text>
          <Text size="xs" c="yellow.7" fw={500} ml={4}>D</Text>
          <Text size="sm" fw={700} c="yellow.7">{d}</Text>
          <Text size="xs" c="red" fw={500} ml={4}>L</Text>
          <Text size="sm" fw={700} c="red">{l}</Text>
        </Group>
        <Group gap={4} align="center">
          <Text size="xs" c="dimmed">Form</Text>
          {form.map((o, i) => (
            <Badge key={i} color={outcomeColor[o]} variant="filled" size="xs" radius="sm">{o}</Badge>
          ))}
        </Group>
      </Group>
    </Paper>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * One row of the results table.
 *
 * A U11-and-below match is not dropped — it appears with the fields that cannot
 * be published stripped out, so the season still reads as a complete record of
 * who played and when.
 */
interface PastMatch {
  id: string;
  date: string;
  time: string;
  homeTeam: string;
  awayTeam: string;
  division: string;
  /** null when the score must not be published. */
  score: string | null;
  restricted: boolean;
  team?: string;
  league?: string;
  homeAway?: 'home' | 'away';
}

function resultToPastMatch(r: LiveResult): PastMatch {
  const base = {
    id: r.id,
    date: r.date,
    time: r.time,
    division: r.division,
    team: r.team,
    league: r.league,
    homeAway: r.home_away,
  };

  // The feed sends restricted matches as participation entries, so this branch
  // only fires on a stale cached feed or one from a source we do not control.
  // Redact rather than drop: the match still happened.
  if (isRowRestricted(r)) {
    const homeAway = r.home_away ?? (r.home_team === r.team ? 'home' : 'away');
    const sides = restrictedSides(r.team, homeAway);
    return { ...base, homeAway, homeTeam: sides.home, awayTeam: sides.away, score: null, restricted: true };
  }

  return {
    ...base,
    homeTeam: r.home_team,
    awayTeam: r.away_team,
    score: `${r.home_score ?? 'X'} - ${r.away_score ?? 'X'}`,
    restricted: false,
  };
}

function participationToPastMatch(p: ParticipationEntry): PastMatch {
  const sides = restrictedSides(p.team, p.home_away);
  return {
    id: p.id,
    date: p.date,
    time: p.time,
    division: p.division,
    team: p.team,
    league: p.league,
    homeAway: p.home_away,
    homeTeam: sides.home,
    awayTeam: sides.away,
    score: null,
    restricted: true,
  };
}

interface Props {
  feed: ClubFeed;
}

export function ClubFixturesDisplay({ feed }: Props) {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  // Use composite key (team + league) to differentiate same-named teams across leagues
  const fixtureKey = (f: { team?: string; league?: string }) => `${f.team}\0${f.league}`;

  const participation = useMemo(() => feed.participation ?? [], [feed]);

  const teamOptions = useMemo(() => {
    const keys = new Set<string>();
    for (const f of feed.fixtures) if (f.team) keys.add(fixtureKey(f));
    for (const r of feed.results) if (r.team) keys.add(fixtureKey(r));
    for (const p of participation) if (p.team) keys.add(fixtureKey(p));

    return Array.from(keys)
      .map(k => {
        const [name, league] = k.split('\0');
        // Simple label: team name + league abbreviation
        const leagueAbbr = league.includes('saturday') ? 'Sat' : league.includes('sunday') ? 'Sun' : '';
        const label = leagueAbbr ? `${name} (${leagueAbbr})` : name;
        return { value: k, label };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [feed, participation]);

  // Reset team dropdown when it's no longer in the available list
  const effectiveTeam = selectedTeam && teamOptions.some(o => o.value === selectedTeam) ? selectedTeam : null;

  const fixtures = useMemo(() => {
    let list: LiveFixture[] = feed.fixtures;
    if (effectiveTeam) {
      list = list.filter((f) => fixtureKey(f) === effectiveTeam);
    } else {
      const seen = new Set<string>();
      list = list.filter((f) => {
        if (seen.has(f.id)) return false;
        seen.add(f.id);
        return true;
      });
    }
    return [...list].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  }, [feed, effectiveTeam]);

  // Played matches, both lanes in one list: open-age results with their score,
  // and U11-and-below matches with the score, opposition and venue stripped.
  const results = useMemo(() => {
    let rows: PastMatch[] = [
      ...feed.results.map(resultToPastMatch),
      // `played: false` marks a participation entry still to come, which does
      // not belong in a list of played matches.
      ...participation.filter((p) => p.played !== false).map(participationToPastMatch),
    ];
    if (effectiveTeam) {
      rows = rows.filter((r) => fixtureKey(r) === effectiveTeam);
    } else {
      const seen = new Set<string>();
      rows = rows.filter((r) => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });
    }
    return rows.sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
  }, [feed, participation, effectiveTeam]);

  // Played/won/drawn/lost and form are a standings summary, so they are built
  // from open-age results only and never shown for a restricted team.
  const openResults = useMemo(() => {
    const list = feed.results.filter((r) => !isRowRestricted(r));
    if (!effectiveTeam) return [];
    return list
      .filter((r) => fixtureKey(r) === effectiveTeam)
      .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
  }, [feed, effectiveTeam]);

  const restrictedCount = results.filter((r) => r.restricted).length;
  const showRestrictedNotice = restrictedCount > 0 || fixtures.some(isRowRestricted);

  if (!feed) {
    return (
      <Stack gap="md">
        <Title order={2}>Fixtures & Results</Title>
        <Alert icon={<IconAlertCircle size={16} />}>
          Live fixture and result data is currently unavailable. Please check back later.
        </Alert>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Data sourced from FA Full-Time via{' '}
        <Text component="a" href="https://github.com/touchlineHQ/fulltimeFeeds" c="var(--mantine-primary-color-filled)" size="sm">
          fulltimeFeeds
        </Text>
        . Last updated: {new Date(feed.generated).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}.
      </Text>

      <Select
        label="Filter by team"
        placeholder="All teams"
        data={teamOptions}
        value={effectiveTeam}
        onChange={(value) => setSelectedTeam(value)}
        clearable
        searchable
        allowDeselect={false}
      />

      {showRestrictedNotice && (
        <Alert icon={<IconShieldLock size={16} />} color="blue" title="Under-11 and below">
          {RESTRICTED_RESULTS_NOTICE}
        </Alert>
      )}

      <Tabs defaultValue="fixtures">
        <Tabs.List>
          <Tabs.Tab value="fixtures" leftSection={<IconCalendar size={14} />}>
            Fixtures ({fixtures.length})
          </Tabs.Tab>
          <Tabs.Tab value="results" leftSection={<IconTrophy size={14} />}>
            Results ({results.length})
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="fixtures" pt="md" style={{ maxHeight: 500, overflowY: "scroll" }}>
          {fixtures.length === 0 ? (
            <Text c="dimmed" size="sm">No upcoming fixtures.</Text>
          ) : (
            <Stack gap="xs">
              {fixtures.map((f) => {
                const restricted = isRowRestricted(f);
                const homeAway = f.home_away === 'home' ? 'Home' : 'Away';
                return (
                  <Paper key={f.id} p="sm" withBorder radius="md">
                    <Group justify="space-between" wrap="wrap" gap="xs" mb={4}>
                      <Badge variant="light" size="xs">{f.division}</Badge>
                      <Text size="xs" c="dimmed">{formatDate(f.date)} · {f.time}</Text>
                    </Group>
                    <Text fw={700} size="sm" ta="center">
                      {restricted
                        ? `${f.team ?? OPPONENT_LABEL} vs ${OPPONENT_LABEL}`
                        : effectiveTeam ? `${f.team} vs ${f.opponent}` : `${f.home_team} vs ${f.away_team}`}
                    </Text>
                    <Text size="xs" c="dimmed" ta="center">
                      {restricted
                        ? `${homeAway} · Opposition and venue not published`
                        : effectiveTeam ? `${homeAway} · ${f.venue}` : f.venue}
                    </Text>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="results" pt="md" style={{ maxHeight: 500, overflowY: "scroll" }}>
          {results.length === 0 ? (
            <Text c="dimmed" size="sm">No results yet.</Text>
          ) : (
            <Stack gap="sm">
              {effectiveTeam && <ResultsStats results={openResults} />}
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Home</Table.Th>
                    <Table.Th ta="center">Score</Table.Th>
                    <Table.Th>Away</Table.Th>
                    <Table.Th visibleFrom="sm">Division</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {results.map((r) => (
                    <Table.Tr key={r.id}>
                      <Table.Td>
                        <Text size="xs">{formatDate(r.date)} · {r.time}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={r.homeAway === 'home' ? 700 : 400}>
                          {r.homeTeam}
                        </Text>
                      </Table.Td>
                      <Table.Td ta="center">
                        {r.score === null ? (
                          <Text size="xs" c="dimmed" fs="italic">{SCORE_WITHHELD_LABEL}</Text>
                        ) : (
                          <Text size="sm" fw={700}>{r.score}</Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={r.homeAway === 'away' ? 700 : 400}>
                          {r.awayTeam}
                        </Text>
                      </Table.Td>
                      <Table.Td visibleFrom="sm">
                        <Text size="xs" c="dimmed">{r.division}</Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Stack>
          )}
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
