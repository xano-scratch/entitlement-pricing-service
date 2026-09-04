import { query, s, ref } from "@xanots/sdk";
import { adminApi } from "./groups.js";
import { adminGuard } from "./_guards.js";
import { staff } from "../tables/staff.js";
import { feeSchedules } from "../tables/fee-schedules.js";

// List every fee schedule version with its status, newest version first.
// pricing-admin only.
export const feeSchedulesQuery = query({
  name: "fee-schedules",
  verb: "GET",
  apiGroup: adminApi,
  auth: staff,
  stack: [
    ...adminGuard(),
    s.db.query({ table: feeSchedules, sort: [{ sortBy: "version", dir: "desc" }], as: "rows" }),
  ],
  response: ref("rows"),
});
