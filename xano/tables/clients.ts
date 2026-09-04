import { table, f } from "@xanots/sdk";
import { tiers } from "./tiers.js";
import { CLIENTS } from "../seed-data.js";

// A wealth client. Each belongs to one tier (which drives entitlements and
// pricing) and carries a status: a `suspended` client is refused at resolve
// time, at the API layer.
export const clients = table({
  name: "clients",
  schema: {
    name: f.text({ required: true }),
    tier_id: f.tableRef(tiers, { required: true }),
    segment: f.enum(["retail", "affluent", "institutional"], { required: true }),
    status: f.enum(["active", "suspended"], { required: true }),
  },
  seed: [...CLIENTS],
});
