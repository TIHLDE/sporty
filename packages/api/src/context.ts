import type { Session } from "@sporty/auth";
import type { Database } from "@sporty/db";
import type { SpondClient } from "@sporty/spond";

import type { PhotonClient } from "./photon";

export type Context = {
	session: Session | null;
	db: Database;
	spond: SpondClient;
	photon: PhotonClient;
	/** The Spond group picked on /groups, from its cookie. */
	selectedGroupId: string | null;
	/** Show every group the Spond account is in, not just the viewer's own. */
	displayAllGroups: boolean;
};
