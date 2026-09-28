import type { Database } from "@sporty/db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { genericOAuth } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";

export type AuthConfig = {
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  PHOTON_CLIENT_ID: string;
  PHOTON_CLIENT_SECRET: string;
};

const PHOTON_ISSUER =
  process.env.PHOTON_ISSUER ?? "https://photon.tihlde.org/api/auth";
export function createAuth(_env: AuthConfig, database: Database) {
  return betterAuth({
    database: prismaAdapter(database, {
      provider: "postgresql",
    }),
    trustedOrigins: [process.env.BETTER_AUTH_URL!],
    emailAndPassword: { enabled: true },
    plugins: [
      genericOAuth({
        config:
          process.env.PHOTON_CLIENT_ID && process.env.PHOTON_CLIENT_SECRET
            ? [
                {
                  providerId: "photon",
                  discoveryUrl: `${PHOTON_ISSUER}/.well-known/openid-configuration`,
                  clientId: process.env.PHOTON_CLIENT_ID,
                  clientSecret: process.env.PHOTON_CLIENT_SECRET,
                  scopes: ["openid", "profile", "email"],
                },
              ]
            : [],
      }),
      tanstackStartCookies(),
    ],
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
  });
}

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];
