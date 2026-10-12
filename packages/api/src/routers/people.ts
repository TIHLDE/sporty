import { createHash, randomInt, timingSafeEqual } from "node:crypto";

import type { SpondGroup } from "@sporty/spond";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { Context } from "../context";
import { protectedProcedure, router } from "../index";
import {
	getTihldeIdentity,
	getViewer,
	linkPerson,
	memberRoleNames,
	normalizeEmail,
	requirePeopleManager,
	requireTihldeIdentity,
	syncPeople,
	unlinkPerson,
} from "../people";
import type { PhotonLaw } from "../photon";
import { getGroup, getGroupForLinking } from "../spond-cache";
import { getFineSettings } from "./event-fines";
import { finesErrorReason, getFineUsers } from "./fines";

const groupInput = z.object({ groupId: z.string().optional() });

const CODE_TTL_MS = 15 * 60 * 1000;
const CODE_RESEND_MS = 60 * 1000;
const CODE_MAX_ATTEMPTS = 5;

function hashCode(code: string) {
	return createHash("sha256").update(code).digest("hex");
}

/** "ola.nordmann@gmail.com" → "o**********n@gmail.com" */
function maskEmail(email: string) {
	const [local = "", domain = ""] = email.split("@");
	const masked =
		local.length <= 2
			? `${local[0] ?? ""}*`
			: `${local[0]}${"*".repeat(local.length - 2)}${local.at(-1)}`;
	return `${masked}@${domain}`;
}

export const peopleRouter = router({
	/**
	 * Everyone in the group with their Spond and TIHLDE identities.
	 * Administrators and sub-administrators only.
	 */
	list: protectedProcedure.input(groupInput).query(async ({ ctx, input }) => {
		const group = await getGroup(ctx, input.groupId);
		await requirePeopleManager(ctx.db, ctx.session, group);
		await syncPeople(ctx.db, group);

		const people = await ctx.db.person.findMany({
			where: { spondGroupId: group.id },
			orderBy: { name: "asc" },
		});
		const linkerIds = [
			...new Set(people.flatMap((p) => (p.linkedById ? [p.linkedById] : []))),
		];
		const linkers = await ctx.db.user.findMany({
			where: { id: { in: linkerIds } },
			select: { id: true, name: true },
		});
		const linkerNames = new Map(linkers.map((u) => [u.id, u.name]));
		const members = new Map(group.members.map((m) => [m.id, m]));

		return people.map((p) => {
			const member = members.get(p.spondMemberId);
			return {
				id: p.id,
				spondMemberId: p.spondMemberId,
				name: p.name,
				spondEmail: p.spondEmail,
				tihldeEmail: p.tihldeEmail,
				tihldeUserId: p.tihldeUserId,
				tihldeName: p.tihldeName,
				linked: Boolean(p.tihldeEmail || p.tihldeUserId),
				linkedAt: p.linkedAt,
				linkedBy: p.linkedById
					? (linkerNames.get(p.linkedById) ?? "Ukjent")
					: p.linkedAt
						? "Kommandolinje"
						: null,
				inGroup: Boolean(member),
				imageUrl: member?.profile?.imageUrl ?? null,
				roles: member ? memberRoleNames(group, member) : [],
			};
		});
	}),

	/** The Spond member the current TIHLDE user is linked to, if any. */
	me: protectedProcedure.input(groupInput).query(async ({ ctx, input }) => {
		const group = await getGroup(ctx, input.groupId);
		const viewer = await getViewer(ctx.db, ctx.session, group);
		if (!viewer.member) return null;
		return ctx.db.person.findUnique({
			where: { spondMemberId: viewer.member.id },
		});
	}),

	link: protectedProcedure
		.input(
			groupInput.extend({
				memberId: z.string(),
				tihldeEmail: z.email("Ugyldig e-postadresse").nullish(),
				tihldeUserId: z.string().nullish(),
				tihldeName: z.string().nullish(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const group = await getGroup(ctx, input.groupId);
			await requirePeopleManager(ctx.db, ctx.session, group);
			return linkPerson(ctx.db, group, {
				memberId: input.memberId,
				tihldeEmail: input.tihldeEmail,
				tihldeUserId: input.tihldeUserId,
				tihldeName: input.tihldeName,
				linkedById: ctx.session.user.id,
			});
		}),

	unlink: protectedProcedure
		.input(groupInput.extend({ memberId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const group = await getGroup(ctx, input.groupId);
			await requirePeopleManager(ctx.db, ctx.session, group);
			await unlinkPerson(ctx.db, group, input.memberId);
		}),

	/**
	 * Spond members nobody is linked to yet, for users to find themselves in.
	 * No emails, since every signed-in user can see this.
	 */
	unlinkedMembers: protectedProcedure
		.input(groupInput)
		.query(async ({ ctx, input }) => {
			const group = await getGroupForLinking(ctx, input.groupId);
			await syncPeople(ctx.db, group);
			const linked = await ctx.db.person.findMany({
				where: {
					spondGroupId: group.id,
					OR: [{ tihldeEmail: { not: null } }, { tihldeUserId: { not: null } }],
				},
				select: { spondMemberId: true },
			});
			const linkedIds = new Set(linked.map((p) => p.spondMemberId));
			return {
				groupName: group.name,
				/** Whether codes can be emailed; otherwise only admin requests work. */
				emailEnabled: ctx.mailer !== null,
				members: group.members
					.filter((m) => !linkedIds.has(m.id))
					.map((m) => ({
						memberId: m.id,
						name: `${m.firstName} ${m.lastName}`.trim(),
						imageUrl: m.profile?.imageUrl ?? null,
						hasEmail: Boolean(normalizeEmail(m.email)),
					}))
					.sort((a, b) => a.name.localeCompare(b.name, "nb")),
			};
		}),

	/** The current user's pending request to be linked, if any. */
	myLinkRequest: protectedProcedure
		.input(groupInput)
		.query(async ({ ctx, input }) => {
			const group = await getGroupForLinking(ctx, input.groupId);
			const tihlde = await getTihldeIdentity(ctx.db, ctx.session);
			if (!tihlde) return null;
			const request = await ctx.db.personLinkRequest.findUnique({
				where: {
					spondGroupId_tihldeUserId: {
						spondGroupId: group.id,
						tihldeUserId: tihlde.userId,
					},
				},
			});
			if (!request) return null;
			const member = group.members.find((m) => m.id === request.spondMemberId);
			return {
				id: request.id,
				memberId: request.spondMemberId,
				name: member
					? `${member.firstName} ${member.lastName}`.trim()
					: "Ukjent medlem",
				createdAt: request.createdAt,
			};
		}),

	/**
	 * Asks to be linked to a Spond member. An administrator has to approve it,
	 * since nothing proves the user is that member. Replaces an earlier request.
	 */
	requestLink: protectedProcedure
		.input(groupInput.extend({ memberId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const group = await getGroupForLinking(ctx, input.groupId);
			const { tihlde } = await requireLinkable(ctx, group, input.memberId);

			const data = {
				spondMemberId: input.memberId,
				tihldeEmail: tihlde.email,
				tihldeName: ctx.session.user.name,
				requestedById: ctx.session.user.id,
				createdAt: new Date(),
			};
			await ctx.db.personLinkRequest.upsert({
				where: {
					spondGroupId_tihldeUserId: {
						spondGroupId: group.id,
						tihldeUserId: tihlde.userId,
					},
				},
				create: {
					spondGroupId: group.id,
					tihldeUserId: tihlde.userId,
					...data,
				},
				update: data,
			});
		}),

	/**
	 * Emails a one-time code to the Spond member's email. Entering it in
	 * verifyLinkCode proves the user owns that email and links them directly.
	 */
	sendLinkCode: protectedProcedure
		.input(groupInput.extend({ memberId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const group = await getGroupForLinking(ctx, input.groupId);
			const { tihlde, member } = await requireLinkable(
				ctx,
				group,
				input.memberId,
			);
			const email = normalizeEmail(member.email);
			if (!ctx.mailer || !email) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: ctx.mailer
						? "Medlemmet har ingen e-post i Spond. Be en administrator om å koble deg i stedet."
						: "E-postverifisering er ikke satt opp. Be en administrator om å koble deg i stedet.",
				});
			}

			const key = {
				spondGroupId_tihldeUserId: {
					spondGroupId: group.id,
					tihldeUserId: tihlde.userId,
				},
			};
			const previous = await ctx.db.linkVerificationCode.findUnique({
				where: key,
				select: { createdAt: true },
			});
			if (
				previous &&
				Date.now() - previous.createdAt.getTime() < CODE_RESEND_MS
			) {
				throw new TRPCError({
					code: "TOO_MANY_REQUESTS",
					message: "Vent litt før du ber om en ny kode",
				});
			}

			const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
			const data = {
				spondMemberId: member.id,
				codeHash: hashCode(code),
				attempts: 0,
				expiresAt: new Date(Date.now() + CODE_TTL_MS),
				createdAt: new Date(),
			};
			await ctx.db.linkVerificationCode.upsert({
				where: key,
				create: {
					spondGroupId: group.id,
					tihldeUserId: tihlde.userId,
					...data,
				},
				update: data,
			});

			try {
				await ctx.mailer.send({
					to: email,
					subject: `Koden din for Sporty: ${code}`,
					text: [
						"Hei!",
						"",
						`${ctx.session.user.name} vil koble TIHLDE-brukeren sin til deg i Spond-gruppen ${group.name}.`,
						"",
						`Koden er: ${code}`,
						"",
						"Koden gjelder i 15 minutter. Har du ikke bedt om dette, kan du se bort fra e-posten.",
					].join("\n"),
				});
			} catch (error) {
				await ctx.db.linkVerificationCode.deleteMany({
					where: key.spondGroupId_tihldeUserId,
				});
				console.error("Failed to send link verification code", error);
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Klarte ikke å sende e-posten. Prøv igjen senere.",
				});
			}
			return { sentTo: maskEmail(email) };
		}),

	verifyLinkCode: protectedProcedure
		.input(
			groupInput.extend({
				memberId: z.string(),
				code: z
					.string()
					.trim()
					.regex(/^\d{6}$/, "Koden er seks siffer"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const group = await getGroupForLinking(ctx, input.groupId);
			const { tihlde } = await requireLinkable(ctx, group, input.memberId);
			const key = {
				spondGroupId_tihldeUserId: {
					spondGroupId: group.id,
					tihldeUserId: tihlde.userId,
				},
			};
			const stored = await ctx.db.linkVerificationCode.findUnique({
				where: key,
			});
			if (
				!stored ||
				stored.spondMemberId !== input.memberId ||
				stored.expiresAt.getTime() < Date.now() ||
				stored.attempts >= CODE_MAX_ATTEMPTS
			) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Koden har utløpt. Be om en ny kode.",
				});
			}
			const matches = timingSafeEqual(
				Buffer.from(stored.codeHash, "hex"),
				Buffer.from(hashCode(input.code), "hex"),
			);
			if (!matches) {
				const { attempts } = await ctx.db.linkVerificationCode.update({
					where: key,
					data: { attempts: { increment: 1 } },
				});
				const left = CODE_MAX_ATTEMPTS - attempts;
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						left > 0
							? `Feil kode. Du har ${left} forsøk igjen.`
							: "Feil kode. Be om en ny kode.",
				});
			}

			await ctx.db.linkVerificationCode.delete({ where: key });
			return linkPerson(ctx.db, group, {
				memberId: input.memberId,
				tihldeEmail: tihlde.email,
				tihldeUserId: tihlde.userId,
				tihldeName: ctx.session.user.name,
				linkedById: ctx.session.user.id,
			});
		}),

	cancelLinkRequest: protectedProcedure
		.input(groupInput)
		.mutation(async ({ ctx, input }) => {
			const group = await getGroupForLinking(ctx, input.groupId);
			const tihlde = await requireTihldeIdentity(ctx.db, ctx.session);
			await ctx.db.personLinkRequest.deleteMany({
				where: { spondGroupId: group.id, tihldeUserId: tihlde.userId },
			});
		}),

	/** Pending link requests. Administrators and sub-administrators only. */
	linkRequests: protectedProcedure
		.input(groupInput)
		.query(async ({ ctx, input }) => {
			const group = await getGroup(ctx, input.groupId);
			await requirePeopleManager(ctx.db, ctx.session, group);
			const requests = await ctx.db.personLinkRequest.findMany({
				where: { spondGroupId: group.id },
				orderBy: { createdAt: "asc" },
			});
			const members = new Map(group.members.map((m) => [m.id, m]));
			return requests.map((r) => {
				const member = members.get(r.spondMemberId);
				return {
					id: r.id,
					memberId: r.spondMemberId,
					memberName: member
						? `${member.firstName} ${member.lastName}`.trim()
						: null,
					spondEmail: member?.email ?? null,
					imageUrl: member?.profile?.imageUrl ?? null,
					tihldeName: r.tihldeName,
					tihldeEmail: r.tihldeEmail,
					createdAt: r.createdAt,
				};
			});
		}),

	approveLinkRequest: protectedProcedure
		.input(groupInput.extend({ requestId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const group = await getGroup(ctx, input.groupId);
			await requirePeopleManager(ctx.db, ctx.session, group);
			const request = await ctx.db.personLinkRequest.findFirst({
				where: { id: input.requestId, spondGroupId: group.id },
			});
			if (!request) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Forespørselen finnes ikke lenger",
				});
			}
			return linkPerson(ctx.db, group, {
				memberId: request.spondMemberId,
				tihldeEmail: request.tihldeEmail,
				tihldeUserId: request.tihldeUserId,
				tihldeName: request.tihldeName,
				linkedById: ctx.session.user.id,
			});
		}),

	rejectLinkRequest: protectedProcedure
		.input(groupInput.extend({ requestId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const group = await getGroup(ctx, input.groupId);
			await requirePeopleManager(ctx.db, ctx.session, group);
			await ctx.db.personLinkRequest.deleteMany({
				where: { id: input.requestId, spondGroupId: group.id },
			});
		}),

	/** Settings for the Spond group, plus the manager's tihlde.org groups to choose from. */
	settings: protectedProcedure
		.input(groupInput)
		.query(async ({ ctx, input }) => {
			const group = await getGroup(ctx, input.groupId);
			await requirePeopleManager(ctx.db, ctx.session, group);
			const settings = await getFineSettings(ctx.db, group.id);

			let tihldeGroups: { slug: string; name: string }[] | null = null;
			let tihldeGroupsError: string | null = null;
			try {
				const groups = await ctx.photon.getMyGroups(ctx.session.user.id);
				tihldeGroups = groups
					.filter((g) => g.finesActivated)
					.map((g) => ({ slug: g.slug, name: g.name }))
					.sort((a, b) => a.name.localeCompare(b.name, "nb"));
			} catch (error) {
				tihldeGroupsError = finesErrorReason(error).message;
			}

			let laws: PhotonLaw[] = [];
			if (settings.tihldeGroupSlug) {
				laws = await ctx.photon
					.getLaws(ctx.session.user.id, settings.tihldeGroupSlug)
					.catch(() => []);
			}

			return {
				...settings,
				tihldeGroups,
				tihldeGroupsError,
				laws: laws.map((l) => ({
					id: l.id,
					paragraph: l.paragraph,
					title: l.title,
				})),
			};
		}),

	setTihldeGroup: protectedProcedure
		.input(groupInput.extend({ tihldeGroupSlug: z.string().nullable() }))
		.mutation(async ({ ctx, input }) => {
			const group = await getGroup(ctx, input.groupId);
			await requirePeopleManager(ctx.db, ctx.session, group);
			const current = await ctx.db.spondGroupSettings.findUnique({
				where: { spondGroupId: group.id },
				select: { tihldeGroupSlug: true },
			});
			const data = {
				tihldeGroupSlug: input.tihldeGroupSlug,
				updatedById: ctx.session.user.id,
				// A paragraph belongs to one group's lovverk.
				...(current?.tihldeGroupSlug !== input.tihldeGroupSlug
					? { fineLawId: null }
					: {}),
			};
			await ctx.db.spondGroupSettings.upsert({
				where: { spondGroupId: group.id },
				create: { spondGroupId: group.id, ...data },
				update: data,
			});
		}),

	setFineSettings: protectedProcedure
		.input(
			groupInput.extend({
				fineAmountMatch: z.number().int().min(0).max(50),
				fineAmountTraining: z.number().int().min(0).max(50),
				fineAmountOther: z.number().int().min(0).max(50).nullable(),
				fineLawId: z.string().nullable(),
				fineReason: z
					.string()
					.trim()
					.min(1, "Skriv inn en grunn")
					.max(200, "Grunnen kan være maks 200 tegn"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const group = await getGroup(ctx, input.groupId);
			await requirePeopleManager(ctx.db, ctx.session, group);
			const { groupId: _groupId, ...fineSettings } = input;
			const data = { ...fineSettings, updatedById: ctx.session.user.id };
			await ctx.db.spondGroupSettings.upsert({
				where: { spondGroupId: group.id },
				create: { spondGroupId: group.id, ...data },
				update: data,
			});
		}),

	/**
	 * Members of the chosen tihlde.org group, to pick from when linking. Marks
	 * who is already linked to which Spond member.
	 */
	tihldeMembers: protectedProcedure
		.input(groupInput)
		.query(async ({ ctx, input }) => {
			const group = await getGroup(ctx, input.groupId);
			await requirePeopleManager(ctx.db, ctx.session, group);
			const settings = await ctx.db.spondGroupSettings.findUnique({
				where: { spondGroupId: group.id },
			});
			if (!settings?.tihldeGroupSlug) {
				return {
					status: "unavailable" as const,
					message: "Velg en TIHLDE-gruppe først",
				};
			}

			try {
				const users = await getFineUsers(
					ctx.photon,
					ctx.session.user.id,
					settings.tihldeGroupSlug,
				);
				const linked = await ctx.db.person.findMany({
					where: { spondGroupId: group.id, tihldeUserId: { not: null } },
					select: { tihldeUserId: true, spondMemberId: true },
				});
				const linkedTo = new Map(
					linked.map((p) => [p.tihldeUserId, p.spondMemberId]),
				);
				return {
					status: "ok" as const,
					members: users
						.map((u) => ({
							id: u.id,
							name: u.name,
							image: u.image,
							linkedToMemberId: linkedTo.get(u.id) ?? null,
						}))
						.sort((a, b) => a.name.localeCompare(b.name, "nb")),
				};
			} catch (error) {
				return {
					status: "unavailable" as const,
					message: finesErrorReason(error).message,
				};
			}
		}),
});

/**
 * Checks that the current user may link themselves to the member: signed in
 * with TIHLDE, not linked yet, and the member is in the group and unlinked.
 */
async function requireLinkable(
	ctx: Context & { session: NonNullable<Context["session"]> },
	group: SpondGroup,
	memberId: string,
) {
	const tihlde = await requireTihldeIdentity(ctx.db, ctx.session);
	const viewer = await getViewer(ctx.db, ctx.session, group);
	if (viewer.member) {
		throw new TRPCError({
			code: "CONFLICT",
			message: "Du er allerede koblet til Spond",
		});
	}
	const member = group.members.find((m) => m.id === memberId);
	if (!member) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Fant ikke medlemmet i Spond-gruppen",
		});
	}
	await syncPeople(ctx.db, group);
	const person = await ctx.db.person.findUnique({
		where: { spondMemberId: memberId },
		select: { tihldeEmail: true, tihldeUserId: true },
	});
	if (person?.tihldeEmail || person?.tihldeUserId) {
		throw new TRPCError({
			code: "CONFLICT",
			message: "Medlemmet er allerede koblet til en TIHLDE-bruker",
		});
	}
	return { tihlde, member };
}
