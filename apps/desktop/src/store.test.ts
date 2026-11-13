import { describe, expect, it } from "vitest";

import { applyEvent, isRunning, type RunState } from "./store";

const starting: RunState = { id: null, starting: true, jobs: [], summary: null };

describe("applyEvent", () => {
  it("queues the planned jobs, then follows each one's status", () => {
    let state = applyEvent(starting, {
      type: "planned",
      jobs: [
        { id: 1, line: "Report" },
        { id: 2, line: "???" },
      ],
    });
    expect(state.starting).toBe(false);
    expect(state.jobs.map((job) => job.status.state)).toEqual(["queued", "queued"]);

    state = applyEvent(state, { type: "job", id: 1, status: { state: "done", name: "Report" } });
    expect(state.jobs[0]?.status).toEqual({ state: "done", name: "Report" });
    expect(state.jobs[1]?.status).toEqual({ state: "queued" });
  });

  it("ends the run with its summary", () => {
    const running = { ...starting, starting: false, id: 3 };
    expect(isRunning(running)).toBe(true);
    const finished = applyEvent(running, {
      type: "finished",
      summary: { done: 1, failed: 0, cancelled: false },
    });
    expect(finished.summary).toEqual({ done: 1, failed: 0, cancelled: false });
    expect(isRunning(finished)).toBe(false);
  });
});
