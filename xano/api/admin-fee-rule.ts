import { query, input, s, c, ref, inp, col, expr } from "@xanots/sdk";
import { adminApi } from "./groups.js";
import { adminGuard } from "./_guards.js";
import { staff } from "../tables/staff.js";
import { feeSchedules } from "../tables/fee-schedules.js";
import { feeRules } from "../tables/fee-rules.js";

// Upsert a fee line (tier, product) on a DRAFT schedule. Editing a published or
// archived version is refused, so a live price is immutable once published. Keyed
// on (schedule, tier, product) since a fee rule matches on all three.
// pricing-admin only.
export const upsertFeeRuleQuery = query({
  name: "fee-rule",
  verb: "POST",
  apiGroup: adminApi,
  auth: staff,
  input: {
    fee_schedule_id: input.int({ required: true }),
    tier_id: input.int({ required: true }),
    product: input.text({ required: true, methods: ["trim", "lower"] }),
    basis: input.enum(["bps", "flat"], { required: true }),
    rate: input.decimal({ required: true }),
    min_fee: input.decimal({ required: false }),
  },
  stack: [
    ...adminGuard(),
    s.db.get({ table: feeSchedules, fieldName: "id", fieldValue: inp("fee_schedule_id"), as: "schedule" }),
    s.precondition({
      expr: expr(ref("schedule", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("No fee schedule found with that id."),
    }),
    s.precondition({
      expr: expr(ref("schedule.status"), "=", c.text("draft")),
      error_type: "badrequest",
      error: c.text("Fee rules can only be edited on a draft schedule; published and archived versions are immutable."),
    }),

    // Upsert on (schedule, tier, product).
    s.db.query({
      table: feeRules,
      where: [
        expr(col("fee_schedule_id"), "=", inp("fee_schedule_id")),
        expr(col("tier_id"), "=", inp("tier_id")),
        expr(col("product"), "=", inp("product")),
      ],
      returnType: "single",
      as: "existing",
    }),
    s.conditional({
      when: expr(ref("existing", { safe: true }), "!=", c.null()),
      then: [
        s.db.edit({
          table: feeRules,
          fieldName: "id",
          fieldValue: ref("existing.id"),
          row: { basis: inp("basis"), rate: inp("rate"), min_fee: inp("min_fee") },
          as: "rule",
        }),
      ],
      else: [
        s.db.add({
          table: feeRules,
          row: {
            fee_schedule_id: inp("fee_schedule_id"),
            tier_id: inp("tier_id"),
            product: inp("product"),
            basis: inp("basis"),
            rate: inp("rate"),
            min_fee: inp("min_fee"),
          },
          as: "rule",
        }),
      ],
    }),
  ],
  response: {
    ok: c.bool(true),
    rule: ref("rule"),
  },
  responseShape: null as unknown as {
    ok: boolean;
    rule: {
      id: number;
      created_at: number;
      fee_schedule_id: number;
      tier_id: number;
      product: string;
      basis: "bps" | "flat";
      rate: number;
      min_fee: number | null;
    };
  },
});
