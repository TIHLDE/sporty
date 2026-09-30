import { createFileRoute, redirect } from "@tanstack/react-router";

// Sign-in happens on the home page, with TIHLDE only.
export const Route = createFileRoute("/login")({
	beforeLoad: () => {
		throw redirect({ to: "/" });
	},
});
