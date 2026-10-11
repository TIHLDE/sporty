import {
	getVisibleGroups,
	SELECTED_GROUP_COOKIE,
} from "@sporty/api/spond-cache";
import { createServerFn } from "@tanstack/react-start";
import { getRequest, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";

import { createContext } from "@/context";

/**
 * Whether a group has been picked on /groups and the user may still see it.
 * False both before the first pick and after losing access to the group.
 */
export const hasSelectedGroup = createServerFn({ method: "GET" }).handler(
	async () => {
		const ctx = await createContext({ req: getRequest() });
		if (!ctx.selectedGroupId) return false;
		const groups = await getVisibleGroups(ctx);
		return groups.some((g) => g.id === ctx.selectedGroupId);
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
