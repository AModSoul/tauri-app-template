import type { ComponentProps } from "react";

import { keepHeader } from "@/layout";
import { DrawerRoot as SharedDrawerRoot } from "@my-app/ui/drawer";

export * from "@my-app/ui/drawer";

/** The shared drawer, with the app's header kept usable while it's open (`keepHeader`). */
export function DrawerRoot(props: ComponentProps<typeof SharedDrawerRoot>) {
  return <SharedDrawerRoot persistentElements={keepHeader} {...props} />;
}
