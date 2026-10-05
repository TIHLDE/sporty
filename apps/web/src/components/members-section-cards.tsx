import { Badge } from "@sporty/ui/components/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@sporty/ui/components/card";
import { MinusIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react";

import { formatNumber, formatPercent } from "@/lib/format";
import type { SpondOverview } from "@/utils/trpc";

function Trend({
  value,
  suffix = "",
}: {
  value: number | null;
  suffix?: string;
}) {
  if (value === null) return null;
  const Icon =
    value > 0 ? TrendingUpIcon : value < 0 ? TrendingDownIcon : MinusIcon;
  return (
    <Badge variant="outline">
      <Icon />
      {suffix
        ? `${value > 0 ? "+" : ""}${Math.round(value * 10) / 10}${suffix}`
        : formatPercent(value, { signed: true })}
    </Badge>
  );
}

export function SectionCards({ stats }: { stats: SpondOverview["stats"] }) {
  const attendanceChange =
    stats.attendanceRate !== null && stats.attendanceRatePrev !== null
      ? stats.attendanceRate - stats.attendanceRatePrev
      : null;

  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Medlemmer</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatNumber(stats.memberCount)}
          </CardTitle>
          <CardAction>
            <Trend value={stats.newMembersChange} />
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {stats.newMembers} nye siste 30 dager
          </div>
          <div className="text-muted-foreground">
            Sammenlignet med forrige periode
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Kommende arrangementer</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatNumber(stats.upcomingEvents)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {stats.upcomingNext30} de neste 30 dagene
          </div>
          <div className="text-muted-foreground">Planlagt i Spond</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Oppmøte</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatPercent(stats.attendanceRate)}
          </CardTitle>
          <CardAction>
            <Trend value={attendanceChange} suffix=" pp" />
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Andel påmeldte
          </div>
          <div className="text-muted-foreground">
            Arrangementer siste 30 dager
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Svarprosent</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatPercent(stats.responseRate)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Har svart ja eller nei
          </div>
          <div className="text-muted-foreground">På kommende arrangementer</div>
        </CardFooter>
      </Card>
    </div>
  );
}
