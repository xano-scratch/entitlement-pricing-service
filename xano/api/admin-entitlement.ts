import { query, input, s, c, ref, inp, col, expr } from "@xanots/sdk";
import { adminApi } from "./groups.js";
import { adminGuard } from "./_guards.js";
import { staff } from "../tables/staff.js";
import { entitlements } from "../tables/entitlements.js";

// Upsert a tier entitlement (allowed, limit_value). Keyed on (tier, feature).
// Entitlements are not versioned like fees, so a change takes effect on the next
// resolve; a past resolution keeps its frozen snapshot. pricing-admin only.
export const upsertEntitlementQuery = query({
  name: "entitlement",
  verb: "POST",
  apiGroup: adminApi,
  auth: staff,
  input: {
    tier_id: input.int({ required: true }),
    feature_key: input.text({ required: true, methods: ["trim", "lower"] }),
    allowed: input.bool({ required: true }),
    limit_value: input.int({ required: false }),
  },
  stack: [
    ...adminGuard(),
    s.db.query({
      table: entitlements,
      where: [
        expr(col("tier_id"), "=", inp("tier_id")),
        expr(col("feature_key"), "=", inp("feature_key")),
      ],
      returnType: "single",
      as: "existing",
    }),
    s.conditional({
      when: expr(ref("existing", { safe: true }), "!=", c.null()),
      then: [
        s.db.edit({
          table: entitlements,
          fieldName: "id",
          fieldValue: ref("existing.id"),
          row: { allowed: inp("allowed"), limit_value: inp("limit_value") },
          as: "row",
        }),
      ],
      else: [
        s.db.add({
          table: entitlements,
          row: {
            tier_id: inp("tier_id"),
            feature_key: inp("feature_key"),
            allowed: inp("allowed"),
            limit_value: inp("limit_value"),
          },
          as: "row",
        }),
      ],
    }),
  ],
  response: {
    ok: c.bool(true),
    entitlement: ref("row"),
  },
  responseShape: null as unknown as {
    ok: boolean;
    entitlement: {
      id: number;
      created_at: number;
      tier_id: number;
      feature_key: string;
      allowed: boolean;
      limit_value: number | null;
    };
  },
});
