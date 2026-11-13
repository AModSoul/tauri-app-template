import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, mocked, screen, userEvent, waitFor, within } from "storybook/test";

import { defaultSettings } from "@/__fixtures__/run";
import { api } from "@/api";
import { useSettings } from "@/store";

import { SettingsDrawer } from "./SettingsDrawer";

const meta = {
  component: SettingsDrawer,
} satisfies Meta<typeof SettingsDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

async function openDrawer(canvas: { getByRole: typeof screen.getByRole }) {
  await userEvent.click(canvas.getByRole("button", { name: "Settings" }));
  const drawer = await waitFor(() => screen.getByRole("dialog", { name: "Settings" }));
  await waitFor(() => expect(drawer).toBeVisible());
  return within(drawer);
}

/** Each change is saved at once. */
export const SavesEachChange: Story = {
  play: async ({ canvas }) => {
    const drawer = await openDrawer(canvas);
    await userEvent.selectOptions(drawer.getByRole("combobox", { name: "Case" }), "lower");
    await expect(api.saveSettings).toHaveBeenLastCalledWith({ ...defaultSettings, case: "lower" });

    await userEvent.click(drawer.getByText("Dash"));
    await expect(api.saveSettings).toHaveBeenLastCalledWith({
      ...defaultSettings,
      case: "lower",
      spaces: "dash",
    });

    await userEvent.click(drawer.getByRole("checkbox", { name: /Number repeated names/ }));
    await expect(useSettings.getState().settings?.numberDuplicates).toBe(false);
  },
};

/** A length can be cleared and typed afresh; it's saved once it's a length. */
export const LongestName: Story = {
  play: async ({ canvas }) => {
    const drawer = await openDrawer(canvas);
    const field = drawer.getByRole("textbox", { name: "Longest name" });
    await userEvent.clear(field);
    await expect(drawer.getByText("A whole number from 1 to 255")).toBeVisible();
    await expect(api.saveSettings).not.toHaveBeenCalled();
    await userEvent.type(field, "40");
    await expect(api.saveSettings).toHaveBeenLastCalledWith({ ...defaultSettings, maxLength: 40 });
  },
};

/** A save that fails puts the setting back and says why. */
export const SaveFails: Story = {
  beforeEach: () => {
    mocked(api.saveSettings).mockRejectedValue("The settings folder is read-only");
  },
  play: async ({ canvas }) => {
    const drawer = await openDrawer(canvas);
    await userEvent.selectOptions(drawer.getByRole("combobox", { name: "Case" }), "upper");
    await waitFor(() => expect(screen.getByText("Couldn't save the settings")).toBeVisible());
    await expect(useSettings.getState().settings?.case).toBe("keep");
  },
};

/** Until the settings have loaded, there's nothing to open. */
export const Loading: Story = {
  beforeEach: () => {
    useSettings.setState({ settings: null });
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Settings" })).toBeDisabled();
  },
};
