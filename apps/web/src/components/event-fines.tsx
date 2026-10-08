import { Badge } from "@sporty/ui/components/badge";
import { Button } from "@sporty/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@sporty/ui/components/card";
import { Checkbox } from "@sporty/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@sporty/ui/components/dialog";
import { Input } from "@sporty/ui/components/input";
import { Label } from "@sporty/ui/components/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@sporty/ui/components/select";
import { Skeleton } from "@sporty/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@sporty/ui/components/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GavelIcon } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { formatDateTime } from "@/lib/format";
import { type RouterOutputs, useTRPC } from "@/utils/trpc";

type Settings = RouterOutputs["people"]["settings"];
type FineEvent = RouterOutputs["eventFines"]["list"]["events"][number];

const categoryLabels: Record<FineEvent["category"], string> = {
  match: "Kamp",
  training: "Trening",
  other: "Arrangement",
};

const NO_LAW = "none";

function parseAmount(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : Number.NaN;
}

/** Default number of bøter per event type, plus paragraph and reason. */
export function FineRulesForm({ settings }: { settings: Settings }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [match, setMatch] = React.useState(String(settings.fineAmountMatch));
  const [training, setTraining] = React.useState(
    String(settings.fineAmountTraining),
  );
  const [other, setOther] = React.useState(
    settings.fineAmountOther === null ? "" : String(settings.fineAmountOther),
  );
  const [lawId, setLawId] = React.useState(settings.fineLawId ?? NO_LAW);
  const [reason, setReason] = React.useState(settings.fineReason);

  const save = useMutation(
    trpc.people.setFineSettings.mutationOptions({
      onSuccess: () => {
        toast.success("Bøteoppsettet er lagret");
        queryClient.invalidateQueries({
          queryKey: trpc.people.settings.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.eventFines.list.queryKey(),
        });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const matchAmount = parseAmount(match);
  const trainingAmount = parseAmount(training);
  const otherAmount = parseAmount(other);
  const valid =
    matchAmount !== null &&
    !Number.isNaN(matchAmount) &&
    trainingAmount !== null &&
    !Number.isNaN(trainingAmount) &&
    !Number.isNaN(otherAmount) &&
    reason.trim().length > 0;
  const selectedLaw = settings.laws.find((l) => l.id === lawId);

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!valid) return;
        save.mutate({
          fineAmountMatch: matchAmount as number,
          fineAmountTraining: trainingAmount as number,
          fineAmountOther: otherAmount,
          fineLawId: lawId === NO_LAW ? null : lawId,
          fineReason: reason,
        });
      }}
    >
      <div>
        <h3 className="font-medium text-sm">Fellesbøter for manglende svar</h3>
        <p className="text-muted-foreground text-sm">
          Antall bøter hver person får når de ikke har svart innen fristen. Kan
          justeres hver gang bøter gis.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <AmountField
          id="fine-match"
          label="Kamp"
          value={match}
          onChange={setMatch}
        />
        <AmountField
          id="fine-training"
          label="Trening (treningskamp)"
          value={training}
          onChange={setTraining}
        />
        <AmountField
          id="fine-other"
          label="Andre arrangementer"
          value={other}
          onChange={setOther}
          placeholder="Velges ved utdeling"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Paragraf i lovverket</Label>
          <Select value={lawId} onValueChange={(v) => setLawId(v ?? NO_LAW)}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {selectedLaw
                  ? `§ ${selectedLaw.paragraph} ${selectedLaw.title}`
                  : "Ingen paragraf"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={NO_LAW}>Ingen paragraf</SelectItem>
                {settings.laws.map((law) => (
                  <SelectItem key={law.id} value={law.id}>
                    § {law.paragraph} {law.title}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="fine-reason">Grunn</Label>
          <Input
            id="fine-reason"
            value={reason}
            maxLength={200}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={!valid || save.isPending}>
          {save.isPending ? "Lagrer…" : "Lagre oppsett"}
        </Button>
        <span className="text-muted-foreground text-xs">
          Grunnen får arrangementets navn og dato lagt til, f.eks. «{reason}:
          Kamp mot abakus (1. okt.)».
        </span>
      </div>
    </form>
  );
}

function AmountField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={0}
        max={50}
        inputMode="numeric"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

/** Events past their reply deadline, with a button to fine everyone who didn't reply. */
export function EventFinesCard() {
  const trpc = useTRPC();
  const list = useQuery(trpc.eventFines.list.queryOptions({}));
  const [selected, setSelected] = React.useState<FineEvent | null>(null);

  const events = list.data?.events ?? [];

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GavelIcon className="size-4" />
          Fellesbøter
        </CardTitle>
        <CardDescription>
          Arrangementer siste 60 dager der svarfristen har gått ut og noen ikke
          har svart. Uten svarfrist regnes starttidspunktet som frist. Medlemmer
          i undergruppen «Inaktiv» får ikke fellesbøter.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {list.isPending ? (
          <Skeleton className="h-32 rounded-lg" />
        ) : list.isError ? (
          <p className="text-muted-foreground text-sm">{list.error.message}</p>
        ) : events.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
            Ingen arrangementer med manglende svar etter fristen 🎉
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead className="pl-4">Arrangement</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Frist</TableHead>
                  <TableHead className="text-right">Ikke svart</TableHead>
                  <TableHead className="pr-4 text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => {
                  // Inaktive never get fellesbøter, so they don't count as open.
                  const open = event.nonResponders.filter(
                    (p) => p.finedAmount === null && !p.exempt,
                  );
                  const exemptCount = event.nonResponders.filter(
                    (p) => p.exempt,
                  ).length;
                  const done = open.length === 0;
                  // Only linked people can be fined on tihlde.org.
                  const fineable = open.filter((p) => p.linked).length;
                  return (
                    <TableRow key={event.id} className="odd:bg-black/5">
                      <TableCell className="pl-4">
                        <div className="font-medium">{event.heading}</div>
                        <div className="text-muted-foreground text-xs">
                          {formatDateTime(event.start)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="px-1.5 text-muted-foreground"
                        >
                          {categoryLabels[event.category]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(event.deadline)}
                        {!event.hasDeadline && (
                          <span className="block text-xs">(start)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {event.nonResponders.length}
                        {!done &&
                          open.length !==
                            event.nonResponders.length - exemptCount && (
                            <span className="block text-muted-foreground text-xs">
                              {open.length} uten bot
                            </span>
                          )}
                        {exemptCount > 0 && (
                          <span className="block text-muted-foreground text-xs">
                            {exemptCount} inaktiv{exemptCount === 1 ? "" : "e"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        {done ? (
                          <Badge variant="secondary">Bøter gitt</Badge>
                        ) : fineable === 0 ? (
                          <Badge
                            variant="outline"
                            className="text-muted-foreground"
                          >
                            Resten er ikke koblet
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!list.data?.tihldeGroupSlug}
                            onClick={() => setSelected(event)}
                          >
                            <GavelIcon />
                            Gi bøter
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      {list.data && !list.data.tihldeGroupSlug && events.length > 0 && (
        <CardFooter className="text-muted-foreground text-sm">
          Velg en TIHLDE-gruppe under Botsystem for å kunne gi bøter.
        </CardFooter>
      )}
      <GiveFinesDialog
        event={selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </Card>
  );
}

function GiveFinesDialog({
  event,
  onOpenChange,
}: {
  event: FineEvent | null;
  onOpenChange: (open: boolean) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const settings = useQuery(trpc.people.settings.queryOptions({}));
  const laws = settings.data?.laws ?? [];
  const [amount, setAmount] = React.useState("");
  const [lawId, setLawId] = React.useState(NO_LAW);
  const [chosen, setChosen] = React.useState<Set<string>>(new Set());

  const eligible = React.useMemo(
    () =>
      event?.nonResponders.filter(
        (p) => p.linked && !p.exempt && p.finedAmount === null,
      ) ?? [],
    [event],
  );

  // Reset the form each time the dialog is opened for an event.
  const [prevEvent, setPrevEvent] = React.useState(event);
  if (event !== prevEvent) {
    setPrevEvent(event);
    if (event) {
      setAmount(event.defaultAmount === null ? "" : String(event.defaultAmount));
      setChosen(new Set(eligible.map((p) => p.memberId)));
    }
  }

  // Start from the paragraph in the settings each time the dialog opens.
  const defaultLawId = settings.data?.fineLawId ?? NO_LAW;
  const [prevLawKey, setPrevLawKey] = React.useState<string | null>(null);
  const lawKey = event ? `${event.id}:${defaultLawId}` : null;
  if (lawKey !== prevLawKey) {
    setPrevLawKey(lawKey);
    if (event) setLawId(defaultLawId);
  }
  const selectedLaw = laws.find((l) => l.id === lawId);

  const give = useMutation(
    trpc.eventFines.give.mutationOptions({
      onSuccess: ({ given, skipped, failed }) => {
        if (given.length) {
          toast.success(
            `${given.length} ${given.length === 1 ? "person" : "personer"} fikk ${given[0]?.amount} ${given[0]?.amount === 1 ? "bot" : "bøter"}`,
          );
        }
        for (const s of skipped)
          toast.info(`${s.name}: hoppet over (${s.reason})`);
        for (const f of failed) toast.error(`${f.name}: ${f.message}`);
        for (const key of [
          trpc.eventFines.list.queryKey(),
          trpc.fines.overview.queryKey(),
        ]) {
          queryClient.invalidateQueries({ queryKey: key });
        }
        if (!failed.length) onOpenChange(false);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const amountNumber = Number(amount);
  const amountValid =
    amount.trim() !== "" &&
    Number.isInteger(amountNumber) &&
    amountNumber >= 0 &&
    amountNumber <= 50;
  const count = chosen.size;

  const toggle = (memberId: string, on: boolean) =>
    setChosen((prev) => {
      const next = new Set(prev);
      if (on) next.add(memberId);
      else next.delete(memberId);
      return next;
    });

  return (
    <Dialog open={event !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!event || !amountValid || count === 0) return;
            give.mutate({
              eventId: event.id,
              amount: amountNumber,
              memberIds: [...chosen],
              lawId: lawId === NO_LAW ? null : lawId,
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Gi fellesbøter</DialogTitle>
            <DialogDescription>
              {event?.heading} –{" "}
              {event && categoryLabels[event.category].toLowerCase()}. Bøtene
              gis på tihlde.org i ditt navn og må godkjennes av botsjefen.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="give-amount">Antall bøter per person</Label>
            <Input
              id="give-amount"
              type="number"
              min={0}
              max={50}
              required
              placeholder="Velg antall"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {event?.defaultAmount === null && (
              <p className="text-muted-foreground text-xs">
                Ingen standard for denne typen – velg antall.
              </p>
            )}
            {amount.trim() !== "" && amountNumber === 0 && (
              <p className="text-muted-foreground text-xs">
                0 bøter vises som en advarsel på tihlde.org og teller ikke i
                summen. De lagres ikke her, så personene kan fortsatt få ekte
                bøter for dette arrangementet.
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Paragraf i lovverket</Label>
            <Select value={lawId} onValueChange={(v) => setLawId(v ?? NO_LAW)}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {selectedLaw
                    ? `§ ${selectedLaw.paragraph} ${selectedLaw.title}`
                    : "Ingen paragraf"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={NO_LAW}>Ingen paragraf</SelectItem>
                  {laws.map((law) => (
                    <SelectItem key={law.id} value={law.id}>
                      § {law.paragraph} {law.title}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Ikke svart ({event?.nonResponders.length ?? 0})</Label>
            <ul className="grid gap-2 rounded-lg border p-3">
              {event?.nonResponders.map((p) => {
                const disabled =
                  !p.linked || p.exempt || p.finedAmount !== null;
                return (
                  <li key={p.memberId} className="flex items-center gap-3">
                    <Checkbox
                      id={`fine-${p.memberId}`}
                      checked={chosen.has(p.memberId)}
                      disabled={disabled}
                      onCheckedChange={(on) => toggle(p.memberId, on === true)}
                    />
                    <Label
                      htmlFor={`fine-${p.memberId}`}
                      className={
                        disabled ? "text-muted-foreground" : "font-normal"
                      }
                    >
                      {p.name}
                    </Label>
                    <span className="ml-auto text-muted-foreground text-xs">
                      {p.finedAmount !== null
                        ? `fikk ${p.finedAmount}`
                        : p.exempt
                          ? "inaktiv – får ikke bot"
                          : !p.linked
                            ? "ikke koblet til TIHLDE"
                            : null}
                    </span>
                  </li>
                );
              })}
            </ul>
            {event?.nonResponders.some((p) => p.exempt) && (
              <p className="text-muted-foreground text-xs">
                Medlemmer i undergruppen «Inaktiv» får ikke fellesbøter.
              </p>
            )}
            {event?.nonResponders.some((p) => !p.linked && !p.exempt) && (
              <p className="text-muted-foreground text-xs">
                Personer uten TIHLDE-kobling kan ikke få bot før de er koblet.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={!amountValid || count === 0 || give.isPending}
            >
              {give.isPending
                ? "Gir bøter…"
                : amountValid && count > 0
                  ? `Gi ${amountNumber} ${amountNumber === 1 ? "bot" : "bøter"} til ${count} ${count === 1 ? "person" : "personer"}`
                  : "Gi bøter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
