import { query, input, s, ref, inp, col, expr } from "@xanots/sdk";
import { adminApi } from "./groups.js";
import { adminGuard } from "./_guards.js";
import { staff } from "../tables/staff.js";
import { feeRules } from "../tables/fee-rules.js";

// The fee lines under one schedule version, for the editor. pricing-admin only.
export const feeRulesQuery = query({
  name: "fee-rules",
  verb: "GET",
  apiGroup: adminApi,
  auth: staff,
  input: {
    fee_schedule_id: input.int({ required: true }),
  },
  stack: [
    ...adminGuard(),
    s.db.query({
      table: feeRules,
      where: [expr(col("fee_schedule_id"), "=", inp("fee_schedule_id"))],
      sort: [{ sortBy: "tier_id", dir: "asc" }],
      as: "rows",
    }),
  ],
  response: ref("rows"),
});
