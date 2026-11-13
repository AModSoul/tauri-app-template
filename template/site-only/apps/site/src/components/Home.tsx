import { Container, Heading, HStack, Icon, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import type { IconType } from "react-icons";
import { LuFileCode, LuLayers, LuZap } from "react-icons/lu";

import { Card } from "@my-app/ui/card";
import { LinkButton } from "@my-app/ui/link-button";

import { APP_NAME, GITHUB_REPO_URL } from "@/site-config";

// The template's example. Say what the site is about here.
const FEATURES: { icon: IconType; title: string; body: string }[] = [
  {
    icon: LuZap,
    title: "Static and fast",
    body: "Every page is built to plain HTML ahead of time, and sends no JavaScript unless a part of it needs to run in the browser.",
  },
  {
    icon: LuLayers,
    title: "One design",
    body: "Pages are made of the shared Chakra components, in the shared theme, light and dark.",
  },
  {
    icon: LuFileCode,
    title: "Code where it's needed",
    body: "A Cloudflare Worker serves the pages, and answers routes of your own under /api.",
  },
];

/** The home page's content, rendered to HTML when the site is built, with no JavaScript. */
export function Home() {
  return (
    <>
      <Container maxW="6xl" pt={{ base: 12, md: 20 }} pb={{ base: 10, md: 16 }}>
        <Stack gap={6} align="center" textAlign="center" maxW="3xl" mx="auto">
          <Heading as="h1" size={{ base: "4xl", md: "6xl" }} letterSpacing="tight">
            {APP_NAME}
          </Heading>
          <Text fontSize={{ base: "lg", md: "xl" }} color="fg.muted">
            A site built with Astro and the shared Chakra components, served by a Cloudflare Worker.
          </Text>
          <HStack gap={3} wrap="wrap" justify="center">
            <LinkButton
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noreferrer"
              variant="outline"
              size="lg"
            >
              View on GitHub
            </LinkButton>
          </HStack>
        </Stack>
      </Container>

      <Container maxW="6xl" pb={{ base: 14, md: 20 }}>
        <SimpleGrid columns={{ base: 1, md: 3 }} gap={6}>
          {FEATURES.map(({ icon, title, body }) => (
            <Card
              key={title}
              variant="subtle"
              icon={<Icon as={icon} boxSize={6} color="emerald.fg" aria-hidden />}
              title={title}
              titleProps={{ as: "h2" }}
              description={body}
            />
          ))}
        </SimpleGrid>
      </Container>
    </>
  );
}
