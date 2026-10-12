import { getViewer } from "@sporty/api/people";
import {
	getVisibleGroups,
	SELECTED_GROUP_COOKIE,
} from "@sporty/api/spond-cache";
import { createServerFn } from "@tanstack/react-start";
import { getRequest, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";

import { createContext } from "@/context";

export type AccessState =
	/** No group picked on /groups, or the picked group is no longer visible. */
	| "no-group"
	/** Not linked to a Spond member in the picked group yet. */
	| "unlinked"
	| "ok";

/**
 * Where the user is on the way into the dashboard: they have to pick a group
 * and then be linked to their Spond member in it.
 */
export const getAccessState = createServerFn({ method: "GET" }).handler(
	async (): Promise<AccessState> => {
		const ctx = await createContext({ req: getRequest() });
		if (!ctx.selectedGroupId) return "no-group";
		const groups = await getVisibleGroups(ctx);
		const group = groups.find((g) => g.id === ctx.selectedGroupId);
		if (!group) return "no-group";
		const viewer = await getViewer(ctx.db, ctx.session, group);
		return viewer.member ? "ok" : "unlinked";
	},
);

export const setSelectedGroup = createServerFn({ method: "POST" })
	.inputValidator(z.object({ groupId: z.string().min(1) }))
	.handler(async ({ data }) => {
		setCookie(SELECTED_GROUP_COOKIE, data.groupId, {
			path: "/",
			sameSite: "lax",
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			maxAge: 60 * 60 * 24 * 365,
		});
	});
