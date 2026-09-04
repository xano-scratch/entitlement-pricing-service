import { workspace } from "@xanots/sdk";

// Tables
import { tiers } from "./tables/tiers.js";
import { clients } from "./tables/clients.js";
import { entitlements } from "./tables/entitlements.js";
import { feeSchedules } from "./tables/fee-schedules.js";
import { feeRules } from "./tables/fee-rules.js";
import { resolutions } from "./tables/resolutions.js";
import { staff } from "./tables/staff.js";

// API groups
import { resolveApi, adminApi, authApi } from "./api/groups.js";

// Resolve surface (read-only service)
import { resolveEntitlementsAndFeeQuery } from "./api/resolve-entitlements-and-fee.js";
import { tierGrantsQuery } from "./api/resolve-tier-grants.js";
import { resolutionQuery } from "./api/resolve-resolution.js";
import { resolutionsQuery } from "./api/resolve-resolutions.js";
import { clientsQuery } from "./api/resolve-clients.js";
import { tiersQuery } from "./api/resolve-tiers.js";
import { seedQuery } from "./api/resolve-seed.js";

// Admin surface (pricing-admin only)
import { feeSchedulesQuery } from "./api/admin-fee-schedules.js";
import { feeRulesQuery } from "./api/admin-fee-rules.js";
import { createFeeScheduleQuery } from "./api/admin-fee-schedule.js";
import { publishFeeScheduleQuery } from "./api/admin-fee-schedule-publish.js";
import { upsertFeeRuleQuery } from "./api/admin-fee-rule.js";
import { upsertEntitlementQuery } from "./api/admin-entitlement.js";

// Auth
import { loginQuery } from "./api/auth-login.js";

/**
 * Entitlement & Pricing Service.
 *
 * One governed service every client-facing app calls to answer two coupled
 * questions in one place: what can this client tier access, and what fee
 * applies. Both are resolved from a single versioned rule set, and every answer
 * records the exact tier rule and fee schedule version that produced it, so
 * access and pricing are defined once and audited instead of copied into each
 * app. Access is controlled at the API layer by role, not row-level security.
 */
export default workspace("entitlement-pricing-service")
  .registerTables([tiers, clients, entitlements, feeSchedules, feeRules, resolutions, staff])
  .registerApiGroups([resolveApi, adminApi, authApi])
  .registerQueries([
    resolveEntitlementsAndFeeQuery,
    tierGrantsQuery,
    resolutionQuery,
    resolutionsQuery,
    clientsQuery,
    tiersQuery,
    seedQuery,
    feeSchedulesQuery,
    feeRulesQuery,
    createFeeScheduleQuery,
    publishFeeScheduleQuery,
    upsertFeeRuleQuery,
    upsertEntitlementQuery,
    loginQuery,
  ]);
