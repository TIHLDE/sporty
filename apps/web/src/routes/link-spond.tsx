import { Button } from "@sporty/ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { ArrowLeftRightIcon, LogOutIcon } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { SelfLinkFlow } from "@/components/self-link";
import { getUser } from "@/functions/get-user";
import { getAccessState } from "@/functions/selected-group";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/link-spond")({
	component: LinkSpondComponent,
	beforeLoad: async () => {
		const session = await getUser();
		if (!session) {
			throw redirect({ to: "/" });
		}
		const access = await getAccessState();
		if (access === "no-group") {
			throw redirect({ to: "/groups" });
		}
		if (access === "ok") {
			throw redirect({ to: "/dashboard" });
		}
	},
});

/**
 * Required step before the dashboard: the user has to be linked to their
 * Spond member in the picked group, since fines and attendance go by it.
 */
function LinkSpondComponent() {
	const trpc = useTRPC();
	const router = useRouter();
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const unlinked = useQuery(trpc.people.unlinkedMembers.queryOptions({}));
	const [checking, setChecking] = React.useState(false);

	// beforeLoad sends them on to the dashboard once they are linked.
	const checkAgain = async () => {
		setChecking(true);
		try {
			await router.invalidate();
			await queryClient.invalidateQueries({
				queryKey: trpc.people.myLinkRequest.queryKey(),
			});
			if (router.state.location.pathname === "/link-spond") {
				toast.info("Ikke godkjent ennå");
			}
		} finally {
			setChecking(false);
		}
	};

	const { data: session } = authClient.useSession();
	const signOut = useMutation({
		mutationFn: () => authClient.signOut(),
		onSuccess: async () => {
			queryClient.removeQueries();
			await navigate({ to: "/" });
		},
	});

	return (
		<main className="flex min-h-svh flex-col items-center bg-background px-4 py-16">
			<div className="grid w-full max-w-lg gap-8">
				<div className="grid gap-2 text-center">
					<p className="text-sm font-medium tracking-[0.2em] text-muted-foreground uppercase">
						Sporty
					</p>
					<h1 className="text-3xl font-semibold tracking-tight">
						Koble til Spond
					</h1>
					<p className="text-balance text-muted-foreground">
						Finn deg selv blant medlemmene
						{unlinked.data ? ` i ${unlinked.data.groupName}` : ""}. Bøter og
						oppmøte knyttes til Spond-medlemmet ditt, så du må være koblet før
						du kommer inn.
					</p>
				</div>

				<SelfLinkFlow
					onLinked={async () => {
						// Everything cached so far was fetched as an unlinked user.
						queryClient.removeQueries();
						await navigate({ to: "/dashboard" });
					}}
					onCheckAgain={checkAgain}
					checking={checking}
				/>

				<div className="flex flex-wrap items-center justify-center gap-x-1 text-sm text-muted-foreground">
					{session && <span>Innlogget som {session.user.name}.</span>}
					<Button
						variant="link"
						size="sm"
						className="h-auto px-1 text-muted-foreground"
						nativeButton={false}
						render={<Link to="/groups" />}
					>
						<ArrowLeftRightIcon />
						Bytt gruppe
					</Button>
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
		</main>
	);
}
