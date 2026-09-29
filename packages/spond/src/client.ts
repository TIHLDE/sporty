import type {
	SpondEvent,
	SpondGroup,
	SpondTokens,
	SpondTokenStore,
} from "./types";

const API_URL = "https://api.spond.com/core/v1/";

// Refresh the access token (valid ~24h) when less than this much time remains.
const DEFAULT_REFRESH_MARGIN_MS = 60 * 60 * 1000;

type TokenResponse = {
	accessToken: { token: string; expiration: string };
	refreshToken: { token: string; expiration: string };
};

export class SpondError extends Error {
	constructor(
		message: string,
		readonly status: number,
	) {
		super(message);
		this.name = "SpondError";
	}
}

export type SpondClientOptions = {
	email: string;
	password: string;
	store?: SpondTokenStore;
	refreshMarginMs?: number;
	/** Defaults to Spond's API; overridable for local testing. */
	apiUrl?: string;
};

export type GetEventsOptions = {
	groupId?: string;
	minStart?: Date;
	maxStart?: Date;
	minEnd?: Date;
	max?: number;
	includeHidden?: boolean;
};

/**
 * Client for Spond's unofficial API.
 *
 * Tokens are handled automatically: the access token is refreshed with the
 * refresh token before it expires (Spond rotates both on every refresh), and
 * if the refresh token is expired or rejected we fall back to logging in with
 * email/password. Requests that still get a 401 are retried once with fresh
 * tokens.
 */
export class SpondClient {
	private tokens: SpondTokens | null = null;
	private loadedFromStore = false;
	private pendingTokens: Promise<SpondTokens> | null = null;
	private readonly refreshMarginMs: number;
	private readonly apiUrl: string;

	constructor(private readonly options: SpondClientOptions) {
		this.refreshMarginMs = options.refreshMarginMs ?? DEFAULT_REFRESH_MARGIN_MS;
		this.apiUrl = options.apiUrl ?? API_URL;
	}

	getGroups() {
		return this.request<SpondGroup[]>("groups/");
	}

	getGroup(groupId: string) {
		return this.request<SpondGroup>(`groups/${groupId}`);
	}

	getEvents(options: GetEventsOptions = {}) {
		return this.request<SpondEvent[]>("sponds/", {
			groupId: options.groupId,
			minStartTimestamp: options.minStart?.toISOString(),
			maxStartTimestamp: options.maxStart?.toISOString(),
			minEndTimestamp: options.minEnd?.toISOString(),
			max: String(options.max ?? 200),
			includeHidden: String(options.includeHidden ?? false),
			addProfileInfo: "true",
			scheduled: "true",
			order: "asc",
		});
	}

	getEvent(eventId: string) {
		return this.request<SpondEvent>(`sponds/${eventId}`, {
			includeComments: "true",
			addProfileInfo: "true",
		});
	}

	/** Returns a valid access token, refreshing or logging in if needed. */
	async getAccessToken(): Promise<string> {
		return (await this.ensureTokens()).accessToken;
	}

	private async request<T>(
		path: string,
		params: Record<string, string | undefined> = {},
	): Promise<T> {
		const url = new URL(path, this.apiUrl);
		for (const [key, value] of Object.entries(params)) {
			if (value !== undefined) url.searchParams.set(key, value);
		}

		let tokens = await this.ensureTokens();
		let response = await fetch(url, {
			headers: { Authorization: `Bearer ${tokens.accessToken}` },
		});

		if (response.status === 401) {
			tokens = await this.ensureTokens({ force: true });
			response = await fetch(url, {
				headers: { Authorization: `Bearer ${tokens.accessToken}` },
			});
		}

		if (!response.ok) {
			throw new SpondError(
				`Spond request ${path} failed with ${response.status}`,
				response.status,
			);
		}
		return (await response.json()) as T;
	}

	private ensureTokens({ force = false } = {}): Promise<SpondTokens> {
		// Share one in-flight refresh between concurrent requests, since Spond
		// invalidates the old refresh token when a new one is issued.
		this.pendingTokens ??= this.resolveTokens(force).finally(() => {
			this.pendingTokens = null;
		});
		return this.pendingTokens;
	}

	private async resolveTokens(force: boolean): Promise<SpondTokens> {
		if (!this.loadedFromStore) {
			this.loadedFromStore = true;
			this.tokens = (await this.options.store?.load()) ?? null;
		}

		const now = Date.now();
		const tokens = this.tokens;

		if (
			tokens &&
			!force &&
			tokens.accessTokenExpiresAt.getTime() - now > this.refreshMarginMs
		) {
			return tokens;
		}

		let next: SpondTokens | null = null;
		if (tokens && tokens.refreshTokenExpiresAt.getTime() > now) {
			next = await this.refresh(tokens.refreshToken).catch(() => null);
		}
		next ??= await this.login();

		this.tokens = next;
		await this.options.store?.save(next);
		return next;
	}

	private async login(): Promise<SpondTokens> {
		const { email, password } = this.options;
		if (!email || !password) {
			throw new SpondError("SPOND_EMAIL and SPOND_PASSWORD must be set", 401);
		}
		return this.postTokens("auth2/login", { email, password });
	}

	private refresh(refreshToken: string): Promise<SpondTokens> {
		// The refresh endpoint takes the refresh token as a bare JSON string.
		return this.postTokens("auth2/login/refresh", refreshToken);
	}

	private async postTokens(path: string, body: unknown): Promise<SpondTokens> {
		const response = await fetch(new URL(path, this.apiUrl), {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
		if (!response.ok) {
			throw new SpondError(
				`Spond ${path} failed with ${response.status}`,
				response.status,
			);
		}
		const data = (await response.json()) as TokenResponse;
		return {
			accessToken: data.accessToken.token,
			accessTokenExpiresAt: new Date(data.accessToken.expiration),
			refreshToken: data.refreshToken.token,
			refreshTokenExpiresAt: new Date(data.refreshToken.expiration),
		};
	}
}
