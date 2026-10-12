import { SidebarInset, SidebarProvider } from "@sporty/ui/components/sidebar";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import type * as React from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { getUser } from "@/functions/get-user";
import { getAccessState } from "@/functions/selected-group";

export const Route = createFileRoute("/_auth")({
	component: AuthLayout,
	beforeLoad: async () => {
		const session = await getUser();
		if (!session) {
			throw redirect({
				to: "/",
			});
		}
		// Picking a group is the first step after signing in, and the way back
		// if the picked group is no longer visible to them. Then they have to be
		// linked to their Spond member in it.
		const access = await getAccessState();
		if (access === "no-group") {
			throw redirect({ to: "/groups" });
		}
		if (access === "unlinked") {
			throw redirect({ to: "/link-spond" });
		}
		return { session };
	},
	loader: async ({ context }) => {
		if (!context.session) {
			throw redirect({
				to: "/",
			});
		}
	},
});

function AuthLayout() {
	return (
		<SidebarProvider
			style={
				{
					"--sidebar-width": "calc(var(--spacing) * 72)",
					"--header-height": "calc(var(--spacing) * 12)",
				} as React.CSSProperties
			}
		>
			<AppSidebar variant="inset" />
			<SidebarInset>
				<Outlet />
			</SidebarInset>
		</SidebarProvider>
	);
}
