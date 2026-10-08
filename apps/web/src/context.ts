import type { Context as ApiContext } from "@sporty/api/context";
import { SELECTED_GROUP_COOKIE } from "@sporty/api/spond-cache";

import { ENV } from "./env.server";
import { auth, db, photon, spond } from "./services";

export async function createContext({
	req,
}: {
	req: Request;
}): Promise<ApiContext> {
	const session = await auth.api.getSession({
		headers: req.headers,
	});
	return {
		db,
		session,
		spond,
		photon,
		selectedGroupId: readCookie(req, SELECTED_GROUP_COOKIE),
		displayAllGroups: ENV.DISPLAY_ALL_GROUPS,
	};
}

function readCookie(req: Request, name: string): string | null {
	for (const part of req.headers.get("cookie")?.split(";") ?? []) {
		const [key, ...value] = part.trim().split("=");
		if (key === name) return decodeURIComponent(value.join("="));
	}
	return null;
}

export type Context = Awaited<ReturnType<typeof createContext>>;
