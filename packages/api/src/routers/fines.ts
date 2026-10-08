import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { getViewer, syncPeople } from "../people";
import {
	type PhotonClient,
	PhotonError,
	type PhotonFineUser,
	PhotonReauthRequired,
} from "../photon";
import { cached, getGroup } from "../spond-cache";

type FineTotal = { amount: number; count: number };

export type FinesUnavailableReason =
	| "not-configured"
	| "not-signed-in-with-tihlde"
	| "reauth"
	| "forbidden"
	| "not-found";

const unavailable = (reason: FinesUnavailableReason, message: string) => ({
	status: "unavailable" as const,
	reason,
	message,
});

/**
 * Fetches a TIHLDE group's fine totals as the given Sporty user. Cached per
 * user, since what Photon shows depends on who is asking.
 */
export function getFineUsers(
	photon: PhotonClient,
	userId: string,
	groupSlug: string,
): Promise<PhotonFineUser[]> {
	return cached(`fines:${groupSlug}:${userId}`, () =>
		photon.getFineUsers(userId, groupSlug),
	);
}

/** Maps Photon errors to a reason the UI can explain, rethrowing anything unexpected. */
export function finesErrorReason(error: unknown) {
	if (error instanceof PhotonReauthRequired) {
		return unavailable("reauth", error.message);
	}
	if (error instanceof PhotonError && error.status === 403) {
		return unavailable(
			"forbidden",
			"Du er ikke medlem av TIHLDE-gruppen, så du kan ikke se bøtene",
		);
	}
	if (error instanceof PhotonError && error.status === 404) {
		return unavailable(
			"not-found",
			"Fant ikke TIHLDE-gruppen, eller den har ikke botsystemet aktivert",
		);
	}
	throw error;
}

export const finesRouter = router({
	/** Active fines (pending or approved, unpaid) per Spond member. */
	overview: protectedProcedure
		.input(z.object({ groupId: z.string().optional() }))
		.query(async ({ ctx, input }) => {
			const group = await getGroup(ctx, input.groupId);
			const settings = await ctx.db.spondGroupSettings.findUnique({
				where: { spondGroupId: group.id },
			});
			if (!settings?.tihldeGroupSlug) {
				return unavailable(
					"not-configured",
					"Ingen TIHLDE-gruppe er valgt for bøter ennå",
				);
			}
			// getViewer also fills in the TIHLDE user id on a link made by email.
			const viewer = await getViewer(ctx.db, ctx.session, group);
			if (!viewer.tihlde) {
				return unavailable(
					"not-signed-in-with-tihlde",
					"Logg inn med TIHLDE for å se bøter",
				);
			}

			let fineUsers: PhotonFineUser[];
			try {
				fineUsers = await getFineUsers(
					ctx.photon,
					ctx.session.user.id,
					settings.tihldeGroupSlug,
				);
			} catch (error) {
				return finesErrorReason(error);
			}

			await syncPeople(ctx.db, group);
			const people = await ctx.db.person.findMany({
				where: { spondGroupId: group.id, tihldeUserId: { not: null } },
				select: { spondMemberId: true, tihldeUserId: true },
			});
			const memberByTihldeUser = new Map(
				people.map((p) => [p.tihldeUserId, p.spondMemberId]),
			);

			const byMember: Record<string, FineTotal> = {};
			const unlinked: (FineTotal & { id: string; name: string })[] = [];
			for (const user of fineUsers) {
				const total = { amount: user.finesAmount, count: user.finesCount };
				const memberId = memberByTihldeUser.get(user.id);
				if (memberId) byMember[memberId] = total;
				else unlinked.push({ id: user.id, name: user.name, ...total });
			}

			return {
				status: "ok" as const,
				groupSlug: settings.tihldeGroupSlug,
				totalAmount: fineUsers.reduce((sum, u) => sum + u.finesAmount, 0),
				byMember,
				unlinked,
			};
		}),
});
