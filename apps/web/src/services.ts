import { PhotonClient } from "@sporty/api/photon";
import { createAuth, PHOTON_ISSUER } from "@sporty/auth";
import { createPrismaClient } from "@sporty/db";
import { SpondClient } from "@sporty/spond";

import { ENV } from "./env.server";

export const db = createPrismaClient(ENV);
export const auth = createAuth(ENV, db);

// Tokens are persisted so refreshes survive restarts; the client refreshes them automatically.
export const spond = new SpondClient({
	email: ENV.SPOND_EMAIL,
	password: ENV.SPOND_PASSWORD,
	apiUrl: process.env.SPOND_API_URL,
	store: {
		async load() {
			return db.spondToken.findUnique({ where: { id: ENV.SPOND_EMAIL } });
		},
		async save({
			accessToken,
			accessTokenExpiresAt,
			refreshToken,
			refreshTokenExpiresAt,
		}) {
			const data = {
				accessToken,
				accessTokenExpiresAt,
				refreshToken,
				refreshTokenExpiresAt,
			};
			await db.spondToken.upsert({
				where: { id: ENV.SPOND_EMAIL },
				create: { id: ENV.SPOND_EMAIL, ...data },
				update: data,
			});
		},
	},
});

// One refresh at a time per user: Photon rotates refresh tokens, so two
// parallel refreshes with the same token would make the second one fail.
const pendingPhotonTokens = new Map<string, Promise<string | null>>();

async function getPhotonAccessToken(userId: string): Promise<string | null> {
	const account = await db.account.findFirst({
		where: { userId, providerId: "photon" },
		select: { id: true },
	});
	if (!account) return null;
	try {
		// Refreshes (and stores) the token first if it has expired.
		const { accessToken } = await auth.api.getAccessToken({
			body: { accountId: account.id, userId },
		});
		return accessToken ?? null;
	} catch {
		return null;
	}
}

export const photon = new PhotonClient({
	apiUrl: PHOTON_ISSUER.replace(/\/auth\/?$/, ""),
	getAccessToken(userId) {
		let pending = pendingPhotonTokens.get(userId);
		if (!pending) {
			pending = getPhotonAccessToken(userId).finally(() =>
				pendingPhotonTokens.delete(userId),
			);
			pendingPhotonTokens.set(userId, pending);
		}
		return pending;
	},
});
