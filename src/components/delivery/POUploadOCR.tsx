import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { FileText, Upload, Loader2, CheckCircle2, AlertTriangle, X, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// ─── Default Field Mapping (fallback if DB config not found) ─
const DEFAULT_FIELD_MAPPING: Record<string, string> = {
  po_number: "poNumber",
  pr_number: "prNumber",
  vendor_code: "supplierId",
  vendor_name: "supplierName",
  department: "departmentId",
  comment: "notes",
  receipt_date: "expectedDate",
};

export interface POOCRData {
  po_number: string | null;
  po_date: string | null;
  buyer_company_name: string | null;
  vendor_code: string | null;
  vendor_name: string | null;
  pr_number: string | null;
  department: string | null;
  payment_terms: string | null;
  receipt_date: string | null;
  comment: string | null;
  items: POOCRItem[];
  total_excl_vat: number | null;
  vat: number | null;
  total_incl_vat: number | null;
}

export interface POOCRItem {
  item_no: string | null;
  description: string;
  asset_no: string | null;
  quantity: number;
  unit: string;
  unit_price: number | null;
  amount: number | null;
  // Matching results
  matched_equipment_id?: string | null;
  matched_equipment_code?: string | null;
  matched_equipment_name?: string | null;
  match_status?: "matched" | "not_found" | "new";
}

export interface POImportResult {
  poNumber: string;
  prNumber: string;
  supplierId: string;
  supplierName: string;
  departmentName: string;
  buyerCompanyId: string;
  buyerCompanyName: string;
  notes: string;
  items: POOCRItem[];
  pdfFile: File;
}

interface Supplier {
  id: string;
  code: string;
  name: string;
  vendor_code: string | null;
}

interface Equipment {
  id: string;
  code: string;
  name: string;
  unit: string;
  unit_price: number;
}

interface Department {
  id?: string;
  name: string;
}

interface Company {
  id: string;
  code: string;
  name: string;
  department_id: string | null;
}

interface POUploadOCRProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: POImportResult) => void;
  suppliers: Supplier[];
  equipment: Equipment[];
  departments: Department[];
  companies?: Company[];
}

export function POUploadOCR({
  open,
  onOpenChange,
  onImport,
  suppliers,
  equipment,
  departments,
  companies = [],
}: POUploadOCRProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrData, setOcrData] = useState<POOCRData | null>(null);

  // Editable header fields
  const [poNumber, setPoNumber] = useState("");
  const [prNumber, setPrNumber] = useState("");
  const [matchedSupplierId, setMatchedSupplierId] = useState("");
  const [matchedDepartment, setMatchedDepartment] = useState("");
  const [supplierMatchStatus, setSupplierMatchStatus] = useState<"matched" | "not_found" | "pending">("pending");
  const [deptMatchStatus, setDeptMatchStatus] = useState<"matched" | "not_found" | "pending">("pending");
  const [matchedBuyerCompanyId, setMatchedBuyerCompanyId] = useState("");
  const [matchedBuyerCompanyName, setMatchedBuyerCompanyName] = useState("");
  const [buyerMatchStatus, setBuyerMatchStatus] = useState<"matched" | "not_found" | "pending">("pending");
  const [comment, setComment] = useState("");
  const [items, setItems] = useState<POOCRItem[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>(DEFAULT_FIELD_MAPPING);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load dynamic field mapping from DB
  useEffect(() => {
    const loadMapping = async () => {
      try {
        const { data } = await supabase
          .from("system_settings")
          .select("value")
          .eq("key", "ocr_po_config")
          .maybeSingle();
        if (data?.value && (data.value as any).field_mapping) {
          setFieldMapping((data.value as any).field_mapping);
        }
      } catch {
        // Use defaults
      }
    };
    if (open) loadMapping();
  }, [open]);

  const resetState = useCallback(() => {
    setFile(null);
    setIsProcessing(false);
    setOcrData(null);
    setPoNumber("");
    setPrNumber("");
    setMatchedSupplierId("");
    setMatchedDepartment("");
    setSupplierMatchStatus("pending");
    setDeptMatchStatus("pending");
    setMatchedBuyerCompanyId("");
    setMatchedBuyerCompanyName("");
    setBuyerMatchStatus("pending");
    setComment("");
    setItems([]);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.type !== "application/pdf") {
      toast.error("รองรับเฉพาะไฟล์ PDF เท่านั้น");
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      toast.error("ไฟล์ต้องมีขนาดไม่เกิน 10MB");
      return;
    }
    setFile(selected);
    setOcrData(null);
  };

  const matchSupplier = (vendorCode: string | null, vendorName: string | null) => {
    if (vendorCode) {
      const found = suppliers.find((s) => s.vendor_code === vendorCode);
      if (found) {
        setMatchedSupplierId(found.id);
        setSupplierMatchStatus("matched");
        return;
      }
    }
    if (vendorName) {
      const found = suppliers.find((s) =>
        s.name.toLowerCase().includes(vendorName.toLowerCase()) ||
        vendorName.toLowerCase().includes(s.name.toLowerCase())
      );
      if (found) {
        setMatchedSupplierId(found.id);
        setSupplierMatchStatus("matched");
        return;
      }
    }
    setMatchedSupplierId("");
    setSupplierMatchStatus("not_found");
  };

  const matchDepartment = (deptName: string | null) => {
    if (!deptName) {
      setDeptMatchStatus("not_found");
      return;
    }
    const found = departments.find(
      (d) =>
        d.name.toLowerCase().includes(deptName.toLowerCase()) ||
        deptName.toLowerCase().includes(d.name.toLowerCase())
    );
    if (found) {
      setMatchedDepartment(found.name);
      setDeptMatchStatus("matched");
    } else {
      setMatchedDepartment("");
      setDeptMatchStatus("not_found");
    }
  };

  const matchEquipmentItems = (ocrItems: POOCRItem[]) => {
    return ocrItems.map((item) => {
      if (item.item_no) {
        const found = equipment.find(
          (e) => e.code === item.item_no || e.code.replace(/\s/g, "") === item.item_no.replace(/\s/g, "")
        );
        if (found) {
          return {
            ...item,
            matched_equipment_id: found.id,
            matched_equipment_code: found.code,
            matched_equipment_name: found.name,
            match_status: "matched" as const,
          };
        }
      }
      return { ...item, match_status: "not_found" as const };
    });
  };

  const handleProcess = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      // Convert PDF to base64
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      const { data, error } = await supabase.functions.invoke("ocr-purchase-order", {
        body: { pdf_base64: base64 },
      });

      if (error) {
        console.error("OCR error:", error);
        toast.error("ไม่สามารถอ่านเอกสาร PO ได้: " + (error.message || "Unknown error"));
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      const extracted: POOCRData = data?.data;
      if (!extracted) {
        toast.error("ไม่พบข้อมูลในเอกสาร PO");
        return;
      }

      setOcrData(extracted);
      setPoNumber(extracted.po_number || "");
      setPrNumber(extracted.pr_number || "");
      setComment(extracted.comment || "");

      // Match supplier
      matchSupplier(extracted.vendor_code, extracted.vendor_name);

      // Match department
      matchDepartment(extracted.department);

      // Match items
      const matchedItems = matchEquipmentItems(extracted.items || []);
      setItems(matchedItems);

      toast.success(`อ่านข้อมูล PO สำเร็จ: ${matchedItems.length} รายการ`);
    } catch (err) {
      console.error("Process error:", err);
      toast.error("เกิดข้อผิดพลาดในการอ่านเอกสาร");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleItemEquipmentChange = (index: number, equipmentId: string) => {
    const eq = equipment.find((e) => e.id === equipmentId);
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              matched_equipment_id: equipmentId,
              matched_equipment_code: eq?.code || null,
              matched_equipment_name: eq?.name || null,
              match_status: equipmentId ? "matched" : "not_found",
            }
          : item
      )
    );
  };

  const handleImport = () => {
    if (!file) return;

    const result: POImportResult = {
      poNumber,
      prNumber,
      supplierId: matchedSupplierId,
      supplierName:
        suppliers.find((s) => s.id === matchedSupplierId)?.name || ocrData?.vendor_name || "",
      departmentName: matchedDepartment,
      notes: comment,
      items,
      pdfFile: file,
    };

    onImport(result);
    resetState();
    onOpenChange(false);
  };

  const supplierOptions = suppliers.map((s) => ({
    value: s.id,
    label: `${s.code} - ${s.name}`,
    description: s.vendor_code ? `Vendor: ${s.vendor_code}` : undefined,
    searchableText: s.vendor_code || undefined,
  }));

  const departmentOptions = departments.map((d) => ({
    value: d.name,
    label: d.name,
  }));

  const equipmentOptions = equipment.map((e) => ({
    value: e.id,
    label: `${e.code} - ${e.name}`,
    description: `${e.unit} | ฿${e.unit_price.toLocaleString()}`,
  }));

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetState();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="w-5 h-5" />
            นำเข้าจาก PO (OCR)
          </DialogTitle>
          <DialogDescription>
            อัปโหลดไฟล์ Purchase Order (PDF) ระบบจะอ่านข้อมูลอัตโนมัติ ตรวจสอบแล้วกดนำเข้า
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="font-semibold">1. เลือกไฟล์ PO</Label>
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(file.size / 1024 / 1024).toFixed(1)} MB)
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setOcrData(null);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    คลิกเลือกไฟล์ PDF หรือลากมาวาง (จำกัด 10MB)
                  </p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {file && !ocrData && (
            <Button onClick={handleProcess} disabled={isProcessing} className="w-full">
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังอ่านเอกสาร PO...
                </>
              ) : (
                <>
                  <ScanLine className="w-4 h-4" />
                  อ่านข้อมูล PO
                </>
              )}
            </Button>
          )}

          {/* Step 2: Review */}
          {ocrData && (
            <div className="space-y-4">
              <Label className="font-semibold">2. ตรวจสอบข้อมูล</Label>

              {/* Header info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-muted/30 rounded-lg">
                <div className="space-y-1">
                  <Label className="text-xs">เลขที่ PO</Label>
                  <Input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">เลขที่ PR</Label>
                  <Input value={prNumber} onChange={(e) => setPrNumber(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    ผู้จัดจำหน่าย
                    {supplierMatchStatus === "matched" && (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> พบในระบบ
                      </Badge>
                    )}
                    {supplierMatchStatus === "not_found" && (
                      <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                        <AlertTriangle className="w-3 h-3 mr-1" /> เลือกเอง
                      </Badge>
                    )}
                  </Label>
                  <SearchableSelect
                    options={supplierOptions}
                    value={matchedSupplierId}
                    onValueChange={(v) => {
                      setMatchedSupplierId(v);
                      setSupplierMatchStatus(v ? "matched" : "not_found");
                    }}
                    placeholder="เลือกผู้จัดจำหน่าย"
                    searchPlaceholder="ค้นหา..."
                    emptyMessage="ไม่พบผู้จัดจำหน่าย"
                  />
                  {ocrData.vendor_name && (
                    <p className="text-xs text-muted-foreground">
                      จาก PO: {ocrData.vendor_code} - {ocrData.vendor_name}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    ฝ่าย
                    {deptMatchStatus === "matched" && (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> พบ
                      </Badge>
                    )}
                    {deptMatchStatus === "not_found" && (
                      <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                        <AlertTriangle className="w-3 h-3 mr-1" /> เลือกเอง
                      </Badge>
                    )}
                  </Label>
                  <SearchableSelect
                    options={departmentOptions}
                    value={matchedDepartment}
                    onValueChange={(v) => {
                      setMatchedDepartment(v);
                      setDeptMatchStatus(v ? "matched" : "not_found");
                    }}
                    placeholder="เลือกฝ่าย"
                    searchPlaceholder="ค้นหาฝ่าย..."
                    emptyMessage="ไม่พบฝ่าย"
                  />
                  {ocrData.department && (
                    <p className="text-xs text-muted-foreground">จาก PO: {ocrData.department}</p>
                  )}
                </div>
                {ocrData.payment_terms && (
                  <div className="space-y-1">
                    <Label className="text-xs">เงื่อนไขชำระ</Label>
                    <Input value={ocrData.payment_terms} disabled className="bg-muted/50" />
                  </div>
                )}
                {ocrData.po_date && (
                  <div className="space-y-1">
                    <Label className="text-xs">วันที่ PO</Label>
                    <Input value={ocrData.po_date} disabled className="bg-muted/50" />
                  </div>
                )}
                <div className="md:col-span-2 space-y-1">
                  <Label className="text-xs">หมายเหตุ</Label>
                  <Input value={comment} onChange={(e) => setComment(e.target.value)} />
                </div>
              </div>

              {/* Items table */}
              <div className="space-y-2">
                <Label className="font-semibold text-sm">
                  รายการสินค้า ({items.length} รายการ)
                </Label>
                <div className="border rounded-lg overflow-auto max-h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead className="min-w-[120px]">รหัสสินค้า</TableHead>
                        <TableHead className="min-w-[200px]">รายละเอียด</TableHead>
                        <TableHead className="w-20 text-right">จำนวน</TableHead>
                        <TableHead className="w-16">หน่วย</TableHead>
                        <TableHead className="w-28 text-right">ราคา/หน่วย</TableHead>
                        <TableHead className="min-w-[200px]">Match สินค้า</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-mono text-xs">{item.item_no || "-"}</TableCell>
                          <TableCell className="text-xs max-w-[250px] truncate" title={item.description}>
                            {item.description}
                          </TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell className="text-right">
                            {item.unit_price != null ? `฿${item.unit_price.toLocaleString()}` : "-"}
                          </TableCell>
                          <TableCell>
                            {item.match_status === "matched" ? (
                              <div className="flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                                <span className="text-xs truncate">{item.matched_equipment_code}</span>
                              </div>
                            ) : (
                              <SearchableSelect
                                options={equipmentOptions}
                                value={item.matched_equipment_id || ""}
                                onValueChange={(v) => handleItemEquipmentChange(idx, v)}
                                placeholder="เลือกสินค้า..."
                                searchPlaceholder="ค้นหา..."
                                emptyMessage="ไม่พบ"
                                triggerClassName="h-8 text-xs"
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {ocrData.total_incl_vat != null && (
                  <div className="text-right text-sm text-muted-foreground">
                    ยอดรวม: ฿{ocrData.total_excl_vat?.toLocaleString() || 0} | VAT: ฿
                    {ocrData.vat?.toLocaleString() || 0} |{" "}
                    <span className="font-semibold text-foreground">
                      สุทธิ: ฿{ocrData.total_incl_vat.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {ocrData && (
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetState(); onOpenChange(false); }}>
              ยกเลิก
            </Button>
            <Button onClick={handleImport}>
              <FileText className="w-4 h-4" />
              นำเข้าข้อมูล ({items.length} รายการ)
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
