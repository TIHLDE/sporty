import { z } from "zod";

import { publicProcedure, protectedProcedure, router } from "../index";

export const reportsRouter = router({
	/** Router for user bugs/suggestions. */
	list: publicProcedure.query(({ ctx }) => {
		return ctx.db.report.findMany({
			orderBy: { createdAt: "desc" },
		});
	}),
	setStatus: protectedProcedure
		.input(
			z.object({
				id: z.number(),
				status: z.enum(["OPEN", "CLOSED", "REJECTED"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await ctx.db.report.update({
				where: { id: input.id },
				data: { status: input.status },
			});
		}),
	create: protectedProcedure
		.input(
			z.object({
				title: z.string(),
				description: z.string(),
				type: z.enum(["BUG", "SUGGESTION"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await ctx.db.report.create({
				data: {
					title: input.title,
					description: input.description,
					type: input.type,
				},
			});
		}),
});
