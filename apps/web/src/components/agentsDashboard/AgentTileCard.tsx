import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/models";
import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import type { ScopedThreadRef } from "@t3tools/contracts";
import { Link } from "@tanstack/react-router";
import { useRef } from "react";
import {
  CircleAlertIcon,
  CircleCheckIcon,
  CircleDotDashedIcon,
  EllipsisIcon,
  HourglassIcon,
  MessageCircleQuestionIcon,
  MoonIcon,
  ShieldQuestionIcon,
  UserRoundIcon,
  type LucideIcon,
} from "lucide-react";

import { cn } from "../../lib/utils";
import { useProjects } from "../../state/entities";
import { useEnvironments } from "../../state/environments";
import { RelativeTime } from "../RelativeTime";
import { ThreadDecorationLayers } from "../threadDecoration/ThreadDecorationDialog";
import { useThreadDecoration } from "../threadDecoration/threadDecorationState";
import { Button } from "../ui/button";
import type { AgentTile, AgentTileState } from "./agentsDashboard.logic";

export const AGENT_STATE_META: Record<
  AgentTileState,
  { readonly label: string; readonly Icon: LucideIcon; readonly tone: string }
> = {
  permission: {
    label: "Needs permission",
    Icon: ShieldQuestionIcon,
    tone: "text-amber-600 dark:text-amber-300/90",
  },
  question: {
    label: "Asked a question",
    Icon: MessageCircleQuestionIcon,
    tone: "text-indigo-600 dark:text-indigo-300/90",
  },
  guest: { label: "Guest request", Icon: UserRoundIcon, tone: "text-guest-foreground" },
  failed: { label: "Failed", Icon: CircleAlertIcon, tone: "text-red-600 dark:text-red-300/90" },
  done: {
    label: "Done",
    Icon: CircleCheckIcon,
    tone: "text-emerald-600 dark:text-emerald-300/90",
  },
  working: {
    label: "Working",
    Icon: CircleDotDashedIcon,
    tone: "text-sky-600 dark:text-sky-300/80",
  },
  waiting: { label: "Waiting", Icon: HourglassIcon, tone: "text-muted-foreground" },
  idle: { label: "Idle", Icon: MoonIcon, tone: "text-muted-foreground" },
};

/** "project · machine" for a thread; the machine is left out when only one is connected. */
export function useThreadPlaceLabel(): (thread: EnvironmentThreadShell) => string {
  const projects = useProjects();
  const { environments } = useEnvironments();
  const projectTitles = new Map(
    projects.map((project) => [`${project.environmentId}:${project.id}`, project.title] as const),
  );
  const machineLabels =
    environments.length > 1
      ? new Map(environments.map((environment) => [environment.environmentId, environment.label]))
      : null;
  return (thread) =>
    [
      projectTitles.get(`${thread.environmentId}:${thread.projectId}`),
      machineLabels?.get(thread.environmentId),
    ]
      .filter(Boolean)
      .join(" · ");
}

export function AgentTileCard(props: {
  readonly tile: AgentTile;
  readonly place: string;
  readonly renaming: boolean;
  readonly onOpenMenu: (threadRef: ScopedThreadRef, position: { x: number; y: number }) => void;
  /** `null` cancels. */
  readonly onFinishRename: (threadRef: ScopedThreadRef, title: string | null) => void;
}) {
  const { thread, state } = props.tile;
  const { label, Icon, tone } = AGENT_STATE_META[state];
  const threadRef = scopeThreadRef(thread.environmentId, thread.id);
  const decoration = useThreadDecoration(threadRef);
  const finishedRef = useRef(false);
  const finish = (title: string | null) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    props.onFinishRename(threadRef, title);
  };
  return (
    <div
      className={cn(
        "group relative min-w-0 overflow-hidden rounded-lg border border-border bg-card",
        state === "permission" && "border-warning/40",
        state === "question" && "border-info/40",
        state === "failed" && "border-destructive/40",
      )}
      onContextMenu={(event) => {
        if (props.renaming) return;
        event.preventDefault();
        props.onOpenMenu(threadRef, { x: event.clientX, y: event.clientY });
      }}
    >
      <ThreadDecorationLayers decoration={decoration} />
      {props.renaming ? (
        <div className="relative flex flex-col gap-1 p-3">
          <Icon className={cn("size-4 shrink-0", tone)} aria-hidden />
          <input
            autoFocus
            dir="auto"
            aria-label="Thread title"
            className="min-w-0 rounded-sm bg-transparent text-sm font-medium text-foreground outline-none ring-1 ring-inset ring-ring/50 focus:ring-ring"
            defaultValue={thread.title}
            onFocus={(event) => {
              finishedRef.current = false;
              event.currentTarget.select();
            }}
            onBlur={(event) => finish(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing || event.keyCode === 229) return;
              if (event.key === "Enter") finish(event.currentTarget.value);
              else if (event.key === "Escape") finish(null);
            }}
          />
        </div>
      ) : (
        <Link
          to="/$environmentId/$threadId"
          params={{ environmentId: thread.environmentId, threadId: thread.id }}
          className="relative flex min-w-0 flex-col gap-1 p-3 text-left hover:bg-accent/40"
        >
          <span className="flex items-center gap-1.5 pr-6">
            <Icon className={cn("size-4 shrink-0", tone)} aria-hidden />
            {decoration?.emoji ? (
              <span aria-hidden className="text-base leading-none">
                {decoration.emoji}
              </span>
            ) : null}
          </span>
          <span className="line-clamp-2 text-sm font-medium text-foreground">{thread.title}</span>
          <span className="text-xs text-muted-foreground">
            {label} · <RelativeTime timestamp={thread.updatedAt} />
          </span>
          {props.place ? (
            <span className="truncate text-xs text-muted-foreground/70">{props.place}</span>
          ) : null}
        </Link>
      )}
      {props.renaming ? null : (
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`Actions for ${thread.title}`}
          className="absolute top-1.5 right-1.5"
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            props.onOpenMenu(threadRef, { x: rect.left, y: rect.bottom + 4 });
          }}
        >
          <EllipsisIcon />
        </Button>
      )}
    </div>
  );
}
