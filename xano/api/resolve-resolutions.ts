import { query, s, ref } from "@xanots/sdk";
import { resolveApi } from "./groups.js";
import { serviceGuard } from "./_guards.js";
import { staff } from "../tables/staff.js";
import { resolutions } from "../tables/resolutions.js";

// The audit log: every resolve, newest first. Each row is the frozen snapshot
// of one decision. Service-guarded.
export const resolutionsQuery = query({
  name: "resolutions",
  verb: "GET",
  apiGroup: resolveApi,
  auth: staff,
  stack: [
    ...serviceGuard(),
    s.db.query({
      table: resolutions,
      sort: [{ sortBy: "created_at", dir: "desc" }],
      as: "rows",
    }),
  ],
  response: ref("rows"),
});
