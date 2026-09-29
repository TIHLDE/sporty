import type { Session } from "@sporty/auth";
import type { Database } from "@sporty/db";
import type { SpondGroup, SpondMember } from "@sporty/spond";
import { TRPCError } from "@trpc/server";

import { cached } from "./spond-cache";

/** Spond roles that may link Spond members to TIHLDE users. */
const MANAGER_ROLE_NAMES = new Set(["administrator", "sub-administrator"]);

export function normalizeEmail(
	email: string | null | undefined,
): string | null {
	const trimmed = email?.trim().toLowerCase();
	return trimmed ? trimmed : null;
}

function memberName(member: SpondMember) {
	return `${member.firstName} ${member.lastName}`.trim();
}

export function memberRoleNames(group: SpondGroup, member: SpondMember) {
	const names = new Map((group.roles ?? []).map((r) => [r.id, r.name]));
	return (member.roles ?? [])
		.map((id) => names.get(id))
		.filter((name): name is string => Boolean(name));
}

export function canManagePeople(group: SpondGroup, member: SpondMember) {
	return memberRoleNames(group, member).some((name) =>
		MANAGER_ROLE_NAMES.has(name.trim().toLowerCase()),
	);
}

/**
 * Upserts every member of the group into `person`, keeping name and Spond
 * email current. Members who leave the group are kept, so history (e.g.
 * fines) still has someone to point to. Runs at most once per cache window.
 */
export function syncPeople(db: Database, group: SpondGroup) {
	return cached(`people-sync:${group.id}`, () =>
		db.$transaction(
			group.members.map((member) => {
				const data = {
					spondGroupId: group.id,
					spondProfileId: member.profile?.id ?? null,
					name: memberName(member),
					spondEmail: normalizeEmail(member.email),
				};
				return db.person.upsert({
					where: { spondMemberId: member.id },
					create: { spondMemberId: member.id, ...data },
					update: data,
				});
			}),
		),
	);
}

export type TihldeIdentity = {
	/** Photon (tihlde.org) user id. */
	userId: string;
	email: string | null;
};

/**
 * Who the current user is on tihlde.org, or null if they didn't sign in with
 * TIHLDE (Photon). Email/password accounts are unverified, so their email
 * can't be trusted to identify anyone.
 */
export async function getTihldeIdentity(
	db: Database,
	session: Session | null,
): Promise<TihldeIdentity | null> {
	if (!session) return null;
	const photonAccount = await db.account.findFirst({
		where: { userId: session.user.id, providerId: "photon" },
		select: { accountId: true },
	});
	if (!photonAccount) return null;
	return {
		userId: photonAccount.accountId,
		email: normalizeEmail(session.user.email),
	};
}

export type Viewer = {
	tihlde: TihldeIdentity | null;
	member: SpondMember | null;
	canManagePeople: boolean;
};

/**
 * Finds the Spond member the current user is, either through an existing
 * link (by TIHLDE user id or email) or because their TIHLDE email is the same
 * as their Spond email. A link made with only one of id/email gets the other
 * filled in once the person signs in.
 */
export async function getViewer(
	db: Database,
	session: Session | null,
	group: SpondGroup,
): Promise<Viewer> {
	const tihlde = await getTihldeIdentity(db, session);
	if (!tihlde) return { tihlde, member: null, canManagePeople: false };

	const linked = await db.person.findFirst({
		where: {
			spondGroupId: group.id,
			OR: [
				{ tihldeUserId: tihlde.userId },
				...(tihlde.email ? [{ tihldeEmail: tihlde.email }] : []),
			],
		},
		select: {
			id: true,
			spondMemberId: true,
			tihldeUserId: true,
			tihldeEmail: true,
		},
	});
	if (linked && (!linked.tihldeUserId || !linked.tihldeEmail)) {
		await db.person
			.update({
				where: { id: linked.id },
				data: {
					tihldeUserId: linked.tihldeUserId ?? tihlde.userId,
					tihldeEmail: linked.tihldeEmail ?? tihlde.email,
				},
			})
			// Another person may already hold this email; the link still works by id.
			.catch(() => undefined);
	}

	const member =
		group.members.find((m) => m.id === linked?.spondMemberId) ??
		(tihlde.email
			? group.members.find((m) => normalizeEmail(m.email) === tihlde.email)
			: undefined) ??
		null;

	return {
		tihlde,
		member,
		canManagePeople: member ? canManagePeople(group, member) : false,
	};
}

export async function requirePeopleManager(
	db: Database,
	session: Session | null,
	group: SpondGroup,
): Promise<Viewer & { tihlde: TihldeIdentity }> {
	const viewer = await getViewer(db, session, group);
	if (!viewer.canManagePeople || !viewer.tihlde) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: viewer.tihlde
				? "Kun administratorer og sub-administratorer i Spond-gruppen har tilgang til dette"
				: "Du må være logget inn med TIHLDE for å bruke administrasjonen",
		});
	}
	return { ...viewer, tihlde: viewer.tihlde };
}

export async function linkPerson(
	db: Database,
	group: SpondGroup,
	input: {
		memberId: string;
		tihldeEmail?: string | null;
		tihldeUserId?: string | null;
		tihldeName?: string | null;
		linkedById: string | null;
	},
) {
	const member = group.members.find((m) => m.id === input.memberId);
	if (!member) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Fant ikke medlemmet i Spond-gruppen",
		});
	}
	const tihldeEmail = normalizeEmail(input.tihldeEmail);
	const tihldeUserId = input.tihldeUserId?.trim() || null;
	if (!tihldeEmail && !tihldeUserId) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Velg en TIHLDE-bruker eller skriv inn e-post",
		});
	}

	await syncPeople(db, group);

	const taken = await db.person.findFirst({
		where: {
			spondGroupId: group.id,
			NOT: { spondMemberId: member.id },
			OR: [
				...(tihldeEmail ? [{ tihldeEmail }] : []),
				...(tihldeUserId ? [{ tihldeUserId }] : []),
			],
		},
		select: { name: true },
	});
	if (taken) {
		throw new TRPCError({
			code: "CONFLICT",
			message: `${input.tihldeName ?? tihldeEmail ?? "Brukeren"} er allerede koblet til ${taken.name}`,
		});
	}

	const data = {
		spondGroupId: group.id,
		spondProfileId: member.profile?.id ?? null,
		name: memberName(member),
		spondEmail: normalizeEmail(member.email),
		tihldeEmail,
		tihldeUserId,
		tihldeName: tihldeUserId ? (input.tihldeName ?? null) : null,
		linkedAt: new Date(),
		linkedById: input.linkedById,
	};
	return db.person.upsert({
		where: { spondMemberId: member.id },
		create: { spondMemberId: member.id, ...data },
		update: data,
	});
}

export function unlinkPerson(
	db: Database,
	group: SpondGroup,
	memberId: string,
) {
	return db.person.updateMany({
		where: { spondGroupId: group.id, spondMemberId: memberId },
		data: {
			tihldeEmail: null,
			tihldeUserId: null,
			tihldeName: null,
			linkedAt: null,
			linkedById: null,
		},
	});
}
