import { apiGroup } from "@xanots/sdk";

// Each group pins its `canonical` slug so the public path is stable and
// `getPath()` resolves in the browser bundle from source alone (no lock needed).
// The slugs are prefixed `eps_` (entitlement & pricing service) to stay distinct
// on the shared instance, since a canonical is unique instance-wide.

// The read-only service surface every client-facing app calls: resolve a
// client's entitlements + fee, inspect a tier's grants, read a past resolution.
// `resolve/seed` is public so the demo is browsable immediately; the rest
// require an authenticated app-service (or admin) token.
export const resolveApi = apiGroup({ name: "resolve", canonical: "eps_resolve" });

// The governed write surface: create, edit, and publish fee schedule versions
// and edit tier entitlements. Every endpoint requires the pricing-admin role.
export const adminApi = apiGroup({ name: "admin", canonical: "eps_admin" });

// Sign-in for the two demo roles (the honest credential -> token path).
export const authApi = apiGroup({ name: "auth", canonical: "eps_auth" });
