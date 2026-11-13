import { Box, Container, HStack, IconButton, Image, Link } from "@chakra-ui/react";
import { LuGithub } from "react-icons/lu";

import { ColorModeButton } from "@my-app/ui/color-mode";

import { APP_NAME, GITHUB_REPO_URL, PAGES, type SitePath } from "@/site-config";

export interface HeaderProps {
  /** The page it's on, which the navigation marks. */
  current?: SitePath;
}

/** The site's header: its name, its pages, and the colour mode. An island on every page, for the
 * colour mode button. */
export function Header({ current }: HeaderProps) {
  return (
    <Box
      as="header"
      position="sticky"
      top={0}
      zIndex="sticky"
      borderBottomWidth="1px"
      bg="bg/80"
      backdropFilter="blur(12px)"
    >
      <Container maxW="6xl" py={3}>
        <HStack justify="space-between" gap={4}>
          <Link href="/" fontWeight="semibold" color="fg" textDecoration="none" gap={2}>
            {/* The app's icon at 256px, sharp at this size on any screen. */}
            <Image src="/apple-touch-icon.png" alt="" boxSize={7} />
            <Box as="span" display={{ base: "none", sm: "inline" }}>
              {APP_NAME}
            </Box>
          </Link>

          <HStack as="nav" aria-label="Main" gap={{ base: 3, sm: 5 }} fontSize="sm">
            {PAGES.map(({ path, label }) => (
              <Link
                key={path}
                href={path}
                aria-current={path === current ? "page" : undefined}
                color="fg.muted"
                _hover={{ color: "fg" }}
                _currentPage={{ fontWeight: "semibold" }}
              >
                {label}
              </Link>
            ))}
            <HStack gap={1}>
              <IconButton asChild variant="ghost" size="sm" aria-label="Source code on GitHub">
                <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">
                  <LuGithub />
                </a>
              </IconButton>
              <ColorModeButton />
            </HStack>
          </HStack>
        </HStack>
      </Container>
    </Box>
  );
}
