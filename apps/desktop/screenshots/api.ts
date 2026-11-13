// Stands in for `src/api.ts` while the screenshots are taken: the core's answers, from the sample
// run in `src/__fixtures__/run.ts`. It's typed as the real `api`, so `pnpm typecheck` says when
// the app asks for something this doesn't answer.
//
// Once the app does real work, record a real run instead (a small example in the core that does
// a run through `http::Http` and writes its events to `target/screenshots`) and answer from the
// recording here.

import { defaultSettings, finishedRun } from "../src/__fixtures__/run";
import type { api as realApi } from "../src/api";
import type { RunEvent } from "../src/core-types";

/** The run's events, as the core sends them. */
function events(): RunEvent[] {
  const jobs = finishedRun.jobs.map(({ id, line }) => ({ id, line }));
  return [
    { type: "planned", jobs },
    ...finishedRun.jobs.flatMap((job): RunEvent[] =>
      job.status.state === "queued" ? [] : [{ type: "job", id: job.id, status: job.status }],
    ),
    { type: "finished", summary: finishedRun.summary ?? { done: 0, failed: 0, cancelled: false } },
  ];
}

export const api: typeof realApi = {
  getSettings: async () => defaultSettings,
  saveSettings: async () => {},
  startRun: async (_lines, _settings, onEvent) => {
    setTimeout(() => events().forEach(onEvent), 50);
    return 1;
  },
  cancelRun: async () => {},
};
