import { Button } from "@sporty/ui/components/button";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";
import * as React from "react";

import Ballpit from "@/components/ballpit";
import TechText from "@/components/tech-text";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

// Ball 0 is the (hidden) cursor ball, and its color lights the scene.
const BALL_COLORS = [0xffffff, 0x60a5fa, 0x2563eb, 0x1e3a8a];

function HomeComponent() {
	const { data: session, isPending } = authClient.useSession();
	// Mounted on the client only, and skipped for people who prefer less motion.
	const [ballCount, setBallCount] = React.useState<number | null>(null);
	React.useEffect(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		// Fewer balls on narrow screens, so the pile doesn't bury the text.
		setBallCount(window.innerWidth < 640 ? 45 : 100);
	}, []);

	const signIn = useMutation({
		mutationFn: async () => {
			const result = await authClient.signIn.social({
				provider: "photon",
				callbackURL: "/dashboard",
			});
			if (result.error) {
				throw new Error(result.error.message ?? "Innlogging med TIHLDE feilet");
			}
		},
	});

	return (
		<main className="relative isolate h-svh overflow-hidden bg-background">
			<div className="absolute inset-0 -z-20">
				{ballCount !== null && (
					<Ballpit
						count={ballCount}
						colors={BALL_COLORS}
						gravity={0.5}
						friction={0.9975}
						wallBounce={0.95}
						// Hide the ball under the cursor; it still pushes the others aside.
						followCursor={false}
					/>
				)}
			</div>
			{/* Keeps the text readable when balls pass behind it. */}
			<div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,var(--background)_0%,transparent_60%)] opacity-80" />

			<div className="pointer-events-none flex h-full flex-col items-center justify-center gap-8 px-4 pb-[20svh] text-center">
				<div className="grid gap-3">
					<p className="font-medium text-muted-foreground text-sm uppercase tracking-[0.2em]">
						TIHLDE
					</p>
					{/* Hover to see the outlines; letters can be dragged and spring back. */}
					<h1 className="mx-auto h-32 w-[min(90vw,40rem)] sm:h-44">
						<TechText
							text="Sporty"
							fontWeight={700}
							fontSize={140}
							color="#fafafa"
							accentColor="#60a5fa"
							reach={160}
							className="pointer-events-auto"
						/>
					</h1>
					<p className="mx-auto max-w-md text-balance text-lg text-muted-foreground">
						Spond og botsystemet for lagene dine, samlet på ett sted.
					</p>
				</div>

				<div className="pointer-events-auto grid justify-items-center gap-3">
					{session ? (
						<Button
							size="lg"
							nativeButton={false}
							render={<Link to="/dashboard" />}
						>
							Gå til dashboard
							<ArrowRightIcon />
						</Button>
					) : (
						<Button
							size="lg"
							disabled={isPending || signIn.isPending}
							onClick={() => signIn.mutate()}
						>
							{signIn.isPending ? "Sender deg til tihlde.org…" : "Logg inn"}
						</Button>
					)}
					<p className="text-muted-foreground text-sm">
						{signIn.isError
							? signIn.error.message
							: session
								? `Innlogget som ${session.user.name}`
								: "Du logger inn med TIHLDE-kontoen din."}
					</p>
				</div>
			</div>
		</main>
	);
}
