import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Lightbulb, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Suggestion {
  main_category: string;
  sub_category?: string;
  confidence: number;
  reason: string;
}

interface Props {
  entryType: "equipment" | "tool";
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "ghost" | "secondary";
  triggerSize?: "default" | "sm" | "icon";
  compact?: boolean;
  defaultProductName?: string;
  onPick?: (main: string, sub?: string) => void;
}

export function CategorySuggestWizard({
  entryType,
  triggerLabel = "แนะนำหมวดหมู่ด้วย AI",
  triggerVariant = "outline",
  triggerSize = "sm",
  compact = false,
  onPick,
}: Props) {
  const [open, setOpen] = useState(false);
  const [productName, setProductName] = useState("");
  const [usage, setUsage] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Suggestion[] | null>(null);
  const [noMatch, setNoMatch] = useState<{ suggested_new?: string } | null>(null);

  const parentTable = entryType === "tool" ? "tool_categories" : "categories";
  const childTable = entryType === "tool" ? "tool_subcategories" : "subcategories";
  const childFk = entryType === "tool" ? "tool_category_id" : "category_id";

  const reset = () => {
    setProductName("");
    setUsage("");
    setResults(null);
    setNoMatch(null);
  };

  const handleSubmit = async () => {
    if (!productName.trim() && !usage.trim()) {
      toast.error("กรุณากรอกชื่อสินค้า หรือลักษณะการใช้งาน");
      return;
    }
    setLoading(true);
    setResults(null);
    setNoMatch(null);
    try {
      const [pRes, cRes] = await Promise.all([
        (supabase as any).from(parentTable).select("id,name,description,keywords,examples,usage_hint").eq("is_active", true),
        (supabase as any).from(childTable).select(`id,name,description,keywords,examples,usage_hint,${childFk}`).eq("is_active", true),
      ]);
      if (pRes.error) throw pRes.error;
      if (cRes.error) throw cRes.error;

      const cats = (pRes.data || []).map((c: any) => ({
        id: c.id, name: c.name, description: c.description,
        keywords: c.keywords, examples: c.examples, usage_hint: c.usage_hint,
      }));
      const subs = (cRes.data || []).map((s: any) => ({
        id: s.id, name: s.name, description: s.description,
        keywords: s.keywords, examples: s.examples, usage_hint: s.usage_hint,
        parent_id: s[childFk],
      }));

      const { data, error } = await supabase.functions.invoke("suggest-category", {
        body: {
          mode: "suggest",
          product_name: productName,
          usage,
          entry_type: entryType,
          categories: cats,
          subcategories: subs,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResults(data?.suggestions || []);
      if (data?.no_match) setNoMatch({ suggested_new: data?.suggested_new });
    } catch (e: any) {
      toast.error(e?.message || "ไม่สามารถแนะนำหมวดหมู่ได้");
    } finally {
      setLoading(false);
    }
  };

  const handlePick = (s: Suggestion) => {
    onPick?.(s.main_category, s.sub_category);
    toast.success(`เลือก: ${s.main_category}${s.sub_category ? ` › ${s.sub_category}` : ""}`);
    setOpen(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        {compact ? (
          <Button type="button" variant={triggerVariant} size="icon" title={triggerLabel}>
            <Sparkles className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" variant={triggerVariant} size={triggerSize} className="gap-1.5">
            <Sparkles className="h-4 w-4" />
            {triggerLabel}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            ผู้ช่วยแนะนำหมวดหมู่
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md flex items-start gap-2">
            <Lightbulb className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
            <span>ตอบคำถาม 2-3 ข้อ ระบบจะแนะนำหมวดหมู่ที่เหมาะสม 3 อันดับ (ประเภท: <b>{entryType === "tool" ? "เครื่องมือ" : "อุปกรณ์/อะไหล่"}</b>)</span>
          </div>

          <div className="space-y-2">
            <Label>1) ชื่อ/รุ่นสินค้า</Label>
            <Input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="เช่น สว่านไร้สาย Makita DF333D, สาย LAN Cat6"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>2) ใช้ทำอะไร / ลักษณะการใช้งาน</Label>
            <Textarea
              value={usage}
              onChange={(e) => setUsage(e.target.value)}
              rows={2}
              placeholder="เช่น ใช้เจาะผนัง มีแบตเตอรี่ 12V / ใช้เดินสายเน็ตเวิร์คในตู้ Rack"
            />
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />กำลังวิเคราะห์...</>) :
              (<><Sparkles className="h-4 w-4 mr-2" />ให้ AI แนะนำ</>)}
          </Button>

          {results && results.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">ผลลัพธ์ Top {results.length}</h4>
              {results.map((s, i) => (
                <div key={i} className="border rounded-lg p-3 hover:border-primary/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <Badge variant="secondary" className="shrink-0">#{i + 1}</Badge>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">
                        {s.main_category}
                        {s.sub_category && (
                          <span className="text-muted-foreground"> › {s.sub_category}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{s.reason}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge className={
                        s.confidence >= 75 ? "bg-emerald-500" :
                        s.confidence >= 50 ? "bg-amber-500" : "bg-muted-foreground"
                      }>
                        {Math.round(s.confidence)}%
                      </Badge>
                      {onPick && (
                        <Button size="sm" variant="outline" onClick={() => handlePick(s)}>
                          เลือก
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {noMatch && (
            <div className="border border-amber-300 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium">ไม่มีหมวดหมู่ที่เข้าเกณฑ์</div>
                {noMatch.suggested_new && (
                  <div className="text-muted-foreground mt-1">
                    แนะนำให้เพิ่มหมวดใหม่: <b>{noMatch.suggested_new}</b>
                  </div>
                )}
              </div>
            </div>
          )}

          {results && results.length === 0 && !noMatch && (
            <div className="text-sm text-muted-foreground text-center py-4">
              ไม่มีคำแนะนำ ลองกรอกข้อมูลให้ละเอียดขึ้น
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
