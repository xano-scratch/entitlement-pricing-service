import { useCallback, useEffect, useRef, useState } from "react";
import { FileCheck2, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ErrorNote, GrantBadge, StatusBadge, Stat } from "@/components/bits";
import { titleCase, formatRate } from "@/lib/format";
import { resolve, PRODUCTS, type ClientRow, type ResolveResult, type TierRow } from "@/lib/api";

export function ResolveScreen({
  clients,
  tiers,
  onResolved,
}: {
  clients: ClientRow[];
  tiers: TierRow[];
  onResolved: () => void;
}) {
  const [clientId, setClientId] = useState<string>("");
  const [product, setProduct] = useState<string>("managed_portfolio");
  const [result, setResult] = useState<ResolveResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const autoTried = useRef(false);

  const tierName = (id: number): string => tiers.find((t) => t.id === id)?.name ?? "—";

  const run = useCallback(async (cid: number, prod: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await resolve({ client_id: cid, product: prod });
      setResult(res);
      onResolved();
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : "Resolve failed.");
    } finally {
      setBusy(false);
    }
  }, [onResolved]);

  // Populate the screen on first load with a seeded client, so a reviewer lands
  // on a governed result rather than an empty form.
  useEffect(() => {
    if (autoTried.current || clients.length === 0) return;
    autoTried.current = true;
    const first = clients.find((c) => c.status === "active") ?? clients[0];
    setClientId(String(first.id));
    void run(first.id, "managed_portfolio");
  }, [clients, run]);

  const onSubmit = () => {
    if (!clientId) return;
    void run(Number(clientId), product);
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resolve entitlements and fee</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <label className="text-muted-foreground text-xs font-medium">Client</label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="w-[260px]">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name} · {tierName(c.tier_id)}
                      {c.status === "suspended" ? " (suspended)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-muted-foreground text-xs font-medium">Product</label>
              <Select value={product} onValueChange={setProduct}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCTS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {titleCase(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={onSubmit} disabled={busy || !clientId}>
              <Play className="size-4" /> {busy ? "Resolving…" : "Resolve"}
            </Button>
          </div>
          {error && (
            <div className="mt-4">
              <ErrorNote>{error}</ErrorNote>
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <>
          {/* The governed result: the exact rule + version that produced it. */}
          <Card className="border-primary/40">
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
                    <FileCheck2 className="size-5" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{result.client.name}</div>
                    <div className="text-muted-foreground text-sm">
                      {titleCase(result.client.segment)} client · {result.tier.name} tier
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={result.client.status} />
                  <Badge className="bg-primary/15 text-primary border-transparent">
                    Fee schedule v{result.fee_schedule_version}
                  </Badge>
                  <Badge variant="outline">Firing rule #{result.firing_rule_id}</Badge>
                </div>
              </div>
              <p className="text-muted-foreground mt-4 text-sm">
                Resolved from the one published rule set. This answer was recorded as resolution #
                {result.resolution_id}; a later edit to a rule or entitlement never changes it.
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Fee */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Applicable fee</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <Stat label="Product">{titleCase(result.fee.product)}</Stat>
                <Stat label="Basis">{titleCase(result.fee.basis)}</Stat>
                <Stat label="Rate">{formatRate(result.fee.basis, result.fee.rate)}</Stat>
                <Stat label="Minimum fee">
                  {result.fee.min_fee == null ? "None" : result.fee.min_fee}
                </Stat>
                <div className="col-span-2">
                  <Stat label="Floor applied">
                    {result.fee.applied_min_fee == null ? (
                      <span className="text-muted-foreground">
                        No floor (a flat fee carries no minimum).
                      </span>
                    ) : (
                      <span>
                        {result.fee.applied_min_fee} minimum floors a bps rate on a small balance.
                      </span>
                    )}
                  </Stat>
                </div>
              </CardContent>
            </Card>

            {/* Entitlements */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Entitlements ({result.tier.name})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Feature</TableHead>
                      <TableHead className="text-right">Grant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.entitlements.map((e) => (
                      <TableRow key={e.feature_key}>
                        <TableCell>{titleCase(e.feature_key)}</TableCell>
                        <TableCell className="text-right">
                          <GrantBadge allowed={e.allowed} limit={e.limit_value} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
