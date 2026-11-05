import { useState } from "react";

import { useNowMinute } from "../../hooks/useNowMinute";
import { useQuietThreadShells } from "../../state/entities";
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
          {shown.map((tile) => (
            <AgentTileCard
              key={`${tile.thread.environmentId}:${tile.thread.id}`}
              tile={tile}
              place={placeLabel(tile.thread)}
            />
          ))}
        </div>
      )}
    </AgentsDashboardShell>
  );
}
