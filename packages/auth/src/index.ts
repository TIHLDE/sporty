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

export const PHOTON_ISSUER =
  process.env.PHOTON_ISSUER ?? "https://photon.tihlde.org/api/auth";

// Photon only issues a JWT access token (which its API accepts) when the token
// request names an audience; otherwise the token is opaque. It has to be sent
// on every refresh too, or the renewed token falls back to opaque.
const PHOTON_TOKEN_PARAMS = { resource: PHOTON_ISSUER };

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
                  // offline_access gives a refresh token, so we can keep calling
                  // Photon's API after the one-hour access token expires.
                  scopes: ["openid", "profile", "email", "offline_access"],
                  tokenUrlParams: PHOTON_TOKEN_PARAMS,
                  refreshTokenParams: PHOTON_TOKEN_PARAMS,
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
