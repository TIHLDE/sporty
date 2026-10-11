import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import z from "zod";

import { SiteHeader } from "@/components/site-header";
import { useTRPC } from "@/utils/trpc";

const searchSchema = z.object({
	tab: z.enum(["events", "members", "subgroups"]).optional(),
	subGroup: z.string().optional(),
	event: z.string().optional(),
});
export const Route = createFileRoute("/_auth/dashboard/events")({
	validateSearch: searchSchema,
	component: RouteComponent,
});

function RouteComponent() {
	const trpc = useTRPC();
	const overview = useQuery(trpc.spond.overview.queryOptions({}));
	return (
		<>
			<SiteHeader
				title="Arrangementer"
				onRefresh={() => overview.refetch()}
				refreshing={overview.isFetching}
			/>
		</>
	);
}
