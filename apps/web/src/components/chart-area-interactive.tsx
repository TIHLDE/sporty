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

import { useNow } from "@/hooks/use-now";
import { formatDate } from "@/lib/format";
import type { SpondOverview } from "@/utils/trpc";

const chartConfig = {
	accepted: { label: "Påmeldt", color: "oklch(72.3% 0.219 149.579)" },
	declined: { label: "Avslått", color: "oklch(63.7% 0.237 25.331)" },
} satisfies ChartConfig;

// Bottom to top in the stack.
const series = ["accepted", "declined"] as const;

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
	const now = useNow();
	const [selectedRange, setSelectedRange] = React.useState<Range | null>(null);
	const hasRecent = events.some((e) => {
		const start = new Date(e.start).getTime();
		return start >= now - ranges["90d"].days * 24 * 60 * 60 * 1000 && start <= now;
	});
	const range = selectedRange ?? (hasRecent ? "90d" : "upcoming");

	const data = React.useMemo(() => {
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
			const point = byDay.get(date) ?? {
				date,
				accepted: 0,
				declined: 0,
			};
			point.accepted += event.accepted;
			point.declined += event.declined;
			byDay.set(date, point);
		}
		return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
	}, [events, range, now]);

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
							setSelectedRange((value[0] as Range | undefined) ?? "90d")
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
						onValueChange={(value) => value && setSelectedRange(value as Range)}
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
								{series.map((key) => (
									<linearGradient
										key={key}
										id={`fill-${key}`}
										x1="0"
										y1="0"
										x2="0"
										y2="1"
									>
										<stop
											offset="5%"
											stopColor={`var(--color-${key})`}
											stopOpacity={0.8}
										/>
										<stop
											offset="95%"
											stopColor={`var(--color-${key})`}
											stopOpacity={0.1}
										/>
									</linearGradient>
								))}
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
							{series.map((key) => (
								<Area
									key={key}
									dataKey={key}
									type="natural"
									fill={`url(#fill-${key})`}
									stroke={`var(--color-${key})`}
									stackId="a"
								/>
							))}
						</AreaChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	);
}
