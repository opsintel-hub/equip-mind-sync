import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Paperclip, FileText, Download, Loader2, Search } from "lucide-react";
import { DOCUMENT_TYPES, type ToolDocumentItem } from "./ToolDocumentUpload";

interface Props {
  toolId: string;
  toolCode: string;
  toolName: string;
}

const BUCKET = "tool-documents";

export function ToolDocumentViewer({ toolId, toolCode, toolName }: Props) {
  const [open, setOpen] = useState(false);
  const [docs, setDocs] = useState<ToolDocumentItem[]>([]);
  const [count, setCount] = useState<number>(0);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  // Fetch count on mount
  useEffect(() => {
    (async () => {
      const { count } = await supabase
        .from("tool_documents")
        .select("*", { count: "exact", head: true })
        .eq("tool_id", toolId);
      setCount(count || 0);
    })();
  }, [toolId]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("tool_documents")
        .select("*")
        .eq("tool_id", toolId)
        .order("created_at", { ascending: false });
      const items = (data || []).map((d: any) => ({
        id: d.id,
        document_type: d.document_type,
        file_name: d.file_name,
        file_path: d.file_path,
        file_size: d.file_size,
        mime_type: d.mime_type,
        notes: d.notes,
        created_at: d.created_at,
      })) as ToolDocumentItem[];
      setDocs(items);
      const paths = items.map((i) => i.file_path);
      if (paths.length > 0) {
        const { data: s } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
        const map: Record<string, string> = {};
        (s || []).forEach((x) => { if (x.path && x.signedUrl) map[x.path] = x.signedUrl; });
        setSigned(map);
      }
      setLoading(false);
    })();
  }, [open, toolId]);

  const filtered = docs.filter((d) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      d.file_name.toLowerCase().includes(s) ||
      (d.notes || "").toLowerCase().includes(s) ||
      d.document_type.toLowerCase().includes(s)
    );
  });

  const download = (item: ToolDocumentItem) => {
    const url = signed[item.file_path];
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = item.file_name;
    a.target = "_blank";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="เอกสารประกอบ" className="relative">
          <Paperclip className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
              {count}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>เอกสารประกอบ - {toolCode} {toolName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาชื่อไฟล์ / ประเภท / หมายเหตุ"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-8"
            />
          </div>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              {docs.length === 0 ? "ยังไม่มีเอกสาร (อัพโหลดผ่านหน้าแก้ไขเครื่องมือ)" : "ไม่พบเอกสารที่ตรงคำค้น"}
            </div>
          ) : (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {filtered.map((d) => {
                const label = DOCUMENT_TYPES.find((t) => t.value === d.document_type)?.label || d.document_type;
                return (
                  <div key={d.file_path} className="flex items-center gap-2 rounded-md border px-2 py-1.5">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{d.file_name}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <Badge variant="secondary" className="text-[10px]">{label}</Badge>
                        {d.notes && <span className="truncate">{d.notes}</span>}
                        {d.file_size && <span>{(d.file_size / 1024).toFixed(0)} KB</span>}
                        {d.created_at && <span>{new Date(d.created_at).toLocaleDateString("th-TH")}</span>}
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => download(d)}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
