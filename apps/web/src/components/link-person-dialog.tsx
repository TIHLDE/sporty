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
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@sporty/ui/components/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";

import { useTRPC } from "@/utils/trpc";

export type LinkTarget = {
	memberId: string;
	name: string;
	spondEmail: string | null;
	tihldeEmail: string | null;
	tihldeUserId: string | null;
};

const NONE = "none";

export function LinkPersonDialog({
	target,
	onOpenChange,
}: {
	target: LinkTarget | null;
	onOpenChange: (open: boolean) => void;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [email, setEmail] = React.useState("");
	const [tihldeUserId, setTihldeUserId] = React.useState<string>(NONE);

	const roster = useQuery({
		...trpc.people.tihldeMembers.queryOptions({}),
		enabled: target !== null,
	});
	const rosterMembers =
		roster.data?.status === "ok" ? roster.data.members : null;
	const selected = rosterMembers?.find((m) => m.id === tihldeUserId);

	React.useEffect(() => {
		if (target) {
			setEmail(target.tihldeEmail ?? "");
			setTihldeUserId(target.tihldeUserId ?? NONE);
		}
	}, [target]);

	const onSuccess = (message: string) => {
		toast.success(message);
		for (const key of [
			trpc.people.list.queryKey(),
			trpc.people.tihldeMembers.queryKey(),
			trpc.spond.overview.queryKey(),
			trpc.fines.overview.queryKey(),
		]) {
			queryClient.invalidateQueries({ queryKey: key });
		}
		onOpenChange(false);
	};
	const onError = (error: { message: string }) => toast.error(error.message);

	const link = useMutation(
		trpc.people.link.mutationOptions({
			onSuccess: (person) =>
				onSuccess(
					`${person.name} er koblet til ${person.tihldeName ?? person.tihldeEmail}`,
				),
			onError,
		}),
	);
	const unlink = useMutation(
		trpc.people.unlink.mutationOptions({
			onSuccess: () => onSuccess("Koblingen er fjernet"),
			onError,
		}),
	);
	const pending = link.isPending || unlink.isPending;
	const hasUser = tihldeUserId !== NONE;
	const alreadyLinked = Boolean(target?.tihldeEmail || target?.tihldeUserId);

	return (
		<Dialog open={target !== null} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<form
					className="grid gap-4"
					onSubmit={(event) => {
						event.preventDefault();
						if (!target) return;
						link.mutate({
							memberId: target.memberId,
							tihldeUserId: hasUser ? tihldeUserId : null,
							tihldeName: selected?.name ?? null,
							tihldeEmail: email.trim() || null,
						});
					}}
				>
					<DialogHeader>
						<DialogTitle>Koble til TIHLDE-bruker</DialogTitle>
						<DialogDescription>
							Knytt {target?.name} i Spond til brukeren sin på tihlde.org.
							Bøtene hentes via TIHLDE-brukeren.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-2">
						<Label>Spond-e-post</Label>
						<p className="truncate text-sm text-muted-foreground">
							{target?.spondEmail ?? "Ingen e-post registrert i Spond"}
						</p>
					</div>
					<div className="grid gap-2">
						<Label>TIHLDE-bruker</Label>
						{rosterMembers ? (
							<Select
								value={tihldeUserId}
								onValueChange={(value) => setTihldeUserId(value ?? NONE)}
							>
								<SelectTrigger className="w-full">
									<SelectValue>
										{selected?.name ?? "Velg fra TIHLDE-gruppen"}
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectItem value={NONE}>Ingen</SelectItem>
										{rosterMembers.map((m) => {
											const takenByOther =
												m.linkedToMemberId !== null &&
												m.linkedToMemberId !== target?.memberId;
											return (
												<SelectItem
													key={m.id}
													value={m.id}
													disabled={takenByOther}
												>
													{m.name}
													{takenByOther && " (allerede koblet)"}
												</SelectItem>
											);
										})}
									</SelectGroup>
								</SelectContent>
							</Select>
						) : (
							<p className="text-sm text-muted-foreground">
								{roster.isPending
									? "Henter medlemmer fra tihlde.org…"
									: roster.data?.status === "unavailable"
										? roster.data.message
										: "Klarte ikke å hente medlemmer fra tihlde.org"}
							</p>
						)}
					</div>
					<div className="grid gap-2">
						<div className="flex items-center justify-between gap-2">
							<Label htmlFor="tihlde-email">TIHLDE-e-post</Label>
							{target?.spondEmail && (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="h-6"
									onClick={() => setEmail(target.spondEmail ?? "")}
								>
									Bruk Spond-e-post
								</Button>
							)}
						</div>
						<Input
							id="tihlde-email"
							type="email"
							placeholder="Valgfritt – fylles inn når personen logger inn"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
						/>
					</div>
					<DialogFooter>
						{alreadyLinked && target && (
							<Button
								type="button"
								variant="outline"
								className="sm:mr-auto"
								disabled={pending}
								onClick={() => unlink.mutate({ memberId: target.memberId })}
							>
								Fjern kobling
							</Button>
						)}
						<Button
							type="submit"
							disabled={pending || (!hasUser && !email.trim())}
						>
							{link.isPending ? "Lagrer…" : "Lagre"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
