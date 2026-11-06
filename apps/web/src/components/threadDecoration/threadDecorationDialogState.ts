import type { ScopedThreadRef } from "@t3tools/contracts";
import { Atom } from "effect/reactivity";

import { appAtomRegistry } from "~/rpc/atomRegistry";

/** Opened from the grid, sidebar, and chat header menus, so it renders once at the root. */
export const threadDecorationDialogAtom = Atom.make<ScopedThreadRef | null>(null).pipe(
  Atom.keepAlive,
  Atom.withLabel("thread-decoration:dialog-thread"),
);

export function openThreadDecorationDialog(threadRef: ScopedThreadRef): void {
  appAtomRegistry.set(threadDecorationDialogAtom, threadRef);
}
