import { Box, Heading, HStack, Image, VisuallyHidden } from "@chakra-ui/react";

import appIcon from "@/assets/app-icon.png";

import { APP_NAME } from "@/app-config";
import { windowFrame } from "@/appWindow";
import { SettingsDrawer } from "@/components/SettingsDrawer";
import { UpdateButton } from "@/components/UpdateButton";
import { WindowControls } from "@/components/WindowControls";
import { HEADER_BUTTON, HEADER_HEIGHT, headerProps } from "@/layout";
import { ColorModeButton } from "@my-app/ui/color-mode";

/** The app's title bar: its icon and name, its buttons, and on Windows and Linux the window's
 * own, the native title bar being turned off. On macOS the native one stays, with its traffic
 * lights over the start of this bar, so the name is left out there but for screen readers. */
export function AppHeader() {
  const frame = windowFrame();
  // This bar is all there is to drag the window by: anywhere on it but its buttons, which
  // Tauri leaves to their clicks.
  const drag = frame === "browser" ? {} : { "data-tauri-drag-region": "deep" };

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
      {...drag}
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
        {frame === "mac" ? (
          <VisuallyHidden>{APP_NAME}</VisuallyHidden>
        ) : (
          <HStack gap="2">
            {/* The app's own icon, as the taskbar shows it. */}
            <Image src={appIcon} alt="" boxSize="6" draggable={false} />
            <Box as="span">{APP_NAME}</Box>
          </HStack>
        )}
      </Heading>
      {/* Small buttons, so the bar stays slim. Each sets its own size: a group would hand its
          size to the settings drawer's buttons too, which render inside it. */}
      <HStack gap="2" pe="4">
        <UpdateButton />
        <ColorModeButton {...HEADER_BUTTON} />
        <SettingsDrawer />
      </HStack>
      {frame === "custom" && <WindowControls />}
    </HStack>
  );
}
