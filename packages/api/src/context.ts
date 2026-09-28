import type { Session } from "@sporty/auth";
import type { Database } from "@sporty/db";

export type Context = {
  session: Session | null;
  db: Database;
};
