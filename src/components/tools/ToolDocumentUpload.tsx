import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, FileText, Download, Trash2, Loader2 } from "lucide-react";

export const DOCUMENT_TYPES: { value: string; label: string }[] = [
  { value: "warranty", label: "ใบรับประกัน (Warranty)" },
  { value: "po", label: "ใบสั่งซื้อ (PO)" },
  { value: "pr", label: "ใบขอซื้อ (PR)" },
  { value: "invoice", label: "ใบกำกับภาษี/Invoice" },
  { value: "delivery_note", label: "ใบส่งของ" },
  { value: "manual", label: "คู่มือการใช้งาน (Manual)" },
  { value: "certificate", label: "ใบรับรอง/Calibration" },
  { value: "other", label: "อื่นๆ" },
];

const BUCKET = "tool-documents";

export interface ToolDocumentItem {
  id?: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  notes?: string;
  created_at?: string;
  _newFile?: File;
  _pendingType?: string;
  _pendingNotes?: string;
}

interface Props {
  toolCode: string; // used in filename autoprefix
  toolId?: string; // if present, load & persist immediately
  value: ToolDocumentItem[];
  onChange: (items: ToolDocumentItem[]) => void;
  disabled?: boolean;
}

/** Sanitize for display/file names — keeps Thai chars for readability. */
function sanitize(s: string) {
  return s.replace(/[^\w.\-ก-๙]+/g, "_").slice(0, 80);
}

/** Sanitize for Supabase Storage keys — ASCII-safe only (no spaces, no Thai). */
function sanitizeKey(s: string) {
  const cleaned = (s || "").replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80);
  return cleaned || "unassigned";
}

function buildFileName(toolCode: string, docType: string, original: string) {
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const dotIdx = original.lastIndexOf(".");
  const ext = dotIdx >= 0 ? original.slice(dotIdx) : "";
  const base = dotIdx >= 0 ? original.slice(0, dotIdx) : original;
  // File name kept human-readable (Thai allowed) but folder key stays ASCII-safe
  return `${sanitizeKey(toolCode)}_${docType}_${ymd}_${sanitize(base)}${ext.toLowerCase()}`;
}

export function ToolDocumentUpload({ toolCode, toolId, value, onChange, disabled }: Props) {
  const [uploading, setUploading] = useState(false);
  const [pendingType, setPendingType] = useState<string>("warranty");
  const [pendingNotes, setPendingNotes] = useState<string>("");
  const [signed, setSigned] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const paths = value.filter((v) => v.file_path).map((v) => v.file_path);
      if (paths.length === 0) return;
      const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
      const map: Record<string, string> = {};
      (data || []).forEach((d) => {
        if (d.path && d.signedUrl) map[d.path] = d.signedUrl;
      });
      setSigned(map);
    })();
  }, [value]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const newItems: ToolDocumentItem[] = [];
      for (const f of Array.from(files)) {
        if (f.size > 20 * 1024 * 1024) {
          toast.error(`ไฟล์ ${f.name} เกิน 20MB`);
          continue;
        }
        const finalName = buildFileName(toolCode || "TOOL", pendingType, f.name);
        const path = `${toolCode || "unassigned"}/${finalName}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, f, { upsert: false, contentType: f.type });
        if (upErr) {
          toast.error(`อัพโหลด ${f.name} ล้มเหลว: ${upErr.message}`);
          continue;
        }
        const item: ToolDocumentItem = {
          document_type: pendingType,
          file_name: finalName,
          file_path: path,
          file_size: f.size,
          mime_type: f.type,
          notes: pendingNotes || undefined,
        };
        // Persist to DB if we have toolId (edit mode)
        if (toolId) {
          const { data: inserted, error: insErr } = await supabase
            .from("tool_documents")
            .insert({
              tool_id: toolId,
              document_type: item.document_type,
              file_name: item.file_name,
              file_path: item.file_path,
              file_size: item.file_size,
              mime_type: item.mime_type,
              notes: item.notes,
            })
            .select("id")
            .single();
          if (insErr) {
            toast.error("บันทึกข้อมูลเอกสารล้มเหลว");
            await supabase.storage.from(BUCKET).remove([path]);
            continue;
          }
          item.id = inserted.id;
        }
        newItems.push(item);
      }
      if (newItems.length > 0) {
        onChange([...value, ...newItems]);
        setPendingNotes("");
        toast.success(`อัพโหลด ${newItems.length} ไฟล์สำเร็จ`);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (item: ToolDocumentItem) => {
    if (!confirm(`ลบไฟล์ ${item.file_name}?`)) return;
    try {
      if (item.id) {
        await supabase.from("tool_documents").delete().eq("id", item.id);
      }
      await supabase.storage.from(BUCKET).remove([item.file_path]);
      onChange(value.filter((v) => v.file_path !== item.file_path));
      toast.success("ลบไฟล์แล้ว");
    } catch {
      toast.error("ลบไฟล์ไม่สำเร็จ");
    }
  };

  const handleDownload = async (item: ToolDocumentItem) => {
    const url = signed[item.file_path];
    if (!url) {
      toast.error("URL ยังไม่พร้อม");
      return;
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = item.file_name;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-dashed p-3 bg-muted/30 space-y-2">
        <div className="text-xs text-muted-foreground">
          📎 อัพโหลดเอกสารประกอบ (ไม่บังคับ) — ไฟล์จะถูกตั้งชื่อเป็น <code>{"{รหัสเครื่องมือ}_{ประเภท}_{วันที่}_{ชื่อเดิม}"}</code> เพื่อค้นหาได้ง่าย
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
          <div className="md:col-span-4">
            <Label className="text-xs">ประเภทเอกสาร</Label>
            <Select value={pendingType} onValueChange={setPendingType} disabled={disabled}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((d) => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-5">
            <Label className="text-xs">หมายเหตุ (เช่น เลขที่ PO)</Label>
            <Input
              value={pendingNotes}
              onChange={(e) => setPendingNotes(e.target.value)}
              placeholder="ไม่บังคับ"
              className="h-9"
              disabled={disabled}
            />
          </div>
          <div className="md:col-span-3">
            <Label className="text-xs">&nbsp;</Label>
            <label>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                disabled={disabled || uploading}
              />
              <div className={`flex items-center justify-center gap-2 h-9 rounded-md border bg-primary text-primary-foreground text-sm cursor-pointer hover:opacity-90 ${uploading ? "opacity-50" : ""}`}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                <span>เลือกไฟล์</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      {value.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">
            ไฟล์แนบ ({value.length})
          </div>
          {value.map((item) => {
            const label = DOCUMENT_TYPES.find((d) => d.value === item.document_type)?.label || item.document_type;
            return (
              <div key={item.file_path} className="flex items-center gap-2 rounded-md border px-2 py-1.5 bg-background">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{item.file_name}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="text-[10px]">{label}</Badge>
                    {item.notes && <span className="truncate">{item.notes}</span>}
                    {item.file_size && <span>{(item.file_size / 1024).toFixed(0)} KB</span>}
                  </div>
                </div>
                <Button type="button" size="icon" variant="ghost" onClick={() => handleDownload(item)} title="ดาวน์โหลด">
                  <Download className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" onClick={() => handleDelete(item)} title="ลบ" disabled={disabled}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export async function loadToolDocuments(toolId: string): Promise<ToolDocumentItem[]> {
  const { data } = await supabase
    .from("tool_documents")
    .select("*")
    .eq("tool_id", toolId)
    .order("created_at", { ascending: false });
  return (data || []).map((d: any) => ({
    id: d.id,
    document_type: d.document_type,
    file_name: d.file_name,
    file_path: d.file_path,
    file_size: d.file_size,
    mime_type: d.mime_type,
    notes: d.notes,
    created_at: d.created_at,
  }));
}

export async function persistPendingToolDocuments(toolId: string, items: ToolDocumentItem[]) {
  const pending = items.filter((i) => !i.id);
  if (pending.length === 0) return;
  await supabase.from("tool_documents").insert(
    pending.map((i) => ({
      tool_id: toolId,
      document_type: i.document_type,
      file_name: i.file_name,
      file_path: i.file_path,
      file_size: i.file_size,
      mime_type: i.mime_type,
      notes: i.notes,
    }))
  );
}
