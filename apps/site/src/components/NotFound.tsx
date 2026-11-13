import { Container, Heading, Stack, Text } from "@chakra-ui/react";

import { LinkButton } from "@my-app/ui/link-button";
import { link } from "@/links";

/** Any address the site has no page for: `src/pages/404.astro`, built as `404.html`, which the
 * Worker serves for every such address, with a 404 status. */
export function NotFound() {
  return (
    <Container maxW="3xl" py={{ base: 16, md: 24 }}>
      <Stack gap={5} align="center" textAlign="center">
        <Heading as="h1" size="3xl">
          Page not found
        </Heading>
        <Text color="fg.muted" fontSize="lg">
          There's nothing at this address. It may have moved, or the link may be wrong.
        </Text>
        <LinkButton href={link("/")}>Go to the home page</LinkButton>
      </Stack>
    </Container>
  );
}
