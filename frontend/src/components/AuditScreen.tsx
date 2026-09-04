import { useCallback, useEffect, useState } from "react";
import { ScrollText } from "lucide-react";

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
import { ErrorNote, GrantBadge, InfoNote, Stat } from "@/components/bits";
import { titleCase, formatRate, formatDate } from "@/lib/format";
import { getResolutions, getResolution, type AuditRow, type ResolutionDetail } from "@/lib/api";

export function AuditScreen({ reloadSignal }: { reloadSignal: number }) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [detail, setDetail] = useState<ResolutionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setRows(await getResolutions());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load the audit log.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, reloadSignal]);

  const open = async (id: number) => {
    try {
      setDetail(await getResolution(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load the resolution.");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-base">Resolution audit log</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <ErrorNote>{error}</ErrorNote>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Fee</TableHead>
                <TableHead className="text-right">Ver</TableHead>
                <TableHead className="text-right">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow
                  key={r.id}
                  className={detail?.resolution.id === r.id ? "bg-muted/50" : "cursor-pointer"}
                  onClick={() => void open(r.id)}
                >
                  <TableCell className="font-medium">{r.id}</TableCell>
                  <TableCell>#{r.client_id}</TableCell>
                  <TableCell>{titleCase(r.product)}</TableCell>
                  <TableCell>{titleCase(r.tier_code)}</TableCell>
                  <TableCell className="text-right">{formatRate(r.fee_basis, r.fee_rate)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">v{r.fee_schedule_version}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right text-xs">
                    {formatDate(r.resolved_at)}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground text-center">
                    No resolutions yet. Resolve a client to record one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Frozen snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          {!detail ? (
            <InfoNote>Select a resolution to see the exact answer that was recorded.</InfoNote>
          ) : (
            <div className="grid gap-4">
              <div className="flex items-center gap-2">
                <ScrollText className="text-primary size-5" />
                <div className="font-medium">Resolution #{detail.resolution.id}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Stat label="Product">{titleCase(detail.resolution.product)}</Stat>
                <Stat label="Tier">{titleCase(detail.resolution.tier_code)}</Stat>
                <Stat label="Fee">
                  {formatRate(detail.resolution.fee_basis, detail.resolution.fee_rate)}
                </Stat>
                <Stat label="Schedule version">v{detail.resolution.fee_schedule_version}</Stat>
                <Stat label="Firing rule id">#{detail.resolution.firing_rule_id}</Stat>
                <Stat label="Resolved at">{formatDate(detail.resolution.resolved_at)}</Stat>
              </div>
              <div>
                <div className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
                  Entitlements at resolve time
                </div>
                <Table>
                  <TableBody>
                    {detail.resolution.entitlements_snapshot.map((e) => (
                      <TableRow key={e.feature_key}>
                        <TableCell>{titleCase(e.feature_key)}</TableCell>
                        <TableCell className="text-right">
                          <GrantBadge allowed={e.allowed} limit={e.limit_value} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {detail.firing_rule.id == null && (
                <InfoNote>The firing rule was since removed; the snapshot above still stands.</InfoNote>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
