import { table, f } from "@xanots/sdk";
import { FEE_SCHEDULES } from "../seed-data.js";

// A versioned container of fee rules. Only one schedule is `published` at a
// time; a new version starts as a `draft` and, on publish, the current
// published one is `archived`. `version` is unique across the service.
export const feeSchedules = table({
  name: "fee_schedules",
  schema: {
    version: f.int({ required: true }),
    status: f.enum(["draft", "published", "archived"], { required: true }),
    effective_from: f.timestamp({ required: true }),
    notes: f.text(),
  },
  index: [{ type: "unique", fields: [{ name: "version" }] }],
  seed: [...FEE_SCHEDULES],
});
