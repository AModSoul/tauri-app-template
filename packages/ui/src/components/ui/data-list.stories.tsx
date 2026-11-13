import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { DataListItem, DataListRoot } from "./data-list";

const meta = {
  component: DataListRoot,
  args: { size: "sm" },
  render: (args) => (
    <DataListRoot {...args} maxW="sm">
      <DataListItem label="Saving to" value="C:\My App" />
      <DataListItem label="Picked" value="Team plan" />
    </DataListRoot>
  ),
} satisfies Meta<typeof DataListRoot>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A label above each value. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Saving to")).toBeVisible();
    await expect(canvas.getByText("C:\\My App")).toBeVisible();
  },
};

/** A label beside each value. */
export const Horizontal: Story = { args: { orientation: "horizontal" } };
