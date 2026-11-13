import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { finishedRun, runningRun } from "@/__fixtures__/run";
import { useRun } from "@/store";

import { RunTable } from "./RunTable";

const meta = {
  component: RunTable,
  decorators: [
    (Story) => (
      <div style={{ height: "420px" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RunTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Before the first run: what to do. */
export const Empty: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Nothing yet")).toBeVisible();
  },
};

/** Halfway: done, working and queued jobs, and the progress so far. */
export const Running: Story = {
  beforeEach: () => {
    useRun.setState(runningRun);
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Making names…")).toBeVisible();
    await expect(canvas.getByText("2 of 6")).toBeVisible();
    await expect(canvas.getByText("Working…")).toBeVisible();
    await expect(canvas.getAllByText("Queued")).toHaveLength(3);
  },
};

/** Finished: each line's file name, or why it has none. */
export const Finished: Story = {
  beforeEach: () => {
    useRun.setState(finishedRun);
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Finished")).toBeVisible();
    await expect(canvas.getByRole("columnheader", { name: "File name" })).toBeVisible();
    await expect(canvas.getByText("Quarterly report Q3 final (2)")).toBeVisible();
    await expect(canvas.getByText("Nothing is left of it to name a file by")).toBeVisible();
  },
};

/** Cancelled partway: says so. */
export const Cancelled: Story = {
  beforeEach: () => {
    useRun.setState({ ...runningRun, id: null, summary: { done: 2, failed: 0, cancelled: true } });
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Cancelled")).toBeVisible();
  },
};
