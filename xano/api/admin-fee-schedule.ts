import { query, input, s, c, ref, inp, col, expr, withFilters, fl } from "@xanots/sdk";
import { adminApi } from "./groups.js";
import { adminGuard } from "./_guards.js";
import { staff } from "../tables/staff.js";
import { feeSchedules } from "../tables/fee-schedules.js";
import { feeRules } from "../tables/fee-rules.js";

// Create a new DRAFT schedule version. The version auto-increments past the
// highest one, and the currently published rules are cloned into the draft so it
// starts from the live prices (an edit then shows a real diff). pricing-admin
// only.
export const createFeeScheduleQuery = query({
  name: "fee-schedule",
  verb: "POST",
  apiGroup: adminApi,
  auth: staff,
  input: {
    notes: input.text({ required: false, default: "" }),
  },
  stack: [
    ...adminGuard(),

    // Next version = highest existing version + 1.
    s.db.query({
      table: feeSchedules,
      sort: [{ sortBy: "version", dir: "desc" }],
      returnType: "single",
      as: "latest",
    }),
    s.set_var("next_version", c.int(1)),
    s.conditional({
      when: expr(ref("latest", { safe: true }), "!=", c.null()),
      then: [s.update_var("next_version", withFilters(ref("latest.version"), fl.add(c.int(1))))],
    }),

    s.db.add({
      table: feeSchedules,
      row: {
        version: ref("next_version"),
        status: "draft",
        effective_from: c.now(),
        notes: inp("notes"),
      },
      as: "schedule",
    }),

    // Clone the currently published rules into the new draft.
    s.db.query({
      table: feeSchedules,
      where: [expr(col("status"), "=", c.text("published"))],
      returnType: "single",
      as: "published",
    }),
    s.set_var("cloned", c.int(0)),
    s.conditional({
      when: expr(ref("published", { safe: true }), "!=", c.null()),
      then: [
        s.db.query({
          table: feeRules,
          where: [expr(col("fee_schedule_id"), "=", ref("published.id"))],
          as: "src_rules",
        }),
        s.foreach({
          list: ref("src_rules"),
          as: "r",
          body: [
            s.db.add({
              table: feeRules,
              row: {
                fee_schedule_id: ref("schedule.id"),
                tier_id: ref("r.tier_id"),
                product: ref("r.product"),
                basis: ref("r.basis"),
                rate: ref("r.rate"),
                min_fee: ref("r.min_fee"),
              },
            }),
          ],
        }),
        s.db.query({
          table: feeRules,
          where: [expr(col("fee_schedule_id"), "=", ref("schedule.id"))],
          returnType: "count",
          as: "cloned_count",
        }),
        s.update_var("cloned", ref("cloned_count")),
      ],
    }),
  ],
  response: {
    ok: c.bool(true),
    schedule_id: ref("schedule.id"),
    version: ref("next_version"),
    status: c.text("draft"),
    cloned_rules: ref("cloned"),
  },
  responseShape: null as unknown as {
    ok: boolean;
    schedule_id: number;
    version: number;
    status: string;
    cloned_rules: number;
  },
});
