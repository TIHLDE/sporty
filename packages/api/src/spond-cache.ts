import type { SpondClient, SpondEvent, SpondGroup } from "@sporty/spond";
import { TRPCError } from "@trpc/server";

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

export async function getGroup(
	spond: SpondClient,
	groupId?: string,
): Promise<SpondGroup> {
	const groups = await getGroups(spond);
	const group = groupId ? groups.find((g) => g.id === groupId) : groups[0];
	if (!group) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Fant ingen Spond-gruppe",
		});
	}
	return group;
}
