import { useAtomValue } from "@effect/atom-react";
import type { ScopedThreadRef } from "@t3tools/contracts";
import { BanIcon } from "lucide-react";
import { useState } from "react";

import { cn } from "~/lib/utils";
import { appAtomRegistry } from "~/rpc/atomRegistry";
import { useThreadShell } from "~/state/entities";
import { useUpdateEnvironmentSettings } from "~/hooks/useSettings";
import { PROJECT_EMOJIS, firstEmoji } from "../../projectIconOptions";
import { PROJECT_ICON_COLORS } from "../../projectIconColors";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import {
  THREAD_BACKGROUNDS,
  encodeThreadDecoration,
  type ResolvedThreadDecoration,
} from "./threadDecoration.logic";
import { threadDecorationDialogAtom } from "./threadDecorationDialogState";
import { useThreadDecoration } from "./threadDecorationState";

const SWATCH_BUTTON =
  "flex size-7 items-center justify-center rounded-full border border-transparent outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";

export function ThreadDecorationDialogHost() {
  const threadRef = useAtomValue(threadDecorationDialogAtom);
  if (threadRef === null) return null;
  return (
    <ThreadDecorationDialog
      key={`${threadRef.environmentId}:${threadRef.threadId}`}
      threadRef={threadRef}
      onClose={() => appAtomRegistry.set(threadDecorationDialogAtom, null)}
    />
  );
}

/** Tint, stripe, and background layers behind a decorated surface; the parent is `relative`. */
export function ThreadDecorationLayers(props: {
  readonly decoration: ResolvedThreadDecoration | null;
}) {
  const { decoration } = props;
  if (!decoration) return null;
  return (
    <>
      {decoration.background ? (
        <span
          aria-hidden
          className={cn("pointer-events-none absolute inset-0", decoration.background.className)}
        />
      ) : null}
      {decoration.color ? (
        <>
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0 opacity-10",
              decoration.color.swatchClassName,
            )}
          />
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 w-1",
              decoration.color.swatchClassName,
            )}
          />
        </>
      ) : null}
    </>
  );
}

function ThreadDecorationDialog(props: {
  readonly threadRef: ScopedThreadRef;
  readonly onClose: () => void;
}) {
  const { threadRef, onClose } = props;
  const thread = useThreadShell(threadRef);
  const decoration = useThreadDecoration(threadRef);
  const updateSettings = useUpdateEnvironmentSettings(threadRef.environmentId);
  const [customEmoji, setCustomEmoji] = useState("");

  const save = (next: ResolvedThreadDecoration) => {
    updateSettings({
      threadDecorations: { [threadRef.threadId]: encodeThreadDecoration(next) },
    });
  };
  const current: ResolvedThreadDecoration = decoration ?? {
    color: null,
    emoji: null,
    background: null,
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPopup className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Customize thread</DialogTitle>
          <DialogDescription>
            Shown in the agents grid and the sidebar on every device connected to this server.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <div className="flex flex-col gap-4">
            <div className="relative overflow-hidden rounded-lg border border-border bg-card p-3">
              <ThreadDecorationLayers decoration={decoration} />
              <span className="relative flex items-center gap-2 text-sm font-medium">
                {current.emoji ? <span aria-hidden>{current.emoji}</span> : null}
                <span className="truncate">{thread?.title ?? "Thread"}</span>
              </span>
            </div>

            <section>
              <div className="mb-2 text-xs font-medium text-muted-foreground">Color</div>
              <div className="flex flex-wrap gap-1" role="group" aria-label="Thread color">
                <button
                  type="button"
                  aria-label="No color"
                  aria-pressed={current.color === null}
                  className={cn(SWATCH_BUTTON, current.color === null && "border-foreground/64")}
                  onClick={() => save({ ...current, color: null })}
                >
                  <BanIcon className="size-4 text-muted-foreground" />
                </button>
                {PROJECT_ICON_COLORS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-label={option.label}
                    aria-pressed={current.color?.value === option.value}
                    className={cn(
                      SWATCH_BUTTON,
                      current.color?.value === option.value && "border-foreground/64",
                    )}
                    onClick={() => save({ ...current, color: option })}
                  >
                    <span className={cn("size-5 rounded-full", option.swatchClassName)} />
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-2 text-xs font-medium text-muted-foreground">Emoji</div>
              <ScrollArea scrollFade className="max-h-36">
                <div className="grid grid-cols-8 gap-1 p-0.5 sm:grid-cols-10">
                  <button
                    type="button"
                    aria-label="No emoji"
                    aria-pressed={current.emoji === null}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-md border border-transparent outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                      current.emoji === null && "border-border bg-accent",
                    )}
                    onClick={() => save({ ...current, emoji: null })}
                  >
                    <BanIcon className="size-4 text-muted-foreground" />
                  </button>
                  {PROJECT_EMOJIS.map((option) => (
                    <button
                      key={option.emoji}
                      type="button"
                      aria-label={option.label}
                      aria-pressed={current.emoji === option.emoji}
                      className={cn(
                        "flex aspect-square items-center justify-center rounded-md border border-transparent text-xl outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                        current.emoji === option.emoji && "border-border bg-accent",
                      )}
                      onClick={() => save({ ...current, emoji: option.emoji })}
                    >
                      {option.emoji}
                    </button>
                  ))}
                </div>
              </ScrollArea>
              <Input
                className="mt-2"
                value={customEmoji}
                aria-label="Custom emoji"
                placeholder="Or paste any emoji"
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setCustomEmoji(value);
                  const emoji = firstEmoji(value);
                  if (emoji && emoji !== current.emoji) save({ ...current, emoji });
                }}
              />
            </section>

            <section>
              <div className="mb-2 text-xs font-medium text-muted-foreground">Background</div>
              <div
                className="grid grid-cols-3 gap-1.5 sm:grid-cols-5"
                role="group"
                aria-label="Background"
              >
                <button
                  type="button"
                  aria-pressed={current.background === null}
                  className={cn(
                    "flex h-10 items-center justify-center rounded-md border border-border text-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    current.background === null && "ring-2 ring-inset ring-foreground/64",
                  )}
                  onClick={() => save({ ...current, background: null })}
                >
                  None
                </button>
                {THREAD_BACKGROUNDS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={current.background?.value === option.value}
                    className={cn(
                      "flex h-10 items-end rounded-md border border-border p-1 text-2xs text-foreground/80 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                      option.className,
                      current.background?.value === option.value &&
                        "ring-2 ring-inset ring-foreground/64",
                    )}
                    onClick={() => save({ ...current, background: option })}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>
          </div>
        </DialogPanel>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={decoration === null}
            onClick={() => save({ color: null, emoji: null, background: null })}
          >
            Reset
          </Button>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

/** Compact colour dot and emoji for list rows. */
export function ThreadDecorationMarker(props: { readonly threadRef: ScopedThreadRef }) {
  const decoration = useThreadDecoration(props.threadRef);
  if (!decoration || (!decoration.color && !decoration.emoji)) return null;
  return (
    <span aria-hidden className="flex shrink-0 items-center gap-1">
      {decoration.color ? (
        <span className={cn("size-2 rounded-full", decoration.color.swatchClassName)} />
      ) : null}
      {decoration.emoji ? <span className="text-xs leading-none">{decoration.emoji}</span> : null}
    </span>
  );
}
