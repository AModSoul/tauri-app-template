// A run: the user's input worked through job by job, its progress reported as `RunEvent`s.
//
// The example names files: each line of the input is a job, which turns into a file name
// (`fileName`). Replace the job's work with the app's own and keep the shape: plan the jobs,
// report each one's status as it changes, stop between jobs when cancelled, and always end with
// `finished`.

import { fileName, numbered } from "./naming";
import type { JobInfo, JobStatus, RunEvent, RunSummary, Settings } from "./types";

export interface RunOptions {
  /** Cancels the run between jobs. */
  signal?: AbortSignal;
  /** How long each job takes, in milliseconds: the example's work is instant, so the desktop
   * app slows it down to show its progress. Real work doesn't need it; drop it then. */
  pace?: number;
}

/** Works through `lines`, one job each, skipping blank ones. */
export async function run(
  lines: readonly string[],
  settings: Settings,
  emit: (event: RunEvent) => void,
  { signal, pace = 0 }: RunOptions = {},
): Promise<RunSummary> {
  const jobs: JobInfo[] = lines
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .map((line, index) => ({ id: index + 1, line }));
  emit({ type: "planned", jobs });

  const summary: RunSummary = { done: 0, failed: 0, cancelled: false };
  // How many times each name (in lower case, as Windows and macOS compare them) was given.
  const given = new Map<string, number>();
  for (const job of jobs) {
    if (signal?.aborted) {
      summary.cancelled = true;
      break;
    }
    emit({ type: "job", id: job.id, status: { state: "running" } });
    await wait(pace, signal);
    const status = statusOf(job.line, settings, given);
    if (status.state === "failed") summary.failed += 1;
    else summary.done += 1;
    emit({ type: "job", id: job.id, status });
  }
  emit({ type: "finished", summary: { ...summary } });
  return summary;
}

function statusOf(line: string, settings: Settings, given: Map<string, number>): JobStatus {
  const name = fileName(line, settings);
  if (name === null) return { state: "failed", error: "Nothing is left of it to name a file by" };
  const key = name.toLowerCase();
  const times = (given.get(key) ?? 0) + 1;
  given.set(key, times);
  if (times === 1) return { state: "done", name };
  if (settings.numberDuplicates) return { state: "done", name: numbered(name, times, settings) };
  return { state: "failed", error: `${name} is already taken` };
}

/** Waits `ms`, or less if `signal` aborts. */
function wait(ms: number, signal: AbortSignal | undefined): Promise<void> {
  if (ms <= 0 || signal?.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(done, ms);
    function done() {
      clearTimeout(timer);
      signal?.removeEventListener("abort", done);
      resolve();
    }
    signal?.addEventListener("abort", done);
  });
}
