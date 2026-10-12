import { Skeleton } from "@sporty/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { SiteHeader } from "@/components/site-header";
import { MembersTable } from "@/components/spond-tables";
import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/dashboard/subgroups/$subGroupId")({
	component: RouteComponent,
});

function RouteComponent() {
	const { subGroupId } = Route.useParams();
	const trpc = useTRPC();
	const overview = useQuery(trpc.spond.overview.queryOptions({}));
	const data = overview.data;

	const subGroup = data?.subGroups.find((s) => s.id === subGroupId);

	return (
		<>
			<SiteHeader
				title={subGroup?.name ?? "Undergruppe"}
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
						<MembersSkeleton />
					) : (
						<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
							<div className="flex items-center gap-2 px-4 lg:px-6">
								<span
									className="size-2.5 rounded-full bg-muted-foreground"
									style={
										subGroup?.color
											? { backgroundColor: subGroup.color }
											: undefined
									}
								/>
								<h2 className="text-lg font-semibold">{subGroup?.name}</h2>
								<span className="text-sm text-muted-foreground">
									{
										data.members.filter((m) =>
											m.subGroupIds.includes(subGroupId),
										).length
									}{" "}
									medlemmer
								</span>
							</div>
							<div className="flex flex-col gap-4 px-4 lg:px-6">
								<MembersTable
									members={data.members}
									subGroupId={subGroupId}
									canManagePeople={data.viewer.canManagePeople}
								/>
							</div>
						</div>
					)}
				</div>
			</div>
		</>
	);
}

// TODO: Update skeleton, dette er kopiert fra dashboard-skeletonet
function MembersSkeleton() {
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
