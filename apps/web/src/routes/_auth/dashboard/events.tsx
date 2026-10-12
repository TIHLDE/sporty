import { Skeleton } from "@sporty/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import z from "zod";

import { EventDialog } from "@/components/event-dialog";
import { EventsSectionCards } from "@/components/events-section-cards";
import { SiteHeader } from "@/components/site-header";
import {
	type EventFilter,
	EventFilterSelect,
	EventsTable,
} from "@/components/spond-tables";
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
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const trpc = useTRPC();
	const overview = useQuery(trpc.spond.overview.queryOptions({}));
	const data = overview.data;

	const [eventFilter, setEventFilter] = useState<EventFilter>("upcoming");

	return (
		<>
			<SiteHeader
				title="Arrangementer"
				onRefresh={() => overview.refetch()}
				refreshing={overview.isFetching}
			/>
			<div className="flex flex-1 flex-col">
				<div className="@container/main flex flex-1 flex-col gap-2">
					{overview.isError ? (
						<div className="m-4 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground lg:m-6">
							Klarte ikke å hente data fra Spond: {overview.error.message}
						</div>
					) : !data ? (
						<EventsSkeleton />
					) : (
						<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
							<EventsSectionCards stats={data.stats} />
							<div className="flex items-center justify-between px-4 lg:px-6">
								<h2 className="text-lg font-semibold">Arrangementer</h2>
								<EventFilterSelect
									value={eventFilter}
									onChange={setEventFilter}
								/>
							</div>
							<div className="flex flex-col gap-4 px-4 lg:px-6">
								<EventsTable
									events={data.events}
									filter={eventFilter}
									onOpen={(event) =>
										navigate({ search: (prev) => ({ ...prev, event }) })
									}
								/>
							</div>
						</div>
					)}
				</div>
			</div>
			<EventDialog
				eventId={search.event}
				onOpenChange={(open) =>
					!open &&
					navigate({
						search: (prev) => ({ ...prev, event: undefined }),
						replace: true,
					})
				}
			/>
		</>
	);
}

// TODO: Update skeleton, dette er kopiert fra dashboard-skeletonet
function EventsSkeleton() {
	return (
		<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
				{Array.from({ length: 4 }, (_, i) => (
					<Skeleton key={i} className="h-40 rounded-xl" />
				))}
			</div>
			<div className="px-4 lg:px-6">
				<Skeleton className="h-[380px] rounded-xl" />
			</div>
			<div className="px-4 lg:px-6">
				<Skeleton className="h-64 rounded-xl" />
			</div>
		</div>
	);
}
