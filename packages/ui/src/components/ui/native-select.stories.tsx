import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";

import { Field } from "./field";
import { NativeSelectField, NativeSelectRoot } from "./native-select";

const ITEMS = [
  { value: "cloudThenLocal", label: "Cloud, then this computer" },
  { value: "cloudOnly", label: "Cloud only" },
  { value: "localOnly", label: "This computer only" },
];

const meta = {
  component: NativeSelectField,
  args: { items: ITEMS, defaultValue: "cloudThenLocal", onChange: fn() },
  render: (args) => (
    <Field label="Where art comes from">
      <NativeSelectRoot>
        <NativeSelectField {...args} />
      </NativeSelectRoot>
    </Field>
  ),
} satisfies Meta<typeof NativeSelectField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** `items` takes `{ value, label }` objects or plain strings. */
export const Default: Story = {
  play: async ({ canvas, args }) => {
    const select = canvas.getByRole("combobox", { name: "Where art comes from" });
    await userEvent.selectOptions(select, "This computer only");
    await expect(select).toHaveValue("localOnly");
    await expect(args.onChange).toHaveBeenCalled();
  },
};

export const StringItems: Story = { args: { items: ["Newest", "Oldest"], defaultValue: "Newest" } };
