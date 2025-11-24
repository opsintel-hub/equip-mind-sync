import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  Package,
  PackageOpen,
  Database,
  MapPin,
  LogOut,
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
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const menuItems = [
  { title: "แดชบอร์ด", url: "/dashboard", icon: LayoutDashboard },
  { title: "รับสินค้าเข้า (GR)", url: "/goods-receipt", icon: Package },
  { title: "เบิกจ่ายสินค้า (GI)", url: "/goods-issue", icon: PackageOpen },
  { title: "ข้อมูลหลัก", url: "/master-data", icon: Database },
  { title: "ป้ายโฆษณา", url: "/billboards", icon: MapPin },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { signOut } = useAuth();

  const handleLogout = () => {
    signOut();
  };

  return (
    <Sidebar className={state === "collapsed" ? "w-16" : "w-64"} collapsible="icon">
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
        <SidebarGroup>
          <SidebarGroupLabel className={state === "collapsed" ? "text-center" : ""}>
            {state === "collapsed" ? "•••" : "เมนูหลัก"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {state !== "collapsed" && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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
