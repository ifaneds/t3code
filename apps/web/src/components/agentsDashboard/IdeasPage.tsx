import {
  threadRuntimeIsActive,
  type EnvironmentThreadShell,
} from "@t3tools/client-runtime/state/models";
import { canSnooze } from "@t3tools/client-runtime/state/thread-settled";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { useNowMinute } from "../../hooks/useNowMinute";
import { newMessageId } from "../../lib/utils";
import { useQuietThreadShells } from "../../state/entities";
import { threadEnvironment } from "../../state/threads";
import { useOrchestrationCommand } from "../../state/use-orchestration-command";
import { Button } from "../ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "../ui/empty";
import { AgentsDashboardShell } from "./AgentsDashboardShell";
import { AGENT_STATE_META, useThreadPlaceLabel } from "./AgentTileCard";
import {
  IDEA_TAG,
  buildIdeaList,
  nextMorning,
  resolveAgentTileState,
} from "./agentsDashboard.logic";

const APPROVE_MESSAGE = "Approved. Go ahead and implement the plan.";

const MORNING_PROMPT = `Look over this project for the three most worthwhile improvements: bugs, missing tests, slow code, or rough edges. For each one, call create_threads with a short title, tags ["${IDEA_TAG}"], interactionMode "plan", and a prompt that says what to change and why it matters. Do not change anything yourself.`;

export function IdeasPage() {
  const threads = useQuietThreadShells();
  const now = useNowMinute();
  const placeLabel = useThreadPlaceLabel();
  const ideas = buildIdeaList(threads, now);

  return (
    <AgentsDashboardShell title="Ideas">
      <div className="mx-auto flex max-w-2xl flex-col gap-2">
        {ideas.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No ideas waiting</EmptyTitle>
              <EmptyDescription>
                Agents put proposals here when they tag a thread “{IDEA_TAG}”. To get a few each
                morning, add a daily scheduled task with this prompt:
              </EmptyDescription>
            </EmptyHeader>
            <pre className="w-full whitespace-pre-wrap rounded-lg border border-border bg-card p-3 text-left text-xs">
              {MORNING_PROMPT}
            </pre>
            <Link to="/settings/scheduled-tasks" className="text-sm text-foreground underline">
              Open scheduled tasks
            </Link>
          </Empty>
        ) : (
          ideas.map((thread) => (
            <IdeaCard
              key={`${thread.environmentId}:${thread.id}`}
              thread={thread}
              place={placeLabel(thread)}
              now={now}
            />
          ))
        )}
      </div>
    </AgentsDashboardShell>
  );
}

function IdeaCard(props: {
  readonly thread: EnvironmentThreadShell;
  readonly place: string;
  readonly now: string;
}) {
  const { thread } = props;
  const startTurn = useOrchestrationCommand(threadEnvironment.startTurn);
  const setTag = useOrchestrationCommand(threadEnvironment.setTag);
  const interrupt = useOrchestrationCommand(threadEnvironment.interruptTurn);
  // The tag is what keeps a rejected idea out of the inbox; settling is tidy-up the server may refuse.
  const settle = useOrchestrationCommand(threadEnvironment.settle, { reportFailure: false });
  const snooze = useOrchestrationCommand(threadEnvironment.snooze);
  const [busy, setBusy] = useState(false);
  const state = resolveAgentTileState(thread);
  const { Icon, tone } = AGENT_STATE_META[state];
  const status = thread.hasActionableProposedPlan
    ? "Plan ready"
    : state === "working"
      ? "Planning"
      : AGENT_STATE_META[state].label;
  const target = { environmentId: thread.environmentId };
  const ref = { threadId: thread.id };

  const run = async (action: () => Promise<{ readonly _tag: string }>) => {
    setBusy(true);
    await action();
    setBusy(false);
  };
  const approve = () =>
    run(async () => {
      const sent = await startTurn({
        ...target,
        input: {
          ...ref,
          message: {
            messageId: newMessageId(),
            role: "user",
            text: APPROVE_MESSAGE,
            attachments: [],
          },
          runtimeMode: thread.runtimeMode,
          interactionMode: "default",
        },
      });
      // Untag only once the go-ahead is accepted, so a failed send leaves the idea in the inbox.
      if (sent._tag === "Failure") return sent;
      return setTag({ ...target, input: { ...ref, tag: IDEA_TAG, tagged: false } });
    });

  const reject = () =>
    run(async () => {
      if (threadRuntimeIsActive(thread.runtime)) {
        const stopped = await interrupt({ ...target, input: ref });
        if (stopped._tag === "Failure") return stopped;
      }
      const untagged = await setTag({ ...target, input: { ...ref, tag: IDEA_TAG, tagged: false } });
      if (untagged._tag === "Failure") return untagged;
      return settle({ ...target, input: ref });
    });

  return (
    <article className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <Link
        to="/$environmentId/$threadId"
        params={{ environmentId: thread.environmentId, threadId: thread.id }}
        className="flex items-start gap-2"
      >
        <Icon className={`mt-0.5 size-4 shrink-0 ${tone}`} aria-hidden />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-medium">{thread.title}</span>
          <span className="truncate text-xs text-muted-foreground">
            {status}
            {props.place ? ` · ${props.place}` : ""}
          </span>
        </span>
      </Link>
      <div className="flex gap-2">
        <Button size="compact" disabled={busy} onClick={() => void approve()}>
          Approve
        </Button>
        <Button size="compact" variant="outline" disabled={busy} onClick={() => void reject()}>
          Reject
        </Button>
        {/* A thread waiting on you ignores snooze, so Later would do nothing. */}
        {canSnooze(thread, { now: props.now }) ? (
          <Button
            size="compact"
            variant="ghost"
            disabled={busy}
            onClick={() =>
              void run(() =>
                snooze({ ...target, input: { ...ref, snoozedUntil: nextMorning(new Date()) } }),
              )
            }
          >
            Later
          </Button>
        ) : null}
      </div>
    </article>
  );
}
