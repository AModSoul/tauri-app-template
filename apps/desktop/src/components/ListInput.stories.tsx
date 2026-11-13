import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, mocked, screen, userEvent, waitFor } from "storybook/test";

import { SAMPLE_TEXT, defaultSettings } from "@/__fixtures__/run";
import { api } from "@/api";
import { useInput, useRun } from "@/store";

import { ListInput } from "./ListInput";

const meta = {
  component: ListInput,
  decorators: [
    (Story) => (
      <div style={{ height: "420px" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ListInput>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing typed: nothing to start. */
export const Empty: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Make names" })).toBeDisabled();
    await expect(canvas.getByText("0 lines")).toBeVisible();
  },
};

/** Typing names counts them, and the button sends every line, with the settings, to the core. */
export const Starts: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(
      canvas.getByRole("textbox", { name: "Names" }),
      "Report{Enter}{Enter}Notes",
    );
    await expect(canvas.getByText("2 lines")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Make names" }));
    await expect(api.startRun).toHaveBeenCalledWith(
      ["Report", "", "Notes"],
      defaultSettings,
      expect.any(Function),
    );
  },
};

/** While a run is going, the button cancels it. */
export const Running: Story = {
  beforeEach: () => {
    useInput.setState({ text: SAMPLE_TEXT });
    useRun.setState({ id: 7, starting: false, jobs: [], summary: null });
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Cancel" }));
    await expect(api.cancelRun).toHaveBeenCalledWith(7);
  },
};

/** A run the core refuses to start says why. */
export const StartFails: Story = {
  beforeEach: () => {
    useInput.setState({ text: SAMPLE_TEXT });
    mocked(api.startRun).mockRejectedValue("The disk is full");
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Make names" }));
    await waitFor(() => expect(screen.getByText("Couldn't start")).toBeVisible());
    await expect(screen.getByText("The disk is full")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Make names" })).toBeEnabled();
  },
};
