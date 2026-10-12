import type { Database } from "@sporty/db";
import { SpondError, type SpondEvent, type SpondGroup } from "@sporty/spond";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { requirePeopleManager, syncPeople } from "../people";
import { PhotonReauthRequired } from "../photon";
import { getGroup, getGroupEvents, invalidateCache } from "../spond-cache";

const DAY = 24 * 60 * 60 * 1000;
/** How far back events are offered for fellesbøter. */
const LOOKBACK_DAYS = 60;

export type EventCategory = "match" | "training" | "other";

export const DEFAULT_FINE_SETTINGS = {
	fineAmountMatch: 2,
	fineAmountTraining: 1,
	fineAmountOther: null as number | null,
	fineLawId: null as string | null,
	fineReason: "Ikke svart i Spond innen fristen",
};

/**
 * Home and away games are matches; training is set up in Spond as a
 * "treningskamp" (friendly). Everything else is an ordinary event.
 */
export function eventCategory(event: SpondEvent): EventCategory {
	if (!event.matchEvent || !event.matchInfo) return "other";
	return event.matchInfo.type === "FRIENDLY" ? "training" : "match";
}

/** The reply deadline, falling back to the start when none is set. */
function replyDeadline(event: SpondEvent) {
	return event.rsvpDate ?? event.startTimestamp;
}

function nonResponderIds(event: SpondEvent) {
	return [...event.responses.unansweredIds, ...event.responses.unconfirmedIds];
}

/** Members of this Spond subgroup (injured, on leave, …) never get fellesbøter. */
const EXEMPT_SUBGROUP_NAME = "inaktiv";

export function exemptMemberIds(group: SpondGroup): Set<string> {
	const exemptSubGroups = new Set(
		group.subGroups
			.filter((s) => s.name.trim().toLowerCase() === EXEMPT_SUBGROUP_NAME)
			.map((s) => s.id),
	);
	return new Set(
		group.members
			.filter((m) => m.subGroups.some((id) => exemptSubGroups.has(id)))
			.map((m) => m.id),
	);
}

export async function getFineSettings(db: Database, spondGroupId: string) {
	const row = await db.spondGroupSettings.findUnique({
		where: { spondGroupId },
	});
	return {
		tihldeGroupSlug: row?.tihldeGroupSlug ?? null,
		fineAmountMatch:
			row?.fineAmountMatch ?? DEFAULT_FINE_SETTINGS.fineAmountMatch,
		fineAmountTraining:
			row?.fineAmountTraining ?? DEFAULT_FINE_SETTINGS.fineAmountTraining,
		fineAmountOther: row
			? row.fineAmountOther
			: DEFAULT_FINE_SETTINGS.fineAmountOther,
		fineLawId: row?.fineLawId ?? null,
		fineReason: row?.fineReason ?? DEFAULT_FINE_SETTINGS.fineReason,
	};
}

type FineSettings = Awaited<ReturnType<typeof getFineSettings>>;

function defaultAmount(settings: FineSettings, category: EventCategory) {
	if (category === "match") return settings.fineAmountMatch;
	if (category === "training") return settings.fineAmountTraining;
	return settings.fineAmountOther;
}

const dateFormat = new Intl.DateTimeFormat("nb-NO", {
	day: "numeric",
	month: "short",
	timeZone: "Europe/Oslo",
});

export const eventFinesRouter = router({
	/**
	 * Events whose reply deadline has passed, with the people who never
	 * replied and whether they have already been fined for it.
	 */
	list: protectedProcedure
		.input(z.object({ groupId: z.string().optional() }))
		.query(async ({ ctx, input }) => {
			const group = await getGroup(ctx, input.groupId);
			await requirePeopleManager(ctx.db, ctx.session, group);
			const settings = await getFineSettings(ctx.db, group.id);
			const exempt = exemptMemberIds(group);
			const now = Date.now();

			const events = (await getGroupEvents(ctx.spond, group.id)).filter((e) => {
				const deadline = new Date(replyDeadline(e)).getTime();
				return (
					!e.cancelled &&
					deadline < now &&
					deadline > now - LOOKBACK_DAYS * DAY &&
					nonResponderIds(e).some((id) => !exempt.has(id))
				);
			});

			await syncPeople(ctx.db, group);
			const [people, given] = await Promise.all([
				ctx.db.person.findMany({
					where: { spondGroupId: group.id },
					select: { spondMemberId: true, name: true, tihldeUserId: true },
				}),
				ctx.db.eventFine.findMany({
					where: { spondEventId: { in: events.map((e) => e.id) } },
					select: { spondEventId: true, spondMemberId: true, amount: true },
				}),
			]);
			const personByMember = new Map(people.map((p) => [p.spondMemberId, p]));
			const givenByKey = new Map(
				given.map((g) => [`${g.spondEventId}:${g.spondMemberId}`, g.amount]),
			);

			return {
				tihldeGroupSlug: settings.tihldeGroupSlug,
				events: events
					.map((e) => {
						const category = eventCategory(e);
						return {
							id: e.id,
							heading: e.heading,
							start: e.startTimestamp,
							deadline: replyDeadline(e),
							hasDeadline: Boolean(e.rsvpDate),
							category,
							defaultAmount: defaultAmount(settings, category),
							nonResponders: nonResponderIds(e).map((memberId) => {
								const person = personByMember.get(memberId);
								return {
									memberId,
									name: person?.name ?? "Ukjent",
									linked: Boolean(person?.tihldeUserId),
									exempt: exempt.has(memberId),
									finedAmount: givenByKey.get(`${e.id}:${memberId}`) ?? null,
								};
							}),
						};
					})
					.sort((a, b) => b.deadline.localeCompare(a.deadline)),
			};
		}),

	/**
	 * Gives everyone selected who still hasn't replied a fine on tihlde.org,
	 * as the signed-in administrator. People who have replied since, aren't
	 * linked to a TIHLDE user, or were already fined for the event are skipped.
	 */
	give: protectedProcedure
		.input(
			z.object({
				groupId: z.string().optional(),
				eventId: z.string(),
				amount: z
					.number()
					.int("Antall bøter må være et heltall")
					// 0 is allowed: on tihlde.org it is a warning that doesn't count.
					.min(0, "Antall bøter kan ikke være negativt")
					.max(50, "Maks 50 bøter"),
				memberIds: z.array(z.string()).min(1, "Velg minst én person"),
				/** Paragraph in the lovverk. Null means none; left out means the one from the settings. */
				lawId: z.string().nullable().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const group = await getGroup(ctx, input.groupId);
			await requirePeopleManager(ctx.db, ctx.session, group);
			const settings = await getFineSettings(ctx.db, group.id);
			const groupSlug = settings.tihldeGroupSlug;
			if (!groupSlug) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "Velg en TIHLDE-gruppe under Botsystem først",
				});
			}

			// Fresh from Spond, not the cache: someone may have replied in the meantime.
			const event = await ctx.spond.getEvent(input.eventId).catch((error) => {
				if (error instanceof SpondError && error.status < 500) return null;
				throw error;
			});
			if (!event || event.recipients?.group?.id !== group.id) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Fant ikke arrangementet",
				});
			}
			if (event.cancelled) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Arrangementet er avlyst",
				});
			}
			if (new Date(replyDeadline(event)).getTime() > Date.now()) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Svarfristen har ikke gått ut ennå",
				});
			}

			await syncPeople(ctx.db, group);
			const people = await ctx.db.person.findMany({
				where: {
					spondGroupId: group.id,
					spondMemberId: { in: input.memberIds },
				},
				select: { spondMemberId: true, name: true, tihldeUserId: true },
			});
			const personByMember = new Map(people.map((p) => [p.spondMemberId, p]));
			const stillUnanswered = new Set(nonResponderIds(event));
			const exempt = exemptMemberIds(group);
			const lawId =
				input.lawId === undefined ? settings.fineLawId : input.lawId;
			const reason = `${settings.fineReason}: ${event.heading} (${dateFormat.format(new Date(event.startTimestamp))})`;

			const given: { name: string; amount: number }[] = [];
			const skipped: { name: string; reason: string }[] = [];
			const failed: { name: string; message: string }[] = [];
			let reauthRequired = false;

			for (const memberId of new Set(input.memberIds)) {
				const person = personByMember.get(memberId);
				const name = person?.name ?? "Ukjent";
				if (!stillUnanswered.has(memberId)) {
					skipped.push({ name, reason: "har svart" });
					continue;
				}
				if (exempt.has(memberId)) {
					skipped.push({ name, reason: "er i undergruppen Inaktiv" });
					continue;
				}
				if (!person?.tihldeUserId) {
					skipped.push({ name, reason: "ikke koblet til TIHLDE" });
					continue;
				}
				if (reauthRequired) {
					failed.push({ name, message: "Logg inn med TIHLDE på nytt" });
					continue;
				}

				// The unique (event, member) row doubles as a lock, so a double
				// click or two admins at once can't fine the same person twice.
				// 0 bøter (a warning, or a test) isn't recorded, so it doesn't
				// stop a real fine for the same event later.
				const record =
					input.amount === 0
						? null
						: await ctx.db.eventFine
								.create({
									data: {
										spondGroupId: group.id,
										spondEventId: event.id,
										spondMemberId: memberId,
										tihldeUserId: person.tihldeUserId,
										amount: input.amount,
										createdById: ctx.session.user.id,
									},
								})
								.catch((error: unknown) => {
									if ((error as { code?: string }).code === "P2002")
										return "taken" as const;
									throw error;
								});
				if (record === "taken") {
					skipped.push({ name, reason: "har allerede fått bot for dette" });
					continue;
				}

				try {
					const fine = await ctx.photon.createFine(
						ctx.session.user.id,
						groupSlug,
						{
							userId: person.tihldeUserId,
							amount: input.amount,
							reason,
							...(lawId ? { lawId } : {}),
						},
					);
					if (record) {
						await ctx.db.eventFine.update({
							where: { id: record.id },
							data: { photonFineId: fine.id },
						});
					}
					given.push({ name, amount: input.amount });
				} catch (error) {
					if (record) {
						await ctx.db.eventFine.delete({ where: { id: record.id } });
					}
					if (error instanceof PhotonReauthRequired) reauthRequired = true;
					failed.push({
						name,
						message: error instanceof Error ? error.message : "Ukjent feil",
					});
				}
			}

			if (given.length > 0) invalidateCache(`fines:${groupSlug}:`);
			return { given, skipped, failed };
		}),
});
