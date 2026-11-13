import { describe, expect, it } from "vitest";

import { run } from "./engine";
import { defaultSettings, type RunEvent, type Settings } from "./types";

async function eventsOf(lines: string[], settings: Settings, signal?: AbortSignal) {
  const events: RunEvent[] = [];
  await run(lines, settings, (event) => events.push(event), { signal });
  return events;
}

describe("run", () => {
  it("names each line and numbers repeats", async () => {
    const events = await eventsOf(["Report", "", "  report ", "???"], defaultSettings);
    const finished = events.filter(
      (event) => event.type === "job" && event.status.state !== "running",
    );
    expect(finished).toEqual([
      { type: "job", id: 1, status: { state: "done", name: "Report" } },
      { type: "job", id: 2, status: { state: "done", name: "report (2)" } },
      {
        type: "job",
        id: 3,
        status: { state: "failed", error: "Nothing is left of it to name a file by" },
      },
    ]);
    expect(events.at(-1)).toEqual({
      type: "finished",
      summary: { done: 2, failed: 1, cancelled: false },
    });
  });

  it("reports a repeat when told not to number it", async () => {
    const events = await eventsOf(["Report", "Report"], {
      ...defaultSettings,
      numberDuplicates: false,
    });
    expect(events).toContainEqual({
      type: "job",
      id: 2,
      status: { state: "failed", error: "Report is already taken" },
    });
  });

  it("plans a cancelled run's jobs and finishes without doing them", async () => {
    const controller = new AbortController();
    controller.abort();
    const events = await eventsOf(["a", "b"], defaultSettings, controller.signal);
    expect(events[0]).toMatchObject({ type: "planned", jobs: [{ id: 1 }, { id: 2 }] });
    expect(events.slice(1)).toEqual([
      { type: "finished", summary: { done: 0, failed: 0, cancelled: true } },
    ]);
  });
});
