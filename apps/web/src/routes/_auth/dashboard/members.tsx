import { SiteHeader } from "@/components/site-header";
import { useTRPC } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import z from "zod";

const searchSchema = z.object({
  tab: z.enum(["events", "members", "subgroups"]).optional(),
  subGroup: z.string().optional(),
  event: z.string().optional(),
});
export const Route = createFileRoute("/_auth/dashboard/members")({
  validateSearch: searchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = Route.useNavigate();
  const trpc = useTRPC();
  const overview = useQuery(trpc.spond.overview.queryOptions({}));
  const data = overview.data;
  return (
    <>
      <SiteHeader
        title="Medlemmer"
        onRefresh={() => overview.refetch()}
        refreshing={overview.isFetching}
      />
    </>
  );
}
