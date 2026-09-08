import {
  Box, Container, Stack, Title, Text, Paper, SimpleGrid, ThemeIcon, Anchor, Image, Group,
} from '@mantine/core';
import {
  IconBrandWhatsapp, IconDeviceMobileMessage, IconMail, IconTrophy,
} from '@tabler/icons-react';
import { Helmet } from 'react-helmet-async';
import { ClubRoundup } from '../components/ClubRoundup';

const DESCRIPTION = "Build a weekly results roundup for your grassroots football club — ready to send over WhatsApp, post to your socials, or email round the parents. Free, updated automatically all season.";

const sendGuides = [
  {
    icon: <IconBrandWhatsapp size={24} />,
    title: 'Team WhatsApp',
    steps: [
      'Pick your club and check the week is right',
      'Tap "WhatsApp" to open your chat list',
      'Or "Copy message" and paste it wherever you like',
    ],
  },
  {
    icon: <IconDeviceMobileMessage size={24} />,
    title: 'Club socials',
    steps: [
      'Switch to the "Socials" tab for a shorter version',
      'Watch the character count — it trims itself to fit X',
      'Copy, then paste into your scheduling tool',
    ],
  },
  {
    icon: <IconMail size={24} />,
    title: 'Parents\' email',
    steps: [
      'Switch to the "Email" tab for a subject and plain-text body',
      'Turn off emoji if your mailing list prefers plain text',
      'Tap "Email" to open it in your mail app',
    ],
  },
];

export const RoundupPage = () => {
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
        <title>Weekly Results Roundup — touchlineHQ</title>
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href="https://touchlinehq.co.uk/roundup" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Weekly Results Roundup — touchlineHQ" />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content="https://touchlinehq.co.uk/roundup" />
        <meta property="og:image" content="https://touchlinehq.co.uk/images/logo.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Weekly Results Roundup — touchlineHQ" />
        <meta name="twitter:description" content={DESCRIPTION} />
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
                  <Text size="sm" fw={600} c="green.8" tt="uppercase" ta="center">Weekly Roundup</Text>
                  <Title order={1} ta="center">Your club's results, ready to send</Title>
                </Stack>
              </Stack>
              <Text size="lg" c="dimmed" ta="center" maw={800} mx="auto">
                Find your club and get every team's result from the weekend written up as a message —
                for the team WhatsApp group, your club socials, or the parents' mailing list.
                Free for every grassroots club.
              </Text>
            </Box>
          </Stack>
        </Container>
      </Box>

      <Box flex={1} py="xl">
        <Container size="lg" h="100%">
          <Stack gap="xl">
            <Paper p="xl" radius="lg" withBorder style={{ borderColor: 'var(--mantine-color-gray-2)', background: 'white' }}>
              <ClubRoundup />
            </Paper>

            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
              {sendGuides.map(guide => (
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
              Results sourced from FA Full-Time via{' '}
              <Anchor href="https://github.com/touchlineHQ/fulltimeFeeds" target="_blank" rel="noopener noreferrer">
                fulltimeFeeds
              </Anchor>
              . Feeds refresh daily, so each week's roundup is ready the morning after the games.
              <Group gap={6} justify="center" mt={4}>
                <IconTrophy size={14} color="var(--mantine-color-green-6)" />
                <Text size="sm" c="dimmed">Free forever for grassroots clubs</Text>
              </Group>
            </Text>
          </Stack>
        </Container>
      </Box>
    </Stack>
  );
}
