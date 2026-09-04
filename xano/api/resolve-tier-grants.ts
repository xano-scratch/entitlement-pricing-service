import { query, input, s, c, ref, inp, col, expr, obj } from "@xanots/sdk";
import { resolveApi } from "./groups.js";
import { serviceGuard } from "./_guards.js";
import { staff } from "../tables/staff.js";
import { tiers } from "../tables/tiers.js";
import { entitlements } from "../tables/entitlements.js";

// What a tier grants: its entitlement rows. Read-only, service-guarded. The
// same grants the resolve decision reads, exposed for inspection.
export const tierGrantsQuery = query({
  name: "tier-grants/{tier_code}",
  verb: "GET",
  apiGroup: resolveApi,
  auth: staff,
  input: {
    tier_code: input.text({ required: true, methods: ["trim", "lower"] }),
  },
  stack: [
    ...serviceGuard(),
    s.db.get({ table: tiers, fieldName: "code", fieldValue: inp("tier_code"), as: "tier" }),
    s.precondition({
      expr: expr(ref("tier", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("No tier found with that code."),
    }),
    s.db.query({
      table: entitlements,
      where: [expr(col("tier_id"), "=", ref("tier.id"))],
      sort: [{ sortBy: "feature_key", dir: "asc" }],
      as: "grants",
    }),
  ],
  response: {
    tier: obj({ id: ref("tier.id"), code: ref("tier.code"), name: ref("tier.name"), rank: ref("tier.rank") }),
    entitlements: ref("grants"),
  },
  responseShape: null as unknown as {
    tier: { id: number; code: string; name: string; rank: number };
    entitlements: Array<{
      id: number;
      tier_id: number;
      feature_key: string;
      allowed: boolean;
      limit_value: number | null;
      created_at: number;
    }>;
  },
});
