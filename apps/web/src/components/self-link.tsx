import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@sporty/ui/components/avatar";
import { Button } from "@sporty/ui/components/button";
import { Input } from "@sporty/ui/components/input";
import { Label } from "@sporty/ui/components/label";
import { Skeleton } from "@sporty/ui/components/skeleton";
import { cn } from "@sporty/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClockIcon, RefreshCwIcon, SearchIcon } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { formatDate } from "@/lib/format";
import { useTRPC } from "@/utils/trpc";

function initials(name: string) {
	return name
		.split(" ")
		.map((part) => part[0])
		.slice(0, 2)
		.join("")
		.toUpperCase();
}

/**
 * Lets a TIHLDE user find themselves among the Spond members and link
 * themselves, either with a code sent to their Spond email or, without access
 * to that email, by asking an administrator.
 */
export function SelfLinkFlow({
	onLinked,
	onCheckAgain,
	checking,
}: {
	/** Called once the user is linked. */
	onLinked: () => void;
	/** Checks whether an administrator has approved the request. */
	onCheckAgain: () => void;
	checking: boolean;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [query, setQuery] = React.useState("");
	const [memberId, setMemberId] = React.useState<string | null>(null);
	/** Masked email the code was sent to; set while entering the code. */
	const [sentTo, setSentTo] = React.useState<string | null>(null);
	const [code, setCode] = React.useState("");

	const request = useQuery(trpc.people.myLinkRequest.queryOptions({}));
	const unlinked = useQuery(trpc.people.unlinkedMembers.queryOptions({}));
	const emailEnabled = unlinked.data?.emailEnabled ?? false;
	const selected = unlinked.data?.members.find((m) => m.memberId === memberId);
	const canEmail = emailEnabled && Boolean(selected?.hasEmail);

	const invalidateRequests = () => {
		for (const key of [
			trpc.people.myLinkRequest.queryKey(),
			trpc.people.linkRequests.queryKey(),
		]) {
			queryClient.invalidateQueries({ queryKey: key });
		}
	};
	const onError = (error: { message: string }) => toast.error(error.message);
	const requestLink = useMutation(
		trpc.people.requestLink.mutationOptions({
			onSuccess: () => {
				toast.success("Forespørselen er sendt til en administrator");
				setMemberId(null);
				invalidateRequests();
			},
			onError,
		}),
	);
	const cancel = useMutation(
		trpc.people.cancelLinkRequest.mutationOptions({
			onSuccess: () => {
				toast.success("Forespørselen er trukket tilbake");
				invalidateRequests();
			},
			onError,
		}),
	);
	const sendCode = useMutation(
		trpc.people.sendLinkCode.mutationOptions({
			onSuccess: (result) => {
				setSentTo(result.sentTo);
				setCode("");
				toast.success(`Koden er sendt til ${result.sentTo}`);
			},
			onError,
		}),
	);
	const verify = useMutation(
		trpc.people.verifyLinkCode.mutationOptions({
			onSuccess: (person) => {
				toast.success(`Du er koblet til ${person.name} i Spond`);
				onLinked();
			},
			onError,
		}),
	);
	const pending =
		requestLink.isPending ||
		cancel.isPending ||
		sendCode.isPending ||
		verify.isPending;

	const rows = React.useMemo(() => {
		const q = query.trim().toLowerCase();
		return (unlinked.data?.members ?? []).filter(
			(m) => !q || m.name.toLowerCase().includes(q),
		);
	}, [unlinked.data, query]);

	if (unlinked.isError) {
		return (
			<div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
				Klarte ikke å hente medlemmene fra Spond: {unlinked.error.message}
			</div>
		);
	}

	if (sentTo && selected) {
		return (
			<form
				className="grid gap-4"
				onSubmit={(event) => {
					event.preventDefault();
					verify.mutate({ memberId: selected.memberId, code });
				}}
			>
				<div className="grid gap-2">
					<Label htmlFor="link-code">Kode fra e-posten</Label>
					<Input
						id="link-code"
						inputMode="numeric"
						autoComplete="one-time-code"
						maxLength={6}
						placeholder="123456"
						className="h-12 text-center font-mono text-xl tracking-[0.5em]"
						value={code}
						onChange={(event) =>
							setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
						}
					/>
					<p className="text-sm text-muted-foreground">
						Vi sendte en kode til {sentTo}, som er e-posten {selected.name} har
						i Spond. Den gjelder i 15 minutter.
					</p>
				</div>
				<div className="flex flex-wrap justify-end gap-2">
					<Button
						type="button"
						variant="ghost"
						className="mr-auto"
						disabled={pending}
						onClick={() => setSentTo(null)}
					>
						Tilbake
					</Button>
					<Button
						type="button"
						variant="outline"
						disabled={pending}
						onClick={() => sendCode.mutate({ memberId: selected.memberId })}
					>
						Send ny kode
					</Button>
					<Button type="submit" disabled={pending || code.length !== 6}>
						{verify.isPending ? "Sjekker…" : "Bekreft"}
					</Button>
				</div>
			</form>
		);
	}

	return (
		<div className="grid gap-4">
			{request.data && (
				<div className="grid gap-3 rounded-xl border bg-muted/50 p-4 text-sm">
					<div className="flex items-start gap-3">
						<ClockIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
						<div className="grid flex-1">
							<span className="font-medium">
								Venter på godkjenning: {request.data.name}
							</span>
							<span className="text-muted-foreground">
								Sendt {formatDate(request.data.createdAt)}. Du kommer inn så
								snart en administrator har godkjent, eller du kan bekrefte med
								e-post under.
							</span>
						</div>
					</div>
					<div className="flex flex-wrap justify-end gap-2">
						<Button
							variant="ghost"
							size="sm"
							disabled={pending}
							onClick={() => cancel.mutate({})}
						>
							Trekk tilbake
						</Button>
						<Button
							variant="outline"
							size="sm"
							disabled={checking}
							onClick={onCheckAgain}
						>
							<RefreshCwIcon className={cn(checking && "animate-spin")} />
							Sjekk igjen
						</Button>
					</div>
				</div>
			)}

			<div className="relative">
				<SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					placeholder="Søk etter navnet ditt"
					className="pl-8"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
				/>
			</div>

			<div className="max-h-80 overflow-y-auto rounded-xl bg-card ring-1 ring-foreground/10">
				{unlinked.isPending ? (
					<div className="grid gap-2 p-3">
						{Array.from({ length: 4 }, (_, i) => (
							<Skeleton key={i} className="h-9" />
						))}
					</div>
				) : rows.length === 0 ? (
					<p className="p-6 text-center text-sm text-muted-foreground">
						{query
							? "Ingen treff. Prøv navnet slik det står i Spond."
							: "Alle medlemmene i gruppen er allerede koblet."}
					</p>
				) : (
					rows.map((m) => (
						<button
							key={m.memberId}
							type="button"
							onClick={() => setMemberId(m.memberId)}
							className={cn(
								"flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted",
								memberId === m.memberId && "bg-muted font-medium",
							)}
						>
							<Avatar className="size-7">
								{m.imageUrl && <AvatarImage src={m.imageUrl} alt={m.name} />}
								<AvatarFallback className="text-xs">
									{initials(m.name)}
								</AvatarFallback>
							</Avatar>
							<span className="flex-1 truncate">{m.name}</span>
							{request.data?.memberId === m.memberId && (
								<span className="text-xs text-muted-foreground">Forespurt</span>
							)}
						</button>
					))
				)}
			</div>

			{selected && (
				<div className="grid gap-3">
					{!canEmail && (
						<p className="text-sm text-muted-foreground">
							{emailEnabled
								? `${selected.name} har ingen e-post i Spond, så en administrator må godkjenne koblingen.`
								: "En administrator må godkjenne koblingen."}
						</p>
					)}
					<div className="flex flex-wrap justify-end gap-2">
						<Button
							variant={canEmail ? "ghost" : "default"}
							className={canEmail ? "mr-auto" : undefined}
							disabled={pending}
							onClick={() =>
								requestLink.mutate({ memberId: selected.memberId })
							}
						>
							{canEmail ? "Har ikke tilgang? Spør en admin" : "Spør en admin"}
						</Button>
						{canEmail && (
							<Button
								disabled={pending}
								onClick={() => sendCode.mutate({ memberId: selected.memberId })}
							>
								{sendCode.isPending ? "Sender…" : "Send kode på e-post"}
							</Button>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
