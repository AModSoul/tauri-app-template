import type { Meta, StoryObj } from "@storybook/react-vite";
import { LuImageDown } from "react-icons/lu";
import { expect } from "storybook/test";

import { EmptyState } from "./empty-state";

const meta = {
  component: EmptyState,
  args: {
    icon: <LuImageDown />,
    title: "Nothing downloaded yet",
    description: "Type some names, one a line, then make them into file names.",
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Nothing downloaded yet")).toBeVisible();
  },
};

export const TitleOnly: Story = { args: { description: undefined } };
