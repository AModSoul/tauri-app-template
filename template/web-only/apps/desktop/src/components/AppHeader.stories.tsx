import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent, waitFor } from "storybook/test";

import { APP_NAME } from "@/app-config";

import { AppHeader } from "./AppHeader";

const meta = {
  component: AppHeader,
} satisfies Meta<typeof AppHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The app's name and its buttons. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: APP_NAME })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Settings" })).toBeVisible();
  },
};

/** The settings drawer opens below the header, which stays in view. */
export const WithSettingsOpen: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Settings" }));
    await waitFor(() => expect(screen.getByRole("dialog", { name: "Settings" })).toBeVisible());
    const bar = canvas.getByRole("banner", { hidden: true }).getBoundingClientRect();
    const drawer = screen.getByRole("dialog", { name: "Settings" }).getBoundingClientRect();
    await expect(Math.round(drawer.top)).toBeGreaterThanOrEqual(Math.round(bar.bottom));
  },
};
