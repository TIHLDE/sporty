import { Badge } from "@sporty/ui/components/badge";
import { Button } from "@sporty/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@sporty/ui/components/dialog";
import { Input } from "@sporty/ui/components/input";
import { Label } from "@sporty/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@sporty/ui/components/select";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@sporty/ui/components/sidebar";
import { Textarea } from "@sporty/ui/components/textarea";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CircleQuestionMark } from "lucide-react";
import { useState } from "react";
import type * as React from "react";
import { toast } from "sonner";

import { useTRPC } from "@/utils/trpc";

const reportTypeLabels = {
  BUG: "Feil",
  SUGGESTION: "Forslag",
} as const;

function ReportDialog() {
  const trpc = useTRPC();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"BUG" | "SUGGESTION">("BUG");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const reports = useQuery({
    ...trpc.reports.list.queryOptions(),
    enabled: open,
  });
  const openReports = (reports.data ?? []).filter((r) => r.status === "OPEN");
  // Surface reports that may overlap with what the user is typing.
  const words = title
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 3);
  const existing =
    words.length > 0
      ? openReports.filter((r) =>
          words.some((w) => r.title.toLowerCase().includes(w)),
        )
      : openReports.slice(0, 3);

  const report = useMutation({
    ...trpc.reports.create.mutationOptions(),
    onSuccess: () => {
      toast.success("Takk for tilbakemeldingen!");
      setOpen(false);
      setTitle("");
      setDescription("");
      setType("BUG");
    },
    onError: (error) => toast.error(error.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && description.trim()) {
      report.mutate({
        type,
        title: title.trim(),
        description: description.trim(),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={"w-full"}>
        <SidebarMenuButton>
          <CircleQuestionMark />
          <span> Meld inn... </span>
        </SidebarMenuButton>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className={"text-xl"}>
            Meld inn feil eller idéer
          </DialogTitle>
          <DialogDescription>
            Har du oppdaget en bug, eller har en god idé eller ønsker? Skriv dem
            her! Hold forskjellige innvendinger i separate meldinger.
          </DialogDescription>
        </DialogHeader>
        {existing.length > 0 && (
          <div className="grid gap-1.5 rounded-lg border border-dashed p-3">
            <p className="text-xs font-medium text-muted-foreground">
              Sjekk om dette allerede er meldt inn før du skriver:
            </p>
            <ul className="max-h-32 space-y-1 overflow-y-auto">
              {existing.map((r) => (
                <li key={r.id} className="flex items-center gap-2 text-sm">
                  <Badge
                    variant="outline"
                    className="shrink-0 px-1.5 text-muted-foreground"
                  >
                    {reportTypeLabels[r.type]}
                  </Badge>
                  <span className="line-clamp-1">{r.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="report-type">Type</Label>
            <Select
              value={type}
              onValueChange={(v) => v && setType(v as "BUG" | "SUGGESTION")}
            >
              <SelectTrigger id="report-type" className="w-full">
                <SelectValue>{reportTypeLabels[type]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BUG">{reportTypeLabels.BUG}</SelectItem>
                <SelectItem value="SUGGESTION">
                  {reportTypeLabels.SUGGESTION}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="report-title">Tittel</Label>
            <Input
              id="report-title"
              value={title}
              placeholder="Kort beskrivelse"
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="report-description">Beskrivelse</Label>
            <Textarea
              id="report-description"
              value={description}
              placeholder="Hva skjedde, og hva forventet du? Jo mer detalj, jo enklere er det å finne feilen."
              className="min-h-28"
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Avbryt
            </Button>
            <Button type="submit" disabled={report.isPending}>
              {report.isPending ? "Sender…" : "Send inn"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string;
    url: string;
    icon: React.ReactNode;
    external?: boolean;
  }[];
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  return (
    <>
      <SidebarGroup {...props}>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <ReportDialog />
            </SidebarMenuItem>
            {items.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  render={
                    <a
                      href={item.url}
                      {...(item.external
                        ? { target: "_blank", rel: "noreferrer" }
                        : {})}
                    />
                  }
                >
                  {item.icon}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  );
}
