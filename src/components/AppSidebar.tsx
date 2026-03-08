import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  Package,
  PackageOpen,
  Database,
  MapPin,
  LogOut,
  Search,
  Shield,
  History,
  Truck,
  Bell,
  Calendar,
  PackageCheck,
  ChevronDown,
  ClipboardList,
  Archive,
  Wrench,
  Clock,
  User,
  BookOpen,
  FileSearch,
  FlaskConical,
  ArrowLeftRight,
  Monitor,
  FileKey,
  ImageIcon,
  PackageCheck as PackageCheckIcon,
  FileOutput,
  AlertTriangle as AlertTriangleIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useFunctionPermissions } from "@/hooks/useFunctionPermissions";
import { useLocation } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
interface MenuItem {
  title: string;
  url?: string;
  icon: React.ComponentType<{ className?: string }>;
  functionName?: string;
  subItems?: {
    title: string;
    url: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    label: "หน้าหลัก",
    items: [
      { title: "แดชบอร์ด", url: "/dashboard", icon: LayoutDashboard },
    ]
  },
  {
    label: "คลังสินค้า",
    items: [
      { 
        title: "นำสินค้าใหม่เข้าระบบ", 
        url: "/delivery-entry",
        icon: Truck,
        functionName: "delivery_entry",
      },
      { 
        title: "Direct Shipping", 
        url: "/direct-shipping",
        icon: Send,
        functionName: "delivery_entry",
      },
        icon: Truck,
        functionName: "delivery_entry",
      },
      { 
        title: "นำของเสียเข้าระบบ", 
        url: "/defective-return",
        icon: AlertTriangleIcon,
        functionName: "goods_receipt",
      },
      { 
        title: "รับสินค้าเข้า (GR)", 
        icon: Package,
        functionName: "goods_receipt",
        subItems: [
          { title: "รับเข้าคลัง", url: "/receive-goods", icon: PackageCheck },
          { title: "รายการรอรหัส", url: "/pending-asset-codes", icon: FileKey },
        ]
      },
      { 
        title: "ขอเบิกสินค้า", 
        url: "/issue-request",
        icon: Package,
        functionName: "issue_request",
      },
      { 
        title: "Dashboard ผู้เบิก", 
        url: "/requester-dashboard",
        icon: User,
        functionName: "issue_request",
      },
      { 
        title: "จ่ายสินค้า", 
        url: "/issue-goods",
        icon: PackageCheck,
        functionName: "goods_issue",
      },
      { 
        title: "แผนจัดเตรียมสินค้า", 
        url: "/warehouse-planning",
        icon: ClipboardList,
        functionName: "goods_issue",
      },
      { 
        title: "ยืมข้ามบริษัท", 
        url: "/equipment-loans",
        icon: ArrowLeftRight,
        functionName: "goods_issue",
      },
      { 
        title: "รอระบุป้าย/รอคืน/รอเข้าคลัง", 
        url: "/incomplete-issues",
        icon: Clock,
        functionName: "goods_issue",
      },
      { 
        title: "คำขอรอสินค้า", 
        url: "/waiting-stock",
        icon: Clock,
        functionName: "goods_issue",
      },
      { 
        title: "ยืนยันรับสินค้า", 
        url: "/delivery-confirmation",
        icon: Truck,
        functionName: "delivery_confirm",
      },
      { 
        title: "อนุมัติเบิกทรัพย์สิน", 
        url: "/manager-approval",
        icon: Shield,
        functionName: "manager_approval",
      },
      { title: "ประวัติการย้าย", url: "/transfer-history", icon: History, functionName: "transfer" },
    ]
  },
  {
    label: "ป้ายโฆษณา",
    items: [
      { title: "จัดการป้ายโฆษณา", url: "/billboards", icon: MapPin, functionName: "billboards" },
      { 
        title: "PM ป้ายโฆษณา", 
        icon: Calendar,
        functionName: "pm_schedule",
        subItems: [
          { title: "แจ้ง PM ป้ายโฆษณา", url: "/pm-billboard", icon: AlertTriangleIcon },
          { title: "ประวัติ PM ป้าย", url: "/pm-history", icon: History },
        ]
      },
    ]
  },
  {
    label: "ภาพโฆษณา",
    items: [
      { title: "นำเข้าภาพโฆษณา", url: "/ad-entry", icon: ImageIcon, functionName: "ad_entry" },
      { title: "รับเข้าคลังภาพ", url: "/ad-receive", icon: PackageCheckIcon, functionName: "ad_warehouse" },
      { title: "เบิกภาพโฆษณา", url: "/ad-request", icon: FileOutput, functionName: "ad_issue_request" },
      { title: "จ่ายภาพโฆษณา", url: "/ad-issue", icon: FileOutput, functionName: "ad_warehouse" },
    ]
  },
  {
    label: "เครื่องมือ",
    items: [
      { title: "ข้อมูลเครื่องมือ", url: "/tool-management", icon: Wrench, functionName: "equipment_pm" },
      { 
        title: "PM เครื่องมือ", 
        icon: Calendar,
        functionName: "equipment_pm",
        subItems: [
          { title: "งาน PM", url: "/tool-pm-tasks", icon: ClipboardList },
          { title: "ตาราง PM", url: "/tool-pm-schedule", icon: Calendar },
          { title: "ประวัติ PM", url: "/tool-pm-history", icon: History },
          { title: "รายงาน PM", url: "/tool-pm-report", icon: FileSearch },
        ]
      },
    ]
  },
  {
  label: "รายงาน",
    items: [
      { title: "รายงานสินค้าคงคลัง", url: "/inventory-report", icon: Package, functionName: "reports" },
      { title: "ค้นหาเอกสาร", url: "/document-search", icon: FileSearch, functionName: "reports" },
      { title: "Stock Movement Log", url: "/stock-movement-log", icon: History, functionName: "reports" },
      { title: "รายงาน Dead Stock", url: "/dead-stock", icon: Archive, functionName: "reports" },
      { title: "รายงานเบิกตามป้าย", url: "/billboard-issue-report", icon: MapPin, functionName: "reports" },
      { title: "ใบขอซื้อ (PR)", url: "/purchase-requests", icon: ClipboardList, functionName: "reports" },
      { title: "ค้นหาอุปกรณ์ป้าย", url: "/equipment-tracking", icon: Search, functionName: "reports" },
      { title: "Stock Card", url: "/stock-card", icon: ClipboardList, functionName: "reports" },
    ]
  },
  {
    label: "ตั้งค่าระบบ",
    items: [
      { title: "ข้อมูลหลัก", url: "/master-data", icon: Database, functionName: "master_data" },
      { title: "ตั้งค่าแจ้งเตือน", url: "/notification-settings", icon: Bell },
      { title: "จัดการผู้ใช้", url: "/admin", icon: Shield, functionName: "admin" },
    ]
  },
  {
    label: "ช่วยเหลือ",
    items: [
      { title: "คู่มือการใช้งาน", url: "/user-manual", icon: BookOpen },
      { title: "ทดสอบระบบ", url: "/testing", icon: FlaskConical, functionName: "admin" },
    ]
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { signOut } = useAuth();
  const { hasFunctionAccess, isAdmin, loading: permLoading } = useFunctionPermissions();
  const location = useLocation();
  
  // Find which menu should be open based on current route
  const getActiveMenu = useCallback(() => {
    const currentPath = location.pathname;
    for (const group of menuGroups) {
      for (const item of group.items) {
        if (item.subItems?.some(sub => sub.url === currentPath)) {
          return item.title;
        }
      }
    }
    return null;
  }, [location.pathname]);

  const [openSubMenu, setOpenSubMenu] = useState<string | null>(getActiveMenu);
  
  // Sync openSubMenu when route changes
  useEffect(() => {
    const activeMenu = getActiveMenu();
    if (activeMenu && openSubMenu !== activeMenu) {
      setOpenSubMenu(activeMenu);
    }
  }, [location.pathname, getActiveMenu]);

  const filteredMenuGroups = useMemo(() => {
    if (permLoading) return [];
    
    return menuGroups.map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (!item.functionName) return true;
        if (isAdmin) return true;
        return hasFunctionAccess(item.functionName);
      })
    })).filter(group => group.items.length > 0);
  }, [hasFunctionAccess, isAdmin, permLoading]);

  const handleLogout = () => {
    signOut();
  };

  const handleToggleMenu = useCallback((title: string) => {
    setOpenSubMenu(prev => prev === title ? null : title);
  }, []);

  const renderMenuItem = (item: MenuItem) => {
    if (item.subItems) {
      const isOpen = openSubMenu === item.title;
      const hasActiveChild = item.subItems.some(sub => sub.url === location.pathname);
      
      // Collapsed state - show only icon with tooltip-like behavior
      if (state === "collapsed") {
        return (
          <SidebarMenuButton 
            className={`flex items-center justify-center w-10 h-10 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors duration-150 ${hasActiveChild ? "bg-sidebar-primary/15 text-sidebar-primary" : ""}`}
          >
            <item.icon className="w-5 h-5" />
          </SidebarMenuButton>
        );
      }
      
      return (
        <Collapsible
          open={isOpen || hasActiveChild}
          onOpenChange={() => handleToggleMenu(item.title)}
        >
          <CollapsibleTrigger asChild>
            <SidebarMenuButton className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors duration-150 group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-sidebar-accent/50 flex items-center justify-center group-hover:bg-sidebar-primary/20 transition-colors duration-150">
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                </div>
                <span className="font-medium">{item.title}</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${isOpen || hasActiveChild ? "rotate-180" : ""}`} />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent className="overflow-hidden transition-all duration-100">
            <SidebarMenuSub className="ml-6 mt-1 border-l border-sidebar-border/50 pl-3">
              {item.subItems.map((subItem) => (
                <SidebarMenuSubItem key={subItem.title}>
                  <SidebarMenuSubButton asChild>
                    <NavLink
                      to={subItem.url}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors duration-150 text-sm"
                      activeClassName="bg-sidebar-primary/15 text-sidebar-primary font-medium border-l-2 border-sidebar-primary -ml-[13px] pl-[11px]"
                    >
                      <subItem.icon className="w-4 h-4 flex-shrink-0" />
                      <span>{subItem.title}</span>
                    </NavLink>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </Collapsible>
      );
    }

    if (state === "collapsed") {
      return (
        <SidebarMenuButton asChild>
          <NavLink
            to={item.url!}
            className="flex items-center justify-center w-10 h-10 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors duration-150"
            activeClassName="bg-sidebar-primary/15 text-sidebar-primary"
          >
            <item.icon className="w-5 h-5" />
          </NavLink>
        </SidebarMenuButton>
      );
    }

    return (
      <SidebarMenuButton asChild>
        <NavLink
          to={item.url!}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors duration-150 group"
          activeClassName="bg-sidebar-primary/15 text-sidebar-primary font-medium"
        >
          <div className="w-8 h-8 rounded-lg bg-sidebar-accent/50 flex items-center justify-center group-hover:bg-sidebar-primary/20 group-[.bg-sidebar-primary\\/15]:bg-sidebar-primary/20 transition-colors duration-150">
            <item.icon className="w-4 h-4 flex-shrink-0" />
          </div>
          <span className="font-medium">{item.title}</span>
        </NavLink>
      </SidebarMenuButton>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className={`border-b border-sidebar-border/50 ${state === "collapsed" ? "p-3" : "p-5"}`}>
        <div className={`flex items-center ${state === "collapsed" ? "justify-center" : "gap-3"}`}>
          <div className={`${state === "collapsed" ? "w-10 h-10" : "w-11 h-11"} gradient-primary rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg`}>
            <Package className={`${state === "collapsed" ? "w-5 h-5" : "w-6 h-6"} text-white`} />
          </div>
          {state !== "collapsed" && (
            <div className="animate-fade-in">
              <h2 className="text-lg font-bold text-sidebar-foreground tracking-tight">Equipment</h2>
              <p className="text-xs text-sidebar-foreground/50 font-medium">Tracking System</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4 sidebar-scrollbar">
        {permLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-16 ml-3" />
                <div className="space-y-1">
                  <Skeleton className="h-10 w-full rounded-lg" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          filteredMenuGroups.map((group, idx) => (
            <SidebarGroup key={group.label} className={idx > 0 ? "mt-2" : ""}>
              {state !== "collapsed" && (
                <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider mb-2 px-3">
                  {group.label}
                </SidebarGroupLabel>
              )}
              {state === "collapsed" && idx > 0 && (
                <div className="mx-auto my-2 w-6 h-px bg-sidebar-border/50" />
              )}
              <SidebarGroupContent>
                <SidebarMenu className={state === "collapsed" ? "space-y-0.5 items-center" : "space-y-1"}>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.title} className={state === "collapsed" ? "flex justify-center" : ""}>
                      {renderMenuItem(item)}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))
        )}
      </SidebarContent>

      <SidebarFooter className={`border-t border-sidebar-border/50 ${state === "collapsed" ? "p-2" : "p-4"}`}>
        <Button
          variant="ghost"
          className={`${state === "collapsed" ? "w-10 h-10 p-0 justify-center" : "w-full justify-start"} text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-all duration-200 rounded-lg`}
          onClick={handleLogout}
        >
          <LogOut className={`${state === "collapsed" ? "w-5 h-5" : "w-5 h-5 mr-3"}`} />
          {state !== "collapsed" && <span className="font-medium">ออกจากระบบ</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
