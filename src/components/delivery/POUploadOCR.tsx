import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  // Per-unit fields parsed from description
  model?: string | null;
  warranty_years?: number | null;
  asset_caretaker?: string | null;
  planned_location?: string | null;
  // Matching results
  matched_equipment_id?: string | null;
  matched_equipment_code?: string | null;
  matched_equipment_name?: string | null;
  matched_is_media_player?: boolean;
  device_kind?: "MEDIA_PLAYER" | "MONITOR" | "EQUIPMENT";
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

interface MediaPlayer {
  id: string;
  code: string;
  name: string;
  unit_price?: number | null;
  device_type?: string | null;
}

type DeviceKind = "MEDIA_PLAYER" | "MONITOR" | "EQUIPMENT";

const KIND_LABELS: Record<DeviceKind, string> = {
  MEDIA_PLAYER: "Media Player",
  MONITOR: "จอภาพ (Monitor)",
  EQUIPMENT: "สินค้า/อุปกรณ์",
};

interface POUploadOCRProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: POImportResult) => void;
  suppliers: Supplier[];
  equipment: Equipment[];
  departments: Department[];
  companies?: Company[];
  mediaPlayers?: MediaPlayer[];
}

export function POUploadOCR({
  open,
  onOpenChange,
  onImport,
  suppliers,
  equipment,
  departments,
  companies = [],
  mediaPlayers = [],
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

  const [isDragging, setIsDragging] = useState(false);

  const acceptFile = (selected: File | undefined | null) => {
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    acceptFile(e.target.files?.[0]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    acceptFile(e.dataTransfer.files?.[0]);
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

  const matchBuyerCompany = (companyName: string | null) => {
    if (!companyName || companies.length === 0) {
      setMatchedBuyerCompanyId("");
      setMatchedBuyerCompanyName(companyName || "");
      setBuyerMatchStatus("not_found");
      return;
    }
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
    const target = norm(companyName);
    const found = companies.find((c) => {
      const n = norm(c.name);
      return n.includes(target) || target.includes(n);
    });
    if (found) {
      setMatchedBuyerCompanyId(found.id);
      setMatchedBuyerCompanyName(found.name);
      setBuyerMatchStatus("matched");
    } else {
      setMatchedBuyerCompanyId("");
      setMatchedBuyerCompanyName(companyName);
      setBuyerMatchStatus("not_found");
    }
  };

  // Fallback regex parsing from description for fields AI may have missed
  const parseFieldsFromDescription = (item: POOCRItem): POOCRItem => {
    // Normalize newlines/extra spaces so lookaheads work consistently
    const desc = (item.description || "").replace(/\r/g, " ").replace(/\n+/g, " ").replace(/\s{2,}/g, " ").trim();
    let model = item.model;
    let asset_caretaker = item.asset_caretaker;
    let planned_location = item.planned_location;
    let warranty_years = item.warranty_years;

    if (!model) {
      const m = desc.match(/(?:รุ่น|Model)\s*[:：]?\s*([A-Za-z0-9][A-Za-z0-9._/\-]*)/i);
      if (m) model = m[1].trim();
    }
    if (!asset_caretaker) {
      // Match through end-of-string or until next known keyword. Allow ทรัพยสิน / ทรัพย์สิน variants.
      const m = desc.match(/ผู้ดูแล(?:ทรัพย[์]?สิน)?\s*[:：]\s*(.+?)(?=\s*(?:Location|รุ่น|Model|รับประกัน|อ้างอิง|จำนวน|Asset|Item|$))/i);
      if (m) asset_caretaker = m[1].replace(/[\s:：\-]+$/, "").trim();
    }
    if (!planned_location) {
      const m = desc.match(/Location\s*[:：]\s*(.+?)(?=\s*(?:ผู้ดูแล|รุ่น|Model|รับประกัน|อ้างอิง|จำนวน|Asset|Item|$))/i);
      if (m) planned_location = m[1].replace(/[\s:：\-]+$/, "").trim();
    }
    if (warranty_years == null) {
      // Years
      let m = desc.match(/รับประกัน(?:สินค้า)?\s*[:：]?\s*(\d+(?:\.\d+)?)\s*ปี/);
      if (m) {
        warranty_years = Number(m[1]);
      } else {
        // Months → years
        m = desc.match(/รับประกัน(?:สินค้า)?\s*[:：]?\s*(\d+)\s*เดือน/);
        if (m) warranty_years = Math.round((Number(m[1]) / 12) * 10) / 10;
        else {
          m = desc.match(/warranty\s*[:：]?\s*(\d+(?:\.\d+)?)\s*(year|yr|y)/i);
          if (m) warranty_years = Number(m[1]);
        }
      }
    }
    return {
      ...item,
      model: model || null,
      asset_caretaker: asset_caretaker || null,
      planned_location: planned_location || null,
      warranty_years: warranty_years ?? null,
    };
  };

  const mpKind = (m: MediaPlayer): DeviceKind =>
    String(m.device_type || "").toUpperCase() === "MONITOR" ? "MONITOR" : "MEDIA_PLAYER";

  const matchEquipmentItems = (ocrItems: POOCRItem[]) => {
    return ocrItems.map((rawItem) => {
      const item = parseFieldsFromDescription(rawItem);
      if (item.item_no) {
        const target = item.item_no.replace(/\s/g, "");
        const found = equipment.find(
          (e) => e.code === item.item_no || e.code.replace(/\s/g, "") === target
        );
        if (found) {
          return {
            ...item,
            matched_equipment_id: found.id,
            matched_equipment_code: found.code,
            matched_equipment_name: found.name,
            matched_is_media_player: false,
            device_kind: "EQUIPMENT" as DeviceKind,
            match_status: "matched" as const,
          };
        }
        const foundMp = mediaPlayers.find(
          (m) => m.code === item.item_no || m.code.replace(/\s/g, "") === target
        );
        if (foundMp) {
          return {
            ...item,
            matched_equipment_id: foundMp.id,
            matched_equipment_code: foundMp.code,
            matched_equipment_name: foundMp.name,
            matched_is_media_player: true,
            device_kind: mpKind(foundMp),
            match_status: "matched" as const,
          };
        }
      }
      // Default kind guess: if description mentions monitor/จอ → MONITOR, else EQUIPMENT
      const desc = (item.description || "").toLowerCase();
      const guess: DeviceKind = /monitor|จอภาพ|จอ\s|จอ$|display|screen/i.test(desc)
        ? "MONITOR"
        : /media\s*player|มีเดีย/i.test(desc)
        ? "MEDIA_PLAYER"
        : "EQUIPMENT";
      return { ...item, device_kind: guess, match_status: "not_found" as const };
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

      // Match buyer company (จากหัวกระดาษ)
      matchBuyerCompany(extracted.buyer_company_name);

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
    const mp = !eq ? mediaPlayers.find((m) => m.id === equipmentId) : null;
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              matched_equipment_id: equipmentId,
              matched_equipment_code: eq?.code || mp?.code || null,
              matched_equipment_name: eq?.name || mp?.name || null,
              matched_is_media_player: !!mp,
              device_kind: eq ? "EQUIPMENT" : mp ? mpKind(mp) : item.device_kind,
              match_status: equipmentId ? "matched" : "not_found",
            }
          : item
      )
    );
  };

  const handleItemKindChange = (index: number, kind: DeviceKind) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              device_kind: kind,
              // Clear match if previous selection no longer fits new kind
              matched_equipment_id: null,
              matched_equipment_code: null,
              matched_equipment_name: null,
              matched_is_media_player: kind !== "EQUIPMENT",
              match_status: "not_found",
            }
          : item
      )
    );
  };

  const handleItemFieldChange = (index: number, field: keyof POOCRItem, value: any) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
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
      buyerCompanyId: matchedBuyerCompanyId,
      buyerCompanyName: matchedBuyerCompanyName,
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

  const equipmentOptions = [
    ...equipment.map((e) => ({
      value: e.id,
      label: `${e.code} - ${e.name}`,
      description: `${e.unit} | ฿${e.unit_price.toLocaleString()}`,
    })),
    ...mediaPlayers.map((m) => ({
      value: m.id,
      label: `${m.code} - ${m.name}`,
      description: `Media Player${m.unit_price ? ` | ฿${Number(m.unit_price).toLocaleString()}` : ""}`,
    })),
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetState();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-[98vw] sm:max-w-[95vw] xl:max-w-[1600px] max-h-[95vh] overflow-y-auto">
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
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
              onDrop={handleDrop}
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
                <div className="md:col-span-2 space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    บริษัทผู้ซื้อ (จากหัวกระดาษ)
                    {buyerMatchStatus === "matched" && (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> พบในระบบ - จะกรอกอัตโนมัติ
                      </Badge>
                    )}
                    {buyerMatchStatus === "not_found" && ocrData.buyer_company_name && (
                      <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                        <AlertTriangle className="w-3 h-3 mr-1" /> ไม่พบในระบบ - เลือกในฟอร์มเอง
                      </Badge>
                    )}
                  </Label>
                  <Input
                    value={matchedBuyerCompanyName || ocrData.buyer_company_name || ""}
                    disabled
                    className="bg-muted/50"
                  />
                  {ocrData.buyer_company_name && (
                    <p className="text-xs text-muted-foreground">จาก PO: {ocrData.buyer_company_name}</p>
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="font-semibold text-sm">
                    รายการสินค้า ({items.length} รายการ)
                  </Label>
                  {mediaPlayers.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs whitespace-nowrap">ตั้งรหัส Media Player ให้ทุกรายการ:</Label>
                      <div className="w-64">
                        <SearchableSelect
                          options={mediaPlayers.map((m) => ({
                            value: m.id,
                            label: `${m.code} - ${m.name}`,
                            description: "Media Player",
                          }))}
                          value=""
                          onValueChange={(v) => {
                            const mp = mediaPlayers.find((m) => m.id === v);
                            if (!mp) return;
                            setItems((prev) =>
                              prev.map((it) => ({
                                ...it,
                                matched_equipment_id: mp.id,
                                matched_equipment_code: mp.code,
                                matched_equipment_name: mp.name,
                                matched_is_media_player: true,
                                match_status: "matched" as const,
                              }))
                            );
                            toast.success(`ตั้งรหัส ${mp.code} ให้ทุกรายการแล้ว`);
                          }}
                          placeholder="เลือก MP เพื่อใช้กับทุกรายการ..."
                          searchPlaceholder="ค้นหา MP..."
                          emptyMessage="ไม่พบ"
                          triggerClassName="h-8 text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="border rounded-lg overflow-auto max-h-[60vh]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead className="w-[120px]">รหัสสินค้า</TableHead>
                        <TableHead className="w-[260px]">รายละเอียด</TableHead>
                        <TableHead className="w-16 text-right">จำนวน</TableHead>
                        <TableHead className="w-16">หน่วย</TableHead>
                        <TableHead className="w-24 text-right">ราคา/หน่วย</TableHead>
                        <TableHead className="w-[120px]">Asset No.</TableHead>
                        <TableHead className="w-[150px]">รุ่น</TableHead>
                        <TableHead className="w-[90px] text-right">รับประกัน (ปี)</TableHead>
                        <TableHead className="w-[170px]">ผู้ดูแล</TableHead>
                        <TableHead className="w-[220px]">Location ตามแผน</TableHead>
                        <TableHead className="w-[200px]">Match สินค้า</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-mono text-xs whitespace-nowrap">{item.item_no || "-"}</TableCell>
                          <TableCell className="text-xs whitespace-pre-line align-top" title={item.description}>
                            <div className="line-clamp-4">{item.description}</div>
                          </TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell className="text-right">
                            {item.unit_price != null ? `฿${item.unit_price.toLocaleString()}` : "-"}
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.asset_no || ""}
                              onChange={(e) => handleItemFieldChange(idx, "asset_no", e.target.value)}
                              className="h-8 text-xs font-mono"
                              placeholder="TE…"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.model || ""}
                              onChange={(e) => handleItemFieldChange(idx, "model", e.target.value)}
                              className="h-8 text-xs"
                              placeholder="รุ่น"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              step={0.5}
                              value={item.warranty_years ?? ""}
                              onChange={(e) =>
                                handleItemFieldChange(
                                  idx,
                                  "warranty_years",
                                  e.target.value === "" ? null : Number(e.target.value)
                                )
                              }
                              className="h-8 text-xs text-right"
                              placeholder="ปี"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.asset_caretaker || ""}
                              onChange={(e) =>
                                handleItemFieldChange(idx, "asset_caretaker", e.target.value)
                              }
                              className="h-8 text-xs"
                              placeholder="ชื่อผู้ดูแล"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.planned_location || ""}
                              onChange={(e) =>
                                handleItemFieldChange(idx, "planned_location", e.target.value)
                              }
                              className="h-8 text-xs"
                              placeholder="จุดติดตั้ง"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <SearchableSelect
                                options={equipmentOptions}
                                value={item.matched_equipment_id || ""}
                                onValueChange={(v) => handleItemEquipmentChange(idx, v)}
                                placeholder="เลือกสินค้า..."
                                searchPlaceholder="ค้นหา..."
                                emptyMessage="ไม่พบ"
                                triggerClassName="h-8 text-xs"
                              />
                              {item.match_status === "matched" && (
                                <div className="flex items-center gap-1 text-[10px] text-green-600">
                                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                                  <span className="truncate">
                                    Auto: {item.matched_equipment_code}
                                    {item.matched_is_media_player ? " (MP)" : ""}
                                  </span>
                                </div>
                              )}
                            </div>
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
