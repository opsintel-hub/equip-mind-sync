import { useState, useEffect } from "react";
import { Search, FileText, Download, ExternalLink, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface DocumentRecord {
  id: string;
  document_no: string;
  document_url: string | null;
  equipment_code: string | null;
  equipment_name: string | null;
  supplier_name: string | null;
  delivery_person_name: string | null;
  quantity: number;
  unit: string;
  created_at: string;
  status: string;
  source: "pending" | "received";
}

export default function DocumentSearch() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState<string>("all");
  const [hasSearched, setHasSearched] = useState(false);

  const fetchDocuments = async () => {
    setLoading(true);
    setHasSearched(true);
    try {
      // Fetch from goods_receipt_pending (with documents)
      const { data: pendingData, error: pendingError } = await supabase
        .from("goods_receipt_pending")
        .select("*")
        .not("document_url", "is", null)
        .order("created_at", { ascending: false });

      if (pendingError) throw pendingError;

      // Fetch from goods_receipt (with documents)
      const { data: receiptData, error: receiptError } = await supabase
        .from("goods_receipt")
        .select("*, equipment:equipment_id(code, name)")
        .not("document_url", "is", null)
        .order("created_at", { ascending: false });

      if (receiptError) throw receiptError;

      // Combine and format data
      const pendingDocs: DocumentRecord[] = (pendingData || []).map((item) => ({
        id: item.id,
        document_no: item.document_no,
        document_url: item.document_url,
        equipment_code: item.equipment_code,
        equipment_name: item.equipment_name,
        supplier_name: item.supplier_name,
        delivery_person_name: item.delivery_person_name,
        quantity: item.quantity,
        unit: item.unit,
        created_at: item.created_at,
        status: item.status,
        source: "pending" as const,
      }));

      const receiptDocs: DocumentRecord[] = (receiptData || []).map((item: any) => ({
        id: item.id,
        document_no: item.document_no,
        document_url: item.document_url,
        equipment_code: item.equipment?.code || null,
        equipment_name: item.equipment?.name || null,
        supplier_name: item.supplier,
        delivery_person_name: null,
        quantity: item.quantity,
        unit: "ชิ้น",
        created_at: item.created_at,
        status: item.status,
        source: "received" as const,
      }));

      setDocuments([...pendingDocs, ...receiptDocs]);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("ไม่สามารถโหลดเอกสารได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const filteredDocuments = documents.filter((doc) => {
    if (!searchTerm) return true;

    const term = searchTerm.toLowerCase();

    switch (searchType) {
      case "supplier":
        return doc.supplier_name?.toLowerCase().includes(term);
      case "equipment":
        return (
          doc.equipment_code?.toLowerCase().includes(term) ||
          doc.equipment_name?.toLowerCase().includes(term)
        );
      case "document":
        return doc.document_no.toLowerCase().includes(term);
      default:
        return (
          doc.supplier_name?.toLowerCase().includes(term) ||
          doc.equipment_code?.toLowerCase().includes(term) ||
          doc.equipment_name?.toLowerCase().includes(term) ||
          doc.document_no.toLowerCase().includes(term) ||
          doc.delivery_person_name?.toLowerCase().includes(term)
        );
    }
  });

  const getStatusBadge = (status: string, source: string) => {
    if (source === "received") {
      return <Badge className="bg-green-100 text-green-800">รับเข้าคลังแล้ว</Badge>;
    }
    switch (status) {
      case "pending":
        return <Badge variant="secondary">รอรับเข้าคลัง</Badge>;
      case "received":
        return <Badge className="bg-green-100 text-green-800">รับแล้ว</Badge>;
      case "rejected":
        return <Badge variant="destructive">ปฏิเสธ</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ค้นหาเอกสาร</h1>
        <p className="text-muted-foreground">
          ค้นหาเอกสารจากการรับสินค้าเข้าระบบ
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            ค้นหาเอกสาร
          </CardTitle>
          <CardDescription>
            ค้นหาจากผู้จำหน่าย รหัสอุปกรณ์ หรือเลขที่เอกสาร
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label>ค้นหา</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="พิมพ์คำค้นหา..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-full sm:w-48 space-y-2">
              <Label>ประเภทการค้นหา</Label>
              <Select value={searchType} onValueChange={setSearchType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="supplier">ผู้จำหน่าย</SelectItem>
                  <SelectItem value="equipment">รหัส/ชื่ออุปกรณ์</SelectItem>
                  <SelectItem value="document">เลขที่เอกสาร</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={fetchDocuments} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                รีเฟรช
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            รายการเอกสาร
          </CardTitle>
          <CardDescription>
            พบ {filteredDocuments.length} รายการ
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              {hasSearched ? (
                searchTerm ? (
                  <p>ไม่พบเอกสารที่ตรงกับคำค้นหา "{searchTerm}"</p>
                ) : (
                  <p>ไม่พบเอกสารในระบบ</p>
                )
              ) : (
                <p>กำลังโหลด...</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เลขที่เอกสาร</TableHead>
                    <TableHead>รหัสอุปกรณ์</TableHead>
                    <TableHead>ชื่ออุปกรณ์</TableHead>
                    <TableHead>ผู้จำหน่าย</TableHead>
                    <TableHead className="text-right">จำนวน</TableHead>
                    <TableHead>วันที่</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="text-center">เอกสาร</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={`${doc.source}-${doc.id}`}>
                      <TableCell className="font-medium">{doc.document_no}</TableCell>
                      <TableCell>{doc.equipment_code || "-"}</TableCell>
                      <TableCell>{doc.equipment_name || "-"}</TableCell>
                      <TableCell>{doc.supplier_name || "-"}</TableCell>
                      <TableCell className="text-right">
                        {doc.quantity.toLocaleString()} {doc.unit}
                      </TableCell>
                      <TableCell>
                        {format(new Date(doc.created_at), "dd MMM yyyy", { locale: th })}
                      </TableCell>
                      <TableCell>{getStatusBadge(doc.status, doc.source)}</TableCell>
                      <TableCell className="text-center">
                        {doc.document_url ? (
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              title="ดูเอกสาร"
                            >
                              <a
                                href={doc.document_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              title="ดาวน์โหลด"
                            >
                              <a
                                href={doc.document_url}
                                download
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
