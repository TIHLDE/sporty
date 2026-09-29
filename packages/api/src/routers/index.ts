import { protectedProcedure, publicProcedure, router } from "../index";
import { eventFinesRouter } from "./event-fines";
import { finesRouter } from "./fines";
import { peopleRouter } from "./people";
import { spondRouter } from "./spond";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	privateData: protectedProcedure.query(({ ctx }) => {
		return {
			message: "This is private",
			user: ctx.session.user,
		};
	}),
	spond: spondRouter,
	people: peopleRouter,
	fines: finesRouter,
	eventFines: eventFinesRouter,
});
export type AppRouter = typeof appRouter;
