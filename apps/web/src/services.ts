import { createAuth } from "@sporty/auth";
import { createPrismaClient } from "@sporty/db";

import { ENV } from "./env.server";

export const db = createPrismaClient(ENV);
export const auth = createAuth(ENV, db);
