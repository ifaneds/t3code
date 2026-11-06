import type { ThreadDecoration } from "@t3tools/contracts";

import { firstEmoji } from "../../projectIconOptions";
import { PROJECT_ICON_COLORS } from "../../projectIconColors";

export const THREAD_BACKGROUNDS = [
  {
    value: "sunset",
    label: "Sunset",
    className: "bg-linear-to-br from-orange-400/45 via-rose-400/25 to-fuchsia-500/45",
  },
  {
    value: "ocean",
    label: "Ocean",
    className: "bg-linear-to-br from-sky-400/45 via-cyan-400/25 to-blue-600/45",
  },
  {
    value: "forest",
    label: "Forest",
    className: "bg-linear-to-br from-emerald-500/45 via-lime-400/25 to-teal-600/45",
  },
  {
    value: "dusk",
    label: "Dusk",
    className: "bg-linear-to-br from-indigo-500/45 via-purple-500/25 to-pink-500/45",
  },
  {
    value: "citrus",
    label: "Citrus",
    className: "bg-linear-to-br from-yellow-300/45 via-amber-300/25 to-orange-400/45",
  },
  {
    value: "slate",
    label: "Slate",
    className: "bg-linear-to-br from-slate-400/45 via-gray-300/25 to-zinc-500/45",
  },
  {
    value: "grid",
    label: "Grid",
    className:
      "bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-size-[14px_14px]",
  },
  {
    value: "dots",
    label: "Dots",
    className:
      "bg-[radial-gradient(var(--color-border)_1.5px,transparent_1.5px)] bg-size-[12px_12px]",
  },
] as const;

export type ThreadColorPreset = (typeof PROJECT_ICON_COLORS)[number];
export type ThreadBackgroundPreset = (typeof THREAD_BACKGROUNDS)[number];

export interface ResolvedThreadDecoration {
  readonly color: ThreadColorPreset | null;
  readonly emoji: string | null;
  readonly background: ThreadBackgroundPreset | null;
}

/** Drops names this client does not know so a newer client's presets never break rendering. */
export function resolveThreadDecoration(
  raw: ThreadDecoration | undefined,
): ResolvedThreadDecoration | null {
  if (!raw) return null;
  const color = PROJECT_ICON_COLORS.find((option) => option.value === raw.color) ?? null;
  const emoji = raw.emoji ? firstEmoji(raw.emoji) : null;
  const background = THREAD_BACKGROUNDS.find((option) => option.value === raw.background) ?? null;
  return color || emoji || background ? { color, emoji, background } : null;
}

export function sameThreadDecoration(
  a: ResolvedThreadDecoration | null,
  b: ResolvedThreadDecoration | null,
): boolean {
  return (
    a === b ||
    (a !== null &&
      b !== null &&
      a.color === b.color &&
      a.emoji === b.emoji &&
      a.background === b.background)
  );
}

/** The settings entry for a decoration, or null to clear it when nothing is set. */
export function encodeThreadDecoration(
  decoration: ResolvedThreadDecoration | null,
): ThreadDecoration | null {
  if (!decoration) return null;
  const encoded = {
    ...(decoration.color ? { color: decoration.color.value } : {}),
    ...(decoration.emoji ? { emoji: decoration.emoji } : {}),
    ...(decoration.background ? { background: decoration.background.value } : {}),
  };
  return Object.keys(encoded).length > 0 ? encoded : null;
}
