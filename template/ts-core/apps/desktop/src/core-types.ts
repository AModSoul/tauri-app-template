// The core's types, as the front end uses them, from the TypeScript core (`@my-app/core`).
// Components import the core's types from here and its calls from `api.ts`, so these two files
// are the only ones that know where the core runs.

export type {
  JobInfo,
  JobStatus,
  NameCase,
  RunEvent,
  RunSummary,
  Settings,
  Spaces,
} from "@my-app/core";
