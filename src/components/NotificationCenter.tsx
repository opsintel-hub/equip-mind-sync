import { useState, useEffect, useMemo } from "react";
import { Bell, Check, RefreshCw, Monitor, Shield, Wrench, FileText, AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { useDepartmentPermissions } from "@/hooks/useDepartmentPermissions";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  category: string;
  is_read: boolean;
  created_at: string;
  reference_id?: string;
  reference_type?: string;
  department?: string;
}

type Priority = "critical" | "high" | "medium" | "low";

interface CategoryConfig {
  id: string;
  title: string;
  icon: React.ReactNode;
  categories: string[];
  priority: Priority;
}

const categoryGroups: CategoryConfig[] = [
  {
    id: "media_player",
    title: "Media Player",
    icon: <Monitor className="h-4 w-4" />,
    categories: ["media_player_expiry", "media_player_warranty"],
    priority: "high",
  },
  {
    id: "assets",
    title: "ทรัพย์สิน",
    icon: <Shield className="h-4 w-4" />,
    categories: ["equipment_expiry", "warranty_expiry", "warehouse_warranty_expiry", "low_stock"],
    priority: "high",
  },
  {
    id: "pm",
    title: "PM",
    icon: <Wrench className="h-4 w-4" />,
    categories: ["pm_schedule", "billboard_pm", "tool_pm"],
    priority: "medium",
  },
  {
    id: "documents",
    title: "เอกสาร",
    icon: <FileText className="h-4 w-4" />,
    categories: ["pending_requests", "incomplete_issues", "loan_overdue", "ad_retention"],
    priority: "medium",
  },
];

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  critical: { label: "ด่วนมาก", className: "bg-destructive text-destructive-foreground" },
  high: { label: "ด่วน", className: "bg-orange-500 text-white" },
  medium: { label: "ปานกลาง", className: "bg-primary/20 text-primary" },
  low: { label: "ทั่วไป", className: "border-muted-foreground/30 text-muted-foreground" },
};

function getCategoryPriority(category: string): Priority {
  if (["low_stock", "loan_overdue"].includes(category)) return "critical";
  if (["equipment_expiry", "media_player_expiry", "pm_schedule", "billboard_pm", "pending_requests", "warehouse_warranty_expiry"].includes(category)) return "high";
  if (["warranty_expiry", "media_player_warranty", "tool_pm", "incomplete_issues", "ad_retention"].includes(category)) return "medium";
  return "low";
}

function getGroupForCategory(category: string): CategoryConfig | undefined {
  return categoryGroups.find(g => g.categories.includes(category));
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const { isAdmin, getViewableDepartments } = useDepartmentPermissions();

  // Filter notifications by user's department permissions
  const filteredNotifications = useMemo(() => {
    if (isAdmin) return notifications;
    const viewable = getViewableDepartments();
    return notifications.filter(n => !n.department || viewable.includes(n.department));
  }, [notifications, isAdmin, getViewableDepartments]);

  const tabNotifications = useMemo(() => {
    if (activeTab === "all") return filteredNotifications;
    const group = categoryGroups.find(g => g.id === activeTab);
    if (!group) return filteredNotifications;
    return filteredNotifications.filter(n => group.categories.includes(n.category));
  }, [filteredNotifications, activeTab]);

  const unreadCount = filteredNotifications.filter((n) => !n.is_read).length;

  const getTabUnreadCount = (groupId: string) => {
    const group = categoryGroups.find(g => g.id === groupId);
    if (!group) return 0;
    return filteredNotifications.filter(n => !n.is_read && group.categories.includes(n.category)).length;
  };

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications((data as Notification[]) || []);
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkExpiringEquipment = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke("check-expiring-equipment");
      if (error) throw error;
      toast.success("ตรวจสอบการแจ้งเตือนเรียบร้อยแล้ว");
      fetchNotifications();
    } catch (error: any) {
      console.error("Error checking expiring equipment:", error);
      toast.error("เกิดข้อผิดพลาดในการตรวจสอบ");
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);

      if (error) throw error;
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (error: any) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = filteredNotifications.filter((n) => !n.is_read).map((n) => n.id);
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .in("id", unreadIds);

      if (error) throw error;
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success("ทำเครื่องหมายอ่านแล้วทั้งหมด");
    } catch (error: any) {
      console.error("Error marking all as read:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "error":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    const group = getGroupForCategory(category);
    return group?.title || category;
  };

  const getCategoryIcon = (category: string) => {
    const group = getGroupForCategory(category);
    return group?.icon || <Info className="h-4 w-4" />;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">การแจ้งเตือน</h4>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={checkExpiringEquipment}
              disabled={isLoading}
              title="ตรวจสอบการแจ้งเตือนใหม่"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={markAllAsRead}
                title="ทำเครื่องหมายอ่านแล้วทั้งหมด"
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0 gap-0">
            <TabsTrigger
              value="all"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs"
            >
              ทั้งหมด
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 min-w-4 px-1 text-[10px]">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            {categoryGroups.map(group => {
              const count = getTabUnreadCount(group.id);
              return (
                <TabsTrigger
                  key={group.id}
                  value={group.id}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs flex items-center gap-1"
                >
                  {group.icon}
                  <span className="hidden sm:inline">{group.title}</span>
                  {count > 0 && (
                    <Badge variant="destructive" className="h-4 min-w-4 px-1 text-[10px]">
                      {count}
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <ScrollArea className="h-[400px]">
            {tabNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mb-2 opacity-20" />
                <p>ไม่มีการแจ้งเตือน</p>
              </div>
            ) : (
              <div className="divide-y">
                {tabNotifications.map((notification) => {
                  const priority = getCategoryPriority(notification.category);
                  const prio = priorityConfig[priority];
                  return (
                    <div
                      key={notification.id}
                      className={`p-3 hover:bg-muted/50 cursor-pointer transition-colors ${
                        !notification.is_read ? "bg-primary/5" : ""
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex gap-3">
                        <div className="mt-0.5">{getTypeIcon(notification.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span className="font-medium text-sm truncate max-w-[180px]">
                              {notification.title}
                            </span>
                            <Badge variant="outline" className="text-[10px] shrink-0 gap-1 px-1.5 py-0">
                              {getCategoryIcon(notification.category)}
                              {getCategoryLabel(notification.category)}
                            </Badge>
                            <Badge className={`text-[10px] px-1.5 py-0 shrink-0 ${prio.className}`}>
                              {prio.label}
                            </Badge>
                            {notification.department && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                                {notification.department}
                              </Badge>
                            )}
                            {!notification.is_read && (
                              <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                              locale: th,
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
