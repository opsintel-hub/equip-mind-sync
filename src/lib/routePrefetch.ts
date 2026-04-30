// Map route paths to their lazy import factories.
// Used to prefetch route chunks on hover/focus, so the chunk is already
// downloaded by the time the user clicks the link.
//
// IMPORTANT: import factory must match the one used in App.tsx exactly,
// otherwise Vite produces a different chunk and prefetch is wasted.
const routeLoaders: Record<string, () => Promise<unknown>> = {
  "/dashboard": () => import("@/pages/Dashboard"),
  "/delivery-entry": () => import("@/pages/DeliveryEntry"),
  "/receive-goods": () => import("@/pages/ReceiveGoods"),
  "/goods-issue": () => import("@/pages/GoodsIssue"),
  "/issue-request": () => import("@/pages/IssueRequest"),
  "/issue-goods": () => import("@/pages/IssueGoods"),
  "/master-data": () => import("@/pages/MasterData"),
  "/billboards": () => import("@/pages/Billboards"),
  "/admin": () => import("@/pages/Admin"),
  "/qr-code": () => import("@/pages/QRCode"),
  "/transfer-history": () => import("@/pages/TransferHistory"),
  "/pm-history": () => import("@/pages/PMHistory"),
  "/equipment-loans": () => import("@/pages/EquipmentLoans"),
  "/incomplete-issues": () => import("@/pages/IncompleteIssues"),
  "/billboard-issue-report": () => import("@/pages/BillboardIssueReport"),
  "/notification-settings": () => import("@/pages/NotificationSettingsPage"),
  "/dead-stock": () => import("@/pages/DeadStockReport"),
  "/purchase-requests": () => import("@/pages/PurchaseRequests"),
  "/waiting-stock": () => import("@/pages/WaitingStockRequests"),
  "/requester-dashboard": () => import("@/pages/RequesterDashboard"),
  "/user-manual": () => import("@/pages/UserManual"),
  "/document-search": () => import("@/pages/DocumentSearch"),
  "/testing": () => import("@/pages/Testing"),
  "/inventory-report": () => import("@/pages/InventoryReport"),
  "/tool-pm-tasks": () => import("@/pages/ToolPMTasks"),
  "/tool-pm-history": () => import("@/pages/ToolPMHistory"),
  "/tool-pm-report": () => import("@/pages/ToolPMReport"),
  "/tool-pm-schedule": () => import("@/pages/ToolPMSchedule"),
  "/tool-management": () => import("@/pages/ToolManagement"),
  "/pending-asset-codes": () => import("@/pages/PendingAssetCodes"),
  "/media-player/search": () => import("@/pages/MediaPlayerProfile"),
  "/media-player-report": () => import("@/pages/MediaPlayerReport"),
  "/swap": () => import("@/pages/SwapWizard"),
  "/assessment": () => import("@/pages/AssessmentLog"),
  "/claims": () => import("@/pages/ClaimTracker"),
  "/ad-entry": () => import("@/pages/AdEntry"),
  "/ad-receive": () => import("@/pages/AdManagement"),
  "/ad-request": () => import("@/pages/AdRequest"),
  "/ad-issue": () => import("@/pages/AdIssue"),
  "/equipment-tracking": () => import("@/pages/EquipmentTrackingReport"),
  "/pm-billboard": () => import("@/pages/BillboardPMPage"),
  "/billboard-packages": () => import("@/pages/BillboardPackages"),
  "/defective-return": () => import("@/pages/DefectiveReturnEntry"),
  "/stock-card": () => import("@/pages/StockCard"),
  "/stock-movement-log": () => import("@/pages/StockCard"),
  "/kpi-report": () => import("@/pages/KPIReport"),
  "/delivery-confirmation": () => import("@/pages/DeliveryConfirmation"),
  "/manager-approval": () => import("@/pages/ManagerApproval"),
  "/warehouse-planning": () => import("@/pages/WarehousePickupPlanning"),
  "/direct-shipping": () => import("@/pages/DirectShippingEntry"),
  "/direct-shipping-approval": () => import("@/pages/DirectShippingApproval"),
  "/direct-shipping-procurement": () => import("@/pages/DirectShippingProcurement"),
  "/database-guide": () => import("@/pages/DatabaseGuide"),
};

const prefetched = new Set<string>();

export function prefetchRoute(path: string) {
  if (prefetched.has(path)) return;
  // Match dynamic param routes like /billboards/:id by stripping last segment
  const loader = routeLoaders[path];
  if (!loader) return;
  prefetched.add(path);
  // Fire-and-forget; ignore errors (network/aborts)
  loader().catch(() => prefetched.delete(path));
}
