import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@sporty/ui/components/avatar";
import { Badge } from "@sporty/ui/components/badge";
import { Button } from "@sporty/ui/components/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@sporty/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@sporty/ui/components/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@sporty/ui/components/tabs";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleCheckIcon,
  CircleXIcon,
  ClockIcon,
  ExternalLinkIcon,
  LinkIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import * as React from "react";

import { useNow } from "@/hooks/use-now";
import { formatDate, formatDateTime, formatPercent } from "@/lib/format";
import { type SpondOverview, useTRPC } from "@/utils/trpc";

export type TableTab = "events" | "members" | "subgroups";

const PAGE_SIZE = 10;

const eventTypeLabels: Record<string, string> = {
  EVENT: "Arrangement",
  RECURRING: "Gjentakende",
  AVAILABILITY: "Tilgjengelighet",
};

function usePagination<T>(rows: T[]) {
  const [page, setPage] = React.useState(0);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  return {
    rows: rows.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE),
    page: current,
    pageCount,
    setPage,
    total: rows.length,
  };
}

function Pagination({
  page,
  pageCount,
  setPage,
  total,
  noun,
}: ReturnType<typeof usePagination<unknown>> & { noun: string }) {
  return (
    <div className="flex items-center justify-between px-4">
      <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
        {total} {noun}
      </div>
      <div className="flex w-full items-center gap-8 lg:w-fit">
        <div className="flex w-fit items-center justify-center text-sm font-medium">
          Side {page + 1} av {pageCount}
        </div>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => setPage(page - 1)}
            disabled={page === 0}
          >
            <span className="sr-only">Forrige side</span>
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => setPage(page + 1)}
            disabled={page >= pageCount - 1}
          >
            <span className="sr-only">Neste side</span>
            <ChevronRightIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmptyRow({
  colSpan,
  children,
}: {
  colSpan: number;
  children: React.ReactNode;
}) {
  return (
    <TableRow>
      <TableCell
        colSpan={colSpan}
        className="h-24 text-center text-muted-foreground"
      >
        {children}
      </TableCell>
    </TableRow>
  );
}

function EventStatus({ event }: { event: SpondOverview["events"][number] }) {
  const now = useNow();
  if (event.cancelled) {
    return (
      <Badge variant="outline" className="px-1.5 text-muted-foreground">
        <CircleXIcon className="text-destructive" />
        Avlyst
      </Badge>
    );
  }
  if (new Date(event.end).getTime() < now) {
    return (
      <Badge variant="outline" className="px-1.5 text-muted-foreground">
        <CircleCheckIcon className="fill-green-500 dark:fill-green-400" />
        Ferdig
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="px-1.5 text-muted-foreground">
      <ClockIcon />
      Kommende
    </Badge>
  );
}

type EventFilter = "upcoming" | "past" | "all";
const eventFilterLabels: Record<EventFilter, string> = {
  upcoming: "Kommende",
  past: "Tidligere",
  all: "Alle",
};

function EventFilterSelect({
  value,
  onChange,
}: {
  value: EventFilter;
  onChange: (value: EventFilter) => void;
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => v && onChange(v as EventFilter)}
    >
      <SelectTrigger size="sm" className="w-36">
        <SelectValue>{eventFilterLabels[value]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {Object.entries(eventFilterLabels).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function EventsTable({
  events,
  filter,
  onOpen,
}: {
  events: SpondOverview["events"];
  filter: EventFilter;
  onOpen: (eventId: string) => void;
}) {
  const now = useNow();
  const filtered = React.useMemo(() => {
    const list = events.filter((e) => {
      const ended = new Date(e.end).getTime() < now;
      return filter === "all" || (filter === "past" ? ended : !ended);
    });
    // Most relevant first: soonest upcoming, or most recent past.
    return filter === "upcoming" ? list : [...list].reverse();
  }, [events, filter, now]);
  const pagination = usePagination(filtered);

  return (
    <>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted">
            <TableRow>
              <TableHead className="pl-4">Arrangement</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tidspunkt</TableHead>
              <TableHead className="text-right">Påmeldt</TableHead>
              <TableHead className="text-right">Avslått</TableHead>
              <TableHead className="text-right">Ikke svart</TableHead>
              <TableHead className="pr-4 text-right">Oppmøte</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.rows.length === 0 ? (
              <EmptyRow colSpan={8}>Ingen arrangementer</EmptyRow>
            ) : (
              pagination.rows.map((event) => (
                <TableRow
                  key={event.id}
                  className="cursor-pointer"
                  onClick={() => onOpen(event.id)}
                >
                  <TableCell className="pl-4">
                    <button
                      type="button"
                      className="text-left font-medium hover:underline focus-visible:underline focus-visible:outline-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpen(event.id);
                      }}
                    >
                      {event.heading}
                    </button>
                    {event.location && (
                      <div className="text-xs text-muted-foreground">
                        {event.location}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="px-1.5 text-muted-foreground"
                    >
                      {eventTypeLabels[event.type] ?? event.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <EventStatus event={event} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(event.start)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {event.accepted}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {event.declined}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {event.unanswered}
                  </TableCell>
                  <TableCell className="pr-4 text-right tabular-nums">
                    {formatPercent(
                      event.invited
                        ? (event.accepted / event.invited) * 100
                        : null,
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Pagination {...pagination} noun="arrangementer" />
    </>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function SubGroupSelect({
  subGroups,
  value,
  onChange,
}: {
  subGroups: SpondOverview["subGroups"];
  value?: string;
  onChange: (id?: string) => void;
}) {
  const selected = subGroups.find((s) => s.id === value);
  return (
    <Select
      value={value ?? "all"}
      onValueChange={(v) => onChange(v && v !== "all" ? v : undefined)}
    >
      <SelectTrigger size="sm" className="w-44">
        <SelectValue>{selected?.name ?? "Alle undergrupper"}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="all">Alle undergrupper</SelectItem>
          {subGroups.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function TihldeCell({
  member,
  canManagePeople,
}: {
  member: SpondOverview["members"][number];
  canManagePeople: boolean;
}) {
  if (canManagePeople && member.tihldeEmail) {
    return <span className="truncate">{member.tihldeEmail}</span>;
  }
  return member.linked ? (
    <Badge variant="outline" className="px-1.5 text-muted-foreground">
      <CircleCheckIcon className="fill-green-500 dark:fill-green-400" />
      Koblet
    </Badge>
  ) : (
    <span className="text-muted-foreground">Ikke koblet</span>
  );
}

function FinesCell({
  total,
  linked,
}: {
  total?: { amount: number; count: number };
  linked: boolean;
}) {
  if (!total) {
    return (
      <span
        className="text-muted-foreground"
        title={
          linked ? "Ikke medlem av TIHLDE-gruppen" : "Ikke koblet til TIHLDE"
        }
      >
        –
      </span>
    );
  }
  // On tihlde.org a fine's amount is the number of bøter; count is how many
  // times fines were registered.
  return (
    <span
      className={total.amount === 0 ? "text-muted-foreground" : "font-medium"}
      title={`${total.count} ${total.count === 1 ? "registrering" : "registreringer"} som ikke er betalt`}
    >
      {total.amount}
    </span>
  );
}

function MembersTable({
  members,
  subGroupId,
  canManagePeople,
}: {
  members: SpondOverview["members"];
  subGroupId?: string;
  canManagePeople: boolean;
}) {
  const filtered = React.useMemo(
    () =>
      (subGroupId
        ? members.filter((m) => m.subGroupIds.includes(subGroupId))
        : members
      )
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, "nb")),
    [members, subGroupId],
  );
  const pagination = usePagination(filtered);
  const trpc = useTRPC();
  const fines = useQuery(trpc.fines.overview.queryOptions({}));
  const finesByMember =
    fines.data?.status === "ok" ? fines.data.byMember : null;

  return (
    <>
      {fines.data?.status === "unavailable" && (
        <p className="text-sm text-muted-foreground">
          Bøter: {fines.data.message}
          {fines.data.reason === "not-configured" && canManagePeople && (
            <>
              {" – "}
              <Link to="/admin" className="underline underline-offset-4">
                velg gruppe under Administrasjon
              </Link>
            </>
          )}
        </p>
      )}
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted">
            <TableRow>
              <TableHead className="pl-4">Navn</TableHead>
              <TableHead>Undergrupper</TableHead>
              <TableHead>Roller</TableHead>
              <TableHead>Medlem siden</TableHead>
              <TableHead className="text-right">Oppmøte</TableHead>
              {finesByMember && (
                <TableHead className="text-right">Bøter</TableHead>
              )}
              <TableHead className="pr-4 text-right">TIHLDE-bruker</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.rows.length === 0 ? (
              <EmptyRow colSpan={finesByMember ? 7 : 6}>
                Ingen medlemmer
              </EmptyRow>
            ) : (
              pagination.rows.map((member) => (
                <TableRow key={member.id} className="odd:bg-white/5">
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-7">
                        {member.imageUrl && (
                          <AvatarImage
                            src={member.imageUrl}
                            alt={member.name}
                          />
                        )}
                        <AvatarFallback className="text-xs">
                          {initials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid">
                        <span className="font-medium">{member.name}</span>
                        {member.spondEmail && (
                          <span className="text-xs text-muted-foreground">
                            {member.spondEmail}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {member.subGroups.map((name) => (
                        <Badge
                          key={name}
                          variant="outline"
                          className="px-1.5 text-muted-foreground"
                        >
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.roles.join(", ") || "–"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(member.joined)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {member.eventsInvited === 0 ? (
                      <span className="text-muted-foreground">–</span>
                    ) : (
                      <>
                        {formatPercent(
                          (member.eventsAccepted / member.eventsInvited) * 100,
                        )}
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({member.eventsAccepted}/{member.eventsInvited})
                        </span>
                      </>
                    )}
                  </TableCell>
                  {finesByMember && (
                    <TableCell className="text-right tabular-nums">
                      <FinesCell
                        total={finesByMember[member.id]}
                        linked={member.linked}
                      />
                    </TableCell>
                  )}
                  <TableCell className="pr-4 text-right">
                    <TihldeCell
                      member={member}
                      canManagePeople={canManagePeople}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Pagination {...pagination} noun="medlemmer" />
    </>
  );
}

function SubGroupsTable({
  subGroups,
  onSelect,
}: {
  subGroups: SpondOverview["subGroups"];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-muted">
          <TableRow>
            <TableHead className="pl-4">Undergruppe</TableHead>
            <TableHead className="text-right">Medlemmer</TableHead>
            <TableHead className="pr-4 text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {subGroups.length === 0 ? (
            <EmptyRow colSpan={3}>Ingen undergrupper</EmptyRow>
          ) : (
            subGroups.map((s) => (
              <TableRow key={s.id} className="odd:bg-white/5">
                <TableCell className="pl-4">
                  <div className="flex items-center gap-2 font-medium">
                    <span
                      className="size-2.5 rounded-full bg-muted-foreground"
                      style={s.color ? { backgroundColor: s.color } : undefined}
                    />
                    {s.name}
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {s.memberCount}
                </TableCell>
                <TableCell className="pr-4 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelect(s.id)}
                  >
                    Vis medlemmer
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function DesktopTabsList({ data }: { data: SpondOverview }) {
  const upcomingCount = data.stats.upcomingEvents;
  return (
    <TabsList className="**:data-[slot=badge]:size-5 hidden md:block **:data-[slot=badge]:rounded-full **:data-[slot=badge]:bg-muted-foreground/30 **:data-[slot=badge]:px-1">
      <TabsTrigger value="events">
        Arrangementer{" "}
        {upcomingCount > 0 && (
          <Badge variant="secondary">{upcomingCount}</Badge>
        )}
      </TabsTrigger>
      <TabsTrigger value="members">
        Medlemmer <Badge variant="secondary">{data.members.length}</Badge>
      </TabsTrigger>
      <TabsTrigger value="subgroups">
        Undergrupper <Badge variant="secondary">{data.subGroups.length}</Badge>
      </TabsTrigger>
    </TabsList>
  );
}

function MobileTabsSelect({
  data,
  value,
  onChange,
}: {
  data: SpondOverview;
  value: string;
  onChange: (value: string) => void;
}) {
  const upcomingCount = data.stats.upcomingEvents;
  const options = [
    {
      value: "events",
      label: `Arrangementer${upcomingCount > 0 ? ` (${upcomingCount})` : ""}`,
    },
    {
      value: "members",
      label: `Medlemmer (${data.members.length})`,
    },
    {
      value: "subgroups",
      label: `Undergrupper (${data.subGroups.length})`,
    },
  ];

  const selectedLabel = options.find((option) => option.value === value)?.label;

  return (
    <Select
      value={value}
      onValueChange={(value) => {
        if (value) onChange(value);
      }}
    >
      <SelectTrigger size="sm" className="w-44 md:hidden">
        <SelectValue>{selectedLabel ?? "Velg visning"}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function SpondTables({
  data,
  tab,
  subGroupId,
  onTabChange,
  onSubGroupChange,
  onEventOpen,
}: {
  data: SpondOverview;
  tab: TableTab;
  subGroupId?: string;
  onTabChange: (tab: TableTab) => void;
  onSubGroupChange: (id?: string) => void;
  onEventOpen: (eventId: string) => void;
}) {
  const [eventFilter, setEventFilter] = React.useState<EventFilter>("upcoming");

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => onTabChange(value as TableTab)}
      className="w-full flex-col justify-start gap-6"
    >
      <div className="flex md:flex-row flex-wrap items-center md:justify-between gap-2 px-4 lg:px-6">
        <DesktopTabsList data={data} />
        <MobileTabsSelect
          data={data}
          value={tab}
          onChange={(value) => onTabChange(value as TableTab)}
        />
        {tab === "events" && (
          <EventFilterSelect value={eventFilter} onChange={setEventFilter} />
        )}
        {tab === "members" && (
          <>
            {data.viewer.canManagePeople && (
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link to="/admin" />}
              >
                <LinkIcon />
                <span className="lg:inline">Koble brukere</span>
              </Button>
            )}
            <SubGroupSelect
              subGroups={data.subGroups}
              value={subGroupId}
              onChange={onSubGroupChange}
            />
          </>
        )}
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={
            <a
              href="https://spond.com/client/"
              target="_blank"
              rel="noreferrer"
              aria-labelledby="spond-link-labelby"
            />
          }
        >
          <ExternalLinkIcon />
          <span className=" lg:inline" id="spond-link-labelby">
            Åpne i Spond
          </span>
        </Button>
      </div>
      <TabsContent
        value="events"
        className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
      >
        <EventsTable
          events={data.events}
          filter={eventFilter}
          onOpen={onEventOpen}
        />
      </TabsContent>
      <TabsContent
        value="members"
        className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
      >
        <MembersTable
          members={data.members}
          subGroupId={subGroupId}
          canManagePeople={data.viewer.canManagePeople}
        />
      </TabsContent>
      <TabsContent
        value="subgroups"
        className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
      >
        <SubGroupsTable
          subGroups={data.subGroups}
          onSelect={(id) => {
            onSubGroupChange(id);
            onTabChange("members");
          }}
        />
      </TabsContent>
    </Tabs>
  );
}
