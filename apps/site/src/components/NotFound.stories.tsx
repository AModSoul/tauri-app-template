import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { NotFound } from "./NotFound";

const meta = {
  component: NotFound,
} satisfies Meta<typeof NotFound>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Says there's no page here, and links home. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Go to the home page" })).toHaveAttribute(
      "href",
      "/",
    );
  },
};
