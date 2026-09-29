import {
	type SpondComment,
	type SpondEvent,
	SpondError,
	type SpondMember,
} from "@sporty/spond";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { getViewer, syncPeople } from "../people";
import { cached, getGroup, getGroupEvents, getGroups } from "../spond-cache";

const DAY = 24 * 60 * 60 * 1000;

function percentChange(current: number, previous: number): number | null {
	if (previous === 0) return current === 0 ? 0 : null;
	return ((current - previous) / previous) * 100;
}

function invitedCount(event: SpondEvent) {
	const r = event.responses;
	return (
		r.acceptedIds.length +
		r.declinedIds.length +
		r.unansweredIds.length +
		r.waitinglistIds.length +
		r.unconfirmedIds.length
	);
}

function attendanceRate(events: SpondEvent[]): number | null {
	const invited = events.reduce((sum, e) => sum + invitedCount(e), 0);
	if (invited === 0) return null;
	const accepted = events.reduce(
		(sum, e) => sum + e.responses.acceptedIds.length,
		0,
	);
	return (accepted / invited) * 100;
}

export const spondRouter = router({
	groups: protectedProcedure.query(async ({ ctx }) => {
		const groups = await getGroups(ctx.spond);
		return groups.map((g) => ({
			id: g.id,
			name: g.name,
			memberCount: g.members.length,
		}));
	}),

	overview: protectedProcedure
		.input(z.object({ groupId: z.string().optional() }))
		.query(async ({ ctx, input }) => {
			const group = await getGroup(ctx.spond, input.groupId);
			const now = Date.now();

			const events = await getGroupEvents(ctx.spond, group.id);
			const activeEvents = events.filter((e) => !e.cancelled);

			await syncPeople(ctx.db, group);
			const [viewer, people] = await Promise.all([
				getViewer(ctx.db, ctx.session, group),
				ctx.db.person.findMany({
					where: { spondGroupId: group.id },
					select: {
						spondMemberId: true,
						spondEmail: true,
						tihldeEmail: true,
						tihldeUserId: true,
					},
				}),
			]);
			const peopleByMember = new Map(people.map((p) => [p.spondMemberId, p]));

			const subGroupNames = new Map(group.subGroups.map((s) => [s.id, s.name]));
			const roleNames = new Map((group.roles ?? []).map((r) => [r.id, r.name]));

			// Stats compare the last 30 days with the 30 days before that.
			const inWindow = (iso: string, from: number, to: number) => {
				const t = new Date(iso).getTime();
				return t >= from && t < to;
			};
			const newMembers = group.members.filter((m) =>
				inWindow(m.createdTime, now - 30 * DAY, now),
			).length;
			const prevNewMembers = group.members.filter((m) =>
				inWindow(m.createdTime, now - 60 * DAY, now - 30 * DAY),
			).length;

			const upcoming = activeEvents.filter(
				(e) => new Date(e.startTimestamp).getTime() >= now,
			);
			const upcomingNext30 = upcoming.filter((e) =>
				inWindow(e.startTimestamp, now, now + 30 * DAY),
			).length;
			const pastLast30 = activeEvents.filter((e) =>
				inWindow(e.startTimestamp, now - 30 * DAY, now),
			);
			const pastPrev30 = activeEvents.filter((e) =>
				inWindow(e.startTimestamp, now - 60 * DAY, now - 30 * DAY),
			);

			const answered = upcoming.reduce(
				(sum, e) =>
					sum + e.responses.acceptedIds.length + e.responses.declinedIds.length,
				0,
			);
			const upcomingInvited = upcoming.reduce(
				(sum, e) => sum + invitedCount(e),
				0,
			);

			const memberStats = new Map<
				string,
				{ invited: number; accepted: number }
			>();
			for (const e of activeEvents) {
				if (new Date(e.startTimestamp).getTime() > now) continue;
				const r = e.responses;
				for (const id of [
					...r.acceptedIds,
					...r.declinedIds,
					...r.unansweredIds,
					...r.waitinglistIds,
					...r.unconfirmedIds,
				]) {
					const s = memberStats.get(id) ?? { invited: 0, accepted: 0 };
					s.invited += 1;
					if (r.acceptedIds.includes(id)) s.accepted += 1;
					memberStats.set(id, s);
				}
			}

			return {
				group: {
					id: group.id,
					name: group.name,
					activity: group.activity ?? null,
				},
				viewer: {
					canManagePeople: viewer.canManagePeople,
					memberId: viewer.member?.id ?? null,
					signedInWithTihlde: viewer.tihlde !== null,
				},
				stats: {
					memberCount: group.members.length,
					newMembers,
					newMembersChange: percentChange(newMembers, prevNewMembers),
					upcomingEvents: upcoming.length,
					upcomingNext30,
					attendanceRate: attendanceRate(pastLast30),
					attendanceRatePrev: attendanceRate(pastPrev30),
					responseRate:
						upcomingInvited === 0 ? null : (answered / upcomingInvited) * 100,
				},
				events: events.map((e) => ({
					id: e.id,
					heading: e.heading,
					type: e.type,
					start: e.startTimestamp,
					end: e.endTimestamp,
					location: e.location?.feature ?? e.location?.address ?? null,
					cancelled: Boolean(e.cancelled),
					accepted: e.responses.acceptedIds.length,
					declined: e.responses.declinedIds.length,
					unanswered:
						e.responses.unansweredIds.length +
						e.responses.unconfirmedIds.length,
					waitinglist: e.responses.waitinglistIds.length,
					invited: invitedCount(e),
				})),
				members: group.members.map((m) => {
					const s = memberStats.get(m.id);
					const person = peopleByMember.get(m.id);
					return {
						linked: Boolean(person?.tihldeEmail || person?.tihldeUserId),
						// Emails are only shown to those who can link users.
						spondEmail: viewer.canManagePeople
							? (person?.spondEmail ?? null)
							: null,
						tihldeEmail: viewer.canManagePeople
							? (person?.tihldeEmail ?? null)
							: null,
						id: m.id,
						name: `${m.firstName} ${m.lastName}`.trim(),
						imageUrl: m.profile?.imageUrl ?? null,
						joined: m.createdTime,
						subGroups: m.subGroups
							.map((id) => subGroupNames.get(id))
							.filter((n): n is string => Boolean(n)),
						subGroupIds: m.subGroups,
						roles: (m.roles ?? [])
							.map((id) => roleNames.get(id))
							.filter((n): n is string => Boolean(n)),
						eventsInvited: s?.invited ?? 0,
						eventsAccepted: s?.accepted ?? 0,
					};
				}),
				subGroups: group.subGroups.map((s) => ({
					id: s.id,
					name: s.name,
					color: s.color ?? null,
					memberCount: group.members.filter((m) => m.subGroups.includes(s.id))
						.length,
				})),
			};
		}),

	/** Everything about one event: time, place, match info, who replied what, comments. */
	event: protectedProcedure
		.input(z.object({ groupId: z.string().optional(), eventId: z.string() }))
		.query(async ({ ctx, input }) => {
			const group = await getGroup(ctx.spond, input.groupId);
			const notFound = new TRPCError({
				code: "NOT_FOUND",
				message: "Fant ikke arrangementet",
			});

			let event: SpondEvent;
			try {
				event = await cached(`event:${input.eventId}`, () =>
					ctx.spond.getEvent(input.eventId),
				);
			} catch (error) {
				if (error instanceof SpondError && error.status < 500) throw notFound;
				throw error;
			}
			// Only events for this group, not anything else the Spond account can see.
			if (event.recipients?.group?.id !== group.id) throw notFound;

			const members = new Map(group.members.map((m) => [m.id, m]));
			const membersByProfile = new Map(
				group.members.flatMap((m) => (m.profile ? [[m.profile.id, m]] : [])),
			);
			const describe = (member: SpondMember | undefined, id: string) => ({
				id,
				name: member
					? `${member.firstName} ${member.lastName}`.trim()
					: "Ukjent",
				imageUrl: member?.profile?.imageUrl ?? null,
			});
			const person = (id: string) => describe(members.get(id), id);
			const flattenComments = (comments: SpondComment[] = []): SpondComment[] =>
				comments.flatMap((c) => [c, ...flattenComments(c.children)]);

			const r = event.responses;
			const loc = event.location;
			const hasCoordinates =
				typeof loc?.latitude === "number" && typeof loc?.longitude === "number";
			const match = event.matchInfo;

			return {
				id: event.id,
				heading: event.heading,
				description: event.description?.trim() || null,
				type: event.type,
				cancelled: Boolean(event.cancelled),
				start: event.startTimestamp,
				end: event.openEnded ? null : event.endTimestamp,
				meetup: event.meetupTimestamp ?? null,
				location: loc
					? {
							name: loc.feature ?? null,
							address:
								[loc.address, loc.postalCode, loc.locality]
									.filter((part, i, all) => part && all.indexOf(part) === i)
									.join(", ") || null,
							latitude: hasCoordinates ? (loc.latitude as number) : null,
							longitude: hasCoordinates ? (loc.longitude as number) : null,
						}
					: null,
				match:
					event.matchEvent && match
						? {
								teamName: match.teamName,
								opponentName: match.opponentName,
								type: match.type,
								teamScore: match.scoresSet ? (match.teamScore ?? null) : null,
								opponentScore: match.scoresSet
									? (match.opponentScore ?? null)
									: null,
								scoresFinal: match.scoresFinal,
							}
						: null,
				owners: (event.owners ?? []).map((o) => ({
					id: o.id,
					name: `${o.firstName} ${o.lastName}`.trim(),
					imageUrl: o.imageUrl ?? null,
				})),
				responses: {
					accepted: r.acceptedIds.map(person),
					declined: r.declinedIds.map((id) => ({
						...person(id),
						message: r.declineMessages?.[id] ?? null,
					})),
					unanswered: [...r.unansweredIds, ...r.unconfirmedIds].map(person),
					waitinglist: r.waitinglistIds.map(person),
				},
				comments: flattenComments(event.comments)
					.map((c) => ({
						id: c.id,
						text: c.text,
						timestamp: c.timestamp,
						author: describe(
							membersByProfile.get(c.fromProfileId),
							c.fromProfileId,
						),
					}))
					.sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
				spondUrl: `https://spond.com/client/sponds/${event.id}`,
			};
		}),
});
