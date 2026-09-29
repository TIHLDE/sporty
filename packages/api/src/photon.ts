/**
 * Client for Photon, the API behind tihlde.org.
 *
 * Every call is made as a specific Sporty user with their own Photon OAuth
 * access token, so Photon's own permissions apply: a user only sees the fines
 * of TIHLDE groups they are a member of.
 */

export class PhotonError extends Error {
	constructor(
		message: string,
		readonly status: number,
	) {
		super(message);
		this.name = "PhotonError";
	}
}

/** Thrown when the user has no usable Photon token and must sign in again. */
export class PhotonReauthRequired extends PhotonError {
	constructor() {
		super("Logg inn med TIHLDE på nytt for å hente data fra tihlde.org", 401);
		this.name = "PhotonReauthRequired";
	}
}

export type PhotonGroup = {
	slug: string;
	name: string;
	finesActivated: boolean;
};

export type PhotonFineUser = {
	id: string;
	name: string;
	image: string | null;
	/** Sum of active (pending or approved, unpaid) fines. */
	finesAmount: number;
	finesCount: number;
};

/** A paragraph in a TIHLDE group's lovverk. */
export type PhotonLaw = {
	id: string;
	paragraph: number;
	title: string;
	description: string | null;
	/** Suggested number of bøter for breaking it. */
	amount: number | null;
};

export type CreateFineInput = {
	/** Photon user id of the person receiving the fine. */
	userId: string;
	reason: string;
	amount: number;
	lawId?: string;
};

type Paginated<K extends string, T> = {
	totalCount: number;
	pages: number;
	nextPage: number | null;
} & Record<K, T[]>;

export type PhotonClientOptions = {
	/** e.g. https://photon.tihlde.org/api */
	apiUrl: string;
	/** Returns a valid Photon access token (a JWT) for a Sporty user, refreshing it if needed. */
	getAccessToken: (userId: string) => Promise<string | null>;
};

export class PhotonClient {
	constructor(private readonly options: PhotonClientOptions) {}

	/** Groups on tihlde.org the user is a member of. */
	getMyGroups(userId: string) {
		return this.request<PhotonGroup[]>(userId, "groups/mine");
	}

	/**
	 * Every member of a TIHLDE group with the total of their active fines
	 * (awaiting approval, or approved but unpaid). Members without fines are
	 * included with 0.
	 */
	async getFineUsers(userId: string, groupSlug: string) {
		const users: PhotonFineUser[] = [];
		let page: number | null = 0;
		while (page !== null) {
			const result: Paginated<"users", PhotonFineUser> = await this.request(
				userId,
				`groups/${encodeURIComponent(groupSlug)}/fines/users`,
				{ page: String(page), pageSize: "100" },
			);
			users.push(...result.users);
			page = result.nextPage;
		}
		return users;
	}

	/** The group's lovverk, ordered by paragraph. */
	getLaws(userId: string, groupSlug: string) {
		return this.request<PhotonLaw[]>(
			userId,
			`groups/${encodeURIComponent(groupSlug)}/laws`,
		);
	}

	/**
	 * Gives one person a fine, as the given Sporty user. It starts out pending
	 * until the group's botsjef approves it on tihlde.org.
	 */
	createFine(userId: string, groupSlug: string, fine: CreateFineInput) {
		return this.request<{ id: string }>(
			userId,
			`groups/${encodeURIComponent(groupSlug)}/fines`,
			{},
			{ method: "POST", body: { ...fine, groupSlug } },
		);
	}

	private async request<T>(
		userId: string,
		path: string,
		params: Record<string, string> = {},
		init: { method?: "GET" | "POST"; body?: unknown } = {},
	): Promise<T> {
		const token = await this.options.getAccessToken(userId);
		// Photon's API only accepts JWT access tokens; an opaque one means the
		// user signed in before we asked for an audience.
		if (!token || token.split(".").length !== 3) {
			throw new PhotonReauthRequired();
		}

		const url = new URL(path, `${this.options.apiUrl.replace(/\/$/, "")}/`);
		for (const [key, value] of Object.entries(params)) {
			url.searchParams.set(key, value);
		}
		const response = await fetch(url, {
			method: init.method ?? "GET",
			headers: {
				Authorization: `Bearer ${token}`,
				...(init.body ? { "Content-Type": "application/json" } : {}),
			},
			body: init.body ? JSON.stringify(init.body) : undefined,
		});
		if (response.status === 401) throw new PhotonReauthRequired();
		if (!response.ok) {
			const body = (await response.json().catch(() => null)) as {
				message?: string;
			} | null;
			throw new PhotonError(
				body?.message ?? `tihlde.org svarte ${response.status}`,
				response.status,
			);
		}
		return (await response.json()) as T;
	}
}
