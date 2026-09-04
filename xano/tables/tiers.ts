import { table, f } from "@xanots/sdk";
import { TIERS } from "../seed-data.js";

// The service tiers a client can hold. `rank` orders them (bronze < platinum).
// A tier's `code` is the stable key the rest of the service resolves against.
export const tiers = table({
  name: "tiers",
  schema: {
    code: f.text({ required: true }),
    name: f.text({ required: true }),
    rank: f.int({ required: true }),
  },
  index: [{ type: "unique", fields: [{ name: "code" }] }],
  seed: [...TIERS],
});
