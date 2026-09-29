import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@sporty/ui/components/avatar";
import { Badge } from "@sporty/ui/components/badge";
import { Button } from "@sporty/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@sporty/ui/components/card";
import { Input } from "@sporty/ui/components/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@sporty/ui/components/select";
import { Skeleton } from "@sporty/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@sporty/ui/components/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	CircleCheckIcon,
	LinkIcon,
	PencilIcon,
	ScaleIcon,
	SearchIcon,
	ShieldAlertIcon,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { z } from "zod";

import { EventFinesCard, FineRulesForm } from "@/components/event-fines";
import {
	LinkPersonDialog,
	type LinkTarget,
} from "@/components/link-person-dialog";
import { SiteHeader } from "@/components/site-header";
import { formatDate, formatPercent } from "@/lib/format";
import { type RouterOutputs, useTRPC } from "@/utils/trpc";

type Person = RouterOutputs["people"]["list"][number];
type Filter = "all" | "unlinked" | "linked";

const filterLabels: Record<Filter, string> = {
	all: "Alle",
	unlinked: "Ikke koblet",
	linked: "Koblet",
};

export const Route = createFileRoute("/_auth/admin")({
	validateSearch: z.object({
		filter: z.enum(["all", "unlinked", "linked"]).optional(),
	}),
	component: AdminPage,
});

function AdminPage() {
	const trpc = useTRPC();
	const overview = useQuery(trpc.spond.overview.queryOptions({}));
	const canManage = overview.data?.viewer.canManagePeople ?? false;
	const people = useQuery({
		...trpc.people.list.queryOptions({}),
		enabled: canManage,
	});

	let content: React.ReactNode;
	if (overview.isPending || (canManage && people.isPending)) {
		content = <AdminSkeleton />;
	} else if (!canManage) {
		content = (
			<NoAccess signedInWithTihlde={overview.data?.viewer.signedInWithTihlde} />
		);
	} else if (people.data) {
		content = <PeopleAdmin people={people.data} />;
	}

	return (
		<>
			<SiteHeader
				title="Administrasjon"
				onRefresh={canManage ? () => people.refetch() : undefined}
				refreshing={people.isFetching}
			/>
			<div className="@container/main flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
				{content}
			</div>
		</>
	);
}

function NoAccess({ signedInWithTihlde }: { signedInWithTihlde?: boolean }) {
	return (
		<div className="px-4 lg:px-6">
			<div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-10 text-center">
				<ShieldAlertIcon className="size-8 text-muted-foreground" />
				<h2 className="font-medium">Ingen tilgang</h2>
				<p className="max-w-md text-sm text-muted-foreground">
					{signedInWithTihlde
						? "Denne siden er for administratorer og sub-administratorer i Spond-gruppen."
						: "Logg inn med TIHLDE for å bruke administrasjonssiden."}
				</p>
			</div>
		</div>
	);
}

function PeopleAdmin({ people }: { people: Person[] }) {
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const filter = search.filter ?? "unlinked";
	const [query, setQuery] = React.useState("");
	const [target, setTarget] = React.useState<LinkTarget | null>(null);

	const members = people.filter((p) => p.inGroup);
	const linked = members.filter((p) => p.linked).length;
	const lastLinked = people
		.filter((p) => p.linkedAt)
		.sort(
			(a, b) =>
				new Date(b.linkedAt ?? 0).getTime() -
				new Date(a.linkedAt ?? 0).getTime(),
		)[0];

	const rows = React.useMemo(() => {
		const q = query.trim().toLowerCase();
		return people.filter((p) => {
			if (filter === "linked" && !p.linked) return false;
			if (filter === "unlinked" && (p.linked || !p.inGroup)) return false;
			if (!q) return true;
			return [p.name, p.spondEmail, p.tihldeEmail, p.tihldeName].some((v) =>
				v?.toLowerCase().includes(q),
			);
		});
	}, [people, filter, query]);

	return (
		<>
			<div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-3 dark:*:data-[slot=card]:bg-card">
				<Card className="@container/card">
					<CardHeader>
						<CardDescription>Koblet til TIHLDE</CardDescription>
						<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
							{linked} / {members.length}
						</CardTitle>
					</CardHeader>
					<CardFooter className="flex-col items-start gap-1.5 text-sm">
						<div className="font-medium">
							{formatPercent(
								members.length ? (linked / members.length) * 100 : null,
							)}{" "}
							av medlemmene
						</div>
						<div className="text-muted-foreground">Klare for botsystemet</div>
					</CardFooter>
				</Card>
				<Card className="@container/card">
					<CardHeader>
						<CardDescription>Mangler kobling</CardDescription>
						<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
							{members.length - linked}
						</CardTitle>
					</CardHeader>
					<CardFooter className="flex-col items-start gap-1.5 text-sm">
						<div className="font-medium">Medlemmer i Spond</div>
						<div className="text-muted-foreground">Uten TIHLDE-bruker</div>
					</CardFooter>
				</Card>
				<Card className="@container/card">
					<CardHeader>
						<CardDescription>Sist koblet</CardDescription>
						<CardTitle className="truncate text-2xl font-semibold @[250px]/card:text-3xl">
							{lastLinked?.name.split(" ")[0] ?? "–"}
						</CardTitle>
					</CardHeader>
					<CardFooter className="flex-col items-start gap-1.5 text-sm">
						<div className="line-clamp-1 font-medium">
							{lastLinked
								? `av ${lastLinked.linkedBy}`
								: "Ingen koblinger ennå"}
						</div>
						<div className="text-muted-foreground">
							{lastLinked?.linkedAt ? formatDate(lastLinked.linkedAt) : " "}
						</div>
					</CardFooter>
				</Card>
			</div>

			<div className="grid gap-4 px-4 lg:px-6">
				<FinesSettings />
				<EventFinesCard />
			</div>

			<div className="flex flex-col gap-4 px-4 lg:px-6">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<div className="relative w-full max-w-xs">
						<SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder="Søk etter navn eller e-post"
							className="h-8 pl-8"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
						/>
					</div>
					<Select
						value={filter}
						onValueChange={(value) =>
							value &&
							navigate({
								search: { filter: value as Filter },
								replace: true,
							})
						}
					>
						<SelectTrigger size="sm" className="w-36">
							<SelectValue>{filterLabels[filter]}</SelectValue>
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								{Object.entries(filterLabels).map(([value, label]) => (
									<SelectItem key={value} value={value}>
										{label}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				</div>

				<div className="overflow-hidden rounded-lg border">
					<Table>
						<TableHeader className="sticky top-0 z-10 bg-muted">
							<TableRow>
								<TableHead className="pl-4">Person</TableHead>
								<TableHead>Roller</TableHead>
								<TableHead>TIHLDE-bruker</TableHead>
								<TableHead>Koblet av</TableHead>
								<TableHead className="pr-4 text-right" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{rows.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={5}
										className="h-24 text-center text-muted-foreground"
									>
										{filter === "unlinked" && !query
											? "Alle medlemmer er koblet 🎉"
											: "Ingen treff"}
									</TableCell>
								</TableRow>
							) : (
								rows.map((person) => (
									<PersonRow
										key={person.id}
										person={person}
										onEdit={() =>
											setTarget({
												memberId: person.spondMemberId,
												name: person.name,
												spondEmail: person.spondEmail,
												tihldeEmail: person.tihldeEmail,
												tihldeUserId: person.tihldeUserId,
											})
										}
									/>
								))
							)}
						</TableBody>
					</Table>
				</div>
				<div className="px-4 text-sm text-muted-foreground">
					{rows.length} av {people.length} personer
				</div>
			</div>

			<LinkPersonDialog
				target={target}
				onOpenChange={(open) => !open && setTarget(null)}
			/>
		</>
	);
}

function initials(name: string) {
	return name
		.split(" ")
		.map((part) => part[0])
		.slice(0, 2)
		.join("")
		.toUpperCase();
}

function PersonRow({ person, onEdit }: { person: Person; onEdit: () => void }) {
	return (
		<TableRow className={person.inGroup ? undefined : "opacity-60"}>
			<TableCell className="pl-4">
				<div className="flex items-center gap-3">
					<Avatar className="size-8">
						{person.imageUrl && (
							<AvatarImage src={person.imageUrl} alt={person.name} />
						)}
						<AvatarFallback className="text-xs">
							{initials(person.name)}
						</AvatarFallback>
					</Avatar>
					<div className="grid">
						<span className="font-medium">
							{person.name}
							{!person.inGroup && (
								<Badge
									variant="outline"
									className="ml-2 px-1.5 text-muted-foreground"
								>
									Ikke lenger medlem
								</Badge>
							)}
						</span>
						<span className="text-xs text-muted-foreground">
							{person.spondEmail ?? "Ingen Spond-e-post"}
						</span>
					</div>
				</div>
			</TableCell>
			<TableCell className="text-muted-foreground">
				{person.roles.join(", ") || "–"}
			</TableCell>
			<TableCell>
				{person.linked ? (
					<span className="flex items-center gap-1.5">
						<CircleCheckIcon className="size-4 shrink-0 fill-green-500 text-background dark:fill-green-400" />
						<span className="grid">
							<span>{person.tihldeName ?? person.tihldeEmail}</span>
							{person.tihldeName && (
								<span className="text-xs text-muted-foreground">
									{person.tihldeEmail ?? "E-post fylles inn ved innlogging"}
								</span>
							)}
							{!person.tihldeUserId && (
								<span className="text-xs text-amber-600 dark:text-amber-400">
									Mangler TIHLDE-bruker – bøter vises ikke
								</span>
							)}
						</span>
					</span>
				) : (
					<span className="text-muted-foreground">Ikke koblet</span>
				)}
			</TableCell>
			<TableCell className="text-muted-foreground">
				{person.linkedBy ? (
					<>
						{person.linkedBy}
						{person.linkedAt && (
							<span className="ml-1 text-xs">
								({formatDate(person.linkedAt)})
							</span>
						)}
					</>
				) : (
					"–"
				)}
			</TableCell>
			<TableCell className="pr-4 text-right">
				<Button
					variant={person.linked ? "ghost" : "outline"}
					size="sm"
					disabled={!person.inGroup}
					onClick={onEdit}
				>
					{person.linked ? <PencilIcon /> : <LinkIcon />}
					{person.linked ? "Endre" : "Koble"}
				</Button>
			</TableCell>
		</TableRow>
	);
}

const NO_GROUP = "none";

function FinesSettings() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const settings = useQuery(trpc.people.settings.queryOptions({}));
	const save = useMutation(
		trpc.people.setTihldeGroup.mutationOptions({
			onSuccess: () => {
				toast.success("TIHLDE-gruppe lagret");
				for (const key of [
					trpc.people.settings.queryKey(),
					trpc.people.tihldeMembers.queryKey(),
					trpc.fines.overview.queryKey(),
				]) {
					queryClient.invalidateQueries({ queryKey: key });
				}
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const data = settings.data;
	const current = data?.tihldeGroupSlug ?? NO_GROUP;
	const groups = data?.tihldeGroups ?? [];
	// Keep a saved group selectable even if the manager isn't a member of it.
	const options =
		data?.tihldeGroupSlug &&
		!groups.some((g) => g.slug === data.tihldeGroupSlug)
			? [...groups, { slug: data.tihldeGroupSlug, name: data.tihldeGroupSlug }]
			: groups;

	return (
		<Card className="@container/card">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<ScaleIcon className="size-4" />
					Botsystem
				</CardTitle>
				<CardDescription>
					Velg gruppen på tihlde.org som bøtene hentes fra. Bøter vises for
					medlemmer som er koblet til en TIHLDE-bruker.
				</CardDescription>
			</CardHeader>
			<CardFooter className="flex flex-wrap items-center gap-3">
				{settings.isPending ? (
					<Skeleton className="h-8 w-64" />
				) : (
					<Select
						value={current}
						disabled={
							save.isPending || (!options.length && current === NO_GROUP)
						}
						onValueChange={(value) =>
							value !== null &&
							value !== current &&
							save.mutate({
								tihldeGroupSlug: value === NO_GROUP ? null : value,
							})
						}
					>
						<SelectTrigger size="sm" className="w-64">
							<SelectValue>
								{options.find((g) => g.slug === current)?.name ??
									"Ingen gruppe valgt"}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectItem value={NO_GROUP}>Ingen gruppe valgt</SelectItem>
								{options.map((g) => (
									<SelectItem key={g.slug} value={g.slug}>
										{g.name}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				)}
				{data?.tihldeGroupsError ? (
					<span className="text-sm text-muted-foreground">
						{data.tihldeGroupsError}
					</span>
				) : (
					data &&
					!groups.length && (
						<span className="text-sm text-muted-foreground">
							Du er ikke medlem av noen TIHLDE-grupper med botsystem.
						</span>
					)
				)}
			</CardFooter>
			{data && (
				<CardContent className="border-t pt-6">
					<FineRulesForm
						// Remount after saving so the form shows what was stored.
						key={[
							data.fineAmountMatch,
							data.fineAmountTraining,
							data.fineAmountOther,
							data.fineLawId,
							data.fineReason,
						].join("|")}
						settings={data}
					/>
				</CardContent>
			)}
		</Card>
	);
}

function AdminSkeleton() {
	return (
		<div className="flex flex-col gap-4 px-4 lg:px-6">
			<div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-3">
				{Array.from({ length: 3 }, (_, i) => (
					<Skeleton key={i} className="h-40 rounded-xl" />
				))}
			</div>
			<Skeleton className="h-8 w-72" />
			<Skeleton className="h-64 rounded-xl" />
		</div>
	);
}
