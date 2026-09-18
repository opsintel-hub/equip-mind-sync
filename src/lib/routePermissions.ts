/**
 * Route-level permission map.
 *
 * The sidebar hides menus a user may not use, but until now the routes
 * themselves were only login-protected — anyone could reach a page by typing
 * its URL. This map mirrors the sidebar definitions (AppSidebar) so the route
 * guard enforces exactly what the permission settings promise.
 *
 * - `fns`: user needs at least ONE of these function permissions
 * - `superAdminOnly`: reserved for Super Admin regardless of function grants
 */
export interface RoutePermissionRule {
  fns?: string[];
  superAdminOnly?: boolean;
}

export const ROUTE_PERMISSIONS: Record<string, RoutePermissionRule> = {
  // Receiving
  "/delivery-entry": { fns: ["delivery_entry"] },
  "/receive-goods": { fns: ["goods_receipt"] },
  "/pending-asset-codes": { fns: ["goods_receipt"] },

  // Defective / disposal
  "/defective-return": { fns: ["disposal_request"] },
  "/disposal-approval": { fns: ["disposal_approve_l1", "disposal_approve_l2", "disposal_finance"] },
  "/disposal-report": { fns: ["disposal_report"] },

  // Issuing
  "/issue-request": { fns: ["issue_request"] },
  "/requester-dashboard": { fns: ["issue_request"] },
  "/manager-approval": { fns: ["manager_approval"] },
  "/issue-goods": { fns: ["goods_issue"] },
  "/goods-issue": { fns: ["goods_issue"] },
  "/warehouse-planning": { fns: ["goods_issue"] },
  "/waiting-stock": { fns: ["goods_issue"] },
  "/incomplete-issues": { fns: ["goods_issue"] },
  "/equipment-loans": { fns: ["goods_issue"] },
  "/delivery-confirmation": { fns: ["delivery_confirm"] },

  // Direct shipping
  "/direct-shipping": { fns: ["direct_shipping_request"] },
  "/direct-shipping-approval": { fns: ["direct_shipping_approval"] },
  "/direct-shipping-procurement": { fns: ["direct_shipping_procurement"] },

  // Transfer
  "/transfer-history": { fns: ["transfer"] },

  // Billboards
  "/billboards": { fns: ["billboards"] },
  "/billboard-packages": { fns: ["billboards"] },
  "/pm-billboard": { fns: ["pm_schedule"] },
  "/pm-history": { fns: ["pm_schedule"] },

  // Advertisements
  "/ad-entry": { fns: ["ad_entry"] },
  "/ad-receive": { fns: ["ad_warehouse"] },
  "/ad-request": { fns: ["ad_issue_request"] },
  "/ad-issue": { fns: ["ad_warehouse"] },

  // Tools
  "/tool-management": { fns: ["equipment_pm"] },
  "/tool-loans": { fns: ["equipment_pm"] },
  "/tool-pm-tasks": { fns: ["equipment_pm"] },
  "/tool-pm-schedule": { fns: ["equipment_pm"] },
  "/tool-pm-history": { fns: ["equipment_pm"] },
  "/tool-pm-report": { fns: ["equipment_pm"] },

  // Swap / assessment / claim
  "/swap": { fns: ["swap_request_create", "swap_request_manage"] },
  "/assessment": { fns: ["assessment_view", "assessment_create"] },
  "/claims": { fns: ["claim_view", "claim_create"] },
  "/repair-report": { fns: ["reports"] },

  // Media player
  "/media-player": { fns: ["master_data"] },
  "/media-player-report": { fns: ["reports"] },

  // Reports
  "/document-search": { fns: ["reports"] },
  "/inventory-report": { fns: ["reports"] },
  "/stock-card": { fns: ["reports"] },
  "/stock-movement-log": { fns: ["reports"] },
  "/dead-stock": { fns: ["reports"] },
  "/billboard-issue-report": { fns: ["reports"] },
  "/equipment-tracking": { fns: ["reports"] },
  "/billboard-parts-availability": { fns: ["reports"] },
  "/purchase-requests": { fns: ["reports"] },
  "/kpi-report": { fns: ["reports"] },
  "/audit-trail": { fns: ["activity_audit_view"] },

  // System settings
  "/master-data": { fns: ["master_data"] },
  "/stock-reconciliation": { fns: ["stock_reconcile"] },
  "/admin": { fns: ["admin"] },
  "/database-guide": { superAdminOnly: true },
  "/setup/import-equipment": { fns: ["setup_import"], superAdminOnly: true },
  "/setup/import-media-player": { fns: ["setup_import"], superAdminOnly: true },
  "/setup/import-tools": { fns: ["setup_import"], superAdminOnly: true },
  "/testing": { fns: ["system_testing"], superAdminOnly: true },
};

/** Longest-prefix lookup so nested paths (e.g. /tool-loans/request) inherit the rule. */
export function getRouteRule(pathname: string): RoutePermissionRule | undefined {
  let best: { key: string; rule: RoutePermissionRule } | undefined;
  for (const [key, rule] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pathname === key || pathname.startsWith(key + "/")) {
      if (!best || key.length > best.key.length) best = { key, rule };
    }
  }
  return best?.rule;
}
