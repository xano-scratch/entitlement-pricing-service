import { table, f } from "@xanots/sdk";
import { feeSchedules } from "./fee-schedules.js";
import { tiers } from "./tiers.js";
import { FEE_RULES } from "../seed-data.js";

// The per-tier, per-product fee line, belonging to one schedule version. `basis`
// is `bps` (rate in basis points, floored by `min_fee`) or `flat` (a fixed
// amount, no floor). The unique index keeps one rule per (schedule, tier,
// product).
export const feeRules = table({
  name: "fee_rules",
  schema: {
    fee_schedule_id: f.tableRef(feeSchedules, { required: true }),
    tier_id: f.tableRef(tiers, { required: true }),
    product: f.text({ required: true }),
    basis: f.enum(["bps", "flat"], { required: true }),
    rate: f.decimal({ required: true }),
    min_fee: f.decimal({ nullable: true }),
  },
  index: [
    {
      type: "unique",
      fields: [{ name: "fee_schedule_id" }, { name: "tier_id" }, { name: "product" }],
    },
  ],
  seed: [...FEE_RULES],
});
