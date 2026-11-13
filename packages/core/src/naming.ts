// File names: a line of text made safe as one path component on Windows, macOS and Linux, and
// styled as the user's settings say. The example run is built on it; keep `sanitize` for every
// file name the app ever writes, whatever replaces the example.

import type { Settings, Spaces } from "./types";

/** `line` as a file name (without an extension), styled by `settings`; `null` when nothing
 * usable is left of it. */
export function fileName(line: string, settings: Settings): string | null {
  let name = sanitize(line);
  if (settings.case === "lower") name = name.toLowerCase();
  if (settings.case === "upper") name = name.toUpperCase();
  const spacer = spacerFor(settings.spaces);
  if (spacer !== null) name = name.replaceAll(" ", spacer);
  name = Array.from(name)
    .slice(0, Math.max(1, settings.maxLength))
    .join("")
    .replace(/[. _-]+$/u, "");
  if (name === "") return null;
  return isReserved(name) ? `_${name}` : name;
}

/** `name` numbered as the `n`th of its name (`n` ≥ 2), in the settings' style. */
export function numbered(name: string, n: number, settings: Settings): string {
  const spacer = spacerFor(settings.spaces);
  return spacer === null ? `${name} (${n})` : `${name}${spacer}${n}`;
}

/** What a space becomes, or `null` to keep it. */
function spacerFor(spaces: Spaces): string | null {
  if (spaces === "dash") return "-";
  if (spaces === "underscore") return "_";
  return null;
}

/** A string made safe as one path component on Windows, macOS and Linux: no characters any of
 * them refuses, no control characters, single spaces, and no trailing dots or spaces (Windows
 * drops them). May be empty. */
export function sanitize(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\p{Cc}]/gu, "")
    .replace(/\s+/gu, " ")
    .trim()
    .replace(/[. ]+$/u, "");
}

/** Names Windows won't create a file as, with any extension. */
function isReserved(name: string): boolean {
  const base = (name.split(".")[0] ?? "").toUpperCase();
  return /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/u.test(base);
}
