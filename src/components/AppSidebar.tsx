import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  Package,
  PackageOpen,
  Database,
  MapPin,
  LogOut,
  Shield,
  History,
  Truck,
  Bell,
  Calendar,
  PackageCheck,
  ChevronDown,
  Archive,
  Wrench,
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
import { useState, useMemo } from "react";
import { useFunctionPermissions } from "@/hooks/useFunctionPermissions";

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

// กลุ่มเมนูแบ่งตามหมวดหมู่
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
        title: "รับสินค้าเข้า (GR)", 
        icon: Package,
        functionName: "goods_receipt",
        subItems: [
          { title: "นำสินค้าเข้า", url: "/delivery-entry", icon: Truck },
          { title: "รับเข้าคลัง", url: "/receive-goods", icon: PackageCheck },
        ]
      },
      { 
        title: "เบิกจ่ายสินค้า (GI)", 
        icon: PackageOpen,
        functionName: "goods_issue",
        subItems: [
          { title: "ขอเบิกสินค้า", url: "/issue-request", icon: Package },
          { title: "จ่ายสินค้า", url: "/issue-goods", icon: PackageCheck },
        ]
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
          { title: "ตาราง PM ป้าย", url: "/pm-schedule", icon: Calendar },
          { title: "ประวัติ PM ป้าย", url: "/pm-history", icon: History },
        ]
      },
    ]
  },
  {
    label: "เครื่องมือ",
    items: [
      { 
        title: "PM เครื่องมือ", 
        icon: Wrench,
        functionName: "equipment_pm",
        subItems: [
          { title: "ตาราง PM เครื่องมือ", url: "/equipment-pm-schedule", icon: Calendar },
          { title: "ประวัติ PM เครื่องมือ", url: "/equipment-pm-history", icon: History },
        ]
      },
    ]
  },
  {
    label: "รายงาน",
    items: [
      { title: "รายงาน Dead Stock", url: "/dead-stock", icon: Archive, functionName: "reports" },
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
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { signOut } = useAuth();
  const { hasFunctionAccess, isAdmin, loading: permLoading } = useFunctionPermissions();
  const [openSubMenu, setOpenSubMenu] = useState<string | null>("รับสินค้าเข้า (GR)");

  // Filter menu groups based on function permissions
  const filteredMenuGroups = useMemo(() => {
    if (permLoading) return [];
    
    return menuGroups.map(group => ({
      ...group,
      items: group.items.filter(item => {
        // Items without functionName are always visible (e.g., Dashboard, Settings)
        if (!item.functionName) return true;
        // Admin can see everything
        if (isAdmin) return true;
        // Check function permission
        return hasFunctionAccess(item.functionName);
      })
    })).filter(group => group.items.length > 0); // Only show groups with items
  }, [hasFunctionAccess, isAdmin, permLoading]);

  const handleLogout = () => {
    signOut();
  };

  const renderMenuItem = (item: MenuItem) => {
    if (item.subItems) {
      return (
        <Collapsible
          open={openSubMenu === item.title}
          onOpenChange={(open) => setOpenSubMenu(open ? item.title : null)}
        >
          <CollapsibleTrigger asChild>
            <SidebarMenuButton className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {state !== "collapsed" && <span>{item.title}</span>}
              </div>
              {state !== "collapsed" && (
                <ChevronDown className={`w-4 h-4 transition-transform ${openSubMenu === item.title ? "rotate-180" : ""}`} />
              )}
            </SidebarMenuButton>
          </CollapsibleTrigger>
          {state !== "collapsed" && (
            <CollapsibleContent>
              <SidebarMenuSub>
                {item.subItems.map((subItem) => (
                  <SidebarMenuSubItem key={subItem.title}>
                    <SidebarMenuSubButton asChild>
                      <NavLink
                        to={subItem.url}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors text-sm"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
                        <subItem.icon className="w-4 h-4 flex-shrink-0" />
                        <span>{subItem.title}</span>
                      </NavLink>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          )}
        </Collapsible>
      );
    }

    return (
      <SidebarMenuButton asChild>
        <NavLink
          to={item.url!}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
        >
          <item.icon className="w-5 h-5 flex-shrink-0" />
          {state !== "collapsed" && <span>{item.title}</span>}
        </NavLink>
      </SidebarMenuButton>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sidebar-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <Package className="w-6 h-6 text-sidebar-primary-foreground" />
          </div>
          {state !== "collapsed" && (
            <div>
              <h2 className="text-base font-semibold text-sidebar-foreground">Equipment</h2>
              <p className="text-xs text-sidebar-foreground/60">Tracking System</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {filteredMenuGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className={state === "collapsed" ? "text-center" : ""}>
              {state === "collapsed" ? "•••" : group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    {renderMenuItem(item)}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 mr-2" />
          {state !== "collapsed" && "ออกจากระบบ"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
