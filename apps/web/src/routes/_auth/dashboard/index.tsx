import { Skeleton } from "@sporty/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { EventDialog } from "@/components/event-dialog";
import { SectionCards } from "@/components/section-cards";
import { SiteHeader } from "@/components/site-header";
import { SpondTables } from "@/components/spond-tables";
import { useTRPC } from "@/utils/trpc";

const searchSchema = z.object({
  tab: z.enum(["events", "members", "subgroups"]).optional(),
  subGroup: z.string().optional(),
  event: z.string().optional(),
});

export const Route = createFileRoute("/_auth/dashboard/")({
  validateSearch: searchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const trpc = useTRPC();
  const overview = useQuery(trpc.spond.overview.queryOptions({}));
  const data = overview.data;

  return (
    <>
      <SiteHeader
        title="Oversikt"
        onRefresh={() => overview.refetch()}
        refreshing={overview.isFetching}
      />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          {overview.isError ? (
            <div className="m-4 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground lg:m-6">
              Klarte ikke å hente data fra Spond: {overview.error.message}
            </div>
          ) : !data ? (
            <DashboardSkeleton />
          ) : (
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards stats={data.stats} />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive events={data.events} />
              </div>
              <div id="tables">
                <SpondTables
                  data={data}
                  tab={search.tab ?? "events"}
                  subGroupId={search.subGroup}
                  onTabChange={(tab) =>
                    navigate({
                      search: (prev) => ({ ...prev, tab }),
                      replace: true,
                    })
                  }
                  onSubGroupChange={(subGroup) =>
                    navigate({
                      search: (prev) => ({ ...prev, subGroup }),
                      replace: true,
                    })
                  }
                  onEventOpen={(event) =>
                    navigate({ search: (prev) => ({ ...prev, event }) })
                  }
                />
              </div>
            </div>
          )}
        </div>
      </div>
      <EventDialog
        eventId={search.event}
        onOpenChange={(open) =>
          !open &&
          navigate({
            search: (prev) => ({ ...prev, event: undefined }),
            replace: true,
          })
        }
      />
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
      <div className="px-4 lg:px-6">
        <Skeleton className="h-[380px] rounded-xl" />
      </div>
      <div className="px-4 lg:px-6">
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}
