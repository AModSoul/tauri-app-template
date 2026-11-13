import { Stack } from "@chakra-ui/react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";

import { Radio, RadioGroup } from "./radio";

const meta = {
  component: RadioGroup,
  args: { defaultValue: "week", onValueChange: fn() },
  render: (args) => (
    <RadioGroup {...args}>
      <Stack gap="3">
        <Radio value="week">Past week</Radio>
        <Radio value="month">Past month</Radio>
        <Radio value="year">Past year</Radio>
      </Stack>
    </RadioGroup>
  ),
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, args }) => {
    await expect(canvas.getByRole("radio", { name: "Past week" })).toBeChecked();
    await userEvent.click(canvas.getByRole("radio", { name: "Past year" }));
    await expect(args.onValueChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ value: "year" }),
    );
  },
};

export const Disabled: Story = { args: { disabled: true } };
