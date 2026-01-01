import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Search, Package, Clock, CheckCircle, XCircle, Bell, FileText, AlertTriangle, Ban } from "lucide-react";
import { toast } from "sonner";

export default function RequesterDashboard() {
  const [searchName, setSearchName] = useState("");
  const [searchedName, setSearchedName] = useState("");
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading: requestsLoading, refetch: refetchRequests } = useQuery({
    queryKey: ["requester-requests", searchedName],
    queryFn: async () => {
      if (!searchedName.trim()) return [];
      
      const { data, error } = await supabase
        .from("goods_issue_pending")
        .select("*")
        .ilike("requester_name", `%${searchedName}%`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!searchedName.trim(),
  });

  const { data: notifications = [], isLoading: notificationsLoading } = useQuery({
    queryKey: ["requester-notifications", searchedName],
    queryFn: async () => {
      if (!searchedName.trim()) return [];
      
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .ilike("message", `%${searchedName}%`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!searchedName.trim(),
  });

  const handleSearch = () => {
    setSearchedName(searchName);
  };

  // Cancel request mutation
  const cancelRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from("goods_issue_pending")
        .update({ status: "cancelled" })
        .eq("id", requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ยกเลิกคำขอสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["requester-requests", searchedName] });
    },
    onError: (error) => {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><Clock className="w-3 h-3 mr-1" />รออนุมัติ</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20"><CheckCircle className="w-3 h-3 mr-1" />อนุมัติแล้ว</Badge>;
      case "issued":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="w-3 h-3 mr-1" />จ่ายแล้ว</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20"><XCircle className="w-3 h-3 mr-1" />ปฏิเสธ</Badge>;
      case "waiting_stock":
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20"><AlertTriangle className="w-3 h-3 mr-1" />รอสินค้า</Badge>;
      case "partially_issued":
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20"><Package className="w-3 h-3 mr-1" />จ่ายบางส่วน</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/20"><Ban className="w-3 h-3 mr-1" />ยกเลิก</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };

  // Summary stats
  const pendingCount = requests.filter(r => r.status === "pending").length;
  const approvedCount = requests.filter(r => r.status === "approved").length;
  const issuedCount = requests.filter(r => r.status === "issued").length;
  const waitingStockCount = requests.filter(r => r.status === "waiting_stock").length;
  const rejectedCount = requests.filter(r => r.status === "rejected").length;
  const cancelledCount = requests.filter(r => r.status === "cancelled").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard ผู้เบิก</h1>
          <p className="text-muted-foreground mt-1">ตรวจสอบสถานะคำขอเบิกและการแจ้งเตือนของคุณ</p>
        </div>

        {/* Search Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              ค้นหาด้วยชื่อผู้เบิก
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                placeholder="กรอกชื่อผู้เบิก..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="max-w-md"
              />
              <Button onClick={handleSearch}>
                <Search className="w-4 h-4 mr-2" />
                ค้นหา
              </Button>
            </div>
          </CardContent>
        </Card>

        {searchedName && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">รออนุมัติ</p>
                      <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
                    </div>
                    <Clock className="w-8 h-8 text-yellow-500/20" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">อนุมัติแล้ว</p>
                      <p className="text-2xl font-bold text-blue-600">{approvedCount}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-blue-500/20" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">จ่ายแล้ว</p>
                      <p className="text-2xl font-bold text-green-600">{issuedCount}</p>
                    </div>
                    <Package className="w-8 h-8 text-green-500/20" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">รอสินค้า</p>
                      <p className="text-2xl font-bold text-orange-600">{waitingStockCount}</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-orange-500/20" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">ปฏิเสธ</p>
                      <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
                    </div>
                    <XCircle className="w-8 h-8 text-red-500/20" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs for Requests and Notifications */}
            <Tabs defaultValue="requests" className="space-y-4">
              <TabsList>
                <TabsTrigger value="requests" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  คำขอเบิก ({requests.length})
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  การแจ้งเตือน ({notifications.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="requests">
                <Card>
                  <CardHeader>
                    <CardTitle>รายการคำขอเบิกทั้งหมด</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {requestsLoading ? (
                      <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>
                    ) : requests.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">ไม่พบคำขอเบิก</div>
                    ) : (
                      <ScrollArea className="h-[400px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>เลขที่เอกสาร</TableHead>
                              <TableHead>รหัสสินค้า</TableHead>
                              <TableHead>ชื่อสินค้า</TableHead>
                              <TableHead className="text-right">จำนวน</TableHead>
                              <TableHead>วัตถุประสงค์</TableHead>
                              <TableHead>สถานะ</TableHead>
                              <TableHead>วันที่ขอ</TableHead>
                              <TableHead className="text-center">จัดการ</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {requests.map((request) => (
                              <TableRow key={request.id}>
                                <TableCell className="font-medium">{request.document_no}</TableCell>
                                <TableCell>{request.equipment_code || "-"}</TableCell>
                                <TableCell>{request.equipment_name || "-"}</TableCell>
                                <TableCell className="text-right">
                                  {request.issued_quantity && request.issued_quantity > 0 ? (
                                    <span>
                                      {request.issued_quantity}/{request.quantity} {request.unit}
                                    </span>
                                  ) : (
                                    <span>{request.quantity} {request.unit}</span>
                                  )}
                                </TableCell>
                                <TableCell>{request.purpose || "-"}</TableCell>
                                <TableCell>{getStatusBadge(request.status)}</TableCell>
                                <TableCell>
                                  {format(new Date(request.created_at), "d MMM yyyy HH:mm", { locale: th })}
                                </TableCell>
                                <TableCell className="text-center">
                                  {request.status === "pending" && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        >
                                          <Ban className="w-4 h-4 mr-1" />
                                          ยกเลิก
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>ยืนยันการยกเลิกคำขอ</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            คุณต้องการยกเลิกคำขอเบิก "{request.document_no}" หรือไม่?
                                            <br />
                                            สินค้า: {request.equipment_name} จำนวน {request.quantity} {request.unit}
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>ไม่ใช่</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => cancelRequestMutation.mutate(request.id)}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          >
                                            ยืนยันยกเลิก
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notifications">
                <Card>
                  <CardHeader>
                    <CardTitle>การแจ้งเตือนล่าสุด</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {notificationsLoading ? (
                      <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>
                    ) : notifications.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">ไม่พบการแจ้งเตือน</div>
                    ) : (
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-3">
                          {notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className={`p-4 rounded-lg border ${
                                notification.is_read ? "bg-muted/30" : "bg-background border-primary/20"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                {getNotificationIcon(notification.type)}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-foreground">{notification.title}</p>
                                  <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    {format(new Date(notification.created_at), "d MMM yyyy HH:mm น.", { locale: th })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}

        {!searchedName && (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">กรุณากรอกชื่อผู้เบิกเพื่อค้นหาคำขอและการแจ้งเตือน</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
