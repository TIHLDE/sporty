import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@sporty/ui/components/card";

import { formatNumber } from "@/lib/format";
import type { SpondOverview } from "@/utils/trpc";

export function EventsSectionCards({
	stats,
}: {
	stats: SpondOverview["stats"];
}) {
	return (
		<div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
			<Card className="@container/card">
				<CardHeader>
					<CardDescription>Kommende arrangementer</CardDescription>
					<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
						{formatNumber(stats.upcomingEvents)}
					</CardTitle>
				</CardHeader>
			</Card>
			<Card className="@container/card">
				<CardHeader>
					<CardDescription>Kommende arrangementer (30d)</CardDescription>
					<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
						{formatNumber(stats.upcomingNext30)}
					</CardTitle>
				</CardHeader>
			</Card>
			<Card className="@container/card">
				<CardHeader>
					<CardDescription>Deltakelsesrate (siste 30d)</CardDescription>
					<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
						{stats.attendanceRate
							? stats.attendanceRate.toFixed(0) + "%"
							: "N/A"}
					</CardTitle>
				</CardHeader>
				<CardFooter className="flex-col items-start gap-1.5 text-sm">
					<div className="line-clamp-1 flex gap-2 font-medium">
						Forrige periode:{" "}
						{stats.attendanceRatePrev
							? formatNumber(stats.attendanceRatePrev)
							: "N/A"}
					</div>
				</CardFooter>
			</Card>
		</div>
	);
}
