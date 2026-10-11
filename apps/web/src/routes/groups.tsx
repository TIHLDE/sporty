import { Badge } from "@sporty/ui/components/badge";
import { Button } from "@sporty/ui/components/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@sporty/ui/components/empty";
import { Skeleton } from "@sporty/ui/components/skeleton";
import { cn } from "@sporty/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import {
	ArrowLeftIcon,
	ChevronRightIcon,
	LogOutIcon,
	UsersIcon,
} from "lucide-react";
import * as React from "react";

import { GroupLogo } from "@/components/group-logo";
import SpinnerWaveHelix from "@/components/uiable/spinner/spinner-wave-helix";
import { getUser } from "@/functions/get-user";
import { setSelectedGroup } from "@/functions/selected-group";
import { authClient } from "@/lib/auth-client";
import { formatActivity } from "@/lib/format";
import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/groups")({
	component: GroupsComponent,
	beforeLoad: async () => {
		const session = await getUser();
		if (!session) {
			throw redirect({ to: "/" });
		}
	},
});

function GroupsComponent() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const groups = useQuery(trpc.spond.groups.queryOptions());

	const select = useMutation({
		mutationFn: (groupId: string) => setSelectedGroup({ data: { groupId } }),
		onSuccess: async () => {
			// Everything cached so far belongs to the previous group.
			queryClient.removeQueries();
			await navigate({ to: "/dashboard" });
		},
	});

	// Nothing to choose between: pick the only group straight away.
	const onlyGroup =
		groups.data?.length === 1 && !groups.data[0]?.selected
			? groups.data[0]
			: undefined;
	React.useEffect(() => {
		if (onlyGroup && select.isIdle) select.mutate(onlyGroup.id);
	}, [onlyGroup, select]);

	const { data: session } = authClient.useSession();
	const signOut = useMutation({
		mutationFn: () => authClient.signOut(),
		onSuccess: async () => {
			queryClient.removeQueries();
			await navigate({ to: "/" });
		},
	});

	const hasSelected = groups.data?.some((g) => g.selected) ?? false;

	return (
		<main className="flex min-h-svh flex-col items-center bg-background px-4 py-16">
			<div className="grid w-full max-w-lg gap-8">
				<div className="grid gap-2 text-center">
					<p className="text-sm font-medium tracking-[0.2em] text-muted-foreground uppercase">
						Sporty
					</p>
					<h1 className="text-3xl font-semibold tracking-tight">Velg gruppe</h1>
					<p className="text-balance text-muted-foreground">
						Statistikk, medlemmer og bøter vises for gruppen du velger. Du kan
						bytte senere fra menyen.
					</p>
				</div>

				{groups.isError ? (
					<div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
						Klarte ikke å hente gruppene fra Spond: {groups.error.message}
					</div>
				) : !groups.data ? (
					<div className="grid gap-3">
						{Array.from({ length: 3 }, (_, i) => (
							<Skeleton key={i} className="h-20 rounded-xl" />
						))}
					</div>
				) : groups.data.length === 0 ? (
					<Empty className="border border-dashed">
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<UsersIcon />
							</EmptyMedia>
							<EmptyTitle>Du er ikke medlem av noen grupper</EmptyTitle>
							<EmptyDescription>
								Vi fant deg ikke i noen av lagene på Spond. Er du med på et lag,
								be en administrator om å koble TIHLDE-brukeren din til Spond,
								eller laget til TIHLDE-gruppen sin.
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				) : (
					<ul className="grid gap-3">
						{groups.data.map((group) => {
							const pending = select.isPending && select.variables === group.id;
							return (
								<li key={group.id}>
									<button
										type="button"
										disabled={select.isPending}
										onClick={() => select.mutate(group.id)}
										className={cn(
											"flex w-full items-center gap-4 rounded-xl bg-card p-4 text-left text-card-foreground shadow-xs ring-1 ring-foreground/10 transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60",
											group.selected && "ring-2 ring-primary",
										)}
									>
										<GroupLogo
											name={group.name}
											imageUrl={group.imageUrl}
											className="size-12"
										/>
										<span className="grid min-w-0 flex-1 gap-0.5">
											<span className="flex items-center gap-2">
												<span className="truncate font-medium">
													{group.name}
												</span>
												{group.selected && (
													<Badge variant="secondary">Valgt</Badge>
												)}
											</span>
											<span className="text-sm text-muted-foreground">
												{[
													group.activity && formatActivity(group.activity),
													`${group.memberCount} ${group.memberCount === 1 ? "medlem" : "medlemmer"}`,
													group.subGroupCount > 0 &&
														`${group.subGroupCount} ${group.subGroupCount === 1 ? "undergruppe" : "undergrupper"}`,
												]
													.filter(Boolean)
													.join(" · ")}
											</span>
										</span>
										{pending ? (
											<SpinnerWaveHelix className="shrink-0" />
										) : (
											<ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
										)}
									</button>
								</li>
							);
						})}
					</ul>
				)}

				{select.isError && (
					<p className="text-center text-sm text-destructive">
						Klarte ikke å velge gruppe: {select.error.message}
					</p>
				)}

				<div className="grid justify-items-center gap-2">
					{hasSelected && (
						<Button
							variant="ghost"
							nativeButton={false}
							render={<Link to="/dashboard" />}
						>
							<ArrowLeftIcon />
							Tilbake til dashboard
						</Button>
					)}
					<div className="flex flex-wrap items-center justify-center gap-x-1 text-sm text-muted-foreground">
						{session && <span>Innlogget som {session.user.name}.</span>}
						<Button
							variant="link"
							size="sm"
							className="h-auto px-1 text-muted-foreground"
							disabled={signOut.isPending}
							onClick={() => signOut.mutate()}
						>
							<LogOutIcon />
							Logg ut
						</Button>
					</div>
				</div>
			</div>
		</main>
	);
}
