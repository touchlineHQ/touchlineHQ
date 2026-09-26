import { Title, Text, Button, Group, SimpleGrid, Paper, ThemeIcon, Stack, Container, Anchor, List, Box, Flex, Badge, Image } from '@mantine/core';
import { IconCheck, IconBrandGithub, IconCalendar, IconCode, IconMail, IconBrandGoogle, IconCloud, IconDeviceDesktop, IconUsers, IconShield, IconCreditCard, IconBrandOpenSource, IconCalendarPlus, IconLayoutKanban } from '@tabler/icons-react';
import { useMediaQuery } from '@mantine/hooks';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import type { AppData } from '../types';
import { DemoSearch } from '../components/DemoSearch';
import { TreasurerTool } from '../components/TreasurerTool';

interface Props { data: AppData }

export const HomePage = ({ data }: Props) => {
  const { club, features, repos, contact, clubFeed } = data;
  const isLarge = useMediaQuery('(min-width: 768px)');
  const isSmall = useMediaQuery('(min-width: 480px)');

  return (
    <Stack gap={0}>
      <Helmet>
        <title>{data.club.name}</title>
        <meta name="description" content={`Custom website for ${data.club.name} with live fixtures, results, and team calendars. Powered by touchlineHQ.`} />
        <link rel="canonical" href={`https://${data.club.domain}/`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${data.club.name} — touchlineHQ`} />
        <meta property="og:description" content={`Custom website for ${data.club.name} with live fixtures, results, and team calendars. Powered by touchlineHQ.`} />
        <meta property="og:url" content={`https://${data.club.domain}/`} />
        <meta property="og:image" content={`https://${data.club.domain}/images/logo.png`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${data.club.name} — touchlineHQ`} />
        <meta name="twitter:description" content={`Custom website for ${data.club.name} with live fixtures, results, and team calendars. Powered by touchlineHQ.`} />
        <meta name="twitter:image" content={`https://${data.club.domain}/images/logo.png`} />
      </Helmet>
      {/* Hero Section */}
      <Box 
        style={{
          height: isLarge ? '100vh' : 'auto',
          background: 'linear-gradient(135deg, #f7fdf9 0%, #e6f9ee 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container size="xl" py="xxl" style={{ height: '100%', position: 'relative', zIndex: 2 }}>
          <Flex 
            align="center" 
            justify="center"
            direction={{ base: 'column', md: 'row' }}
            wrap="wrap" 
            gap="xxl"
            style={{ 
              height: '100%',
            }}
          >
            <Stack gap="xl" style={{ flex: 1, minWidth: 300, maxWidth: 600 }}>
              <div>
                <Title 
                  order={1} 
                  size="3.5rem"
                  lh={1.1} 
                  mb="md"
                >
                  {club.hero.title}
                </Title>
                <Text size="xl" c="dimmed" mb="xl">
                  {club.hero.subtitle}
                </Text>
              </div>
              <Group>
                <Button 
                  component="a" 
                  href={`mailto:${contact.email}?subject=Book%20a%20TouchlineHQ%20Demo`}
                  leftSection={<IconCalendar size={20} />}
                  size="lg"
                  radius="xl"
                  color="green.6"
                  className="hero-btn-full"
                >
                  {club.hero.cta}
                </Button>
                <Button 
                  component="a" 
                  href="https://clubs.touchlinehq.co.uk/demo/"
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outline"
                  leftSection={<IconDeviceDesktop size={20} />}
                  size="lg"
                  radius="xl"
                  color="green.6"
                  className="hero-btn-full"
                >
                  View Sample Club
                </Button>
              </Group>
              <Group gap="xl" mt="xl">
                <Stack gap={4}>
                   <Text fw={700} size="lg">100%</Text>
                  <Text size="sm" c="dimmed">Customisable</Text>
                </Stack>
                <Stack gap={4}>
                   <Text fw={700} size="lg">Live</Text>
                  <Text size="sm" c="dimmed">Fixtures & Results</Text>
                </Stack>
                <Stack gap={4}>
                   <Text fw={700} size="lg">GDPR</Text>
                  <Text size="sm" c="dimmed">Compliant</Text>
                </Stack>
              </Group>
            </Stack>
            <Box style={{ flex: 1, minWidth: 280, position: 'relative' }}>
              {isSmall && (
                <Box style={{ position: 'absolute', top: '-60px', right: '20px', zIndex: 4 }}>
                  <Image src={`${import.meta.env.BASE_URL}images/logo.png`} alt={`${club.name} logo`} h={140} w="auto" />
                </Box>
              )}
              <Box
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #f7fdf9 100%)',
                  borderRadius: '2rem',
                  padding: '1.5rem',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08)',
                  border: '1px solid #e2e8f0',
                  transform: 'rotate(3deg)',
                }}
              >
                <Stack gap="md">
                  <Group>
                    <IconDeviceDesktop size={32} color="var(--mantine-color-green-6)" />
                    <Title order={3}>Club Dashboard</Title>
                  </Group>
                  <Text c="dimmed">
                    Modern club website with team management, fixtures, results, and player profiles.
                  </Text>
                  <Group gap="xs" wrap="wrap">
                    <Badge variant="light" size="lg" radius="xl" fw={500} leftSection={<IconUsers size={12} />} styles={{ label: { textTransform: 'none' }}}>Teams</Badge>
                    <Badge variant="light" size="lg" radius="xl" fw={500} leftSection={<IconUsers size={12} />} styles={{ label: { textTransform: 'none' }}}>Fixtures</Badge>
                    <Badge variant="light" size="lg" radius="xl" fw={500} leftSection={<IconUsers size={12} />} styles={{ label: { textTransform: 'none' }}}>Cloud Hosted</Badge>
                  </Group>
                </Stack>
              </Box>
              <Box
                className="hidden-mobile"
                style={{
                  position: 'absolute',
                  top: '40%',
                  left: '-10%',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f7fdf9 100%)',
                  borderRadius: '1.5rem',
                  padding: '1.5rem',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
                  border: '1px solid #e2e8f0',
                  transform: 'rotate(-5deg)',
                  width: '70%',
                  zIndex: -1,
                }}
              >
                <Stack gap="sm">
                  <Group>
                    <IconBrandGoogle size={24} color="var(--mantine-color-green-6)" />
                    <Text fw={600}>Google Calendar Sync</Text>
                  </Group>
                  <Text size="sm" c="dimmed">
                    Automatic fixture sync with Google Calendar.
                  </Text>
                </Stack>
              </Box>
            </Box>
          </Flex>
        </Container>
        <Box
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(34, 197, 94, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(34, 197, 94, 0.01) 0%, transparent 50%)',
            zIndex: 1,
          }}
        />
      </Box>

      <Box id="features" py="xl" style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #f7fdf9 100%)', borderRadius: 'lg' }}>
        <Container size="lg">
          <Stack gap="xl">
            <div>
               <Group justify="center" gap="md" mb="md">
                 <Image src={`${import.meta.env.BASE_URL}images/logo.png`} alt={`${club.name} logo`} h={50} w="auto" />
                 <div>
                   <Text size="sm" fw={600} c="green.8" tt="uppercase" ta="center">Platform Features</Text>
                   <Title order={2} ta="center">Built for Grassroots Clubs</Title>
                 </div>
               </Group>
              <Text size="lg" c="dimmed" ta="center" maw={800} mx="auto">
                Everything your club needs to manage teams, fixtures, and communications—all in one secure platform.
              </Text>
            </div>
             <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
              {features.map((feature, i) => (
                 <Paper 
                   key={i} 
                   p="xl" 
                   radius="lg" 
                   withBorder
                   style={{ borderColor: 'var(--mantine-color-gray-2)', background: 'white' }}
                   h="100%"
                 >
                  <Stack gap="md">
                    <Group>
                       <ThemeIcon size={48} radius="lg" variant="light" color="green.5">
                         {i === 0 && <IconUsers size={24} />}
                         {i === 1 && <IconCalendar size={24} />}
                         {i === 2 && <IconDeviceDesktop size={24} />}
                         {i === 3 && <IconShield size={24} />}
                         {i === 4 && <IconCreditCard size={24} />}
                         {i === 5 && <IconBrandOpenSource size={24} />}
                       </ThemeIcon>
                      <Title order={3} size="h4">{feature.title}</Title>
                    </Group>
                    <Text c="dimmed">{feature.description}</Text>
                    <List spacing="xs" size="sm">
                      {feature.details.map((detail, idx) => (
                          <List.Item key={idx} icon={<IconCheck size={14} color="var(--mantine-color-green-5)" />}>
                          {detail}
                        </List.Item>
                      ))}
                    </List>
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      <Box id="treasurer" py="xl" style={{ background: 'linear-gradient(135deg, #1a2332 0%, #273347 100%)', borderRadius: 'lg' }}>
        <Container size="lg">
          <Stack gap="xl">
            <div>
              <Group justify="center" gap="md" mb="md">
                <Image src={`${import.meta.env.BASE_URL}images/logo.png`} alt={`${club.name} logo`} h={50} w="auto" />
                <div>
                  <Text size="sm" fw={600} c="green.8" tt="uppercase" ta="center">Financial Tools</Text>
                  <Title order={2} ta="center" c="white">Traceable Payments for Treasurers</Title>
                </div>
              </Group>
              <Text size="lg" c="gray.4" ta="center" maw={800} mx="auto">
                Generate payment links with FAN references for instant bank reconciliation—no personal data stored.
              </Text>
            </div>
            <TreasurerTool />
          </Stack>
        </Container>
      </Box>

      <Box id="demo" py="xl" style={{ background: 'linear-gradient(135deg, #f7fdf9 0%, #e6f9ee 100%)', borderRadius: 'lg' }}>
        <Container size="lg">
          <Stack gap="xl">
            <Group justify="center" gap="md" mb="md">
              <Image src={`${import.meta.env.BASE_URL}images/logo.png`} alt={`${club.name} logo`} h={50} w="auto" />
              <div>
                <Text size="sm" fw={600} c="green.8" tt="uppercase" ta="center">Live Demo</Text>
                <Title order={2} ta="center">See it in action</Title>
              </div>
            </Group>
            <Text size="lg" c="dimmed" ta="center" maw={800} mx="auto">
              View our sample club site or search for any grassroots football club to see live fixtures, results, and recent form powered by our real-time data integration.
            </Text>
            <Group justify="center" gap="md" wrap="wrap">
              <Button
                component="a"
                href="https://clubs.touchlinehq.co.uk/demo/"
                target="_blank"
                rel="noopener noreferrer"
                variant="outline"
                leftSection={<IconDeviceDesktop size={20} />}
                size="lg"
                radius="xl"
                color="green.6"
                className="hero-btn-full"
              >
                View Sample Club
              </Button>
              <Button
                component={Link}
                to="/calendar"
                variant="filled"
                leftSection={<IconCalendarPlus size={20} />}
                size="lg"
                radius="xl"
                color="green.6"
                className="hero-btn-full"
              >
                Get your team's calendar
              </Button>
            </Group>
            <Paper p="xl" radius="lg" withBorder style={{ borderColor: 'var(--mantine-color-gray-2)', background: 'white' }}>
              <Stack gap="lg">
                <DemoSearch />
                {clubFeed && (
                  <Text size="sm" c="dimmed" ta="center">
                    Showing data for <strong>{clubFeed.club}</strong>. Last updated: {new Date(clubFeed.generated).toLocaleDateString('en-GB')}
                  </Text>
                )}
              </Stack>
            </Paper>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" mt="xl">
               <Paper p="md" radius="lg" withBorder style={{ borderColor: 'var(--mantine-color-gray-2)', background: 'white' }}>
                <Stack gap="xs" align="center">
                  <ThemeIcon size={48} radius="lg" variant="light" color="green.5">
                    <IconCalendar size={24} />
                  </ThemeIcon>
                  <Text fw={600} ta="center">Live Fixtures</Text>
                  <Text size="sm" c="dimmed" ta="center">Automatic updates from FA Full-Time</Text>
                </Stack>
              </Paper>
               <Paper p="md" radius="lg" withBorder style={{ borderColor: 'var(--mantine-color-gray-2)', background: 'white' }}>
                <Stack gap="xs" align="center">
                  <ThemeIcon size={48} radius="lg" variant="light" color="green.5">
                    <IconUsers size={24} />
                  </ThemeIcon>
                  <Text fw={600} ta="center">Multi‑Team Support</Text>
                  <Text size="sm" c="dimmed" ta="center">Manage all club teams in one place</Text>
                </Stack>
              </Paper>
               <Paper p="md" radius="lg" withBorder style={{ borderColor: 'var(--mantine-color-gray-2)', background: 'white' }}>
                <Stack gap="xs" align="center">
                  <ThemeIcon size={48} radius="lg" variant="light" color="green.5">
                    <IconBrandGoogle size={24} />
                  </ThemeIcon>
                  <Text fw={600} ta="center">Calendar Sync</Text>
                  <Text size="sm" c="dimmed" ta="center">Google Calendar & iCal integration</Text>
                </Stack>
              </Paper>
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      <Box id="opensource" py="xl" style={{ background: 'transparent', borderRadius: 'lg' }}>
        <Container size="lg">
          <Stack gap="xl">
            <div>
               <Group justify="center" gap="md" mb="md">
                 <Image src={`${import.meta.env.BASE_URL}images/logo.png`} alt={`${club.name} logo`} h={50} w="auto" />
                 <div>
                   <Text size="sm" fw={600} c="green.8" tt="uppercase" ta="center">Open Source</Text>
                   <Title order={2} ta="center">Built on transparent foundations</Title>
                 </div>
               </Group>
              <Text size="lg" c="dimmed" ta="center" maw={800} mx="auto">
                Our platform is built on open-source projects that you can inspect, contribute to, and even self-host.
              </Text>
            </div>
            <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="lg">
              {repos.map((repo, i) => (
                <Paper 
                  key={i} 
                  p="xl" 
                  radius="lg" 
                  withBorder
                  styles={{
                    root: {
                      borderColor: 'var(--mantine-color-gray-2)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 'var(--mantine-shadow-lg)',
                      }
                    }
                  }}
                >
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Group>
                       <ThemeIcon size={48} radius="lg" variant="light" color="green.5">
                          {repo.url.includes('/projects/') ? <IconLayoutKanban size={24} /> : <IconBrandGithub size={24} />}
                        </ThemeIcon>
                        <Title order={3} size="h4">{repo.name}</Title>
                      </Group>
                    </Group>
                    <Text c="dimmed">{repo.description}</Text>
                    <List spacing="xs" size="sm">
                      {repo.features.map((feature, idx) => (
                        <List.Item key={idx} icon={<IconCode size={14} color="var(--mantine-color-green-6)" />}>
                          {feature}
                        </List.Item>
                      ))}
                    </List>
                    <Button 
                      component="a" 
                      href={repo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="outline"
                      color="green.6"
                      fullWidth
                      mt="sm"
                      radius="lg"
                    >
                      {repo.url.includes('/projects/') ? 'View public board' : 'View on GitHub'}
                    </Button>
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      <Box id="contact" py="xl" style={{ background: 'linear-gradient(135deg, #1a2332 0%, #273347 100%)', borderRadius: 'lg' }}>
        <Container size="lg">
          <Stack gap="xl" align="center">
            <div>
              <Text size="sm" fw={600} c="green.5" tt="uppercase" ta="center" mb="xs">Contact</Text>
              <Title order={2} ta="center" mb="md" c="white">Ready to get started?</Title>
              <Text size="lg" c="gray.4" ta="center" maw={800} mx="auto">
                Get in touch to discuss how touchlineHQ can transform your club's online presence.
              </Text>
            </div>
            <Paper p="xl" radius="lg" style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
              <Stack gap="lg" align="center">
                <Text size="xl" ta="center" c="white">{contact.message}</Text>
                <Button 
                  component="a" 
                  href={`mailto:${contact.email}`}
                  leftSection={<IconMail size={24} />}
                  size="lg"
                  radius="xl"
                  color="green.6"
                  variant="filled"
                  justify="center"
                  style={{ display: 'flex', alignItems: 'center' }}
                >
                  <Box visibleFrom="sm">{contact.email}</Box>
                </Button>
                <Group gap="lg" mt="md">
                  {contact.social.github && (
                    <Anchor href={contact.social.github} target="_blank" rel="noopener noreferrer" c="gray.3" size="md" underline="never">
                      GitHub
                    </Anchor>
                  )}
                  <Anchor href="https://github.com/orgs/touchlineHQ/projects/1" target="_blank" rel="noopener noreferrer" c="gray.3" size="md" underline="never">
                    Roadmap
                  </Anchor>
                  {contact.social.twitter && contact.social.twitter !== '#' && (
                    <Anchor href={contact.social.twitter} target="_blank" c="gray.3" size="md" underline="never">
                      Twitter
                    </Anchor>
                  )}
                  {contact.social.linkedin && contact.social.linkedin !== '#' && (
                    <Anchor href={contact.social.linkedin} target="_blank" c="gray.3" size="md" underline="never">
                      LinkedIn
                    </Anchor>
                  )}
                </Group>
              </Stack>
            </Paper>
             <Stack gap="xs" align="center">
               <Group gap="md">
                 <Image src={`${import.meta.env.BASE_URL}images/logo.png`} alt={`${club.name} logo`} h={40} w="auto" />
                 <Text size="sm" c="gray.4">touchlinehq.co.uk</Text>
                 <Badge color="green" variant="light" size="sm">Made in the UK</Badge>
               </Group>
               <Text size="sm" c="gray.5">
                 © {new Date().getFullYear()} touchlineHQ. All rights reserved.
               </Text>
             </Stack>
          </Stack>
        </Container>
      </Box>
    </Stack>
  );
}
