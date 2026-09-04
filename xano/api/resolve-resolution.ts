import { query, input, s, c, ref, inp, expr, obj } from "@xanots/sdk";
import { resolveApi } from "./groups.js";
import { serviceGuard } from "./_guards.js";
import { staff } from "../tables/staff.js";
import { resolutions } from "../tables/resolutions.js";
import { feeRules } from "../tables/fee-rules.js";

// One past resolution, the audit view. Returns the frozen snapshot AND the
// firing rule as it stands now (null if a later edit removed it), so a reviewer
// can see the answer that was recorded and the rule that produced it.
export const resolutionQuery = query({
  name: "resolution/{resolution_id}",
  verb: "GET",
  apiGroup: resolveApi,
  auth: staff,
  input: {
    resolution_id: input.int({ required: true }),
  },
  stack: [
    ...serviceGuard(),
    s.db.get({ table: resolutions, fieldName: "id", fieldValue: inp("resolution_id"), as: "resolution" }),
    s.precondition({
      expr: expr(ref("resolution", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("No resolution found with that id."),
    }),
    // The firing rule as it stands now (field-match binds null if it is gone).
    s.db.get({ table: feeRules, fieldName: "id", fieldValue: ref("resolution.firing_rule_id"), as: "rule" }),
  ],
  response: {
    resolution: ref("resolution"),
    firing_rule: obj({
      id: ref("rule.id", { safe: true }),
      product: ref("rule.product", { safe: true }),
      basis: ref("rule.basis", { safe: true }),
      rate: ref("rule.rate", { safe: true }),
      min_fee: ref("rule.min_fee", { safe: true }),
    }),
  },
  responseShape: null as unknown as {
    resolution: {
      id: number;
      created_at: number;
      client_id: number;
      product: string;
      tier_code: string;
      entitlements_snapshot: Array<{ feature_key: string; allowed: boolean; limit_value: number | null }>;
      fee_basis: string;
      fee_rate: number;
      fee_min_fee: number | null;
      applied_min_fee: number | null;
      fee_schedule_version: number;
      firing_rule_id: number;
      resolved_at: number;
    };
    firing_rule: {
      id: number | null;
      product: string | null;
      basis: string | null;
      rate: number | null;
      min_fee: number | null;
    };
  },
});
