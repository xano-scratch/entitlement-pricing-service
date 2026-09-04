import { query, s, ref } from "@xanots/sdk";
import { resolveApi } from "./groups.js";
import { serviceGuard } from "./_guards.js";
import { staff } from "../tables/staff.js";
import { clients } from "../tables/clients.js";

// The client list, for the resolve picker. Service-guarded. The frontend joins
// each `tier_id` to the tiers list it also loads.
export const clientsQuery = query({
  name: "clients",
  verb: "GET",
  apiGroup: resolveApi,
  auth: staff,
  stack: [
    ...serviceGuard(),
    s.db.query({ table: clients, sort: [{ sortBy: "name", dir: "asc" }], as: "rows" }),
  ],
  response: ref("rows"),
});
