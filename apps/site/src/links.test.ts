import { describe, expect, it } from "vitest";

import { link } from "./links";

describe("link", () => {
  // Tests run at the root, as the site usually is.
  it("leaves a path from the root as it is", () => {
    expect(link("/")).toBe("/");
    expect(link("/download")).toBe("/download");
  });
});
