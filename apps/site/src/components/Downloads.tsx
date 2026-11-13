import { Container, Heading, Stack, Text } from "@chakra-ui/react";

import { DownloadPanel } from "@/components/DownloadPanel";
import type { Release } from "@/downloads/github";
import { useLatestRelease, useVisitorPlatform } from "@/downloads/hooks";

export interface DownloadsProps {
  /** The latest release when the site was built, if GitHub answered: shown at once, before the
   * page asks GitHub again. */
  built?: Release | null;
}

/** The download page's content. An island: it asks GitHub for the latest release, and the
 * browser what system it's on. */
export function Downloads({ built = null }: DownloadsProps) {
  const state = useLatestRelease(built);
  const { os, arch } = useVisitorPlatform();

  return (
    <Container maxW="4xl" py={{ base: 10, md: 16 }}>
      <Stack gap={8}>
        <Stack gap={2}>
          <Heading as="h1" size="3xl">
            Download
          </Heading>
          <Text color="fg.muted" fontSize="lg">
            The desktop app for Windows, macOS and Linux. It checks for new versions when it starts
            and offers to update itself.
          </Text>
        </Stack>
        <DownloadPanel state={state} os={os} arch={arch} />
      </Stack>
    </Container>
  );
}
