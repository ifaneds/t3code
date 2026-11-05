import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/models";
import { effectiveSnoozed } from "@t3tools/client-runtime/state/thread-settled";

import { isSidebarHiddenThread, resolveSidebarThreadStatus } from "../Sidebar.logic";

export type AgentTileState =
  | "permission"
  | "question"
  | "guest"
  | "failed"
  | "done"
  | "working"
  | "waiting"
  | "idle";

export type AgentFilter = "needs-you" | "working" | "all";

const STATE_PRIORITY: Record<AgentTileState, number> = {
  permission: 0,
  question: 1,
  guest: 2,
  failed: 3,
  done: 4,
  working: 5,
  waiting: 6,
  idle: 7,
};

/** Never-opened threads count as unreviewed, so work started by schedules and other agents surfaces. */
function isUnreviewed(thread: EnvironmentThreadShell): boolean {
  const completedAt = Date.parse(thread.latestRun?.completedAt ?? "");
  if (Number.isNaN(completedAt)) return false;
  const lastVisitedAt = Date.parse(thread.lastVisitedAt ?? "");
  return Number.isNaN(lastVisitedAt) || completedAt > lastVisitedAt;
}

export function resolveAgentTileState(thread: EnvironmentThreadShell): AgentTileState {
  switch (resolveSidebarThreadStatus(thread)) {
    case "approval":
      return "permission";
    case "input":
      return "question";
    case "request":
      return "guest";
    case "preparing":
    case "working":
      return "working";
    case "failed":
    case "limited":
      return "failed";
    case "waiting":
      // The sidebar also calls an idle provider session "waiting"; only a thread blocked on another one is.
      if (thread.runtime?.status === "running") return "waiting";
      break;
    case "ready":
      break;
  }
  if (!isUnreviewed(thread)) return "idle";
  if (thread.latestRun?.status === "failed") return "failed";
  return thread.latestRun?.status === "completed" ? "done" : "idle";
}

function agentNeedsYou(state: AgentTileState): boolean {
  return state === "permission" || state === "question" || state === "guest";
}

export function agentMatchesFilter(state: AgentTileState, filter: AgentFilter): boolean {
  if (filter === "needs-you") return agentNeedsYou(state);
  if (filter === "working") return state === "working" || state === "waiting";
  return true;
}

function isLiveThread(thread: EnvironmentThreadShell, now: string): boolean {
  return (
    thread.archivedAt === null &&
    thread.deletedAt === null &&
    thread.settledOverride !== "settled" &&
    !isSidebarHiddenThread(thread) &&
    !effectiveSnoozed(thread, { now })
  );
}

/** Agents mark a proposal with this tag when they create its thread; approving removes it. */
export const IDEA_TAG = "idea";

function isIdeaThread(thread: EnvironmentThreadShell): boolean {
  return thread.source.tags?.includes(IDEA_TAG) === true;
}

/** Open proposals, newest first. Rejected ideas are settled and later ones snoozed, so both drop out. */
export function buildIdeaList(
  threads: ReadonlyArray<EnvironmentThreadShell>,
  now: string,
): ReadonlyArray<EnvironmentThreadShell> {
  return threads
    .filter((thread) => isIdeaThread(thread) && isLiveThread(thread, now))
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** "Later" brings an idea back at 9am the next day, in the viewer's time zone. */
export function nextMorning(now: Date): string {
  const morning = new Date(now);
  morning.setDate(morning.getDate() + 1);
  morning.setHours(9, 0, 0, 0);
  return morning.toISOString();
}

export interface AgentTile {
  readonly thread: EnvironmentThreadShell;
  readonly state: AgentTileState;
}

/** Live threads the sidebar lists outside its Settled and Snoozed shelves, most urgent first. */
export function buildAgentTiles(
  threads: ReadonlyArray<EnvironmentThreadShell>,
  now: string,
): ReadonlyArray<AgentTile> {
  return threads
    .filter((thread) => isLiveThread(thread, now))
    .map((thread) => ({ thread, state: resolveAgentTileState(thread) }))
    .toSorted(
      (a, b) =>
        STATE_PRIORITY[a.state] - STATE_PRIORITY[b.state] ||
        b.thread.updatedAt.localeCompare(a.thread.updatedAt),
    );
}

export function buildTodayFeed(tiles: ReadonlyArray<AgentTile>): {
  readonly needsYou: ReadonlyArray<AgentTile>;
  readonly toReview: ReadonlyArray<AgentTile>;
} {
  return {
    needsYou: tiles.filter((tile) => agentNeedsYou(tile.state)),
    toReview: tiles.filter(
      (tile) =>
        (tile.state === "done" || tile.state === "failed") &&
        isUnreviewed(tile.thread) &&
        // Finished proposals wait in Ideas instead.
        !isIdeaThread(tile.thread),
    ),
  };
}
