import type { ComponentProps } from "react";

import { keepHeader } from "@/layout";
import { DialogRoot as SharedDialogRoot } from "@my-app/ui/dialog";

export * from "@my-app/ui/dialog";

/** The shared dialog, with the app's header kept usable while it's open (`keepHeader`). */
export function DialogRoot(props: ComponentProps<typeof SharedDialogRoot>) {
  return <SharedDialogRoot persistentElements={keepHeader} {...props} />;
}
