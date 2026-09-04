// Canonical demo data for the Entitlement & Pricing Service.
//
// Authored ONCE here and shared two ways:
//   • each table imports its slice for `table({ seed })`, so a fresh `xanots
//     deploy` ships a browsable environment with no endpoint call needed;
//   • the public `resolve/seed` endpoint reloads the reference tables from the
//     same rows (as plain JSON) when the environment comes up empty, and always
//     mints the two demo tokens so the frontend can call both roles.
//
// `id`s are PINNED so the foreign keys line up deterministically across tables
// (a client's `tier_id`, a fee rule's `fee_schedule_id`). Seeding is the one
// place Xano preserves an explicit `id`. `effective_from` is epoch-ms via a
// fixed `Date.UTC(...)` so the seed is deterministic.
//
// Never put a real secret in seed data. The two staff passwords below are demo
// fixtures for a throwaway environment and are hashed on write by the password
// column, exactly as a signed-up credential would be.

const day = (y: number, m: number, d: number): number => Date.UTC(y, m - 1, d);

// Four service tiers, ranked. A client belongs to exactly one.
export const TIERS = [
  { id: 1, code: "bronze", name: "Bronze", rank: 1 },
  { id: 2, code: "silver", name: "Silver", rank: 2 },
  { id: 3, code: "gold", name: "Gold", rank: 3 },
  { id: 4, code: "platinum", name: "Platinum", rank: 4 },
] as const;

// Wealth clients across segments and tiers. One is suspended, so a resolve
// against it is denied at the API layer.
export const CLIENTS = [
  { id: 1, name: "Harbor Point Trust", tier_id: 3, segment: "institutional", status: "active" },
  { id: 2, name: "Meridian Family Office", tier_id: 4, segment: "institutional", status: "active" },
  { id: 3, name: "Ana Whitfield", tier_id: 2, segment: "affluent", status: "active" },
  { id: 4, name: "Rui Okafor", tier_id: 1, segment: "retail", status: "active" },
  { id: 5, name: "Delacroix Holdings", tier_id: 4, segment: "institutional", status: "suspended" },
  { id: 6, name: "Jun Tanaka", tier_id: 3, segment: "affluent", status: "active" },
] as const;

// What each tier grants. `limit_value` is the cap where a feature is metered
// (linked accounts); null where the feature is simply on or off.
export const ENTITLEMENTS = [
  // Bronze
  { id: 1, tier_id: 1, feature_key: "advisory_access", allowed: false, limit_value: null },
  { id: 2, tier_id: 1, feature_key: "tax_reporting", allowed: false, limit_value: null },
  { id: 3, tier_id: 1, feature_key: "api_trading", allowed: false, limit_value: null },
  { id: 4, tier_id: 1, feature_key: "linked_accounts", allowed: true, limit_value: 2 },
  // Silver
  { id: 5, tier_id: 2, feature_key: "advisory_access", allowed: true, limit_value: null },
  { id: 6, tier_id: 2, feature_key: "tax_reporting", allowed: false, limit_value: null },
  { id: 7, tier_id: 2, feature_key: "api_trading", allowed: false, limit_value: null },
  { id: 8, tier_id: 2, feature_key: "linked_accounts", allowed: true, limit_value: 5 },
  // Gold
  { id: 9, tier_id: 3, feature_key: "advisory_access", allowed: true, limit_value: null },
  { id: 10, tier_id: 3, feature_key: "tax_reporting", allowed: true, limit_value: null },
  { id: 11, tier_id: 3, feature_key: "api_trading", allowed: false, limit_value: null },
  { id: 12, tier_id: 3, feature_key: "linked_accounts", allowed: true, limit_value: 15 },
  // Platinum
  { id: 13, tier_id: 4, feature_key: "advisory_access", allowed: true, limit_value: null },
  { id: 14, tier_id: 4, feature_key: "tax_reporting", allowed: true, limit_value: null },
  { id: 15, tier_id: 4, feature_key: "api_trading", allowed: true, limit_value: null },
  { id: 16, tier_id: 4, feature_key: "linked_accounts", allowed: true, limit_value: 50 },
] as const;

// One published schedule to start. Admins create new draft versions and publish
// them; only one is `published` at a time.
export const FEE_SCHEDULES = [
  {
    id: 1,
    version: 1,
    status: "published",
    effective_from: day(2025, 1, 1),
    notes: "Initial published schedule.",
  },
] as const;

// The per-tier, per-product fee line for schedule v1. `bps` rates carry a
// minimum-fee floor; `flat` rates do not. Better tiers pay a lower rate.
export const FEE_RULES = [
  // Bronze
  { id: 1, fee_schedule_id: 1, tier_id: 1, product: "managed_portfolio", basis: "bps", rate: 85, min_fee: 500 },
  { id: 2, fee_schedule_id: 1, tier_id: 1, product: "advisory", basis: "bps", rate: 100, min_fee: 750 },
  { id: 3, fee_schedule_id: 1, tier_id: 1, product: "brokerage", basis: "flat", rate: 25, min_fee: null },
  // Silver
  { id: 4, fee_schedule_id: 1, tier_id: 2, product: "managed_portfolio", basis: "bps", rate: 75, min_fee: 500 },
  { id: 5, fee_schedule_id: 1, tier_id: 2, product: "advisory", basis: "bps", rate: 90, min_fee: 750 },
  { id: 6, fee_schedule_id: 1, tier_id: 2, product: "brokerage", basis: "flat", rate: 20, min_fee: null },
  // Gold
  { id: 7, fee_schedule_id: 1, tier_id: 3, product: "managed_portfolio", basis: "bps", rate: 60, min_fee: 1000 },
  { id: 8, fee_schedule_id: 1, tier_id: 3, product: "advisory", basis: "bps", rate: 75, min_fee: 1000 },
  { id: 9, fee_schedule_id: 1, tier_id: 3, product: "brokerage", basis: "flat", rate: 15, min_fee: null },
  // Platinum
  { id: 10, fee_schedule_id: 1, tier_id: 4, product: "managed_portfolio", basis: "bps", rate: 45, min_fee: 1000 },
  { id: 11, fee_schedule_id: 1, tier_id: 4, product: "advisory", basis: "bps", rate: 60, min_fee: 1000 },
  { id: 12, fee_schedule_id: 1, tier_id: 4, product: "brokerage", basis: "flat", rate: 10, min_fee: null },
] as const;

export const STAFF = [
  { id: 1, email: "admin@demo.test", password: "pricing-demo-2026", name: "Priya Admin", role: "pricing-admin" },
  { id: 2, email: "service@demo.test", password: "service-demo-2026", name: "Portal Service", role: "app-service" },
] as const;

// Plain-JSON views for the seed endpoint's `c.array(...)` reload. `bulk.add`
// with `allowIdField` honors the pinned ids. `JsonRow` keeps them assignable to
// the SDK's `Json[]` argument type (null included for the nullable columns).
type JsonRow = Record<string, string | number | boolean | null>;
export const TIERS_JSON: JsonRow[] = TIERS.map((r): JsonRow => ({ ...r }));
export const CLIENTS_JSON: JsonRow[] = CLIENTS.map((r): JsonRow => ({ ...r }));
export const ENTITLEMENTS_JSON: JsonRow[] = ENTITLEMENTS.map((r): JsonRow => ({ ...r }));
export const FEE_SCHEDULES_JSON: JsonRow[] = FEE_SCHEDULES.map((r): JsonRow => ({ ...r }));
export const FEE_RULES_JSON: JsonRow[] = FEE_RULES.map((r): JsonRow => ({ ...r }));

// Product keys used across the service, for the frontend's product picker.
export const PRODUCTS = ["managed_portfolio", "advisory", "brokerage"] as const;
