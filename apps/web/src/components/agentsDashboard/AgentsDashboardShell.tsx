import { Link } from "@tanstack/react-router";
import { LayoutGridIcon, LightbulbIcon, ListChecksIcon } from "lucide-react";
import type { ReactNode } from "react";

import { isElectron } from "../../env";
import { SidebarInset } from "../ui/sidebar";
import { WorkspacePageHeader } from "../WorkspacePageHeader";

const TABS = [
  { to: "/agents", label: "Agents", Icon: LayoutGridIcon },
  { to: "/today", label: "Today", Icon: ListChecksIcon },
  { to: "/ideas", label: "Ideas", Icon: LightbulbIcon },
] as const;

export function AgentsDashboardShell(props: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <SidebarInset className="h-dvh min-h-0 overflow-hidden overscroll-y-none">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
        <WorkspacePageHeader electron={isElectron} className="border-b border-border">
          <h1 className="text-sm font-medium text-foreground">{props.title}</h1>
        </WorkspacePageHeader>
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{props.children}</main>
        <nav aria-label="Agents dashboard" className="flex shrink-0 border-t border-border pb-safe">
          {TABS.map(({ to, label, Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs text-muted-foreground"
              activeProps={{ className: "text-foreground", "aria-current": "page" }}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </SidebarInset>
  );
}
