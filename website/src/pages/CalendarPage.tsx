import {
  Box, Container, Stack, Title, Text, Paper, SimpleGrid, ThemeIcon, Anchor, Image, Group,
} from '@mantine/core';
import { IconBrandGoogle, IconBrandApple, IconBrandWindows, IconCalendarPlus } from '@tabler/icons-react';
import { Helmet } from 'react-helmet-async';
import { TeamCalendarSearch } from '../components/TeamCalendarSearch';

const subscribeGuides = [
  {
    icon: <IconBrandGoogle size={24} />,
    title: 'Google Calendar',
    steps: [
      'Use the "Add to Google Calendar" button for one-click setup',
      'Or open Google Calendar, click + next to "Other calendars"',
      'Choose "From URL" and paste the feed link',
    ],
  },
  {
    icon: <IconBrandApple size={24} />,
    title: 'Apple Calendar',
    steps: [
      'Copy the feed URL using the "Copy feed URL" button',
      'On Mac: File → New Calendar Subscription',
      'On iPhone/iPad: Calendar → Accounts → Add Subscribed Calendar',
    ],
  },
  {
    icon: <IconBrandWindows size={24} />,
    title: 'Outlook',
    steps: [
      'Copy the feed URL using the "Copy feed URL" button',
      'Go to Calendar → Add calendar',
      'Choose "Subscribe from web" and paste the link',
    ],
  },
];

export const CalendarPage = () => {
  return (
    <Stack
      flex={1}
      h="100%"
      gap={0}
      style={{
        background: 'linear-gradient(135deg, #f7fdf9 0%, #e6f9ee 100%)',
      }}
    >
      <Helmet>
        <title>Team Fixture Calendars — touchlineHQ</title>
        <meta name="description" content="Subscribe to your grassroots football team's fixture calendar. Free live feeds for Google Calendar, Apple Calendar, and Outlook — updated automatically all season." />
        <link rel="canonical" href="https://touchlinehq.co.uk/calendar" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Team Fixture Calendars — touchlineHQ" />
        <meta property="og:description" content="Subscribe to your grassroots football team's fixture calendar. Free live feeds for Google Calendar, Apple Calendar, and Outlook — updated automatically all season." />
        <meta property="og:url" content="https://touchlinehq.co.uk/calendar" />
        <meta property="og:image" content="https://touchlinehq.co.uk/images/logo.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Team Fixture Calendars — touchlineHQ" />
        <meta name="twitter:description" content="Subscribe to your grassroots football team's fixture calendar. Free live feeds for Google Calendar, Apple Calendar, and Outlook — updated automatically all season." />
        <meta name="twitter:image" content="https://touchlinehq.co.uk/images/logo.png" />
      </Helmet>
      <Box py="xl">
        <Container size="lg">
          <Stack gap="xl">
            <Box ta="center">
              <Stack gap="xs" mb="md">
                <Group justify="center">
                  <Image src={`${import.meta.env.BASE_URL}images/logo.png`} alt="TouchlineHQ logo" h={50} w="auto" />
                </Group>
                <Stack gap={2}>
                  <Text size="sm" fw={600} c="green.8" tt="uppercase" ta="center">Fixture Calendars</Text>
                  <Title order={1} ta="center">Your team's fixtures, in your calendar</Title>
                </Stack>
              </Stack>
              <Text size="lg" c="dimmed" ta="center" maw={800} mx="auto">
                Search for your team and subscribe to a live calendar feed. Every fixture is added automatically and kept up to date all season — free for every club and team.
              </Text>
            </Box>
          </Stack>
        </Container>
      </Box>

      <Box flex={1} py="xl">
        <Container size="lg" h="100%">
          <Stack gap="xl">
            <Paper p="xl" radius="lg" withBorder style={{ borderColor: 'var(--mantine-color-gray-2)', background: 'white' }}>
              <TeamCalendarSearch />
            </Paper>

            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
              {subscribeGuides.map(guide => (
                <Paper key={guide.title} p="lg" radius="lg" withBorder style={{ borderColor: 'var(--mantine-color-gray-2)', background: 'white' }} h="100%">
                  <Stack gap="md">
                    <Group gap="sm">
                      <ThemeIcon size={44} radius="lg" variant="light" color="green.5">
                        {guide.icon}
                      </ThemeIcon>
                      <Text fw={600}>{guide.title}</Text>
                    </Group>
                    <Stack gap={6}>
                      {guide.steps.map((step, i) => (
                        <Text key={i} size="sm" c="dimmed">
                          <Text component="span" fw={600} c="green.7">{i + 1}. </Text>
                          {step}
                        </Text>
                      ))}
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>

            <Text component="div" size="sm" c="dimmed" ta="center">
              Data sourced from FA Full-Time via{' '}
              <Anchor href="https://github.com/touchlineHQ/fulltimeFeeds" target="_blank" rel="noopener noreferrer">
                fulltimeFeeds
              </Anchor>
              . Feeds refresh automatically — subscribe once and your calendar stays current all season.
              <Group gap={6} justify="center" mt={4}>
                <IconCalendarPlus size={14} color="var(--mantine-color-green-6)" />
                <Text size="sm" c="dimmed">Free forever for grassroots clubs</Text>
              </Group>
            </Text>
          </Stack>
        </Container>
      </Box>
    </Stack>
  );
}
