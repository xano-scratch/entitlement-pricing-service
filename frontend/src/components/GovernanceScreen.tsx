import { useState } from "react";
import { ShieldCheck, UserCog } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ErrorNote, InfoNote } from "@/components/bits";
import { titleCase } from "@/lib/format";
import { probeAdminGate, type Role } from "@/lib/api";

type Probe = { anonymous: number; app_service: number; pricing_admin: number };

const EXPECTED: Record<keyof Probe, { role: string; expect: string }> = {
  anonymous: { role: "No token", expect: "401 Unauthorized" },
  app_service: { role: "app-service", expect: "403 Forbidden" },
  pricing_admin: { role: "pricing-admin", expect: "200 OK" },
};

export function GovernanceScreen({
  role,
  onSwitchRole,
}: {
  role: Role;
  onSwitchRole: (role: Role) => void;
}) {
  const [probe, setProbe] = useState<Probe | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runProbe = async () => {
    setBusy(true);
    setError(null);
    try {
      setProbe(await probeAdminGate());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Probe failed.");
    } finally {
      setBusy(false);
    }
  };

  const statusTone = (code: number): string =>
    code === 200 ? "text-emerald-400" : code === 403 ? "text-amber-400" : "text-rose-400";

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCog className="size-4" /> Active role
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-muted-foreground text-sm">
            The app holds a bearer token for the selected role and sends it on every call. The role is
            read fresh from the staff table on the server for each request, so switching here changes
            what the same screens are allowed to do.
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant={role === "app-service" ? "default" : "outline"}
              onClick={() => onSwitchRole("app-service")}
            >
              app-service
            </Button>
            <Button
              variant={role === "pricing-admin" ? "default" : "outline"}
              onClick={() => onSwitchRole("pricing-admin")}
            >
              pricing-admin
            </Button>
            <Badge variant="outline" className="ml-2">
              Now: {titleCase(role)}
            </Badge>
          </div>
          <InfoNote>
            app-service may call the read-only resolve surface but is refused every admin endpoint.
            pricing-admin may manage schedules and entitlements.
          </InfoNote>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4" /> RBAC proof
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-muted-foreground text-sm">
            Call one admin endpoint under three identities and read the HTTP status each gets. This is
            authorization at the API layer, not row-level security.
          </p>
          <div>
            <Button onClick={runProbe} disabled={busy}>
              {busy ? "Checking…" : "Run RBAC check"}
            </Button>
          </div>
          {error && <ErrorNote>{error}</ErrorNote>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Identity</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead className="text-right">Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(Object.keys(EXPECTED) as (keyof Probe)[]).map((k) => (
                <TableRow key={k}>
                  <TableCell>{EXPECTED[k].role}</TableCell>
                  <TableCell className="text-muted-foreground">{EXPECTED[k].expect}</TableCell>
                  <TableCell className={`text-right font-medium ${probe ? statusTone(probe[k]) : ""}`}>
                    {probe ? probe[k] : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
