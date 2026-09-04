import { query, input, s, c, ref, inp, col, expr, obj } from "@xanots/sdk";
import { resolveApi } from "./groups.js";
import { serviceGuard } from "./_guards.js";
import { staff } from "../tables/staff.js";
import { clients } from "../tables/clients.js";
import { tiers } from "../tables/tiers.js";
import { entitlements } from "../tables/entitlements.js";
import { feeSchedules } from "../tables/fee-schedules.js";
import { feeRules } from "../tables/fee-rules.js";
import { resolutions } from "../tables/resolutions.js";

// One entitlement grant, as stored.
type EntitlementRow = {
  id: number;
  tier_id: number;
  feature_key: string;
  allowed: boolean;
  limit_value: number | null;
  created_at: number;
};

export type ResolveResult = {
  client: { id: number; name: string; segment: string; status: string };
  tier: { id: number; code: string; name: string; rank: number };
  entitlements: EntitlementRow[];
  fee: {
    product: string;
    basis: "bps" | "flat";
    rate: number;
    min_fee: number | null;
    applied_min_fee: number | null;
  };
  fee_schedule_version: number;
  firing_rule_id: number;
  resolution_id: number;
  resolved_at: number;
};

// The one governed decision. Every client-facing app calls THIS instead of
// re-encoding the entitlement and pricing rules: it resolves the client, refuses
// a suspended one, reads the tier, gathers the tier's entitlements, selects the
// fee rule from the currently published schedule for (tier, product), applies
// the min-fee floor for a bps rate, and writes one immutable audit row capturing
// the firing rule id + schedule version. The answer names the exact rule and
// version that produced it.
export const resolveEntitlementsAndFeeQuery = query({
  name: "entitlements-and-fee",
  verb: "POST",
  apiGroup: resolveApi,
  auth: staff,
  input: {
    client_id: input.int({ required: true }),
    product: input.text({ required: true, methods: ["trim", "lower"] }),
  },
  stack: [
    ...serviceGuard(),

    // Resolve the client (field-match get binds null on no row, no id>=1 throw).
    s.db.get({ table: clients, fieldName: "id", fieldValue: inp("client_id"), as: "client" }),
    s.precondition({
      expr: expr(ref("client", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("No client found with that id."),
    }),
    s.precondition({
      expr: expr(ref("client.status"), "!=", c.text("suspended")),
      error_type: "badrequest",
      error: c.text("Client is suspended; entitlements and fees are not resolved for a suspended client."),
    }),

    // The client's tier.
    s.db.get({ table: tiers, fieldName: "id", fieldValue: ref("client.tier_id"), as: "tier" }),
    s.precondition({
      expr: expr(ref("tier", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("The client's tier is missing."),
    }),

    // What this tier grants.
    s.db.query({
      table: entitlements,
      where: [expr(col("tier_id"), "=", ref("client.tier_id"))],
      sort: [{ sortBy: "feature_key", dir: "asc" }],
      as: "entitlements",
    }),

    // The one schedule in effect, and the fee line for (tier, product) in it.
    s.db.query({
      table: feeSchedules,
      where: [expr(col("status"), "=", c.text("published"))],
      returnType: "single",
      as: "schedule",
    }),
    s.precondition({
      expr: expr(ref("schedule", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("No published fee schedule is in effect."),
    }),
    s.db.query({
      table: feeRules,
      where: [
        expr(col("fee_schedule_id"), "=", ref("schedule.id")),
        expr(col("tier_id"), "=", ref("client.tier_id")),
        expr(col("product"), "=", inp("product")),
      ],
      returnType: "single",
      as: "rule",
    }),
    s.precondition({
      expr: expr(ref("rule", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("No fee rule for this tier and product in the published schedule."),
    }),

    // Apply the min-fee floor: it governs a bps rate; a flat fee carries no
    // floor, so it stays null.
    s.set_var("applied_min_fee", c.null()),
    s.conditional({
      when: expr(ref("rule.basis"), "=", c.text("bps")),
      then: [s.update_var("applied_min_fee", ref("rule.min_fee", { safe: true }))],
    }),

    // The immutable audit trail: inputs + the exact rule + schedule version.
    s.db.add({
      table: resolutions,
      row: {
        client_id: ref("client.id"),
        product: inp("product"),
        tier_code: ref("tier.code"),
        entitlements_snapshot: ref("entitlements"),
        fee_basis: ref("rule.basis"),
        fee_rate: ref("rule.rate"),
        fee_min_fee: ref("rule.min_fee", { safe: true }),
        applied_min_fee: ref("applied_min_fee"),
        fee_schedule_version: ref("schedule.version"),
        firing_rule_id: ref("rule.id"),
        resolved_at: c.now(),
      },
      as: "resolution",
    }),
  ],
  response: {
    client: obj({
      id: ref("client.id"),
      name: ref("client.name"),
      segment: ref("client.segment"),
      status: ref("client.status"),
    }),
    tier: obj({
      id: ref("tier.id"),
      code: ref("tier.code"),
      name: ref("tier.name"),
      rank: ref("tier.rank"),
    }),
    entitlements: ref("entitlements"),
    fee: obj({
      product: inp("product"),
      basis: ref("rule.basis"),
      rate: ref("rule.rate"),
      min_fee: ref("rule.min_fee", { safe: true }),
      applied_min_fee: ref("applied_min_fee"),
    }),
    fee_schedule_version: ref("schedule.version"),
    firing_rule_id: ref("rule.id"),
    resolution_id: ref("resolution.id"),
    resolved_at: ref("resolution.resolved_at"),
  },
  responseShape: null as unknown as ResolveResult,
});
