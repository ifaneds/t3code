import { useAtomValue } from "@effect/atom-react";
import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import { Link } from "@tanstack/react-router";
import { ChevronRightIcon } from "lucide-react";
import type { ReactNode } from "react";

import { useNowMinute } from "../../hooks/useNowMinute";
import { useQuietThreadShells } from "../../state/entities";
import { usePullRequestsSupported } from "../../state/environments";
import { environmentThreadDetails } from "../../state/threads";
import { ChildApproval } from "../chat/ChildThreadApprovals";
import { PullRequestGlyph } from "../pullRequest/pullRequestIcons";
import { readPullRequestListPreferences } from "../pullRequest/pullRequestListPreferences";
import { RelativeTime } from "../RelativeTime";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "../ui/empty";
import { AgentsDashboardShell } from "./AgentsDashboardShell";
import { AGENT_STATE_META, useThreadPlaceLabel } from "./AgentTileCard";
import { buildAgentTiles, buildTodayFeed, type AgentTile } from "./agentsDashboard.logic";

export function TodayPage() {
  const threads = useQuietThreadShells();
  const now = useNowMinute();
  const placeLabel = useThreadPlaceLabel();
  const pullRequestsSupported = usePullRequestsSupported();
  const { needsYou, toReview } = buildTodayFeed(buildAgentTiles(threads, now));

  return (
    <AgentsDashboardShell title="Today">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <FeedSection title="Needs you" count={needsYou.length}>
          {needsYou.length === 0 ? (
            <p className="text-sm text-muted-foreground">No agent is waiting on you.</p>
          ) : (
            needsYou.map((tile) => (
              <NeedsYouItem
                key={`${tile.thread.environmentId}:${tile.thread.id}`}
                tile={tile}
                place={placeLabel(tile.thread)}
              />
            ))
          )}
        </FeedSection>
        <FeedSection title="To review" count={toReview.length}>
          {toReview.map((tile) => (
            <FeedRow
              key={`${tile.thread.environmentId}:${tile.thread.id}`}
              tile={tile}
              place={placeLabel(tile.thread)}
            />
          ))}
          {pullRequestsSupported ? (
            <Link
              to="/pull-requests"
              search={{ ...readPullRequestListPreferences(), involvement: "reviewing" }}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-sm hover:bg-accent/40"
            >
              <PullRequestGlyph.pullRequest
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span className="flex-1">Pull requests waiting on your review</span>
              <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden />
            </Link>
          ) : null}
          {toReview.length === 0 && !pullRequestsSupported ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>All caught up</EmptyTitle>
                <EmptyDescription>
                  Finished and failed work you haven't opened shows up here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}
        </FeedSection>
      </div>
    </AgentsDashboardShell>
  );
}

function FeedSection(props: {
  readonly title: string;
  readonly count: number;
  readonly children: ReactNode;
}) {
  return (
    <section aria-label={props.title} className="flex flex-col gap-2">
      <h2 className="text-xs font-medium text-muted-foreground">
        {props.title} · {props.count}
      </h2>
      {props.children}
    </section>
  );
}

function FeedRow(props: {
  readonly tile: AgentTile;
  readonly place: string;
  readonly detail?: string;
}) {
  const { thread, state } = props.tile;
  const { label, Icon, tone } = AGENT_STATE_META[state];
  return (
    <Link
      to="/$environmentId/$threadId"
      params={{ environmentId: thread.environmentId, threadId: thread.id }}
      className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 hover:bg-accent/40"
    >
      <Icon className={`mt-0.5 size-4 shrink-0 ${tone}`} aria-hidden />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium">{thread.title}</span>
        {props.detail ? <span className="text-sm text-foreground/80">{props.detail}</span> : null}
        <span className="truncate text-xs text-muted-foreground">
          {label} · <RelativeTime timestamp={thread.updatedAt} />
          {props.place ? ` · ${props.place}` : ""}
        </span>
      </span>
      <ChevronRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}

/** Approvals answer in place; questions can have several parts, so they open the thread's answer panel. */
function NeedsYouItem(props: { readonly tile: AgentTile; readonly place: string }) {
  const { thread, state } = props.tile;
  const ref = scopeThreadRef(thread.environmentId, thread.id);
  // Only threads already waiting on you subscribe to their details.
  const requests = useAtomValue(environmentThreadDetails.pendingRequestsAtom(ref));
  const approvals = state === "permission" ? (requests?.approvals ?? []) : [];
  if (approvals.length > 0) {
    return approvals.map((approval) => (
      <ChildApproval
        key={approval.requestId}
        entry={{ thread: ref, title: thread.title, approval }}
      />
    ));
  }
  const question = requests?.userInputs[0]?.questions[0];
  return (
    <FeedRow
      tile={props.tile}
      place={props.place}
      {...(state === "question" && question ? { detail: question.question } : {})}
    />
  );
}
