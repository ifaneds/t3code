import type { ThreadRuntimeSummary } from "@t3tools/client-runtime/state/models";
import { ProviderInstanceId, ThreadId } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import { makeThreadFixture, type ThreadFixtureOverrides } from "../../test-fixtures";
import {
  buildAgentTiles,
  buildTodayFeed,
  resolveAgentTileState,
  type AgentTileState,
} from "./agentsDashboard.logic";

const NOW = "2026-03-09T12:00:00.000Z";
const COMPLETED_AT = "2026-03-09T10:05:00.000Z";

function runtime(status: ThreadRuntimeSummary["status"]): ThreadRuntimeSummary {
  return {
    status,
    activeRunId: null,
    providerInstanceId: ProviderInstanceId.make("codex"),
    providerName: "Codex",
    lastError: null,
    updatedAt: COMPLETED_AT,
  };
}

function latestRun(status: "completed" | "failed") {
  return {
    runId: "run-1" as never,
    status,
    assistantMessageId: null,
    requestedAt: "2026-03-09T10:00:00.000Z",
    startedAt: "2026-03-09T10:00:00.000Z",
    completedAt: COMPLETED_AT,
  };
}

function thread(id: string, overrides: ThreadFixtureOverrides = {}) {
  return makeThreadFixture({ id: ThreadId.make(id), ...overrides });
}

describe("resolveAgentTileState", () => {
  it.each<[string, ThreadFixtureOverrides, AgentTileState]>([
    [
      "a pending approval",
      { hasPendingApprovals: true, runtime: runtime("running") },
      "permission",
    ],
    ["a pending question", { hasPendingUserInput: true, runtime: runtime("running") }, "question"],
    ["a guest message", { pendingGuestMessageCount: 1 }, "guest"],
    ["a running turn", { runtime: runtime("running") }, "working"],
    [
      "a turn blocked on another thread",
      { runtime: runtime("running"), blockedOnThreadWait: true },
      "waiting",
    ],
    [
      "an idle session after an unopened completion",
      { runtime: runtime("idle"), latestRun: latestRun("completed"), lastVisitedAt: null },
      "done",
    ],
    [
      "a completion the user has already opened",
      {
        runtime: runtime("idle"),
        latestRun: latestRun("completed"),
        lastVisitedAt: "2026-03-09T11:00:00.000Z",
      },
      "idle",
    ],
    ["a failed runtime", { runtime: runtime("failed") }, "failed"],
    [
      "an unopened failed run",
      { latestRun: latestRun("failed"), lastVisitedAt: "2026-03-09T09:00:00.000Z" },
      "failed",
    ],
    ["a thread that never ran", {}, "idle"],
  ])("maps %s", (_name, overrides, expected) => {
    expect(resolveAgentTileState(thread("t", overrides))).toBe(expected);
  });
});

describe("buildAgentTiles", () => {
  it("keeps live threads only, most urgent first", () => {
    const tiles = buildAgentTiles(
      [
        thread("idle"),
        thread("working", { runtime: runtime("running") }),
        thread("settled", { settledOverride: "settled", hasPendingApprovals: true }),
        thread("archived", { archivedAt: NOW }),
        thread("snoozed", {
          snoozedUntil: "2099-01-01T00:00:00.000Z",
          snoozedAt: NOW,
          runtime: runtime("running"),
        }),
        thread("permission", { hasPendingApprovals: true, runtime: runtime("running") }),
      ],
      NOW,
    );

    expect(tiles.map((tile) => tile.thread.id)).toEqual(["permission", "working", "idle"]);
  });
});

describe("buildTodayFeed", () => {
  it("splits work waiting on the user from finished work they have not opened", () => {
    const feed = buildTodayFeed(
      buildAgentTiles(
        [
          thread("question", { hasPendingUserInput: true, runtime: runtime("running") }),
          thread("unseen-done", { latestRun: latestRun("completed"), lastVisitedAt: null }),
          thread("seen-failure", {
            runtime: runtime("failed"),
            latestRun: latestRun("failed"),
            lastVisitedAt: "2026-03-09T11:00:00.000Z",
          }),
          thread("working", { runtime: runtime("running") }),
        ],
        NOW,
      ),
    );

    expect(feed.needsYou.map((tile) => tile.thread.id)).toEqual(["question"]);
    expect(feed.toReview.map((tile) => tile.thread.id)).toEqual(["unseen-done"]);
  });
});
