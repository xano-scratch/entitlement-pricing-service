// The one contract. Every path and every request/response type below is derived
// from the xanots query defs in ../../../xano — never hand-typed. Change a def
// and the frontend follows (or fails to compile). Response shapes come from each
// def's `responseShape`, so `InferResponse` resolves them fully.

import type { InferInput, InferResponse } from "@xanots/sdk";

import { resolveEntitlementsAndFeeQuery } from "../../../xano/api/resolve-entitlements-and-fee.js";
import { tierGrantsQuery } from "../../../xano/api/resolve-tier-grants.js";
import { resolutionQuery } from "../../../xano/api/resolve-resolution.js";
import { resolutionsQuery } from "../../../xano/api/resolve-resolutions.js";
import { clientsQuery } from "../../../xano/api/resolve-clients.js";
import { tiersQuery } from "../../../xano/api/resolve-tiers.js";
import { seedQuery } from "../../../xano/api/resolve-seed.js";
import { feeSchedulesQuery } from "../../../xano/api/admin-fee-schedules.js";
import { feeRulesQuery } from "../../../xano/api/admin-fee-rules.js";
import { createFeeScheduleQuery } from "../../../xano/api/admin-fee-schedule.js";
import { publishFeeScheduleQuery } from "../../../xano/api/admin-fee-schedule-publish.js";
import { upsertFeeRuleQuery } from "../../../xano/api/admin-fee-rule.js";
import { upsertEntitlementQuery } from "../../../xano/api/admin-entitlement.js";
import { loginQuery } from "../../../xano/api/auth-login.js";

/** The deployed backend URL, injected by `xanots deploy --static`, or from env in dev. */
export const XANO_HOST: string =
  (typeof window !== "undefined" && (window as { XANO_HOST?: string }).XANO_HOST) ||
  import.meta.env.VITE_XANO_HOST ||
  "";

// ── Derived types ────────────────────────────────────────────────────────────
export type ClientRow = InferResponse<typeof clientsQuery>[number];
export type TierRow = InferResponse<typeof tiersQuery>[number];
export type ResolveInput = InferInput<typeof resolveEntitlementsAndFeeQuery>;
export type ResolveResult = InferResponse<typeof resolveEntitlementsAndFeeQuery>;
export type EntitlementRow = ResolveResult["entitlements"][number];
export type TierGrants = InferResponse<typeof tierGrantsQuery>;
export type ResolutionDetail = InferResponse<typeof resolutionQuery>;
export type AuditRow = InferResponse<typeof resolutionsQuery>[number];
export type FeeSchedule = InferResponse<typeof feeSchedulesQuery>[number];
export type FeeRule = InferResponse<typeof feeRulesQuery>[number];
export type FeeRuleInput = InferInput<typeof upsertFeeRuleQuery>;
export type EntitlementInput = InferInput<typeof upsertEntitlementQuery>;
export type SeedResult = InferResponse<typeof seedQuery>;
export type LoginInput = InferInput<typeof loginQuery>;
export type LoginResult = InferResponse<typeof loginQuery>;
export type Role = LoginResult["role"];

// The products the service prices. Kept in sync with the seed fee rules.
export const PRODUCTS = ["managed_portfolio", "advisory", "brokerage"] as const;
export type Product = (typeof PRODUCTS)[number];

// ── Bearer token (held in memory; RBAC is enforced server-side) ──────────────
let authToken: string | null = null;
export function setToken(t: string | null): void {
  authToken = t;
}
export function getToken(): string | null {
  return authToken;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  opts: { method: string; body?: unknown; auth?: boolean } = { method: "GET" },
): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  if (opts.auth && authToken) headers["authorization"] = `Bearer ${authToken}`;
  const res = await fetch(XANO_HOST + path, {
    method: opts.method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = (await res.json()) as { message?: string };
      if (data?.message) message = data.message;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

// ── Resolve surface ──────────────────────────────────────────────────────────
export function seed(): Promise<SeedResult> {
  return request(seedQuery.getPath(), { method: seedQuery.verb });
}
export function getClients(): Promise<ClientRow[]> {
  return request(clientsQuery.getPath(), { method: clientsQuery.verb, auth: true });
}
export function getTiers(): Promise<TierRow[]> {
  return request(tiersQuery.getPath(), { method: tiersQuery.verb, auth: true });
}
export function resolve(body: ResolveInput): Promise<ResolveResult> {
  return request(resolveEntitlementsAndFeeQuery.getPath(), {
    method: resolveEntitlementsAndFeeQuery.verb,
    body,
    auth: true,
  });
}
export function getTierGrants(tierCode: string): Promise<TierGrants> {
  return request(tierGrantsQuery.getPath({ params: { tier_code: tierCode } }), {
    method: tierGrantsQuery.verb,
    auth: true,
  });
}
export function getResolution(id: number): Promise<ResolutionDetail> {
  return request(resolutionQuery.getPath({ params: { resolution_id: String(id) } }), {
    method: resolutionQuery.verb,
    auth: true,
  });
}
export function getResolutions(): Promise<AuditRow[]> {
  return request(resolutionsQuery.getPath(), { method: resolutionsQuery.verb, auth: true });
}

// ── Admin surface (pricing-admin only) ───────────────────────────────────────
export function getFeeSchedules(): Promise<FeeSchedule[]> {
  return request(feeSchedulesQuery.getPath(), { method: feeSchedulesQuery.verb, auth: true });
}
export function getFeeRules(scheduleId: number): Promise<FeeRule[]> {
  // fee_schedule_id is a query-string filter (not a path segment), so append it.
  return request(feeRulesQuery.getPath() + `?fee_schedule_id=${scheduleId}`, {
    method: feeRulesQuery.verb,
    auth: true,
  });
}
export function createDraft(notes: string): Promise<InferResponse<typeof createFeeScheduleQuery>> {
  return request(createFeeScheduleQuery.getPath(), {
    method: createFeeScheduleQuery.verb,
    body: { notes },
    auth: true,
  });
}
export function publishSchedule(id: number): Promise<InferResponse<typeof publishFeeScheduleQuery>> {
  return request(publishFeeScheduleQuery.getPath(), {
    method: publishFeeScheduleQuery.verb,
    body: { fee_schedule_id: id },
    auth: true,
  });
}
export function upsertFeeRule(body: FeeRuleInput): Promise<InferResponse<typeof upsertFeeRuleQuery>> {
  return request(upsertFeeRuleQuery.getPath(), { method: upsertFeeRuleQuery.verb, body, auth: true });
}
export function upsertEntitlement(
  body: EntitlementInput,
): Promise<InferResponse<typeof upsertEntitlementQuery>> {
  return request(upsertEntitlementQuery.getPath(), {
    method: upsertEntitlementQuery.verb,
    body,
    auth: true,
  });
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export function login(body: LoginInput): Promise<LoginResult> {
  return request(loginQuery.getPath(), { method: loginQuery.verb, body });
}

// The two seeded demo accounts (a throwaway environment; see the README).
export const DEMO_ACCOUNTS: Record<Role, { email: string; password: string }> = {
  "pricing-admin": { email: "admin@demo.test", password: "pricing-demo-2026" },
  "app-service": { email: "service@demo.test", password: "service-demo-2026" },
};

// Self-contained RBAC proof: call one admin endpoint under three identities and
// report the HTTP status each gets. Uses its own tokens, so it does not disturb
// the app's current session.
export async function probeAdminGate(): Promise<{
  anonymous: number;
  app_service: number;
  pricing_admin: number;
}> {
  const path = feeSchedulesQuery.getPath();
  const probe = async (token: string | null): Promise<number> => {
    const res = await fetch(XANO_HOST + path, {
      method: "GET",
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
    return res.status;
  };
  const anonymous = await probe(null);
  const svc = await login(DEMO_ACCOUNTS["app-service"]);
  const app_service = await probe(svc.token);
  const adm = await login(DEMO_ACCOUNTS["pricing-admin"]);
  const pricing_admin = await probe(adm.token);
  return { anonymous, app_service, pricing_admin };
}
