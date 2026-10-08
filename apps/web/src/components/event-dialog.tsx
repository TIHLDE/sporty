import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@sporty/ui/components/avatar";
import { Badge } from "@sporty/ui/components/badge";
import { Button } from "@sporty/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@sporty/ui/components/dialog";
import { Separator } from "@sporty/ui/components/separator";
import { Skeleton } from "@sporty/ui/components/skeleton";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@sporty/ui/components/tabs";
import { useQuery } from "@tanstack/react-query";
import {
	CalendarIcon,
	ClockIcon,
	ExternalLinkIcon,
	MapPinIcon,
	MessageSquareIcon,
	NavigationIcon,
	TrophyIcon,
	UsersIcon,
} from "lucide-react";
import type * as React from "react";

import { useNow } from "@/hooks/use-now";
import { formatDateTime, formatLongDate, formatTime } from "@/lib/format";
import { type RouterOutputs, useTRPC } from "@/utils/trpc";

type EventDetails = RouterOutputs["spond"]["event"];
type Person = EventDetails["responses"]["accepted"][number];

const matchTypeLabels: Record<string, string> = {
	HOME: "Hjemmekamp",
	AWAY: "Bortekamp",
	FRIENDLY: "Treningskamp",
};

export function EventDialog({
	eventId,
	onOpenChange,
}: {
	eventId: string | undefined;
	onOpenChange: (open: boolean) => void;
}) {
	const trpc = useTRPC();
	const event = useQuery({
		...trpc.spond.event.queryOptions({ eventId: eventId ?? "" }),
		enabled: Boolean(eventId),
		// A missing event won't appear by asking again.
		retry: (failureCount, error) =>
			error.data?.code !== "NOT_FOUND" && failureCount < 2,
	});

	return (
		<Dialog open={Boolean(eventId)} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90svh] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
				{event.data ? (
					<EventContent event={event.data} />
				) : event.isError ? (
					<DialogHeader className="p-6">
						<DialogTitle>Kunne ikke hente arrangementet</DialogTitle>
						<DialogDescription>{event.error.message}</DialogDescription>
					</DialogHeader>
				) : (
					<EventSkeleton />
				)}
			</DialogContent>
		</Dialog>
	);
}

function EventContent({ event }: { event: EventDetails }) {
	const { match, location } = event;
	const now = useNow();
	const past = new Date(event.end ?? event.start).getTime() < now;

	return (
		<>
			<DialogHeader className="gap-3 p-6 pb-4">
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant="outline" className="text-muted-foreground">
						{match ? (matchTypeLabels[match.type] ?? "Kamp") : "Arrangement"}
					</Badge>
					{event.cancelled ? (
						<Badge variant="destructive">Avlyst</Badge>
					) : past ? (
						<Badge variant="secondary">Ferdig</Badge>
					) : (
						<Badge variant="secondary">Kommende</Badge>
					)}
				</div>
				<DialogTitle className="pr-8 text-xl">{event.heading}</DialogTitle>
				<DialogDescription className="sr-only">
					Detaljer om arrangementet fra Spond
				</DialogDescription>
			</DialogHeader>

			<div className="flex flex-col gap-6 px-6 pb-6">
				{match && <Scoreboard match={match} />}

				<div className="grid gap-3 text-sm sm:grid-cols-2">
					<InfoRow icon={<CalendarIcon />} label="Dato">
						<span className="first-letter:uppercase">
							{formatLongDate(event.start)}
						</span>
					</InfoRow>
					<InfoRow icon={<ClockIcon />} label="Tid">
						{formatTime(event.start)}
						{event.end && ` – ${formatTime(event.end)}`}
						{event.meetup && (
							<span className="block text-muted-foreground">
								Oppmøte {formatTime(event.meetup)}
							</span>
						)}
					</InfoRow>
					{location && (
						<InfoRow
							icon={<MapPinIcon />}
							label="Sted"
							className="sm:col-span-2"
						>
							{location.name ?? location.address}
							{location.name && location.address && (
								<span className="block text-muted-foreground">
									{location.address}
								</span>
							)}
						</InfoRow>
					)}
				</div>

				{location && <LocationMap location={location} />}

				{event.description && (
					<section className="grid gap-2">
						<h3 className="text-sm font-medium">Beskrivelse</h3>
						<p className="whitespace-pre-wrap text-sm text-muted-foreground">
							{event.description}
						</p>
					</section>
				)}

				<Separator />
				<Responses responses={event.responses} />

				{event.owners.length > 0 && (
					<section className="grid gap-2">
						<h3 className="text-sm font-medium">Arrangør</h3>
						<div className="flex flex-wrap gap-3">
							{event.owners.map((owner) => (
								<PersonChip key={owner.id} person={owner} />
							))}
						</div>
					</section>
				)}

				{event.comments.length > 0 && (
					<>
						<Separator />
						<Comments comments={event.comments} />
					</>
				)}

				<div className="flex justify-end">
					<Button
						variant="outline"
						size="sm"
						nativeButton={false}
						render={
							<a
								href={event.spondUrl}
								target="_blank"
								rel="noreferrer"
								aria-label="Åpne i Spond"
							/>
						}
					>
						<ExternalLinkIcon />
						Åpne i Spond
					</Button>
				</div>
			</div>
		</>
	);
}

function Scoreboard({ match }: { match: NonNullable<EventDetails["match"]> }) {
	const hasScore = match.teamScore !== null && match.opponentScore !== null;
	// On away games the opponent is the home team and is listed first.
	const [home, away] =
		match.type === "AWAY"
			? [
					{ name: match.opponentName, score: match.opponentScore },
					{ name: match.teamName, score: match.teamScore },
				]
			: [
					{ name: match.teamName, score: match.teamScore },
					{ name: match.opponentName, score: match.opponentScore },
				];

	return (
		<div className="rounded-xl border bg-linear-to-t from-primary/5 to-card p-4">
			<div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
				<span className="truncate text-right font-medium">{home.name}</span>
				<span className="text-2xl font-semibold tabular-nums">
					{hasScore ? `${home.score} – ${away.score}` : "vs"}
				</span>
				<span className="truncate font-medium">{away.name}</span>
			</div>
			{hasScore && (
				<p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
					<TrophyIcon className="size-3.5" />
					{match.scoresFinal ? "Endelig resultat" : "Foreløpig resultat"}
				</p>
			)}
		</div>
	);
}

function InfoRow({
	icon,
	label,
	className,
	children,
}: {
	icon: React.ReactNode;
	label: string;
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<div className={`flex gap-3 ${className ?? ""}`}>
			<span className="mt-0.5 text-muted-foreground [&_svg]:size-4">
				{icon}
			</span>
			<div>
				<div className="text-xs text-muted-foreground">{label}</div>
				<div className="font-medium">{children}</div>
			</div>
		</div>
	);
}

function LocationMap({
	location,
}: {
	location: NonNullable<EventDetails["location"]>;
}) {
	const { latitude: lat, longitude: lng } = location;
	const hasCoordinates = lat !== null && lng !== null;
	const query = hasCoordinates
		? `${lat},${lng}`
		: [location.name, location.address].filter(Boolean).join(", ");
	if (!query) return null;

	const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
	const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;

	return (
		<div className="grid gap-2">
			{hasCoordinates && (
				<div className="overflow-hidden rounded-xl border">
					<iframe
						title={`Kart over ${location.name ?? "stedet"}`}
						className="h-56 w-full"
						loading="lazy"
						src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.006},${lat - 0.003},${lng + 0.006},${lat + 0.003}&layer=mapnik&marker=${lat},${lng}`}
					/>
				</div>
			)}
			<div className="flex flex-wrap gap-2">
				<Button
					variant="outline"
					size="sm"
					nativeButton={false}
					render={
						<a
							href={mapsUrl}
							target="_blank"
							rel="noreferrer"
							aria-label="Åpne i kart"
						/>
					}
				>
					<MapPinIcon />
					Åpne i kart
				</Button>
				<Button
					variant="outline"
					size="sm"
					nativeButton={false}
					render={
						<a
							href={directionsUrl}
							target="_blank"
							rel="noreferrer"
							aria-label="Veibeskrivelse"
						/>
					}
				>
					<NavigationIcon />
					Veibeskrivelse
				</Button>
			</div>
		</div>
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

function PersonChip({
	person,
	note,
}: {
	person: Person;
	note?: string | null;
}) {
	return (
		<div className="flex items-center gap-2">
			<Avatar className="size-7">
				{person.imageUrl && (
					<AvatarImage src={person.imageUrl} alt={person.name} />
				)}
				<AvatarFallback className="text-xs">
					{initials(person.name)}
				</AvatarFallback>
			</Avatar>
			<div className="grid text-sm">
				<span>{person.name}</span>
				{note && (
					<span className="text-xs text-muted-foreground">«{note}»</span>
				)}
			</div>
		</div>
	);
}

function Responses({ responses }: { responses: EventDetails["responses"] }) {
	const groups = [
		{ key: "accepted", label: "Påmeldt", people: responses.accepted },
		{ key: "declined", label: "Avslått", people: responses.declined },
		{ key: "unanswered", label: "Ikke svart", people: responses.unanswered },
		{ key: "waitinglist", label: "Venteliste", people: responses.waitinglist },
	].filter((g) => g.key !== "waitinglist" || g.people.length > 0);

	return (
		<section className="grid gap-3">
			<h3 className="flex items-center gap-2 text-sm font-medium">
				<UsersIcon className="size-4 text-muted-foreground" />
				Svar
			</h3>
			<Tabs defaultValue="accepted" className="gap-3">
				<TabsList className="**:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:bg-muted-foreground/30 **:data-[slot=badge]:px-1">
					{groups.map((g) => (
						<TabsTrigger key={g.key} value={g.key}>
							{g.label} <Badge variant="secondary">{g.people.length}</Badge>
						</TabsTrigger>
					))}
				</TabsList>
				{groups.map((g) => (
					<TabsContent key={g.key} value={g.key}>
						{g.people.length === 0 ? (
							<p className="text-sm text-muted-foreground">Ingen</p>
						) : (
							<div className="grid gap-3 sm:grid-cols-2">
								{g.people.map((p) => (
									<PersonChip
										key={p.id}
										person={p}
										note={"message" in p ? (p.message as string | null) : null}
									/>
								))}
							</div>
						)}
					</TabsContent>
				))}
			</Tabs>
		</section>
	);
}

function Comments({ comments }: { comments: EventDetails["comments"] }) {
	return (
		<section className="grid gap-3">
			<h3 className="flex items-center gap-2 text-sm font-medium">
				<MessageSquareIcon className="size-4 text-muted-foreground" />
				Kommentarer ({comments.length})
			</h3>
			<ul className="grid gap-3">
				{comments.map((comment) => (
					<li key={comment.id} className="flex gap-3">
						<Avatar className="size-7">
							{comment.author.imageUrl && (
								<AvatarImage
									src={comment.author.imageUrl}
									alt={comment.author.name}
								/>
							)}
							<AvatarFallback className="text-xs">
								{initials(comment.author.name)}
							</AvatarFallback>
						</Avatar>
						<div className="grid gap-0.5 text-sm">
							<div className="flex items-baseline gap-2">
								<span className="font-medium">{comment.author.name}</span>
								<span className="text-xs text-muted-foreground">
									{formatDateTime(comment.timestamp)}
								</span>
							</div>
							<p className="whitespace-pre-wrap text-muted-foreground">
								{comment.text}
							</p>
						</div>
					</li>
				))}
			</ul>
		</section>
	);
}

function EventSkeleton() {
	return (
		<div className="grid gap-4 p-6">
			<DialogTitle className="sr-only">Laster arrangement</DialogTitle>
			<Skeleton className="h-5 w-24" />
			<Skeleton className="h-7 w-2/3" />
			<div className="grid gap-3 sm:grid-cols-2">
				<Skeleton className="h-10" />
				<Skeleton className="h-10" />
			</div>
			<Skeleton className="h-56 rounded-xl" />
			<Skeleton className="h-24" />
		</div>
	);
}
