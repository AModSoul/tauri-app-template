import { SimpleGrid } from "@chakra-ui/react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { LuPackage } from "react-icons/lu";
import { expect, fn, userEvent } from "storybook/test";

import { RadioCardItem, RadioCardLabel, RadioCardRoot } from "./radio-card";

const PLANS = [
  { value: "starter", name: "Starter", set: "For one person" },
  { value: "team", name: "Team", set: "Up to ten people" },
  { value: "studio", name: "Studio", set: "Everyone, everywhere" },
];

const meta = {
  component: RadioCardRoot,
  args: { defaultValue: "starter", onValueChange: fn() },
  render: (args) => (
    <RadioCardRoot {...args}>
      <RadioCardLabel>Plans</RadioCardLabel>
      <SimpleGrid columns={3} gap="2">
        {PLANS.map((plan) => (
          <RadioCardItem
            key={plan.value}
            value={plan.value}
            label={plan.name}
            description={plan.set}
          />
        ))}
      </SimpleGrid>
    </RadioCardRoot>
  ),
} satisfies Meta<typeof RadioCardRoot>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A radio group whose options are cards: one is picked at a time. */
export const Default: Story = {
  play: async ({ canvas, args }) => {
    await expect(canvas.getByRole("radiogroup", { name: "Plans" })).toBeVisible();
    await expect(canvas.getByRole("radio", { name: /Starter/ })).toBeChecked();
    await userEvent.click(canvas.getByRole("radio", { name: /Team/ }));
    await expect(args.onValueChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ value: "team" }),
    );
  },
};

/** Stacked, with a picture and no indicator, as a gallery of pictures would be. */
export const Vertical: Story = {
  args: { orientation: "vertical", size: "sm" },
  render: (args) => (
    <RadioCardRoot {...args}>
      <RadioCardLabel srOnly>Plans</RadioCardLabel>
      <SimpleGrid columns={3} gap="2">
        {PLANS.map((plan) => (
          <RadioCardItem
            key={plan.value}
            value={plan.value}
            indicator={null}
            icon={<LuPackage />}
            label={plan.name}
            description={plan.set}
          />
        ))}
      </SimpleGrid>
    </RadioCardRoot>
  ),
};

export const Disabled: Story = { args: { disabled: true } };
