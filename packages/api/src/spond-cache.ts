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
	"spond" | "db" | "photon" | "session" | "selectedGroupId" | "displayAllGroups"
>;

/**
 * Slugs of the tihlde.org groups the user is a member of. Empty if they didn't
 * sign in with TIHLDE or tihlde.org can't be reached.
 */
function getMyTihldeGroupSlugs(ctx: GroupContext): Promise<Set<string>> {
	const userId = ctx.session?.user.id;
	if (!userId) return Promise.resolve(new Set());
	return cached(`tihlde-groups:${userId}`, () =>
		ctx.photon
			.getMyGroups(userId)
			.then((groups) => new Set(groups.map((g) => g.slug)))
			.catch(() => new Set<string>()),
	);
}

/**
 * The groups the current user may see: all of the Spond account's groups when
 * DISPLAY_ALL_GROUPS is on, otherwise those where they are a member in Spond,
 * or a member of the TIHLDE group linked to it (set on the admin page).
 */
export async function getVisibleGroups(
	ctx: GroupContext,
): Promise<SpondGroup[]> {
	const groups = await getGroups(ctx.spond);
	if (ctx.displayAllGroups) return groups;
	const [tihldeSlugs, settings, viewers] = await Promise.all([
		getMyTihldeGroupSlugs(ctx),
		ctx.db.spondGroupSettings.findMany({
			where: { spondGroupId: { in: groups.map((g) => g.id) } },
			select: { spondGroupId: true, tihldeGroupSlug: true },
		}),
		Promise.all(groups.map((group) => getViewer(ctx.db, ctx.session, group))),
	]);
	const slugByGroup = new Map(
		settings.map((s) => [s.spondGroupId, s.tihldeGroupSlug]),
	);
	return groups.filter((group, i) => {
		const slug = slugByGroup.get(group.id);
		return (
			Boolean(viewers[i]?.member) || (slug != null && tihldeSlugs.has(slug))
		);
	});
}

/**
 * The requested group, else the one picked on /groups, else the first visible.
 * A stale picked group (no longer visible) falls back to the first.
 */
export async function getGroup(
	ctx: GroupContext,
	groupId?: string,
): Promise<SpondGroup> {
	const groups = await getVisibleGroups(ctx);
	if (groupId) {
		const group = groups.find((g) => g.id === groupId);
		if (group) return group;
		const exists = (await getGroups(ctx.spond)).some((g) => g.id === groupId);
		throw new TRPCError(
			exists
				? {
						code: "FORBIDDEN",
						message: "Du har ikke tilgang til denne gruppen",
					}
				: { code: "NOT_FOUND", message: "Fant ikke Spond-gruppen" },
		);
	}
	const group = groups.find((g) => g.id === ctx.selectedGroupId) ?? groups[0];
	if (!group) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Du er ikke medlem av noen av Spond-gruppene",
		});
	}
	return group;
}
