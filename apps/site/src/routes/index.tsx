import {
  Box,
  Code,
  Container,
  Heading,
  HStack,
  Icon,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import { createFileRoute, Link as RouterLink } from "@tanstack/react-router";
import type { IconType } from "react-icons";
import { LuDownload, LuLaptop, LuSettings2, LuShieldCheck, LuTerminal } from "react-icons/lu";

import { Card } from "@my-app/ui/card";
import { LinkButton } from "@my-app/ui/link-button";
import { ScrollArea } from "@my-app/ui/scroll-area";

import { Screenshot } from "@/components/Screenshot";
import { APP_NAME, GITHUB_REPO_URL } from "@/site-config";

export const Route = createFileRoute("/")({
  component: Home,
});

// The template's example app. Say what the real app does here.
const FEATURES: { icon: IconType; title: string; body: string }[] = [
  {
    icon: LuShieldCheck,
    title: "Safe on every system",
    body: "Characters Windows, macOS or Linux refuse are dropped, and names Windows reserves are guarded, so every name can be saved anywhere.",
  },
  {
    icon: LuSettings2,
    title: "Named your way",
    body: "Keep the case or change it, keep spaces or turn them into dashes or underscores, and cut long names short.",
  },
  {
    icon: LuLaptop,
    title: "Windows, macOS and Linux",
    body: "One small desktop app for each, which updates itself when a new version is released.",
  },
];

function Home() {
  return (
    <>
      <Container maxW="6xl" pt={{ base: 12, md: 20 }} pb={{ base: 10, md: 16 }}>
        <Stack gap={6} align="center" textAlign="center" maxW="3xl" mx="auto">
          <Heading as="h1" size={{ base: "4xl", md: "6xl" }} letterSpacing="tight">
            Safe file names, from any list
          </Heading>
          <Text fontSize={{ base: "lg", md: "xl" }} color="fg.muted">
            Type or paste a list, one name a line, and {APP_NAME} makes each a file name every
            system accepts. A desktop app for Windows, macOS and Linux, and a command line tool.
          </Text>
          <HStack gap={3} wrap="wrap" justify="center">
            <LinkButton asChild size="lg">
              <RouterLink to="/download">
                <LuDownload /> Download
              </RouterLink>
            </LinkButton>
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

      <Container maxW="5xl">
        <Screenshot />
      </Container>

      <Container maxW="6xl" py={{ base: 14, md: 20 }}>
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

      <Container maxW="4xl">
        <Card
          size={{ base: "md", md: "lg" }}
          title={
            <>
              <Icon as={LuTerminal} boxSize={6} color="emerald.fg" aria-hidden />
              From the command line
            </>
          }
          titleProps={{ as: "h2", display: "flex", alignItems: "center", gap: 3 }}
          description={
            <>
              <Code>my-app</Code> does what the app does, and reads the same settings.
            </>
          }
          bodyProps={{ gap: 4 }}
        >
          {/* A line too long for a phone scrolls sideways. */}
          <ScrollArea
            orientation="horizontal"
            label="Command line examples"
            rounded="md"
            bg="bg.muted"
          >
            <Box as="pre" p={4} fontSize="sm">
              <code>
                {[
                  "my-app names.txt                   # a file, one name a line",
                  'echo "Quarterly Report" | my-app -  # standard input',
                ].join("\n")}
              </code>
            </Box>
          </ScrollArea>
        </Card>
      </Container>
    </>
  );
}
