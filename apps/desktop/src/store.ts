// The app's state, in Zustand stores: what the user typed, their settings, and the run. The
// stores hold what the core reported and call it through `api`; they decide nothing the core
// decides.

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { api } from "@/api";
import type { JobInfo, JobStatus, RunEvent, RunSummary, Settings } from "@/core-types";
import { showError, showInfo, showSuccess, showWarning } from "@/notify";

// --- What the user typed, remembered between launches ------------------------

interface InputState {
  text: string;
}

export const useInput = create<InputState>()(
  persist(() => ({ text: "" }), { name: "input", version: 1 }),
);

// --- Settings ----------------------------------------------------------------

interface SettingsState {
  /** `null` until they've loaded. */
  settings: Settings | null;
}

export const useSettings = create<SettingsState>()(() => ({ settings: null }));

export async function loadSettings() {
  try {
    useSettings.setState({ settings: await api.getSettings() });
  } catch (error) {
    showError("Couldn't load the settings", error);
  }
}

/** Changes the settings at once, and saves them; a failed save puts them back. */
export async function updateSettings(patch: Partial<Settings>) {
  const before = useSettings.getState().settings;
  if (!before) return;
  const settings = { ...before, ...patch };
  useSettings.setState({ settings });
  try {
    await api.saveSettings(settings);
  } catch (error) {
    useSettings.setState({ settings: before });
    showError("Couldn't save the settings", error);
  }
}

// --- The run -----------------------------------------------------------------

/** A job as the run table shows it: queued until the core says otherwise. */
export interface Job extends JobInfo {
  status: JobStatus | { state: "queued" };
}

export interface RunState {
  /** The run's id, while it's going. */
  id: number | null;
  /** Between asking for a run and the core planning its jobs. */
  starting: boolean;
  jobs: Job[];
  /** How the last run ended. */
  summary: RunSummary | null;
}

const idle: RunState = { id: null, starting: false, jobs: [], summary: null };

export const useRun = create<RunState>()(() => idle);

/** The run as it is once `event` has happened to `state`. */
export function applyEvent(state: RunState, event: RunEvent): RunState {
  switch (event.type) {
    case "planned":
      return {
        ...state,
        starting: false,
        jobs: event.jobs.map((job) => ({ ...job, status: { state: "queued" } })),
      };
    case "job":
      return {
        ...state,
        jobs: state.jobs.map((job) =>
          job.id === event.id ? { ...job, status: event.status } : job,
        ),
      };
    case "finished":
      return { ...state, id: null, starting: false, summary: event.summary };
  }
}

export async function startRun() {
  const { settings } = useSettings.getState();
  if (!settings || isRunning(useRun.getState())) return;
  const lines = useInput.getState().text.split(/\r?\n/u);
  useRun.setState({ ...idle, starting: true });
  try {
    const id = await api.startRun(lines, settings, (event) => {
      useRun.setState((state) => applyEvent(state, event));
      if (event.type === "finished") announce(event.summary);
    });
    // Unless the run has already finished, as a short one can before this resolves.
    useRun.setState((state) => (state.summary ? state : { id }));
  } catch (error) {
    useRun.setState(idle);
    showError("Couldn't start", error);
  }
}

export async function cancelRun() {
  const { id } = useRun.getState();
  if (id === null) return;
  try {
    await api.cancelRun(id);
  } catch (error) {
    showError("Couldn't cancel", error);
  }
}

export const isRunning = (state: RunState) => state.starting || state.id !== null;

function announce({ done, failed, cancelled }: RunSummary) {
  const named = `${done} ${done === 1 ? "name" : "names"}`;
  if (cancelled) showInfo("Cancelled", { description: `${named} made before it stopped.` });
  else if (failed > 0) showWarning(`${named} made, ${failed} failed`);
  else if (done > 0) showSuccess(`${named} made`);
  else showInfo("Nothing to name", { description: "Type a name on each line first." });
}
