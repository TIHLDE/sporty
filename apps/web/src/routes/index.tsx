import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { useTRPC } from "@/utils/trpc";
import { authClient } from "@/lib/auth-client";
import { Button } from "@sporty/ui/components/button";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  const trpc = useTRPC();
  const healthCheck = useQuery(trpc.healthCheck.queryOptions());
  const oauthMutation = useMutation({
    mutationFn: async () => {
      const result = await authClient.signIn.social({
        provider: "photon",
        // callbackURL: redirectTo || '/meetings',
      });
      if (result.error) {
        throw new Error(result.error.message ?? "Inlogging med TIHLDE feilet");
      }
    },
  });
  return (
    <div className="container mx-auto max-w-3xl px-4 py-2">
      <div className="grid gap-6">
        <Button
          type="button"
          className="w-full"
          disabled={oauthMutation.isPending}
          onClick={() => oauthMutation.mutate()}
        >
          {oauthMutation.isPending
            ? "Sender deg til tihlde.org..."
            : "Logg inn med TIHLDE"}
        </Button>
        <section className="rounded-lg border p-4">
          <h2 className="mb-2 font-medium">API Status</h2>
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${healthCheck.data ? "bg-green-500" : "bg-red-500"}`}
            />
            <span className="text-muted-foreground text-sm">
              {healthCheck.isLoading
                ? "Checking..."
                : healthCheck.data
                  ? "Connected"
                  : "Disconnected"}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
