import { table, f } from "@xanots/sdk";
import { clients } from "./clients.js";

// The immutable audit record of one resolve. It snapshots the inputs AND the
// exact answer: the entitlements at that moment (as json), the fee basis/rate,
// the floor that was applied, and the firing rule id + schedule version that
// produced it. A later edit to a rule or entitlement never changes a past row,
// so a resolution stays explainable by the schedule version that made it.
export const resolutions = table({
  name: "resolutions",
  schema: {
    client_id: f.tableRef(clients, { required: true }),
    product: f.text({ required: true }),
    tier_code: f.text({ required: true }),
    entitlements_snapshot: f.json(),
    fee_basis: f.text({ required: true }),
    fee_rate: f.decimal({ required: true }),
    fee_min_fee: f.decimal({ nullable: true }),
    applied_min_fee: f.decimal({ nullable: true }),
    fee_schedule_version: f.int({ required: true }),
    firing_rule_id: f.int({ required: true }),
    resolved_at: f.timestamp({ required: true }),
  },
});
