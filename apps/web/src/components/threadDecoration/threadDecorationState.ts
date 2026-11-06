import { useAtomValue } from "@effect/atom-react";
import { parseScopedThreadKey, scopedThreadKey } from "@t3tools/client-runtime/environment";
import type { ScopedThreadRef } from "@t3tools/contracts";
import { Atom } from "effect/reactivity";

import { serverEnvironment } from "~/state/server";
import { resolveThreadDecoration, sameThreadDecoration } from "./threadDecoration.logic";

// Every settings push rebuilds the map; equality keeps unrelated rows from re-rendering.
const threadDecorationAtom = Atom.family((threadKey: string) =>
  Atom.make((get) => {
    const threadRef = parseScopedThreadKey(threadKey);
    if (!threadRef) return null;
    const settings = get(serverEnvironment.settingsValueAtom(threadRef.environmentId));
    return resolveThreadDecoration(settings?.threadDecorations?.[threadRef.threadId]);
  }).pipe(
    Atom.withEquality(sameThreadDecoration),
    Atom.withLabel(`thread-decoration:${threadKey}`),
  ),
);

export function useThreadDecoration(threadRef: ScopedThreadRef) {
  return useAtomValue(threadDecorationAtom(scopedThreadKey(threadRef)));
}
