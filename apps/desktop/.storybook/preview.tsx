import type { Preview } from "@storybook/react-vite";
import { open } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { mocked, sb } from "storybook/test";

import { previewFor, resetUi } from "@my-app/ui/storybook";

import { defaultSettings } from "../src/__fixtures__/run.ts";
import { api } from "../src/api.ts";
import {
  closeWindow,
  isWindowMaximized,
  minimizeWindow,
  onWindowResized,
  toggleMaximizeWindow,
  windowFrame,
} from "../src/appWindow.ts";
import { useInput, useRun, useSettings } from "../src/store.ts";
import { system } from "../src/theme.ts";

// Storybook has no Tauri backend, so every module that reaches it is mocked. Each export becomes
// a spy; the defaults below make the app behave as if the core answered, and a story overrides
// them with `mocked(api.x)` in its `beforeEach`. A component that starts importing another
// `@tauri-apps/*` module needs it added here.
sb.mock(import("../src/api.ts"));
sb.mock(import("../src/appWindow.ts"));
sb.mock(import("@tauri-apps/api/core"));
sb.mock(import("@tauri-apps/api/window"));
sb.mock(import("@tauri-apps/plugin-dialog"));
sb.mock(import("@tauri-apps/plugin-process"));
sb.mock(import("@tauri-apps/plugin-updater"));

const preview: Preview = {
  // The app's own system, whose dialogs and drawers open below its header.
  ...previewFor(system),
  beforeEach: () => {
    mocked(api.getSettings).mockResolvedValue(defaultSettings);
    mocked(api.saveSettings).mockResolvedValue();
    mocked(api.startRun).mockResolvedValue(1);
    mocked(api.cancelRun).mockResolvedValue();
    mocked(open).mockResolvedValue(null);
    mocked(check).mockResolvedValue(null);
    mocked(relaunch).mockResolvedValue();
    // The window as on Windows: the app's own title bar, not maximized.
    mocked(windowFrame).mockReturnValue("custom");
    mocked(minimizeWindow).mockResolvedValue();
    mocked(toggleMaximizeWindow).mockResolvedValue();
    mocked(closeWindow).mockResolvedValue();
    mocked(isWindowMaximized).mockResolvedValue(false);
    mocked(onWindowResized).mockResolvedValue(() => {});

    // Every story starts from the app's initial state, with settings loaded and no toasts left
    // over from the story before.
    resetUi();
    useInput.persist.clearStorage();
    useInput.setState(useInput.getInitialState(), true);
    useRun.setState(useRun.getInitialState(), true);
    useSettings.setState({ settings: defaultSettings }, true);
  },
};

export default preview;
