import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/models";
import { Link } from "@tanstack/react-router";
import {
  CircleAlertIcon,
  CircleCheckIcon,
  CircleDotDashedIcon,
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

export function AgentTileCard(props: { readonly tile: AgentTile; readonly place: string }) {
  const { thread, state } = props.tile;
  const { label, Icon, tone } = AGENT_STATE_META[state];
  return (
    <Link
      to="/$environmentId/$threadId"
      params={{ environmentId: thread.environmentId, threadId: thread.id }}
      className={cn(
        "flex min-w-0 flex-col gap-1 rounded-lg border border-border bg-card p-3 text-left hover:bg-accent/40",
        state === "permission" && "border-warning/40",
        state === "question" && "border-info/40",
        state === "failed" && "border-destructive/40",
      )}
    >
      <Icon className={cn("size-4 shrink-0", tone)} aria-hidden />
      <span className="line-clamp-2 text-sm font-medium text-foreground">{thread.title}</span>
      <span className="text-xs text-muted-foreground">
        {label} · <RelativeTime timestamp={thread.updatedAt} />
      </span>
      {props.place ? (
        <span className="truncate text-xs text-muted-foreground/70">{props.place}</span>
      ) : null}
    </Link>
  );
}
