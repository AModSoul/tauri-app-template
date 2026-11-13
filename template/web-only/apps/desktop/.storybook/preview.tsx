import type { Preview } from "@storybook/react-vite";
import { mocked, sb } from "storybook/test";

import { previewFor, resetUi } from "@my-app/ui/storybook";

import { defaultSettings } from "../src/__fixtures__/run.ts";
import { api } from "../src/api.ts";
import { useInput, useRun, useSettings } from "../src/store.ts";
import { system } from "../src/theme.ts";

// The core is mocked, so stories control what it answers. Each export becomes a spy; the
// defaults below make the app behave as if the core answered, and a story overrides them with
// `mocked(api.x)` in its `beforeEach`.
sb.mock(import("../src/api.ts"));

const preview: Preview = {
  // The app's own system, whose dialogs and drawers open below its header.
  ...previewFor(system),
  beforeEach: () => {
    mocked(api.getSettings).mockResolvedValue(defaultSettings);
    mocked(api.saveSettings).mockResolvedValue();
    mocked(api.startRun).mockResolvedValue(1);
    mocked(api.cancelRun).mockResolvedValue();

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
