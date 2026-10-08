// Subset of Spond's (unofficial) API shapes that we use.

export type SpondSubGroup = {
	id: string;
	name: string;
	color?: string;
};

export type SpondRole = {
	id: string;
	name: string;
	permissions: string[];
};

export type SpondMember = {
	id: string;
	firstName: string;
	lastName: string;
	email?: string;
	createdTime: string;
	subGroups: string[];
	roles?: string[];
	guardians: unknown[];
	profile?: {
		id: string;
		imageUrl?: string;
	};
};

export type SpondGroup = {
	id: string;
	name: string;
	activity?: string;
	/** The group's logo. */
	imageUrl?: string;
	createdTime: string;
	members: SpondMember[];
	subGroups: SpondSubGroup[];
	roles?: SpondRole[];
};

export type SpondEventResponses = {
	acceptedIds: string[];
	declinedIds: string[];
	unansweredIds: string[];
	waitinglistIds: string[];
	unconfirmedIds: string[];
};

export type SpondMatchInfo = {
	teamName: string;
	opponentName: string;
	type: "HOME" | "AWAY" | "FRIENDLY" | (string & {});
	scoresSet: boolean;
	teamScore?: number;
	opponentScore?: number;
	scoresFinal: boolean;
};

export type SpondComment = {
	id: string;
	/** Spond profile id of the author (matches `SpondMember.profile.id`). */
	fromProfileId: string;
	timestamp: string;
	text: string;
	children?: SpondComment[];
};

export type SpondEventOwner = {
	id: string;
	firstName: string;
	lastName: string;
	imageUrl?: string;
};

export type SpondEvent = {
	id: string;
	heading: string;
	description?: string;
	startTimestamp: string;
	endTimestamp: string;
	/** Reply deadline ("svarfrist"), if set. */
	rsvpDate?: string;
	/** When to meet up before the start, if set. */
	meetupTimestamp?: string;
	/** The event has no fixed end time. */
	openEnded?: boolean;
	createdTime: string;
	type: "EVENT" | "RECURRING" | "AVAILABILITY" | (string & {});
	cancelled?: boolean;
	expired?: boolean;
	location?: {
		feature?: string;
		address?: string;
		postalCode?: string;
		locality?: string;
		latitude?: number;
		longitude?: number;
	};
	matchEvent?: boolean;
	matchInfo?: SpondMatchInfo;
	owners?: SpondEventOwner[];
	comments?: SpondComment[];
	recipients?: { group?: { id: string; name: string } };
	responses: SpondEventResponses & {
		/** Member id to the message they left when declining. */
		declineMessages?: Record<string, string>;
	};
};

export type SpondTokens = {
	accessToken: string;
	accessTokenExpiresAt: Date;
	refreshToken: string;
	refreshTokenExpiresAt: Date;
};

/** Persists tokens so they survive restarts and are shared between instances. */
export type SpondTokenStore = {
	load(): Promise<SpondTokens | null>;
	save(tokens: SpondTokens): Promise<void>;
};
