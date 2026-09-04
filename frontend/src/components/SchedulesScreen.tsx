import { useCallback, useEffect, useState } from "react";
import { GitBranchPlus, Send, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ErrorNote, GrantBadge, InfoNote, ScheduleStatusBadge } from "@/components/bits";
import { titleCase, formatRate, formatDay } from "@/lib/format";
import {
  getFeeSchedules,
  getFeeRules,
  createDraft,
  publishSchedule,
  upsertFeeRule,
  upsertEntitlement,
  getTierGrants,
  PRODUCTS,
  type FeeSchedule,
  type FeeRule,
  type TierGrants,
  type TierRow,
  type FeeRuleInput,
  type EntitlementInput,
} from "@/lib/api";

const FEATURES = ["advisory_access", "tax_reporting", "api_trading", "linked_accounts"] as const;

export function SchedulesScreen({
  isAdmin,
  tiers,
  onChanged,
}: {
  isAdmin: boolean;
  tiers: TierRow[];
  onChanged: () => void;
}) {
  const [schedules, setSchedules] = useState<FeeSchedule[]>([]);
  const [selId, setSelId] = useState<string>("");
  const [rules, setRules] = useState<FeeRule[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Fee-rule edit form.
  const [rTier, setRTier] = useState("");
  const [rProduct, setRProduct] = useState<string>("managed_portfolio");
  const [rBasis, setRBasis] = useState<"bps" | "flat">("bps");
  const [rRate, setRRate] = useState("");
  const [rMinFee, setRMinFee] = useState("");

  // Entitlement edit form.
  const [eTier, setETier] = useState("");
  const [eFeature, setEFeature] = useState<string>("advisory_access");
  const [eAllowed, setEAllowed] = useState<"true" | "false">("true");
  const [eLimit, setELimit] = useState("");
  const [grants, setGrants] = useState<TierGrants | null>(null);

  const selSchedule = schedules.find((s) => String(s.id) === selId) ?? null;
  const isDraft = selSchedule?.status === "draft";

  const reloadSchedules = useCallback(async (selectId?: number) => {
    const rows = await getFeeSchedules();
    setSchedules(rows);
    const pick = selectId ?? (rows.find((s) => s.status === "published")?.id ?? rows[0]?.id);
    if (pick != null) {
      setSelId(String(pick));
      setRules(await getFeeRules(pick));
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    setError(null);
    reloadSchedules().catch((e) => setError(e instanceof Error ? e.message : "Failed to load schedules."));
  }, [isAdmin, reloadSchedules]);

  const selectSchedule = async (id: string) => {
    setSelId(id);
    setMessage(null);
    try {
      setRules(await getFeeRules(Number(id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load rules.");
    }
  };

  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      setMessage(await fn());
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const newDraft = () =>
    run(async () => {
      const res = await createDraft(notes);
      setNotes("");
      await reloadSchedules(res.schedule_id);
      return `Draft v${res.version} created (${res.cloned_rules} rules cloned from the published schedule).`;
    });

  const publish = () =>
    run(async () => {
      const res = await publishSchedule(Number(selId));
      await reloadSchedules(Number(selId));
      const archived = res.archived_version == null ? "" : `, archived v${res.archived_version}`;
      return `Published v${res.published_version}${archived}. Re-resolve a client to see the new fee.`;
    });

  const saveRule = () =>
    run(async () => {
      const body: FeeRuleInput = {
        fee_schedule_id: Number(selId),
        tier_id: Number(rTier),
        product: rProduct,
        basis: rBasis,
        rate: Number(rRate),
      };
      if (rMinFee !== "") body.min_fee = Number(rMinFee);
      await upsertFeeRule(body);
      setRules(await getFeeRules(Number(selId)));
      return `Saved the ${titleCase(rProduct)} rule for ${tierName(Number(rTier))}.`;
    });

  const loadGrants = async (tierId: string) => {
    setETier(tierId);
    const code = tiers.find((t) => String(t.id) === tierId)?.code;
    if (!code) return;
    try {
      setGrants(await getTierGrants(code));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load grants.");
    }
  };

  const saveEntitlement = () =>
    run(async () => {
      const body: EntitlementInput = {
        tier_id: Number(eTier),
        feature_key: eFeature,
        allowed: eAllowed === "true",
      };
      if (eLimit !== "") body.limit_value = Number(eLimit);
      await upsertEntitlement(body);
      const code = tiers.find((t) => String(t.id) === eTier)?.code;
      if (code) setGrants(await getTierGrants(code));
      return `Saved ${titleCase(eFeature)} for ${tierName(Number(eTier))}.`;
    });

  const tierName = (id: number): string => tiers.find((t) => t.id === id)?.name ?? String(id);

  const fillRuleForm = (r: FeeRule) => {
    setRTier(String(r.tier_id));
    setRProduct(r.product);
    setRBasis(r.basis);
    setRRate(String(r.rate));
    setRMinFee(r.min_fee == null ? "" : String(r.min_fee));
  };

  if (!isAdmin) {
    return (
      <InfoNote>
        Managing fee schedules and entitlements requires the pricing-admin role. Switch role on the
        Governance tab, then return here.
      </InfoNote>
    );
  }

  return (
    <div className="grid gap-6">
      {error && <ErrorNote>{error}</ErrorNote>}
      {message && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {message}
        </div>
      )}

      {/* Versions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Fee schedule versions</CardTitle>
          <div className="flex items-center gap-2">
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="New draft notes (optional)"
              className="w-56"
            />
            <Button variant="outline" onClick={newDraft} disabled={busy}>
              <GitBranchPlus className="size-4" /> New draft
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Effective from</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((s) => (
                <TableRow
                  key={s.id}
                  className={String(s.id) === selId ? "bg-muted/50" : "cursor-pointer"}
                  onClick={() => void selectSchedule(String(s.id))}
                >
                  <TableCell className="font-medium">v{s.version}</TableCell>
                  <TableCell>
                    <ScheduleStatusBadge status={s.status} />
                  </TableCell>
                  <TableCell>{formatDay(s.effective_from)}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[220px] truncate">
                    {s.notes || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {s.status === "draft" && (
                      <Button
                        size="sm"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setSelId(String(s.id));
                          void publish();
                        }}
                        disabled={busy}
                      >
                        <Send className="size-3.5" /> Publish
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Rules of the selected version */}
      {selSchedule && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Fee rules — v{selSchedule.version} <ScheduleStatusBadge status={selSchedule.status} />
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tier</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Basis</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Min fee</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((r) => (
                  <TableRow
                    key={r.id}
                    className={isDraft ? "cursor-pointer" : ""}
                    onClick={() => isDraft && fillRuleForm(r)}
                  >
                    <TableCell>{tierName(r.tier_id)}</TableCell>
                    <TableCell>{titleCase(r.product)}</TableCell>
                    <TableCell>{titleCase(r.basis)}</TableCell>
                    <TableCell className="text-right">{formatRate(r.basis, r.rate)}</TableCell>
                    <TableCell className="text-right">{r.min_fee == null ? "—" : r.min_fee}</TableCell>
                  </TableRow>
                ))}
                {rules.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground text-center">
                      No rules in this version yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {isDraft ? (
              <div>
                <Separator className="mb-4" />
                <div className="mb-3 text-sm font-medium">Add or edit a rule (click a row to prefill)</div>
                <div className="flex flex-wrap items-end gap-3">
                  <Field label="Tier">
                    <Select value={rTier} onValueChange={setRTier}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Tier" />
                      </SelectTrigger>
                      <SelectContent>
                        {tiers.map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Product">
                    <Select value={rProduct} onValueChange={setRProduct}>
                      <SelectTrigger className="w-44">
                        <SelectValue placeholder="Product" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCTS.map((p) => (
                          <SelectItem key={p} value={p}>
                            {titleCase(p)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Basis">
                    <Select value={rBasis} onValueChange={(v) => setRBasis(v as "bps" | "flat")}>
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bps">Bps</SelectItem>
                        <SelectItem value="flat">Flat</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Rate">
                    <Input
                      type="number"
                      value={rRate}
                      onChange={(e) => setRRate(e.target.value)}
                      className="w-24"
                    />
                  </Field>
                  <Field label="Min fee">
                    <Input
                      type="number"
                      value={rMinFee}
                      onChange={(e) => setRMinFee(e.target.value)}
                      placeholder="none"
                      className="w-24"
                    />
                  </Field>
                  <Button onClick={saveRule} disabled={busy || !rTier || rRate === ""}>
                    <Save className="size-4" /> Save rule
                  </Button>
                </div>
              </div>
            ) : (
              <InfoNote>
                This version is {selSchedule.status}. Rules are immutable once published; create a new
                draft to change prices.
              </InfoNote>
            )}
          </CardContent>
        </Card>
      )}

      {/* Entitlements editor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tier entitlements</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Tier">
              <Select value={eTier} onValueChange={(v) => void loadGrants(v)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select a tier" />
                </SelectTrigger>
                <SelectContent>
                  {tiers.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Feature">
              <Select value={eFeature} onValueChange={setEFeature}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEATURES.map((f) => (
                    <SelectItem key={f} value={f}>
                      {titleCase(f)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Allowed">
              <Select value={eAllowed} onValueChange={(v) => setEAllowed(v as "true" | "false")}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Allowed</SelectItem>
                  <SelectItem value="false">Denied</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Limit">
              <Input
                type="number"
                value={eLimit}
                onChange={(e) => setELimit(e.target.value)}
                placeholder="none"
                className="w-24"
              />
            </Field>
            <Button onClick={saveEntitlement} disabled={busy || !eTier}>
              <Save className="size-4" /> Save grant
            </Button>
          </div>

          {grants && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feature</TableHead>
                  <TableHead className="text-right">Grant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grants.entitlements.map((e) => (
                  <TableRow key={e.feature_key}>
                    <TableCell>{titleCase(e.feature_key)}</TableCell>
                    <TableCell className="text-right">
                      <GrantBadge allowed={e.allowed} limit={e.limit_value} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-muted-foreground text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}
