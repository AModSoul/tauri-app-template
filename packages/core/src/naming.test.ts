import { describe, expect, it } from "vitest";

import { fileName, numbered, sanitize } from "./naming";
import { defaultSettings, type Settings } from "./types";

const settings = (patch: Partial<Settings>): Settings => ({ ...defaultSettings, ...patch });

describe("sanitize", () => {
  it("drops what a file name can't hold", () => {
    expect(sanitize("Fire / Ice")).toBe("Fire Ice");
    expect(sanitize('Say "hello"')).toBe("Say hello");
    expect(sanitize("  a \t b  ")).toBe("a b");
    expect(sanitize("notes...")).toBe("notes");
    expect(sanitize("?*<>")).toBe("");
  });
});

describe("fileName", () => {
  const line = "  Quarterly Report: Q3 / Final ";

  it("styles a name", () => {
    expect(fileName(line, defaultSettings)).toBe("Quarterly Report Q3 Final");
    expect(fileName(line, settings({ case: "lower", spaces: "dash" }))).toBe(
      "quarterly-report-q3-final",
    );
    expect(fileName(line, settings({ case: "upper", spaces: "underscore" }))).toBe(
      "QUARTERLY_REPORT_Q3_FINAL",
    );
  });

  it("shortens without leaving a separator at the end", () => {
    expect(
      fileName("Quarterly report", settings({ case: "lower", spaces: "dash", maxLength: 10 })),
    ).toBe("quarterly");
  });

  it("refuses what leaves nothing and guards reserved names", () => {
    expect(fileName("???", defaultSettings)).toBeNull();
    expect(fileName("con", defaultSettings)).toBe("_con");
    expect(fileName("COM1.txt", defaultSettings)).toBe("_COM1.txt");
    expect(fileName("Compass", defaultSettings)).toBe("Compass");
  });
});

describe("numbered", () => {
  it("numbers in the settings' style", () => {
    expect(numbered("Report", 2, defaultSettings)).toBe("Report (2)");
    expect(numbered("report", 3, settings({ spaces: "dash" }))).toBe("report-3");
  });
});
