import { expect, test } from "bun:test";
import { canAccessFunction } from "./functionAccess";
import { getRouteRule } from "./routePermissions";

const access = (permissions, admin = false, superAdmin = false) =>
  canAccessFunction("site_access_manage", permissions, admin, superAdmin, ["admin"]);
test("Super Admin can manage without a grant", () => expect(access([], true, true)).toBe(true));
test("department Admin without explicit manage grant cannot manage", () => expect(access([], true)).toBe(false));
test("department Admin with explicit manage grant can manage", () => expect(access([{ function_name: "site_access_manage", can_access: true }], true)).toBe(true));
test("delegated Operation Support or warehouse user can manage", () => expect(access([{ function_name: "site_access_manage", can_access: true }])).toBe(true));
test("revoked manage permission cannot open management", () => expect(access([{ function_name: "site_access_manage", can_access: false }], true)).toBe(false));
test("booking permission alone does not allow management", () => expect(access([{ function_name: "site_access_request", can_access: true }])).toBe(false));
test("direct management URL requires manage function", () => expect(getRouteRule("/site-access-manage")?.fns).toEqual(["site_access_manage"]));
test("other department Admin operational permissions remain unchanged", () => expect(canAccessFunction("goods_issue", [], true, false, ["admin"])).toBe(true));