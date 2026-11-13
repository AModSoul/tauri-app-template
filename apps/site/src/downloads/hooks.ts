import { useEffect, useState, useSyncExternalStore } from "react";

import type { ReleaseState } from "@/components/DownloadPanel";
import { detectArch, detectOs } from "@/utils/platform";

import type { Arch, Os } from "./artifacts";
import { fetchLatestRelease, type Release } from "./github";

/**
 * The latest release: `built`, the one the site was built with, at once when there is one, then
 * whatever GitHub says now. A failed refresh keeps `built` rather than showing an error.
 */
export function useLatestRelease(built: Release | null = null): ReleaseState {
  const [state, setState] = useState<ReleaseState>(() =>
    built ? { status: "ready", release: built } : { status: "loading" },
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchLatestRelease({ signal: controller.signal }).then(
      (release) => setState({ status: "ready", release }),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "Something went wrong.";
        setState((current) =>
          current.status === "ready" ? current : { status: "error", message },
        );
      },
    );
    return () => controller.abort();
  }, []);

  return state;
}

/** The visitor's system never changes while the page is open. */
const noChanges = () => () => {};

/** The visitor's system and processor, as far as the browser says. Nothing while the site is
 * built, and so nothing while the page hydrates, which must match the built HTML; the browser's
 * answer comes straight after. */
export function useVisitorPlatform(): { os: Os | null; arch: Arch | null } {
  const os = useSyncExternalStore(
    noChanges,
    () => detectOs(navigator),
    () => null,
  );
  const [arch, setArch] = useState<Arch | null>(null);

  useEffect(() => {
    let current = true;
    void detectArch(navigator).then((detected) => {
      if (current) setArch(detected);
    });
    return () => {
      current = false;
    };
  }, []);

  return { os, arch };
}
