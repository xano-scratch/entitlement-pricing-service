import { query, s, ref } from "@xanots/sdk";
import { resolveApi } from "./groups.js";
import { serviceGuard } from "./_guards.js";
import { staff } from "../tables/staff.js";
import { tiers } from "../tables/tiers.js";

// The tier list, ranked. Service-guarded. Used by the resolve picker and the
// admin fee-rule editor.
export const tiersQuery = query({
  name: "tiers",
  verb: "GET",
  apiGroup: resolveApi,
  auth: staff,
  stack: [
    ...serviceGuard(),
    s.db.query({ table: tiers, sort: [{ sortBy: "rank", dir: "asc" }], as: "rows" }),
  ],
  response: ref("rows"),
});
