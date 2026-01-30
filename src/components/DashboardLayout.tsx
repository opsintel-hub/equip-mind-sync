import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { NotificationCenter } from "./NotificationCenter";
import { UserInfoDisplay } from "./UserInfoDisplay";
import { Menu } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-10 h-16 border-b border-border/50 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-full items-center justify-between px-6">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="h-9 w-9 rounded-lg hover:bg-muted transition-colors">
                  <Menu className="h-5 w-5" />
                </SidebarTrigger>
              </div>
              <div className="flex items-center gap-4">
                <UserInfoDisplay />
                <NotificationCenter />
              </div>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">
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
