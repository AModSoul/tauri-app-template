import { Box, Heading, HStack, Image } from "@chakra-ui/react";

import { APP_NAME } from "@/app-config";
import appIcon from "@/assets/app-icon.png";
import { SettingsDrawer } from "@/components/SettingsDrawer";
import { HEADER_BUTTON, HEADER_HEIGHT, headerProps } from "@/layout";
import { ColorModeButton } from "@my-app/ui/color-mode";

/** The app's header: its icon and name, and its buttons. Dialogs and drawers open below it and
 * leave it usable (`layout.ts`, `theme.ts`). */
export function AppHeader() {
  return (
    <HStack
      as="header"
      {...headerProps}
      gap="0"
      align="stretch"
      bg="bg.emphasized"
      shadow="sm"
      h={HEADER_HEIGHT}
      pointerEvents="auto"
    >
      <Heading
        as="h1"
        flex="1"
        display="flex"
        alignItems="center"
        px="4"
        py="0.5"
        // The default heading's line height, with a smaller font, sets the bar's height.
        fontSize="md"
      >
        <HStack gap="2">
          <Image src={appIcon} alt="" boxSize="6" draggable={false} />
          <Box as="span">{APP_NAME}</Box>
        </HStack>
      </Heading>
      {/* Small buttons, so the bar stays slim. Each sets its own size: a group would hand its
          size to the settings drawer's buttons too, which render inside it. */}
      <HStack gap="2" pe="4">
        <ColorModeButton {...HEADER_BUTTON} />
        <SettingsDrawer />
      </HStack>
    </HStack>
  );
}
