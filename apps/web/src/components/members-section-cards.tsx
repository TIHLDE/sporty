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

export function MemberSectionCards({
  stats,
}: {
  stats: SpondOverview["stats"];
}) {
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
        </CardFooter>
      </Card>
    </div>
  );
}
