import { afterEach, describe, expect, it, vi } from "vitest";

import { toaster } from "@my-app/ui/toaster";

import { errorText, showError, showInfo, showSuccess, showWarning } from "./notify";

describe("errorText", () => {
  it("uses an Error's message", () => {
    expect(errorText(new Error("disk full"))).toBe("disk full");
  });

  it("passes a Tauri command's rejection through as text", () => {
    expect(errorText("The service is down")).toBe("The service is down");
  });
});

/** Spies on the toasts made. */
function created() {
  return vi.spyOn(toaster, "create").mockReturnValue("toast");
}

describe("toasts", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a warning, with a button and the time to press it", () => {
    const create = created();
    const onClick = vi.fn<() => void>();
    showWarning("The printer is offline", {
      id: "send",
      description: "Turn it on.",
      action: { label: "Try again", onClick },
    });
    expect(create).toHaveBeenCalledWith({
      id: "send",
      type: "warning",
      title: "The printer is offline",
      description: "Turn it on.",
      action: { label: "Try again", onClick },
      duration: 10_000,
    });
  });

  it("leaves out an id and a button not given", () => {
    const create = created();
    showWarning("Careful");
    expect(create).toHaveBeenCalledWith({
      type: "warning",
      title: "Careful",
      description: undefined,
    });
    showInfo("Note", { description: "Something to know" });
    expect(create).toHaveBeenLastCalledWith({
      type: "info",
      title: "Note",
      description: "Something to know",
    });
  });

  it("gives success and error toasts a button too", () => {
    const create = created();
    const action = { label: "Open", onClick: vi.fn<() => void>() };
    showSuccess("Saved 3 files", {
      id: "send",
      description: "They're in the Downloads folder.",
      action,
    });
    expect(create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: "send",
        type: "success",
        description: "They're in the Downloads folder.",
        action,
      }),
    );
    showError("Couldn't send", "Disk full", { action });
    expect(create).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "error", description: "Disk full", action }),
    );
  });
});
