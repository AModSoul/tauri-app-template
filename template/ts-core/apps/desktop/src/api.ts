// The core, as the front end reaches it. The core is TypeScript (`@my-app/core`) and runs here,
// in the window; settings are kept in the window's storage. Components call the core through
// here and nowhere else, and take its types from `core-types.ts`, so these two files are the
// only ones that know where it runs.
//
// When the core needs what a window can't do (files on disk, other processes), add a Tauri
// command in src-tauri/src/lib.rs and call it from here with `invoke`.
//
// Storybook and the screenshots stand in for this module (`.storybook/preview.tsx`,
// `screenshots/api.ts`).

import { defaultSettings, run } from "@my-app/core";

import type { RunEvent, Settings } from "@/core-types";

/** How long each of the example run's jobs takes, in milliseconds, so its progress shows. Drop
 * it once the jobs do real work. */
const EXAMPLE_PACE = 150;

const SETTINGS_KEY = "settings";

/** Runs going now, by id, to cancel them. */
const runs = new Map<number, AbortController>();
let nextRun = 1;

export const api = {
  getSettings: async (): Promise<Settings> => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    // Settings missing from what's saved take their defaults.
    const parsed: Partial<Settings> = saved ? JSON.parse(saved) : {};
    return { ...defaultSettings, ...parsed };
  },
  saveSettings: async (settings: Settings) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  },
  /** Starts a run of `lines`, and resolves to its id once it has. Its progress comes to
   * `onEvent`, ending with `finished`. */
  startRun: async (lines: string[], settings: Settings, onEvent: (event: RunEvent) => void) => {
    const id = nextRun++;
    const controller = new AbortController();
    runs.set(id, controller);
    void run(lines, settings, onEvent, { signal: controller.signal, pace: EXAMPLE_PACE }).finally(
      () => runs.delete(id),
    );
    return id;
  },
  cancelRun: async (id: number) => {
    runs.get(id)?.abort();
  },
};
