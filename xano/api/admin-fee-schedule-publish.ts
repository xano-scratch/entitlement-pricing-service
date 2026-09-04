import { query, input, s, c, ref, inp, col, expr } from "@xanots/sdk";
import { adminApi } from "./groups.js";
import { adminGuard } from "./_guards.js";
import { staff } from "../tables/staff.js";
import { feeSchedules } from "../tables/fee-schedules.js";

// Publish a draft version. The small state machine: only a draft may be
// published, the currently published schedule (if any) is archived first, and
// the target becomes the one published schedule. This is what makes a re-resolve
// return the new fee with the new version number. pricing-admin only.
export const publishFeeScheduleQuery = query({
  name: "fee-schedule/publish",
  verb: "POST",
  apiGroup: adminApi,
  auth: staff,
  input: {
    fee_schedule_id: input.int({ required: true }),
  },
  stack: [
    ...adminGuard(),
    s.db.get({ table: feeSchedules, fieldName: "id", fieldValue: inp("fee_schedule_id"), as: "target" }),
    s.precondition({
      expr: expr(ref("target", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("No fee schedule found with that id."),
    }),
    s.precondition({
      expr: expr(ref("target.status"), "=", c.text("draft")),
      error_type: "badrequest",
      error: c.text("Only a draft schedule can be published."),
    }),

    // Archive the current published schedule, if there is one.
    s.db.query({
      table: feeSchedules,
      where: [expr(col("status"), "=", c.text("published"))],
      returnType: "single",
      as: "current",
    }),
    s.set_var("archived_version", c.null()),
    s.conditional({
      when: expr(ref("current", { safe: true }), "!=", c.null()),
      then: [
        s.db.edit({ table: feeSchedules, fieldName: "id", fieldValue: ref("current.id"), row: { status: "archived" } }),
        s.update_var("archived_version", ref("current.version")),
      ],
    }),

    // Publish the target.
    s.db.edit({
      table: feeSchedules,
      fieldName: "id",
      fieldValue: inp("fee_schedule_id"),
      row: { status: "published", effective_from: c.now() },
    }),
  ],
  response: {
    ok: c.bool(true),
    published_version: ref("target.version"),
    archived_version: ref("archived_version"),
  },
  responseShape: null as unknown as {
    ok: boolean;
    published_version: number;
    archived_version: number | null;
  },
});
