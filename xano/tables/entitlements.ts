import { table, f } from "@xanots/sdk";
import { tiers } from "./tiers.js";
import { ENTITLEMENTS } from "../seed-data.js";

// What a tier grants. One row per (tier, feature): `allowed` is the on/off
// grant, `limit_value` the cap where a feature is metered (linked accounts) and
// null where it is not. The unique index keeps one grant per (tier, feature).
export const entitlements = table({
  name: "entitlements",
  schema: {
    tier_id: f.tableRef(tiers, { required: true }),
    feature_key: f.text({ required: true }),
    allowed: f.bool({ required: true }),
    limit_value: f.int({ nullable: true }),
  },
  index: [
    { type: "unique", fields: [{ name: "tier_id" }, { name: "feature_key" }] },
  ],
  seed: [...ENTITLEMENTS],
});
