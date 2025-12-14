import { useState, useEffect } from "react";
import { Bell, Check, Trash2, RefreshCw, Settings, AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";

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
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

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
      const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
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
    switch (category) {
      case "equipment_expiry":
        return "หมดอายุ";
      case "warranty_expiry":
        return "ประกัน";
      case "pm_schedule":
        return "PM";
      case "low_stock":
        return "สต็อกต่ำ";
      default:
        return category;
    }
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
      <PopoverContent className="w-96 p-0" align="end">
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
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mb-2 opacity-20" />
              <p>ไม่มีการแจ้งเตือน</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                    !notification.is_read ? "bg-primary/5" : ""
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex gap-3">
                    <div className="mt-0.5">{getTypeIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">
                          {notification.title}
                        </span>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {getCategoryLabel(notification.category)}
                        </Badge>
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
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
