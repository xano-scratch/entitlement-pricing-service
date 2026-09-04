import { query, s, c, ref, expr, obj } from "@xanots/sdk";
import { resolveApi } from "./groups.js";
import { staff } from "../tables/staff.js";
import { tiers } from "../tables/tiers.js";
import { clients } from "../tables/clients.js";
import { entitlements } from "../tables/entitlements.js";
import { feeSchedules } from "../tables/fee-schedules.js";
import { feeRules } from "../tables/fee-rules.js";
import {
  TIERS_JSON,
  CLIENTS_JSON,
  ENTITLEMENTS_JSON,
  FEE_SCHEDULES_JSON,
  FEE_RULES_JSON,
} from "../seed-data.js";

// Public bootstrap. A fresh `xanots deploy` already seeds every table, so this
// is idempotent and non-destructive: it reloads the reference tables ONLY if the
// environment came up empty (it never wipes an admin's edits), and always mints
// the two demo tokens so the frontend can call the service as each role
// immediately. The tokens are for a throwaway demo environment; see the README.
export const seedQuery = query({
  name: "seed",
  verb: "GET",
  apiGroup: resolveApi,
  stack: [
    // Reload the reference data only when the environment is empty.
    s.db.query({ table: tiers, returnType: "count", as: "tier_count" }),
    s.conditional({
      when: expr(ref("tier_count"), "=", c.int(0)),
      then: [
        s.db.bulk.add({ table: tiers, items: c.array(TIERS_JSON), allowIdField: true }),
        s.db.bulk.add({ table: clients, items: c.array(CLIENTS_JSON), allowIdField: true }),
        s.db.bulk.add({ table: entitlements, items: c.array(ENTITLEMENTS_JSON), allowIdField: true }),
        s.db.bulk.add({ table: feeSchedules, items: c.array(FEE_SCHEDULES_JSON), allowIdField: true }),
        s.db.bulk.add({ table: feeRules, items: c.array(FEE_RULES_JSON), allowIdField: true }),
      ],
    }),

    // Mint a bearer token for each seeded demo staff account.
    s.db.get({ table: staff, fieldName: "email", fieldValue: c.text("service@demo.test"), output: ["id"], as: "svc" }),
    s.db.get({ table: staff, fieldName: "email", fieldValue: c.text("admin@demo.test"), output: ["id"], as: "adm" }),
    s.security.create_auth_token({ table: staff, id: ref("svc.id"), as: "svc_token" }),
    s.security.create_auth_token({ table: staff, id: ref("adm.id"), as: "adm_token" }),
  ],
  response: {
    ok: c.bool(true),
    app_service: obj({ email: c.text("service@demo.test"), token: ref("svc_token") }),
    pricing_admin: obj({ email: c.text("admin@demo.test"), token: ref("adm_token") }),
  },
  responseShape: null as unknown as {
    ok: boolean;
    app_service: { email: string; token: string };
    pricing_admin: { email: string; token: string };
  },
});
