import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@sporty/ui/components/avatar";
import { Button } from "@sporty/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@sporty/ui/components/dialog";
import { Input } from "@sporty/ui/components/input";
import { Label } from "@sporty/ui/components/label";
import { cn } from "@sporty/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleCheckIcon, ClockIcon, SearchIcon } from "lucide-react";
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
export function SelfLinkDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [query, setQuery] = React.useState("");
	const [memberId, setMemberId] = React.useState<string | null>(null);
	/** Masked email the code was sent to; set while entering the code. */
	const [sentTo, setSentTo] = React.useState<string | null>(null);
	const [code, setCode] = React.useState("");

	const overview = useQuery(trpc.spond.overview.queryOptions({}));
	const viewer = overview.data?.viewer;
	const canLink = Boolean(viewer?.signedInWithTihlde && !viewer.memberId);
	const request = useQuery({
		...trpc.people.myLinkRequest.queryOptions({}),
		enabled: open && canLink,
	});
	const unlinked = useQuery({
		...trpc.people.unlinkedMembers.queryOptions({}),
		enabled: open && canLink,
	});
	const emailEnabled = unlinked.data?.emailEnabled ?? false;
	const selected = unlinked.data?.members.find((m) => m.memberId === memberId);
	const canEmail = emailEnabled && Boolean(selected?.hasEmail);

	// Start over each time the dialog is opened.
	const [prevOpen, setPrevOpen] = React.useState(open);
	if (open !== prevOpen) {
		setPrevOpen(open);
		if (open) {
			setMemberId(null);
			setSentTo(null);
			setCode("");
		}
	}

	const invalidate = (keys: readonly unknown[][]) => {
		for (const key of keys) queryClient.invalidateQueries({ queryKey: key });
	};
	const onError = (error: { message: string }) => toast.error(error.message);
	const requestLink = useMutation(
		trpc.people.requestLink.mutationOptions({
			onSuccess: () => {
				toast.success("Forespørselen er sendt til en administrator");
				setMemberId(null);
				invalidate([
					trpc.people.myLinkRequest.queryKey(),
					trpc.people.linkRequests.queryKey(),
				]);
			},
			onError,
		}),
	);
	const cancel = useMutation(
		trpc.people.cancelLinkRequest.mutationOptions({
			onSuccess: () => {
				toast.success("Forespørselen er trukket tilbake");
				invalidate([
					trpc.people.myLinkRequest.queryKey(),
					trpc.people.linkRequests.queryKey(),
				]);
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
				invalidate([
					trpc.spond.overview.queryKey(),
					trpc.people.myLinkRequest.queryKey(),
					trpc.people.unlinkedMembers.queryKey(),
					trpc.people.linkRequests.queryKey(),
					trpc.people.list.queryKey(),
					trpc.fines.overview.queryKey(),
				]);
				onOpenChange(false);
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

	let body: React.ReactNode;
	let footer: React.ReactNode = null;
	if (!viewer) {
		body = <p className="text-sm text-muted-foreground">Laster…</p>;
	} else if (!viewer.signedInWithTihlde) {
		body = (
			<p className="text-sm text-muted-foreground">
				Logg inn med TIHLDE for å koble deg til Spond.
			</p>
		);
	} else if (viewer.memberId) {
		body = (
			<p className="flex items-center gap-2 text-sm">
				<CircleCheckIcon className="size-4 shrink-0 fill-green-500 text-background dark:fill-green-400" />
				Du er koblet til Spond-gruppen.
			</p>
		);
	} else if (sentTo && selected) {
		body = (
			<form
				id="verify-code"
				className="grid gap-2"
				onSubmit={(event) => {
					event.preventDefault();
					verify.mutate({ memberId: selected.memberId, code });
				}}
			>
				<Label htmlFor="link-code">Kode fra e-posten</Label>
				<Input
					id="link-code"
					inputMode="numeric"
					autoComplete="one-time-code"
					maxLength={6}
					placeholder="123456"
					className="text-center font-mono text-lg tracking-[0.5em]"
					value={code}
					onChange={(event) =>
						setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
					}
				/>
				<p className="text-sm text-muted-foreground">
					Vi sendte en kode til {sentTo}, som er e-posten {selected.name} har i
					Spond. Den gjelder i 15 minutter.
				</p>
			</form>
		);
		footer = (
			<>
				<Button
					variant="ghost"
					className="sm:mr-auto"
					disabled={pending}
					onClick={() => setSentTo(null)}
				>
					Tilbake
				</Button>
				<Button
					variant="outline"
					disabled={pending}
					onClick={() => sendCode.mutate({ memberId: selected.memberId })}
				>
					Send ny kode
				</Button>
				<Button
					type="submit"
					form="verify-code"
					disabled={pending || code.length !== 6}
				>
					{verify.isPending ? "Sjekker…" : "Bekreft"}
				</Button>
			</>
		);
	} else {
		body = (
			<div className="grid gap-3">
				{request.data && (
					<div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3 text-sm">
						<ClockIcon className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
						<div className="grid flex-1">
							<span className="font-medium">
								Venter på godkjenning: {request.data.name}
							</span>
							<span className="text-xs text-muted-foreground">
								Sendt {formatDate(request.data.createdAt)}. Du kan også bekrefte
								med e-post under.
							</span>
						</div>
						<Button
							variant="outline"
							size="sm"
							disabled={pending}
							onClick={() => cancel.mutate({})}
						>
							Avbryt
						</Button>
					</div>
				)}
				<div className="relative">
					<SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Søk etter navnet ditt i Spond"
						className="h-8 pl-8"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
					/>
				</div>
				<div className="max-h-72 overflow-y-auto rounded-lg border">
					{unlinked.isPending ? (
						<p className="p-4 text-center text-sm text-muted-foreground">
							Henter medlemmer fra Spond…
						</p>
					) : rows.length === 0 ? (
						<p className="p-4 text-center text-sm text-muted-foreground">
							Ingen treff blant medlemmene som ikke er koblet
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
									<span className="text-xs text-muted-foreground">
										Forespurt
									</span>
								)}
							</button>
						))
					)}
				</div>
				{selected && !canEmail && (
					<p className="text-sm text-muted-foreground">
						{emailEnabled
							? `${selected.name} har ingen e-post i Spond, så en administrator må godkjenne koblingen.`
							: "En administrator må godkjenne koblingen."}
					</p>
				)}
			</div>
		);
		footer = selected && (
			<>
				<Button
					variant={canEmail ? "ghost" : "default"}
					className={canEmail ? "sm:mr-auto" : undefined}
					disabled={pending}
					onClick={() => requestLink.mutate({ memberId: selected.memberId })}
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
			</>
		);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Koble deg til Spond</DialogTitle>
					<DialogDescription>
						Finn deg selv blant medlemmene i Spond. Bekreft med en kode vi
						sender til e-posten din i Spond, eller be en administrator om å
						godkjenne.
					</DialogDescription>
				</DialogHeader>
				{body}
				{footer && <DialogFooter>{footer}</DialogFooter>}
			</DialogContent>
		</Dialog>
	);
}

/** Nudges users who aren't linked to Spond to link themselves. */
export function SelfLinkBanner({ onOpen }: { onOpen: () => void }) {
	const trpc = useTRPC();
	const overview = useQuery(trpc.spond.overview.queryOptions({}));
	const viewer = overview.data?.viewer;
	const show = Boolean(viewer?.signedInWithTihlde && !viewer.memberId);
	const request = useQuery({
		...trpc.people.myLinkRequest.queryOptions({}),
		enabled: show,
	});
	if (!show || request.isPending) return null;

	return (
		<div className="mx-4 flex flex-wrap items-center gap-3 rounded-lg border border-dashed p-4 text-sm lg:mx-6">
			<div className="grid flex-1">
				<span className="font-medium">
					{request.data
						? "Venter på at en administrator godkjenner koblingen"
						: "Du er ikke koblet til Spond"}
				</span>
				<span className="text-muted-foreground">
					{request.data
						? `Du har bedt om å bli koblet til ${request.data.name}.`
						: "Finn deg selv i Spond-gruppen, så vises bøtene og oppmøtet ditt."}
				</span>
			</div>
			<Button variant="outline" size="sm" onClick={onOpen}>
				{request.data ? "Se forespørsel" : "Koble til Spond"}
			</Button>
		</div>
	);
}
