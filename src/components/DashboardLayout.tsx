import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { NotificationCenter } from "./NotificationCenter";
import { GlobalSearch } from "./GlobalSearch";
import { UserInfoDisplay } from "./UserInfoDisplay";
import { SidebarResizer, getStoredSidebarWidthRem } from "./SidebarResizer";
import { Menu } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const initialWidth = `${getStoredSidebarWidthRem()}rem`;
  return (
    <SidebarProvider style={{ "--sidebar-width": initialWidth } as React.CSSProperties}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarResizer />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-10 h-16 border-b border-border/50 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-full items-center justify-between px-3 sm:px-6 gap-2">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <SidebarTrigger className="h-9 w-9 rounded-lg hover:bg-muted transition-colors shrink-0">
                  <Menu className="h-5 w-5" />
                </SidebarTrigger>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <UserInfoDisplay />
                <NotificationCenter />
              </div>
            </div>
          </header>
          <main className="flex-1 p-3 sm:p-6 overflow-auto">
            <div className="max-w-[1600px] mx-auto animate-fade-in">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
