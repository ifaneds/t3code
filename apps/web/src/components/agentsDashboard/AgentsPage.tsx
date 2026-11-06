import { scopedThreadKey } from "@t3tools/client-runtime/environment";
import {
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
} from "@t3tools/client-runtime/state/runtime";
import { AuthOrchestrationOperateScope, type ScopedThreadRef } from "@t3tools/contracts";
import { useState } from "react";

import { useNowMinute } from "../../hooks/useNowMinute";
import { useThreadActionMenu } from "../../hooks/useThreadActionMenu";
import { readThreadShell, useQuietThreadShells } from "../../state/entities";
import { readEnvironmentScope } from "../../state/session";
import { threadEnvironment } from "../../state/threads";
import { useOrchestrationCommand } from "../../state/use-orchestration-command";
import { toastManager } from "../ui/toast";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "../ui/empty";
import { Toggle, ToggleGroup } from "../ui/toggle-group";
import { AgentsDashboardShell } from "./AgentsDashboardShell";
import { AgentTileCard, useThreadPlaceLabel } from "./AgentTileCard";
import { agentMatchesFilter, buildAgentTiles, type AgentFilter } from "./agentsDashboard.logic";

const FILTERS: ReadonlyArray<{ readonly value: AgentFilter; readonly label: string }> = [
  { value: "needs-you", label: "Needs you" },
  { value: "working", label: "Working" },
  { value: "all", label: "All" },
];

export function AgentsPage() {
  const threads = useQuietThreadShells();
  const now = useNowMinute();
  const placeLabel = useThreadPlaceLabel();
  const [filter, setFilter] = useState<AgentFilter>("all");
  const [renamingKey, setRenamingKey] = useState<string | null>(null);
  const updateThreadMetadata = useOrchestrationCommand(threadEnvironment.updateMetadata, {
    reportFailure: false,
  });
  const { openMenu } = useThreadActionMenu({
    threadRef: null,
    projectCwd: null,
    onStartRename: (threadRef) => {
      if (!readEnvironmentScope(threadRef.environmentId, AuthOrchestrationOperateScope)) return;
      setRenamingKey(scopedThreadKey(threadRef));
    },
  });
  const finishRename = (threadRef: ScopedThreadRef, title: string | null) => {
    setRenamingKey(null);
    const trimmed = title?.trim() ?? "";
    const original = readThreadShell(threadRef)?.title;
    if (title === null || trimmed === original) return;
    if (trimmed.length === 0) {
      toastManager.add({ type: "warning", title: "Thread title cannot be empty" });
      return;
    }
    void updateThreadMetadata({
      environmentId: threadRef.environmentId,
      input: { threadId: threadRef.threadId, title: trimmed },
    }).then((result) => {
      if (result._tag === "Failure" && !isAtomCommandInterrupted(result)) {
        const error = squashAtomCommandFailure(result);
        toastManager.add({
          type: "error",
          title: "Failed to rename thread",
          description: error instanceof Error ? error.message : "An error occurred.",
        });
      }
    });
  };
  const tiles = buildAgentTiles(threads, now);
  const shown = tiles.filter((tile) => agentMatchesFilter(tile.state, filter));

  return (
    <AgentsDashboardShell title="Agents">
      <ToggleGroup
        value={[filter]}
        onValueChange={(next) => {
          const value = FILTERS.find((option) => option.value === next[0])?.value;
          if (value !== undefined) setFilter(value);
        }}
        aria-label="Filter agents"
        className="mb-3 flex-wrap"
      >
        {FILTERS.map((option) => (
          <Toggle key={option.value} value={option.value} variant="pill">
            {option.label}{" "}
            {tiles.filter((tile) => agentMatchesFilter(tile.state, option.value)).length}
          </Toggle>
        ))}
      </ToggleGroup>
      {shown.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>
              {filter === "needs-you" ? "Nothing needs you" : "No agents here"}
            </EmptyTitle>
            <EmptyDescription>
              {filter === "needs-you"
                ? "Agents waiting on a permission or an answer show up here."
                : "Start a thread and it shows up here."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((tile) => {
            const key = `${tile.thread.environmentId}:${tile.thread.id}`;
            return (
              <AgentTileCard
                key={key}
                tile={tile}
                place={placeLabel(tile.thread)}
                renaming={renamingKey === key}
                onOpenMenu={(threadRef, position) => openMenu(position, threadRef)}
                onFinishRename={finishRename}
              />
            );
          })}
        </div>
      )}
    </AgentsDashboardShell>
  );
}
