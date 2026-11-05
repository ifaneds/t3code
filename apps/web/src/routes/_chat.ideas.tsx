import { createFileRoute } from "@tanstack/react-router";

import { IdeasPage } from "../components/agentsDashboard/IdeasPage";

export const Route = createFileRoute("/_chat/ideas")({
  component: IdeasPage,
});
