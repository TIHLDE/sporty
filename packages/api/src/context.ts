import type { Session } from "@sporty/auth";
import type { Database } from "@sporty/db";
import type { SpondClient } from "@sporty/spond";

import type { PhotonClient } from "./photon";

export type Mailer = {
	send(message: { to: string; subject: string; text: string }): Promise<void>;
};

export type Context = {
	session: Session | null;
	db: Database;
	spond: SpondClient;
	photon: PhotonClient;
	/** Sends email, or null when SMTP isn't configured. */
	mailer: Mailer | null;
	/** The Spond group picked on /groups, from its cookie. */
	selectedGroupId: string | null;
};
