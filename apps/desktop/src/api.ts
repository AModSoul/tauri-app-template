// The core, as the front end reaches it: typed wrappers over the app's Tauri commands
// (src-tauri/src/lib.rs). Components call the core through here and nowhere else, and take its
// types from `core-types.ts`, so these two files are the only ones that know where it runs.
//
// Storybook and the screenshots stand in for this module (`.storybook/preview.tsx`,
// `screenshots/api.ts`).

import { Channel, invoke } from "@tauri-apps/api/core";

import type { RunEvent, Settings } from "@/core-types";

export const api = {
  getSettings: () => invoke<Settings>("get_settings"),
  saveSettings: (settings: Settings) => invoke<void>("save_settings", { settings }),
  /** Starts a run of `lines`, and resolves to its id once it has. Its progress comes to
   * `onEvent`, ending with `finished`. */
  startRun: (lines: string[], settings: Settings, onEvent: (event: RunEvent) => void) => {
    const channel = new Channel<RunEvent>();
    // Tauri's Channel has no addEventListener; onmessage is its only API.
    // oxlint-disable-next-line unicorn/prefer-add-event-listener
    channel.onmessage = onEvent;
    return invoke<number>("start_run", { lines, settings, onEvent: channel });
  },
  cancelRun: (id: number) => invoke<void>("cancel_run", { id }),
};
