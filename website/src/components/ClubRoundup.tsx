import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Select, Loader, Alert, Stack, Title, Group, Button, Paper, Text, Badge, Switch,
  SegmentedControl, Textarea, Divider,
} from '@mantine/core';
import {
  IconAlertCircle, IconSearch, IconCopy, IconCheck, IconBrandWhatsapp,
  IconBrandTwitter, IconMail, IconShare, IconClockExclamation, IconTrophy,
} from '@tabler/icons-react';
import { loadClubIndex, loadClubFeed } from '../data';
import type { FeedClubEntry } from '../data';
import type { ClubFeed } from '../types';
import {
  buildRoundup, defaultWeek, weeksWithMatches, addDays, formatDayRange, formatKickOffLabel,
  formatWhatsApp, formatSocial, formatEmailSubject, formatEmailBody, unscoredMatches,
  participationMatches, withParticipation, hasRecord, SOCIAL_LIMIT,
} from '../utils/roundup';
import type { Roundup, RoundupMatch, RoundupUnscoredLine } from '../utils/roundup';
import { RESTRICTED_RESULTS_NOTICE } from '../utils/compliance';
import { copyTextToClipboard } from '../utils/clipboard';

type Format = 'whatsapp' | 'social' | 'email';

const outcomeColor: Record<'W' | 'D' | 'L', string> = { W: 'green', D: 'yellow', L: 'red' };

/** Badge matching the coloured dot the message uses for this kind of match. */
function MatchBadge({ match }: { match: RoundupMatch }) {
  if (match.kind === 'result') {
    return (
      <Badge color={outcomeColor[match.outcome]} variant="filled" size="xs" radius="sm">
        {match.outcome}
      </Badge>
    );
  }
  if (match.kind === 'derby') {
    return <Badge color="gray" variant="filled" size="xs" radius="sm">Derby</Badge>;
  }
  if (match.kind === 'participation') {
    return <Badge color="blue" variant="light" size="xs" radius="sm">Participation</Badge>;
  }
  return match.reason === 'friendly'
    ? <Badge color="blue" variant="filled" size="xs" radius="sm">Friendly</Badge>
    : <Badge color="blue" variant="light" size="xs" radius="sm">No score</Badge>;
}

function matchText(match: RoundupMatch): string {
  if (match.kind === 'result') {
    return `${match.team} ${match.goalsFor}–${match.goalsAgainst} ${match.opponent}`;
  }
  if (match.kind === 'derby') {
    return `${match.homeTeam} ${match.homeScore}–${match.awayScore} ${match.awayTeam}`;
  }
  // No opposition or venue for U11 and below — see utils/compliance.
  if (match.kind === 'participation') {
    return `${match.team} played ${match.homeAway === 'home' ? 'at home' : 'away'}`;
  }
  return `${match.team} vs ${match.opponent}`;
}

function MatchRow({ match }: { match: RoundupMatch }) {
  return (
    <Paper p="sm" withBorder radius="md">
      <Group justify="space-between" wrap="wrap" gap="xs" mb={4}>
        <Group gap="xs">
          <MatchBadge match={match} />
          {match.division && <Badge variant="light" size="xs">{match.division}</Badge>}
        </Group>
        <Text size="xs" c="dimmed">{formatKickOffLabel(match.date, match.time)}</Text>
      </Group>
      <Text fw={700} size="sm" ta="center" c={match.kind === 'result' || match.kind === 'derby' ? undefined : 'dimmed'}>
        {matchText(match)}
      </Text>
    </Paper>
  );
}

/** Say why some matches have no score, without claiming more than the feed supports. */
function unscoredExplanation(lines: RoundupUnscoredLine[]): string {
  return lines.some(l => l.reason === 'friendly')
    ? 'Friendlies carry no recorded result, so they stay out of the record.'
    : 'The league withholds the score for some of these matches, so they stay out of the record.';
}

function SummaryChips({ roundup }: { roundup: Roundup }) {
  const { played, won, drawn, lost, goalsFor, goalsAgainst } = roundup.summary;
  if (played === 0) return null;
  // "Played" spelled out: it counts every match, so it is not the P of a league
  // table, where P would equal W + D + L.
  return (
    <Paper p="sm" withBorder radius="md">
      <Group gap="lg" wrap="wrap">
        <Group gap="xs">
          <Text size="xs" c="dimmed" fw={500}>Played</Text>
          <Text size="sm" fw={700}>{played}</Text>
        </Group>
        {hasRecord(roundup.summary) && (
          <>
            <Group gap="xs">
              <Text size="xs" c="green" fw={500}>W</Text>
              <Text size="sm" fw={700} c="green">{won}</Text>
              <Text size="xs" c="yellow.7" fw={500} ml={4}>D</Text>
              <Text size="sm" fw={700} c="yellow.7">{drawn}</Text>
              <Text size="xs" c="red" fw={500} ml={4}>L</Text>
              <Text size="sm" fw={700} c="red">{lost}</Text>
            </Group>
            <Group gap="xs">
              <Text size="xs" c="dimmed" fw={500}>Goals</Text>
              <Text size="sm" fw={700}>{goalsFor}–{goalsAgainst}</Text>
            </Group>
          </>
        )}
      </Group>
    </Paper>
  );
}

export function ClubRoundup() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [clubs, setClubs] = useState<FeedClubEntry[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(true);
  const [clubsLoaded, setClubsLoaded] = useState(false);
  const [selectedClub, setSelectedClub] = useState<string | null>(null);
  const [feed, setFeed] = useState<ClubFeed | null>(null);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [week, setWeek] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [format, setFormat] = useState<Format>('whatsapp');
  const [includeLink, setIncludeLink] = useState(true);
  const [includeParticipation, setIncludeParticipation] = useState(true);
  const [emoji, setEmoji] = useState(true);

  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  useEffect(() => {
    loadClubIndex()
      .then(loaded => {
        setClubs(loaded);
        setLoadingClubs(false);
        setClubsLoaded(true);
        if (loaded.length === 0) {
          setError('Unable to load the club list. Please try again later.');
          return;
        }
        const clubParam = searchParams.get('club');
        if (clubParam && loaded.some(c => c.slug === clubParam)) setSelectedClub(clubParam);
      })
      .catch(err => {
        console.error('Failed to load club list:', err);
        setError('Unable to load the club list. Please try again later.');
        setLoadingClubs(false);
      });
  }, []);

  // Load the club feed, then settle on a week: the one in the URL when it has
  // results, otherwise the most recent week that does.
  useEffect(() => {
    setCopied(false);
    setCopyFailed(false);
    if (!selectedClub) {
      setFeed(null);
      setWeek(null);
      setError(null);
      setLoadingFeed(false);
      return;
    }

    setLoadingFeed(true);
    setError(null);
    let isCurrent = true;
    loadClubFeed(selectedClub)
      .then(loaded => {
        if (!isCurrent) return;
        if (loaded === null) {
          setError(`Unable to load results for ${selectedClub}. The feed may be temporarily unavailable.`);
          setFeed(null);
          setWeek(null);
        } else {
          setFeed(loaded);
          const weekParam = searchParams.get('week');
          const available = weeksWithMatches(loaded);
          setWeek(weekParam && available.includes(weekParam) ? weekParam : defaultWeek(loaded));
        }
        setLoadingFeed(false);
      })
      .catch(err => {
        if (!isCurrent) return;
        console.error('Failed to load club feed:', err);
        setError(`Unable to load results for ${selectedClub}. The feed may be temporarily unavailable.`);
        setFeed(null);
        setWeek(null);
        setLoadingFeed(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [selectedClub]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (selectedClub) next.set('club', selectedClub);
    else if (clubsLoaded) next.delete('club');
    if (week) next.set('week', week);
    else if (selectedClub) next.delete('week');
    setSearchParams(next, { replace: true });
  }, [selectedClub, week, clubsLoaded]);

  const selectedEntry = useMemo(
    () => clubs.find(c => c.slug === selectedClub) ?? null,
    [clubs, selectedClub],
  );

  const weekOptions = useMemo(() => {
    if (!feed) return [];
    return weeksWithMatches(feed).map(start => ({
      value: start,
      label: formatDayRange(start, addDays(start, 6)),
    }));
  }, [feed]);

  const fullRoundup = useMemo(
    () => (feed && week ? buildRoundup(feed, week) : null),
    [feed, week],
  );

  /** How many participation games the toggle governs, shown or not. */
  const participationCount = useMemo(
    () => (fullRoundup ? participationMatches(fullRoundup).length : 0),
    [fullRoundup],
  );

  // Everything below reads this, so hiding participation games takes them out
  // of the list, the message and the record together.
  const roundup = useMemo(
    () => (fullRoundup ? withParticipation(fullRoundup, includeParticipation) : null),
    [fullRoundup, includeParticipation],
  );

  const unscored = useMemo(() => (roundup ? unscoredMatches(roundup) : []), [roundup]);
  const hasParticipation = useMemo(
    () => (roundup ? participationMatches(roundup).length > 0 : false),
    [roundup],
  );

  // The deep link is this page's own URL with the club and week pinned, so a
  // recipient who taps it lands on exactly the roundup that was sent.
  const link = useMemo(() => {
    if (!selectedClub || !week || typeof window === 'undefined') return '';
    const url = new URL(window.location.href);
    url.searchParams.set('club', selectedClub);
    url.searchParams.set('week', week);
    return url.toString();
  }, [selectedClub, week]);

  const message = useMemo(() => {
    if (!roundup) return null;
    const options = { includeLink, emoji, link };
    if (format === 'email') {
      return {
        subject: formatEmailSubject(roundup),
        body: formatEmailBody(roundup, options),
        length: null as number | null,
        truncated: false,
      };
    }
    if (format === 'social') {
      const social = formatSocial(roundup, options);
      return { subject: null, body: social.text, length: social.length, truncated: social.truncated };
    }
    const body = formatWhatsApp(roundup, options);
    return { subject: null, body, length: null as number | null, truncated: false };
  }, [roundup, format, includeLink, emoji, link]);

  useEffect(() => {
    setCopied(false);
    setCopyFailed(false);
  }, [format, includeLink, emoji, week, includeParticipation]);

  const copy = async () => {
    if (!message) return;
    const text = message.subject ? `${message.subject}\n\n${message.body}` : message.body;
    const ok = await copyTextToClipboard(text);
    if (!ok) {
      setCopyFailed(true);
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const nativeShare = async () => {
    if (!message || !navigator.share) return;
    try {
      await navigator.share({ text: message.body });
    } catch {
      // Cancelled, or the browser refused — the copy button is still there.
    }
  };

  const overBudget = message?.length != null && message.length > SOCIAL_LIMIT;

  return (
    <Stack gap="md">
      <Select
        label="Search for your club"
        placeholder="Type club name (e.g., 'East Leake', 'Quorn')"
        data={clubs.map(c => ({ value: c.slug, label: c.name }))}
        value={selectedClub}
        onChange={setSelectedClub}
        searchable
        clearable
        limit={50}
        nothingFoundMessage="No club found"
        leftSection={<IconSearch size={16} />}
        disabled={loadingClubs}
        size="md"
      />

      {loadingClubs && <Loader size="sm" />}
      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" title="Error">
          {error}
        </Alert>
      )}
      {loadingFeed && <Loader size="sm" />}

      {!selectedClub && !loadingClubs && !error && (
        <Alert icon={<IconSearch size={16} />} color="blue" title="Find your club">
          Pick your club above and we'll build a results message for the most recent weekend —
          ready to paste into your team WhatsApp group, post to your socials, or email round the parents.
        </Alert>
      )}

      {roundup && selectedEntry && !loadingFeed && (
        <Stack gap="lg">
          <Group justify="space-between" wrap="wrap" gap="md">
            <Stack gap={4}>
              <Title order={3}>{selectedEntry.name}</Title>
              <Text size="sm" c="dimmed">
                {formatDayRange(roundup.weekStart, roundup.weekEnd)}
              </Text>
            </Stack>
            <Select
              label="Week"
              data={weekOptions}
              value={week}
              onChange={value => value && setWeek(value)}
              allowDeselect={false}
              size="sm"
              w={230}
            />
          </Group>

          {roundup.stale && (
            <Alert icon={<IconClockExclamation size={16} />} color="yellow" title="Results may be out of date">
              This club's feed was last updated {new Date(roundup.generated).toLocaleString('en-GB')}.
              Full-Time may have published results since — check before sending.
            </Alert>
          )}

          <SummaryChips roundup={roundup} />

          <Stack gap="xs">
            <Group gap="xs">
              <IconTrophy size={16} color="var(--mantine-color-green-6)" />
              <Text fw={600} size="sm">This week's matches</Text>
            </Group>
            {roundup.matches.length === 0 ? (
              <Text size="sm" c="dimmed">No results published for this week.</Text>
            ) : (
              roundup.matches.map(match => <MatchRow key={match.id} match={match} />)
            )}
            {hasParticipation && (
              <Text size="xs" c="dimmed">{RESTRICTED_RESULTS_NOTICE}</Text>
            )}
            {unscored.length > 0 && (
              <Text size="xs" c="dimmed">{unscoredExplanation(unscored)}</Text>
            )}
            {!includeParticipation && participationCount > 0 && (
              <Text size="xs" c="dimmed">
                {participationCount} participation game{participationCount === 1 ? '' : 's'} hidden
                (Under-11 and below).
              </Text>
            )}
          </Stack>

          <Divider />

          <Stack gap="sm">
            <SegmentedControl
              value={format}
              onChange={value => setFormat(value as Format)}
              data={[
                { label: 'WhatsApp', value: 'whatsapp' },
                { label: 'Socials', value: 'social' },
                { label: 'Email', value: 'email' },
              ]}
              fullWidth
            />

            <Group gap="lg" wrap="wrap">
              <Switch
                label="Link back"
                checked={includeLink}
                onChange={e => setIncludeLink(e.currentTarget.checked)}
                size="sm"
              />
              {participationCount > 0 && (
                <Switch
                  label={`Participation games (${participationCount})`}
                  checked={includeParticipation}
                  onChange={e => setIncludeParticipation(e.currentTarget.checked)}
                  size="sm"
                />
              )}
              <Switch
                label="Emoji"
                checked={emoji}
                onChange={e => setEmoji(e.currentTarget.checked)}
                size="sm"
              />
            </Group>

            {message?.subject && (
              <Textarea label="Subject" value={message.subject} readOnly autosize />
            )}

            <Textarea
              label="Message"
              value={message?.body ?? ''}
              readOnly
              autosize
              minRows={8}
              maxRows={24}
              styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)', fontSize: 13 } }}
            />

            {message?.length != null && (
              <Group gap="xs" justify="space-between">
                <Text size="xs" c={overBudget ? 'red' : 'dimmed'}>
                  {message.length} / {SOCIAL_LIMIT} characters
                </Text>
                {message.truncated && (
                  <Text size="xs" c="dimmed">Trimmed to fit — the link has the full set.</Text>
                )}
              </Group>
            )}

            {overBudget && (
              <Alert icon={<IconAlertCircle size={16} />} color="yellow" title="Over the limit">
                This is longer than X allows even trimmed down. Turn off the link or the emoji,
                or post it somewhere without a character limit.
              </Alert>
            )}
          </Stack>

          <Group gap="sm" wrap="wrap">
            <Button
              onClick={copy}
              leftSection={copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
              color={copied ? 'teal' : 'green.6'}
              radius="xl"
              flex="1 0 auto"
            >
              {copied ? 'Copied' : 'Copy message'}
            </Button>
            <Button
              component="a"
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(message?.body ?? '')}`}
              target="_blank"
              rel="noopener noreferrer"
              leftSection={<IconBrandWhatsapp size={18} />}
              variant="light"
              color="green.6"
              c="green.9"
              style={{
                '--button-bg': 'var(--mantine-color-green-1)',
                '--button-hover': 'var(--mantine-color-green-0)',
              }}
              radius="xl"
              flex="1 0 auto"
            >
              WhatsApp
            </Button>
            <Button
              component="a"
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(message?.body ?? '')}`}
              target="_blank"
              rel="noopener noreferrer"
              leftSection={<IconBrandTwitter size={18} />}
              variant="outline"
              color="blue.6"
              radius="xl"
              flex="1 0 auto"
            >
              Post to X
            </Button>
            <Button
              component="a"
              href={`mailto:?subject=${encodeURIComponent(
                message?.subject ?? formatEmailSubject(roundup),
              )}&body=${encodeURIComponent(message?.body ?? '')}`}
              leftSection={<IconMail size={18} />}
              variant="outline"
              color="green.6"
              radius="xl"
              flex="1 0 auto"
            >
              Email
            </Button>
            {typeof navigator !== 'undefined' && !!navigator.share && (
              <Button
                onClick={nativeShare}
                leftSection={<IconShare size={18} />}
                variant="subtle"
                color="gray"
                radius="xl"
                flex="1 0 auto"
              >
                Share…
              </Button>
            )}
          </Group>

          {copyFailed && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" title="Copy failed">
              Couldn't access your clipboard — select the message above and copy it manually.
            </Alert>
          )}
        </Stack>
      )}

      {feed && !roundup && !loadingFeed && (
        <Alert icon={<IconAlertCircle size={16} />} color="blue" title="No results yet">
          {selectedEntry?.name} has no published results to round up yet. Check back after the next
          round of fixtures.
        </Alert>
      )}
    </Stack>
  );
}
