import { createFileRoute } from "@tanstack/react-router";

import { TodayPage } from "../components/agentsDashboard/TodayPage";

export const Route = createFileRoute("/_chat/today")({
  component: TodayPage,
});
