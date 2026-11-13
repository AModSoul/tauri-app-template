import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, spyOn, waitFor } from "storybook/test";

import { releaseV010 } from "@/downloads/__fixtures__/releases";
import { LATEST_RELEASE_API_URL } from "@/downloads/github";

import { Downloads } from "./Downloads";

const meta = {
  component: Downloads,
  // Tests don't touch the network: GitHub is down, so what shows is what the page started with.
  beforeEach: () => {
    spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 503 }));
  },
} satisfies Meta<typeof Downloads>;

export default meta;
type Story = StoryObj<typeof meta>;

/** With the release the site was built with: its downloads show at once, and stay when GitHub
 * can't be asked again. */
export const Built: Story = {
  args: { built: releaseV010 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Download" })).toBeVisible();
    await expect(canvas.getByRole("tablist")).toBeVisible();
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(LATEST_RELEASE_API_URL, expect.anything()),
    );
    await expect(canvas.getByRole("tablist")).toBeVisible();
  },
};

/** Without one, and GitHub down: says so, and links to the releases page instead. */
export const Unavailable: Story = {
  args: { built: null },
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.getByText(/GitHub answered 503/)).toBeVisible());
  },
};
