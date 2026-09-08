import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Select, Loader, Alert, Stack, Title, Group, Button, Paper, Text, Badge, Menu,
} from '@mantine/core';
import {
  IconAlertCircle, IconSearch, IconDownload, IconBrandGoogle, IconCopy, IconCheck, IconCalendarPlus, IconShare,
  IconBrandWhatsapp, IconBrandTwitter, IconBrandFacebook, IconMail, IconLink, IconShieldLock,
} from '@tabler/icons-react';
import {
  loadAllFeedTeams, loadTeamFeed, teamCalendarUrl, googleCalendarSubscribeUrl,
} from '../data';
import type { FeedTeamEntry } from '../data';
import type { TeamFeed } from '../types';
import { copyTextToClipboard } from '../utils/clipboard';
import {
  OPPONENT_LABEL, RESTRICTED_RESULTS_NOTICE, isRestricted, isRowRestricted,
} from '../utils/compliance';

const optionValue = (t: FeedTeamEntry) => `${t.league}\0${t.slug}`;

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function TeamCalendarSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [teams, setTeams] = useState<FeedTeamEntry[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [teamsLoadSuccess, setTeamsLoadSuccess] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [feed, setFeed] = useState<TeamFeed | null>(null);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    loadAllFeedTeams()
      .then(loaded => {
        const sorted = [...loaded].sort((a, b) => a.name.localeCompare(b.name));
        setTeams(sorted);
        setLoadingTeams(false);
        setTeamsLoadSuccess(true);

        const leagueParam = searchParams.get('league');
        const teamParam = searchParams.get('team');
        if (leagueParam && teamParam) {
          const match = sorted.find(t => t.league === leagueParam && t.slug === teamParam);
          if (match) setSelected(optionValue(match));
        }
      })
      .catch(err => {
        console.error('Failed to load team list:', err);
        setError('Unable to load the team list. Please try again later.');
        setLoadingTeams(false);
      });
  }, []);

  const selectedEntry = useMemo(
    () => teams.find(t => optionValue(t) === selected) ?? null,
    [teams, selected]
  );

  useEffect(() => {
    if (selectedEntry) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('league', selectedEntry.league);
      newParams.set('team', selectedEntry.slug);
      setSearchParams(newParams, { replace: true });
    } else if (teamsLoadSuccess && (searchParams.has('league') || searchParams.has('team'))) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('league');
      newParams.delete('team');
      setSearchParams(newParams, { replace: true });
    }
  }, [selectedEntry, teamsLoadSuccess]);

  useEffect(() => {
    setCopied(false);
    setCopyFailed(false);
    if (!selectedEntry) {
      setFeed(null);
      setError(null);
      setLoadingFeed(false);
      return;
    }

    setLoadingFeed(true);
    setError(null);
    let isCurrent = true;
    loadTeamFeed(selectedEntry.league, selectedEntry.slug)
      .then(loaded => {
        if (!isCurrent) return;
        if (loaded === null) {
          setError(`Unable to load fixtures for ${selectedEntry.name}. The feed may be temporarily unavailable.`);
          setFeed(null);
        } else {
          setFeed(loaded);
        }
        setLoadingFeed(false);
      })
      .catch(err => {
        if (!isCurrent) return;
        console.error('Failed to load team feed:', err);
        setError(`Unable to load fixtures for ${selectedEntry.name}. The feed may be temporarily unavailable.`);
        setFeed(null);
        setLoadingFeed(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [selectedEntry]);

  const nextFixtures = useMemo(() => {
    if (!feed) return [];
    return [...feed.fixtures]
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  }, [feed]);

  // At U11 and below the opposition and venue are not published. The feed
  // already redacts them; this keeps a stale cached feed from slipping past.
  const teamRestricted = useMemo(
    () => isRestricted(selectedEntry?.name, feed?.team),
    [selectedEntry, feed]
  );

  const options = useMemo(
    () => teams.map(t => ({
      value: optionValue(t),
      label: t.leagueName ? `${t.name} — ${t.leagueName}` : t.name,
    })),
    [teams]
  );

  const copyUrl = async () => {
    if (!selectedEntry) return;
    const ok = await copyTextToClipboard(teamCalendarUrl(selectedEntry.league, selectedEntry.slug));
    if (!ok) {
      setCopyFailed(true);
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const shareUrl = async () => {
    if (!selectedEntry) return;
    const leagueLabel = selectedEntry.leagueName ? ` — ${selectedEntry.leagueName}` : '';
    const shareTitle = `${selectedEntry.name}${leagueLabel}`;
    const shareText = `Follow ${selectedEntry.name} fixtures — subscribe to their calendar feed on TouchlineHQ`;
    const shareLink = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareLink });
        return;
      } catch {
        // user cancelled or error — show menu below
      }
    }

    setShareOpen(true);
  };

  return (
    <Stack gap="md">
      <Select
        label="Search for your team"
        placeholder="Type team name (e.g., 'East Leake', 'West Bridgford')"
        data={options}
        value={selected}
        onChange={setSelected}
        searchable
        clearable
        limit={50}
        nothingFoundMessage="No team found"
        leftSection={<IconSearch size={16} />}
        disabled={loadingTeams}
        size="md"
      />

      {loadingTeams && <Loader size="sm" />}
      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" title="Error">
          {error}
        </Alert>
      )}
      {loadingFeed && <Loader size="sm" />}

      {selectedEntry && !loadingFeed && (
        <Stack gap="lg">
          <Group justify="space-between" wrap="wrap" gap="md">
            <Stack gap={4}>
              <Title order={3}>{selectedEntry.name}</Title>
              {selectedEntry.leagueName && (
                <Text size="sm" c="dimmed">{selectedEntry.leagueName}</Text>
              )}
            </Stack>
            {feed?.generated && (
              <Text size="xs" c="dimmed">
                Updated {new Date(feed.generated).toLocaleDateString('en-GB')}
              </Text>
            )}
          </Group>

          <Group gap="sm" wrap="wrap">
            <Button
              component="a"
              href={teamCalendarUrl(selectedEntry.league, selectedEntry.slug)}
              download
              leftSection={<IconDownload size={18} />}
              color="green.6"
              radius="xl"
              flex="1 0 auto"
            >
              Download .ics
            </Button>
            <Button
              component="a"
              href={googleCalendarSubscribeUrl(selectedEntry.league, selectedEntry.slug)}
              target="_blank"
              rel="noopener noreferrer"
              leftSection={<IconBrandGoogle size={18} />}
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
              Add to Google Calendar
            </Button>
            <Button
              onClick={copyUrl}
              leftSection={copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
              variant="outline"
              color={copied ? 'teal' : 'green.6'}
              radius="xl"
              flex="1 0 auto"
            >
              Copy feed URL
            </Button>
            <Menu shadow="md" width={200} opened={shareOpen} onChange={setShareOpen}>
              <Menu.Target>
                <Button
                  onClick={shareUrl}
                  leftSection={<IconShare size={18} />}
                  variant="outline"
                  color="blue.6"
                  radius="xl"
                  flex="1 0 auto"
                >
                  Share
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconBrandWhatsapp size={16} />}
                  component="a"
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Follow ${selectedEntry?.name} fixtures — subscribe to their calendar feed on TouchlineHQ: ${window.location.href}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconBrandTwitter size={16} />}
                  component="a"
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Follow ${selectedEntry?.name} fixtures — subscribe to their calendar feed on TouchlineHQ`)}&url=${encodeURIComponent(window.location.href)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Twitter / X
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconBrandFacebook size={16} />}
                  component="a"
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Facebook
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconMail size={16} />}
                  component="a"
                  href={`mailto:?subject=${encodeURIComponent(`Follow ${selectedEntry?.name} fixtures`)}&body=${encodeURIComponent(`Check out ${selectedEntry?.name} fixtures on TouchlineHQ:\n${window.location.href}`)}`}
                >
                  Email
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  leftSection={copiedShare ? <IconCheck size={16} /> : <IconLink size={16} />}
                  onClick={async () => {
                    const ok = await copyTextToClipboard(window.location.href);
                    setCopiedShare(ok);
                    if (ok) window.setTimeout(() => setCopiedShare(false), 2000);
                  }}
                >
                  {copiedShare ? 'Copied!' : 'Copy link'}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>

          {copyFailed && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" title="Copy failed">
              Couldn't access your clipboard — please select and copy the URL below manually.
            </Alert>
          )}

          <Stack gap="xs">
            <Group gap="xs">
              <IconCalendarPlus size={16} color="var(--mantine-color-green-6)" />
              <Text fw={600} size="sm">Next fixtures</Text>
            </Group>
            {(teamRestricted || nextFixtures.some(isRowRestricted)) && (
              <Alert icon={<IconShieldLock size={16} />} color="blue" title="Under-11 and below">
                {RESTRICTED_RESULTS_NOTICE}
              </Alert>
            )}
            {nextFixtures.length === 0 ? (
              <Text size="sm" c="dimmed">No upcoming fixtures published yet.</Text>
            ) : (
              nextFixtures.map(f => {
                const restricted = teamRestricted || isRowRestricted(f);
                const isHome = f.home_team === (feed?.team ?? selectedEntry.name);
                return (
                  <Paper key={f.id} p="sm" withBorder radius="md">
                    <Group justify="space-between" wrap="wrap" gap="xs" mb={4}>
                      <Badge variant="light" size="xs">{f.division}</Badge>
                      <Text size="xs" c="dimmed">{formatDate(f.date)} · {f.time}</Text>
                    </Group>
                    <Text fw={700} size="sm" ta="center">
                      {restricted
                        ? `${selectedEntry.name} vs ${OPPONENT_LABEL}`
                        : `${f.home_team} vs ${f.away_team}`}
                    </Text>
                    <Text size="xs" c="dimmed" ta="center">
                      {restricted
                        ? `${isHome ? 'Home' : 'Away'} · Opposition and venue not published`
                        : f.venue}
                    </Text>
                  </Paper>
                );
              })
            )}
          </Stack>
        </Stack>
      )}

      {!selectedEntry && !loadingTeams && !error && (
        <Alert icon={<IconSearch size={16} />} color="blue" title="Find your team">
          Search for your team above, then download the calendar file or subscribe to get every fixture added automatically to Google Calendar, Apple Calendar or Outlook.
        </Alert>
      )}
    </Stack>
  );
}
