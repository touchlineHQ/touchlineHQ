import { AppShell, Group, Text, ActionIcon, Button, Burger, Drawer, Stack, Box, Image } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconBrandGithub, IconBrandTwitter, IconBrandLinkedin, IconHome, IconCalendar, IconMail, IconTrophy } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { Club } from '../types';

interface Props {
  club: Club;
}

interface NavItem {
  label: string;
  icon: ReactNode;
  to: string;
}

export const SiteHeader = ({ club }: Props) => {
  const [opened, { toggle, close }] = useDisclosure(false);

  const navItems: NavItem[] = [
    { to: '/', label: 'Home', icon: <IconHome size={18} /> },
    { to: '/calendar', label: 'Team Calendars', icon: <IconCalendar size={18} /> },
    { to: '/roundup', label: 'Weekly Roundup', icon: <IconTrophy size={18} /> },
  ];

  const handleNavClick = () => {
    window.scrollTo(0, 0);
    close();
  };

  const renderNavItem = (item: NavItem, mobile: boolean) => {
    const shared = {
      variant: 'subtle' as const,
      leftSection: item.icon,
      size: mobile ? ('lg' as const) : ('compact-sm' as const),
      justify: mobile ? ('start' as const) : undefined,
      fullWidth: mobile || undefined,
    };
    return (
      <Button key={item.label} {...shared} component={Link} to={item.to} onClick={handleNavClick}>
        {item.label}
      </Button>
    );
  };

  return (
    <AppShell.Header>
      <Box h={70}>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
        {/* Logo / Brand */}
        <Group gap="sm" wrap="nowrap">
          <Image src={`${import.meta.env.BASE_URL}images/logoHQ.png`} alt={`${club.name} logo`} h={40} w="auto" />
          <Stack gap={0}>
            <Text
              component={Link}
              to="/"
              fw={700}
              size="lg"
              c="var(--mantine-primary-color-filled)"
              style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}
            >
              {club.name}
            </Text>
            <Text size="xs" c="dimmed" style={{ lineHeight: 1.2 }}>
              {club.tagline}
            </Text>
          </Stack>
        </Group>

        {/* Desktop Navigation Links */}
        <Group gap="md" wrap="nowrap" visibleFrom="md">
          {navItems.map((item) => renderNavItem(item, false))}
        </Group>

        {/* Desktop Social Links & CTA */}
        <Group gap="xs" wrap="nowrap" visibleFrom="md">
          {club.socials.github && club.socials.github !== '#' && (
            <ActionIcon
              component="a"
              href={club.socials.github}
              target="_blank"
              rel="noopener noreferrer"
              variant="subtle"
              aria-label="GitHub"
            >
              <IconBrandGithub size={20} />
            </ActionIcon>
          )}
          {club.socials.twitter && club.socials.twitter !== '#' && (
            <ActionIcon
              component="a"
              href={club.socials.twitter}
              target="_blank"
              rel="noopener noreferrer"
              variant="subtle"
              aria-label="Twitter"
            >
              <IconBrandTwitter size={20} />
            </ActionIcon>
          )}
          {club.socials.linkedin && club.socials.linkedin !== '#' && (
            <ActionIcon
              component="a"
              href={club.socials.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              variant="subtle"
              aria-label="LinkedIn"
            >
              <IconBrandLinkedin size={20} />
            </ActionIcon>
          )}
          <Button
            component="a"
            href={`mailto:${club.email}`}
            variant="light"
            size="compact-sm"
            leftSection={<IconMail size={14} />}
          >
            Get in touch
          </Button>
        </Group>

        {/* Mobile Menu Button */}
        <Burger opened={opened} onClick={toggle} hiddenFrom="md" size="sm" />
        </Group>
      </Box>

      {/* Mobile Menu Drawer */}
      <Drawer
        opened={opened}
        onClose={close}
        title="Menu"
        position="right"
        hiddenFrom="md"
        padding="lg"
        size="sm"
      >
        <Stack gap="md">
          {navItems.map((item) => renderNavItem(item, true))}
          <Stack gap="xs" mt="lg">
            <Text size="sm" fw={600} c="dimmed">Social Links</Text>
            <Group gap="xs">
              {club.socials.github && club.socials.github !== '#' && (
                <ActionIcon
                  component="a"
                  href={club.socials.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="light"
                  size="lg"
                  aria-label="GitHub"
                >
                  <IconBrandGithub size={20} />
                </ActionIcon>
              )}
              {club.socials.twitter && club.socials.twitter !== '#' && (
                <ActionIcon
                  component="a"
                  href={club.socials.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="light"
                  size="lg"
                  aria-label="Twitter"
                >
                  <IconBrandTwitter size={20} />
                </ActionIcon>
              )}
              {club.socials.linkedin && club.socials.linkedin !== '#' && (
                <ActionIcon
                  component="a"
                  href={club.socials.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="light"
                  size="lg"
                  aria-label="LinkedIn"
                >
                  <IconBrandLinkedin size={20} />
                </ActionIcon>
              )}
            </Group>
            <Button
              component="a"
              href={`mailto:${club.email}`}
              variant="filled"
              size="lg"
              leftSection={<IconMail size={18} />}
              fullWidth
              mt="md"
            >
              Get in touch
            </Button>
          </Stack>
        </Stack>
      </Drawer>
    </AppShell.Header>
  );
};
