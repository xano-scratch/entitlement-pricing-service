import { s, c, ref, auth, expr, or, statements } from "@xanots/sdk";
import { staff } from "../tables/staff.js";

// API-layer RBAC. Attach `auth: staff` to a query (so a valid token is required
// before the stack runs), then spread a guard at the top of the stack to refuse
// a caller whose role is not permitted. This is middleware-style authorization
// at the endpoint, NOT row-level security: the role is read fresh from the staff
// table on every call.
//
// Returning `statements(...)` (a fixed-arity tuple) rather than a plain
// `Statement[]` keeps the caller's stack a tuple, so `InferResponse` still
// traces the endpoint's own `as` bindings after the spread.

// The read service surface: any authenticated staff (app-service or the
// pricing-admin, who outranks it) may resolve and read.
export const serviceGuard = () =>
  statements(
    s.db.get_by_id({ table: staff, id: auth("id"), output: ["id", "role", "name"], as: "caller" }),
    s.precondition({
      expr: or(
        expr(ref("caller.role"), "=", c.text("app-service")),
        expr(ref("caller.role"), "=", c.text("pricing-admin")),
      ),
      error_type: "accessdenied",
      error: c.text("This service requires an app-service or pricing-admin role."),
    }),
  );

// The governed write surface: pricing-admin only.
export const adminGuard = () =>
  statements(
    s.db.get_by_id({ table: staff, id: auth("id"), output: ["id", "role", "name"], as: "caller" }),
    s.precondition({
      expr: expr(ref("caller.role"), "=", c.text("pricing-admin")),
      error_type: "accessdenied",
      error: c.text("This action requires the pricing-admin role."),
    }),
  );
