import { Container, Heading, Stack, Text } from "@chakra-ui/react";
import { Link as RouterLink } from "@tanstack/react-router";

import { LinkButton } from "@my-app/ui/link-button";

/** Any address the site has no page for. Prerendered as `404.html`, which the Worker serves
 * for every such address, with a 404 status. */
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
        <LinkButton asChild>
          <RouterLink to="/">Go to the home page</RouterLink>
        </LinkButton>
      </Stack>
    </Container>
  );
}
