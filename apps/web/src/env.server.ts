function required(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

export const ENV = {
	NODE_ENV: process.env.NODE_ENV ?? "development",
	DATABASE_URL: required("DATABASE_URL"),
	BETTER_AUTH_URL: required("BETTER_AUTH_URL"),
	BETTER_AUTH_SECRET: required("BETTER_AUTH_SECRET"),
	PHOTON_CLIENT_ID: process.env.PHOTON_CLIENT_ID ?? "",
	PHOTON_CLIENT_SECRET: process.env.PHOTON_CLIENT_SECRET ?? "",
	SPOND_EMAIL: process.env.SPOND_EMAIL ?? "",
	SPOND_PASSWORD: process.env.SPOND_PASSWORD ?? "",
	/** Email for verification codes; email verification is off without SMTP_HOST. */
	SMTP_HOST: process.env.SMTP_HOST ?? "",
	SMTP_PORT: Number(process.env.SMTP_PORT || 587),
	SMTP_USER: process.env.SMTP_USER ?? "",
	SMTP_PASSWORD: process.env.SMTP_PASSWORD ?? "",
	SMTP_FROM: process.env.SMTP_FROM || "TIHLDE Sporty <no-reply@tihlde.org>",
	/** Show every Spond group to everyone (development); off in production. */
	DISPLAY_ALL_GROUPS: process.env.DISPLAY_ALL_GROUPS === "true",
};
