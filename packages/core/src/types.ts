// What the core takes and reports: its contract with the desktop app's front end, which takes
// these types through `apps/desktop/src/core-types.ts`.

/** The case a name is put in. */
export type NameCase = "keep" | "lower" | "upper";

/** What the spaces in a name become. */
export type Spaces = "keep" | "dash" | "underscore";

export interface Settings {
  case: NameCase;
  spaces: Spaces;
  /** The longest name kept, in characters. */
  maxLength: number;
  /** Number a name that's already been given (`Report (2)`), rather than reporting it. */
  numberDuplicates: boolean;
}

export interface JobInfo {
  id: number;
  /** The line of input the job is for. */
  line: string;
}

export type JobStatus =
  | { state: "running" }
  | { state: "done"; name: string }
  | { state: "failed"; error: string };

export interface RunSummary {
  done: number;
  failed: number;
  /** Stopped before every job was done. */
  cancelled: boolean;
}

export type RunEvent =
  /** The jobs the run will work through, all queued. */
  | { type: "planned"; jobs: JobInfo[] }
  /** A job's status changed. */
  | { type: "job"; id: number; status: JobStatus }
  /** The run is over, cancelled or not. Always the last event. */
  | { type: "finished"; summary: RunSummary };

export const defaultSettings: Settings = {
  case: "keep",
  spaces: "keep",
  maxLength: 80,
  numberDuplicates: true,
};
