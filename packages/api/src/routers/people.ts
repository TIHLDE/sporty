import { z } from "zod";

import { protectedProcedure, router } from "../index";
import {
	getViewer,
	linkPerson,
	memberRoleNames,
	requirePeopleManager,
	syncPeople,
	unlinkPerson,
} from "../people";
import { getGroup } from "../spond-cache";
import type { PhotonLaw } from "../photon";
import { getFineSettings } from "./event-fines";
import { finesErrorReason, getFineUsers } from "./fines";

const groupInput = z.object({ groupId: z.string().optional() });

export const peopleRouter = router({
	/**
	 * Everyone in the group with their Spond and TIHLDE identities.
	 * Administrators and sub-administrators only.
	 */
	list: protectedProcedure.input(groupInput).query(async ({ ctx, input }) => {
		const group = await getGroup(ctx.spond, input.groupId);
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
		const group = await getGroup(ctx.spond, input.groupId);
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
			const group = await getGroup(ctx.spond, input.groupId);
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
			const group = await getGroup(ctx.spond, input.groupId);
			await requirePeopleManager(ctx.db, ctx.session, group);
			await unlinkPerson(ctx.db, group, input.memberId);
		}),

	/** Settings for the Spond group, plus the manager's tihlde.org groups to choose from. */
	settings: protectedProcedure
		.input(groupInput)
		.query(async ({ ctx, input }) => {
			const group = await getGroup(ctx.spond, input.groupId);
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
			const group = await getGroup(ctx.spond, input.groupId);
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
			const group = await getGroup(ctx.spond, input.groupId);
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
			const group = await getGroup(ctx.spond, input.groupId);
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
