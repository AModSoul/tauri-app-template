// Sample data for stories and the screenshots, typed as the core reports it.

import type { Settings } from "@/core-types";
import type { Job, RunState } from "@/store";

export const defaultSettings: Settings = {
  case: "keep",
  spaces: "keep",
  maxLength: 80,
  numberDuplicates: true,
};

export const SAMPLE_TEXT = [
  "Quarterly Report: Q3 / Final",
  "Meeting notes 12/11",
  "Budget <draft>",
  "Quarterly report: Q3 / final",
  "???",
  "Team offsite — agenda",
].join("\n");

const jobs: Job[] = [
  {
    id: 1,
    line: "Quarterly Report: Q3 / Final",
    status: { state: "done", name: "Quarterly Report Q3 Final" },
  },
  { id: 2, line: "Meeting notes 12/11", status: { state: "done", name: "Meeting notes 1211" } },
  { id: 3, line: "Budget <draft>", status: { state: "done", name: "Budget draft" } },
  {
    id: 4,
    line: "Quarterly report: Q3 / final",
    status: { state: "done", name: "Quarterly report Q3 final (2)" },
  },
  {
    id: 5,
    line: "???",
    status: { state: "failed", error: "Nothing is left of it to name a file by" },
  },
  {
    id: 6,
    line: "Team offsite — agenda",
    status: { state: "done", name: "Team offsite — agenda" },
  },
];

/** A run that has finished: five names made, one failed. */
export const finishedRun: RunState = {
  id: null,
  starting: false,
  jobs,
  summary: { done: 5, failed: 1, cancelled: false },
};

/** The same run halfway through. */
export const runningRun: RunState = {
  id: 1,
  starting: false,
  jobs: jobs.map((job) =>
    job.id < 3
      ? job
      : { ...job, status: job.id === 3 ? { state: "running" } : { state: "queued" } },
  ),
  summary: null,
};
