import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@sporty/ui/components/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@sporty/ui/components/chart";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@sporty/ui/components/select";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@sporty/ui/components/toggle-group";
import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import { formatDate } from "@/lib/format";
import type { SpondOverview } from "@/utils/trpc";

const chartConfig = {
	accepted: { label: "Påmeldt", color: "var(--primary)" },
	declined: { label: "Avslått", color: "var(--primary)" },
} satisfies ChartConfig;

const ranges = {
	"90d": { label: "Siste 3 måneder", short: "3 mnd", days: 90 },
	"30d": { label: "Siste 30 dager", short: "30 dager", days: 30 },
	upcoming: { label: "Kommende", short: "Kommende", days: 0 },
} as const;
type Range = keyof typeof ranges;

export function ChartAreaInteractive({
	events,
}: {
	events: SpondOverview["events"];
}) {
	// Default to upcoming events if nothing happened in the last three months.
	const [range, setRange] = React.useState<Range>(() => {
		const from = Date.now() - ranges["90d"].days * 24 * 60 * 60 * 1000;
		const hasRecent = events.some((e) => {
			const start = new Date(e.start).getTime();
			return start >= from && start <= Date.now();
		});
		return hasRecent ? "90d" : "upcoming";
	});

	const data = React.useMemo(() => {
		const now = Date.now();
		const from =
			range === "upcoming"
				? now
				: now - ranges[range].days * 24 * 60 * 60 * 1000;
		const to = range === "upcoming" ? Number.POSITIVE_INFINITY : now;

		// One point per day, summing all events that start on that day.
		const byDay = new Map<
			string,
			{ date: string; accepted: number; declined: number }
		>();
		for (const event of events) {
			const start = new Date(event.start).getTime();
			if (event.cancelled || start < from || start > to) continue;
			const date = event.start.slice(0, 10);
			const point = byDay.get(date) ?? { date, accepted: 0, declined: 0 };
			point.accepted += event.accepted;
			point.declined += event.declined;
			byDay.set(date, point);
		}
		return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
	}, [events, range]);

	return (
		<Card className="@container/card">
			<CardHeader>
				<CardTitle>Påmeldinger</CardTitle>
				<CardDescription>
					<span className="hidden @[540px]/card:block">
						Svar per arrangementsdag – {ranges[range].label.toLowerCase()}
					</span>
					<span className="@[540px]/card:hidden">{ranges[range].label}</span>
				</CardDescription>
				<CardAction>
					<ToggleGroup
						multiple={false}
						value={[range]}
						onValueChange={(value) =>
							setRange((value[0] as Range | undefined) ?? "90d")
						}
						variant="outline"
						spacing={0}
						className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
					>
						{Object.entries(ranges).map(([key, { label }]) => (
							<ToggleGroupItem key={key} value={key}>
								{label}
							</ToggleGroupItem>
						))}
					</ToggleGroup>
					<Select
						value={range}
						onValueChange={(value) => value && setRange(value as Range)}
					>
						<SelectTrigger
							className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
							size="sm"
							aria-label="Velg periode"
						>
							<SelectValue>{ranges[range].label}</SelectValue>
						</SelectTrigger>
						<SelectContent className="rounded-xl">
							{Object.entries(ranges).map(([key, { label }]) => (
								<SelectItem key={key} value={key} className="rounded-lg">
									{label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</CardAction>
			</CardHeader>
			<CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
				{data.length === 0 ? (
					<div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
						Ingen arrangementer i denne perioden
					</div>
				) : (
					<ChartContainer
						config={chartConfig}
						className="aspect-auto h-[250px] w-full"
					>
						<AreaChart data={data}>
							<defs>
								<linearGradient id="fillAccepted" x1="0" y1="0" x2="0" y2="1">
									<stop
										offset="5%"
										stopColor="var(--color-accepted)"
										stopOpacity={1.0}
									/>
									<stop
										offset="95%"
										stopColor="var(--color-accepted)"
										stopOpacity={0.1}
									/>
								</linearGradient>
								<linearGradient id="fillDeclined" x1="0" y1="0" x2="0" y2="1">
									<stop
										offset="5%"
										stopColor="var(--color-declined)"
										stopOpacity={0.8}
									/>
									<stop
										offset="95%"
										stopColor="var(--color-declined)"
										stopOpacity={0.1}
									/>
								</linearGradient>
							</defs>
							<CartesianGrid vertical={false} />
							<XAxis
								dataKey="date"
								tickLine={false}
								axisLine={false}
								tickMargin={8}
								minTickGap={32}
								tickFormatter={(value) => formatDate(value)}
							/>
							<ChartTooltip
								cursor={false}
								content={
									<ChartTooltipContent
										labelFormatter={(value) => formatDate(value)}
										indicator="dot"
									/>
								}
							/>
							<Area
								dataKey="declined"
								type="natural"
								fill="url(#fillDeclined)"
								stroke="var(--color-declined)"
								stackId="a"
							/>
							<Area
								dataKey="accepted"
								type="natural"
								fill="url(#fillAccepted)"
								stroke="var(--color-accepted)"
								stackId="a"
							/>
						</AreaChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	);
}
