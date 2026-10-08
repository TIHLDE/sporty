import { MemberSectionCards } from "@/components/members-section-cards";
import { SiteHeader } from "@/components/site-header";
import { MembersTable } from "@/components/spond-tables";
import { useTRPC } from "@/utils/trpc";
import { Button } from "@sporty/ui/components/button";
import { Input } from "@sporty/ui/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@sporty/ui/components/select";
import { Skeleton } from "@sporty/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LinkIcon } from "lucide-react";
import { useState } from "react";
import z from "zod";

const searchSchema = z.object({
  group: z.string().optional(),
  tab: z.enum(["events", "members", "subgroups"]).optional(),
  subGroup: z.string().optional(),
  event: z.string().optional(),
});
export const Route = createFileRoute("/_auth/dashboard/members")({
  validateSearch: searchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const search = Route.useSearch();
  const trpc = useTRPC();
  const overview = useQuery(
    trpc.spond.overview.queryOptions({ groupId: search.group }),
  );
  const data = overview.data;

  const [subgroupId, setSubgroupId] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <>
      <SiteHeader
        title="Medlemmer"
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
            <MembersSkeleton />
          ) : (
            <div className="flex flex-col gap-4 py-4 px-4 md:gap-6 md:py-6 md:px-6">
              <MemberSectionCards stats={data.stats} />
              {/* TODO: Add filtering by subgroup */}
              <div className="inline-flex gap-2 w-full">
                <Select
                  value={subgroupId}
                  onValueChange={(v) => setSubgroupId(v ?? undefined)}
                >
                  <SelectTrigger className="min-w-40">
                    <SelectValue>
                      {subgroupId
                        ? overview.data.subGroups.find(
                            (s) => s.id === subgroupId,
                          )?.name
                        : "Velg undergruppe"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Ingen Undergruppe</SelectItem>
                    {data.subGroups.map((subGroup) => (
                      <SelectItem key={subGroup.id} value={subGroup.id}>
                        {subGroup.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={searchTerm}
                  type="text"
                  className="w-40"
                  placeholder="Søk.."
                  onChange={(v) => setSearchTerm(v.target.value)}
                />
                {data.viewer.canManagePeople && (
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    className={"h-full"}
                    render={<Link to="/admin" />}
                  >
                    <LinkIcon />
                    <span className="hidden lg:inline">Koble brukere</span>
                  </Button>
                )}
              </div>
              <MembersTable
                members={data.members}
                subGroupId={subgroupId}
                search={searchTerm}
                canManagePeople={data.viewer.canManagePeople}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// TODO: Update skeleton, dette er kopiert fra dashboard-skeletonet
function MembersSkeleton() {
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
