import type { SpondClient, SpondEvent, SpondGroup } from "@sporty/spond";
import { TRPCError } from "@trpc/server";

import type { Context } from "./context";
import { getViewer } from "./people";

const CACHE_TTL_MS = 60 * 1000;

// Short-lived cache so dashboard refreshes don't hammer Spond's API.
const cache = new Map<string, { expiresAt: number; value: Promise<unknown> }>();

export function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
	const hit = cache.get(key);
	if (hit && hit.expiresAt > Date.now()) return hit.value as Promise<T>;
	const value = load();
	cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
	value.catch(() => cache.delete(key));
	return value;
}

/** Drops cached entries whose key starts with the prefix. */
export function invalidateCache(prefix: string) {
	for (const key of cache.keys()) {
		if (key.startsWith(prefix)) cache.delete(key);
	}
}

const DAY = 24 * 60 * 60 * 1000;

/** The group's events from half a year back and onwards, oldest first. */
export function getGroupEvents(
	spond: SpondClient,
	groupId: string,
): Promise<SpondEvent[]> {
	return cached(`events:${groupId}`, () =>
		spond.getEvents({
			groupId,
			minEnd: new Date(Date.now() - 180 * DAY),
			max: 500,
		}),
	);
}

export function getGroups(spond: SpondClient): Promise<SpondGroup[]> {
	return cached("groups", () => spond.getGroups());
}

/** Cookie holding the Spond group the user picked on /groups. */
export const SELECTED_GROUP_COOKIE = "sporty-group";

type GroupContext = Pick<
	Context,
	"spond" | "db" | "session" | "selectedGroupId"
>;

/**
 * The requested group, else the one picked on /groups, else the first.
 * Every group the Spond account is in can be picked, so people can find
 * their team and link themselves; its data needs getGroup's link check.
 */
export async function getGroupForLinking(
	ctx: GroupContext,
	groupId?: string,
): Promise<SpondGroup> {
	const groups = await getGroups(ctx.spond);
	if (groupId) {
		const group = groups.find((g) => g.id === groupId);
		if (!group) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Fant ikke Spond-gruppen",
			});
		}
		return group;
	}
	const group = groups.find((g) => g.id === ctx.selectedGroupId) ?? groups[0];
	if (!group) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Spond-kontoen er ikke med i noen grupper",
		});
	}
	return group;
}

/**
 * Like getGroupForLinking, but only for people linked to their Spond member
 * in the group. Everything except linking yourself goes through this.
 */
export async function getGroup(
	ctx: GroupContext,
	groupId?: string,
): Promise<SpondGroup> {
	const group = await getGroupForLinking(ctx, groupId);
	const viewer = await getViewer(ctx.db, ctx.session, group);
	if (!viewer.member) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Du må koble deg til Spond-medlemmet ditt i gruppen først",
		});
	}
	return group;
}
