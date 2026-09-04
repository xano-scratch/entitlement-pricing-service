import { useCallback, useEffect, useState } from "react";
import { Scale } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ResolveScreen } from "@/components/ResolveScreen";
import { SchedulesScreen } from "@/components/SchedulesScreen";
import { AuditScreen } from "@/components/AuditScreen";
import { GovernanceScreen } from "@/components/GovernanceScreen";
import { ErrorNote } from "@/components/bits";
import { titleCase } from "@/lib/format";
import {
  seed,
  getClients,
  getTiers,
  setToken,
  type ClientRow,
  type Role,
  type TierRow,
} from "@/lib/api";

export default function App() {
  const [tokens, setTokens] = useState<Record<Role, string> | null>(null);
  const [role, setRole] = useState<Role>("pricing-admin");
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [tiers, setTiers] = useState<TierRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState("resolve");
  const [auditReload, setAuditReload] = useState(0);

  const isAdmin = role === "pricing-admin";
  const bumpAudit = useCallback(() => setAuditReload((n) => n + 1), []);

  // Bootstrap: the public seed endpoint mints a token for each demo role and
  // guarantees data. Default to pricing-admin so every screen is populated; the
  // Governance tab switches roles to show RBAC accept and reject.
  useEffect(() => {
    seed()
      .then((s) => {
        const t: Record<Role, string> = {
          "app-service": s.app_service.token,
          "pricing-admin": s.pricing_admin.token,
        };
        setTokens(t);
        setToken(t["pricing-admin"]);
        return Promise.all([getClients(), getTiers()]);
      })
      .then(([c, ti]) => {
        setClients(c);
        setTiers(ti);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Failed to reach the backend."));
  }, []);

  const switchRole = useCallback(
    (r: Role) => {
      if (!tokens) return;
      setToken(tokens[r]);
      setRole(r);
      bumpAudit();
    },
    [tokens, bumpAudit],
  );

  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="border-border/60 border-b">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
              <Scale className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Entitlement &amp; Pricing Service</h1>
              <p className="text-muted-foreground text-sm">
                One governed service resolves what a client can access and what fee applies, from one
                versioned rule set.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-normal">
              Play 1 · Business Logic Centralization
            </Badge>
            <Badge className="bg-primary/15 text-primary border-transparent">{titleCase(role)}</Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {loadError && (
          <div className="mb-6">
            <ErrorNote>
              Could not reach the backend ({loadError}). If you are running locally, set VITE_XANO_HOST
              in a .env.local file.
            </ErrorNote>
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="resolve">Resolve</TabsTrigger>
            <TabsTrigger value="schedules">Fee schedules</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
            <TabsTrigger value="governance">Governance</TabsTrigger>
          </TabsList>

          <TabsContent value="resolve">
            <ResolveScreen clients={clients} tiers={tiers} onResolved={bumpAudit} />
          </TabsContent>
          <TabsContent value="schedules">
            <SchedulesScreen isAdmin={isAdmin} tiers={tiers} onChanged={bumpAudit} />
          </TabsContent>
          <TabsContent value="audit">
            <AuditScreen reloadSignal={auditReload} />
          </TabsContent>
          <TabsContent value="governance">
            <GovernanceScreen role={role} onSwitchRole={switchRole} />
          </TabsContent>
        </Tabs>

        <footer className="text-muted-foreground mt-12 border-t pt-6 text-xs">
          Built with XanoTS. The entitlement and pricing rules live in one versioned, auditable API
          layer. Access is controlled at the API layer by role, not row-level security. Seeded demo
          data on a throwaway environment.
        </footer>
      </main>
    </div>
  );
}
