import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, ShieldAlert, Trash2, CheckCircle, Images } from "lucide-react";
import { toast } from "sonner";

const SCOPES = [
  {
    key: "transactions",
    label: "ข้อมูลธุรกรรมทั้งหมด",
    detail: "นำเข้า-รับเข้าคลัง (รวมสถานะรอรับเข้า), ใบเบิก-จ่าย, ส่งตรง, ยืนยันรับของ, โอนย้าย, การเคลื่อนไหวสต็อก, ใบขอซื้อ, ส่งคืนของเสีย/จำหน่าย, ประเมิน/ซ่อม/เคลม/Swap, ยืม-คืน, PM ทุกประเภท, การติดตั้งอุปกรณ์บนป้าย, แจ้งเตือน และบันทึกกิจกรรม",
    defaultOn: true,
  },
  {
    key: "ads",
    label: "ข้อมูลภาพโฆษณาทดสอบ",
    detail: "ภาพโฆษณา, เวอร์ชันภาพ, ป้ายปลายทาง และใบขอเบิกภาพ (ไม่ลบข้อมูลป้ายโฆษณา/แพ็กป้าย)",
    defaultOn: false,
  },
  {
    key: "items",
    label: "รายการอุปกรณ์ / Media Player / เครื่องมือ ที่นำเข้าทดสอบ",
    detail: "ลบตัวสินค้าออกทั้งหมด พร้อมรูปภาพ, S/N, ตารางPM และความเข้ากันกับป้าย — ใช้เมื่อจะเริ่มนำเข้าข้อมูลใหม่ทั้งชุด",
    defaultOn: false,
  },
];

const KEPT = [
  "ฝ่าย/แผนก & Section", "ผู้ใช้งาน & สิทธิ์", "หมวดหมู่/หมวดย่อย", "หน่วยนับ & ยี่ห้อ",
  "ผู้จำหน่าย & บริษัท", "คลัง/โซน/ตำแหน่งจัดเก็บ", "ป้ายโฆษณา & แพ็กป้าย", "ช่าง & ผู้รับเหมา",
  "วัตถุประสงค์รับ-เบิก", "ตั้งค่าระบบ & แจ้งเตือน", "คู่มือ/แนวทางสิทธิ์",
];

export function ClearTestData() {
  const { isSuperAdmin, loading } = useIsSuperAdmin();
  const [selected, setSelected] = useState<string[]>(SCOPES.filter((s) => s.defaultOn).map((s) => s.key));
  const [confirmText, setConfirmText] = useState("");
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Record<string, number> | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageConfirmText, setImageConfirmText] = useState("");
  const [clearingImages, setClearingImages] = useState(false);

  if (loading) return null;

  if (!isSuperAdmin) {
    return (
      <Alert variant="destructive">
        <ShieldAlert className="w-4 h-4" />
        <AlertDescription>ฟังก์ชันล้างข้อมูลทดสอบสงวนไว้สำหรับ Super Admin เท่านั้น</AlertDescription>
      </Alert>
    );
  }

  const toggle = (key: string) =>
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    try {
      const { data, error } = await (supabase.rpc as any)("clear_test_operational_data", { _scopes: selected });
      if (error) throw error;
      setResult((data?.deleted || {}) as Record<string, number>);
      toast.success("ล้างข้อมูลทดสอบเรียบร้อย");
      setOpen(false);
      setConfirmText("");
    } catch (e: any) {
      toast.error("ล้างข้อมูลไม่สำเร็จ: " + (e?.message || ""));
    } finally {
      setRunning(false);
    }
  };

  const totalDeleted = result ? Object.values(result).reduce((a, b) => a + Number(b), 0) : 0;

  const handleClearImages = async () => {
    setClearingImages(true);
    try {
      const { data, error } = await supabase.functions.invoke("clear-test-images");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const deleted = (data?.deleted || {}) as Record<string, number>;
      const fileCount = Object.entries(deleted)
        .filter(([key]) => key.endsWith("_files"))
        .reduce((sum, [, count]) => sum + Number(count), 0);
      toast.success(`ล้างรูปภาพเรียบร้อย ${fileCount.toLocaleString()} ไฟล์`);
      setImageDialogOpen(false);
      setImageConfirmText("");
    } catch (e: any) {
      toast.error("ล้างรูปภาพไม่สำเร็จ: " + (e?.message || ""));
    } finally {
      setClearingImages(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            ล้างข้อมูลทดสอบ (Reset Transactional Data)
          </CardTitle>
          <CardDescription>
            สำหรับรอบการทดสอบระบบ — ลบเฉพาะข้อมูลธุรกรรมที่เกิดจากการทดสอบ ไม่ว่าจะอยู่สถานะใด
            โดยข้อมูลหลักและการตั้งค่าระบบทั้งหมดจะยังอยู่ครบ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {SCOPES.map((s) => (
            <label key={s.key} className="flex gap-3 items-start rounded-lg border p-3 cursor-pointer hover:bg-muted/40">
              <Checkbox checked={selected.includes(s.key)} onCheckedChange={() => toggle(s.key)} className="mt-1" />
              <div className="space-y-1">
                <div className="font-medium text-sm">{s.label}</div>
                <p className="text-xs text-muted-foreground">{s.detail}</p>
              </div>
            </label>
          ))}

          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="text-sm font-medium mb-2">ข้อมูลที่ไม่ถูกลบ (Master Data & System Settings)</div>
            <div className="flex flex-wrap gap-1.5">
              {KEPT.map((k) => (
                <Badge key={k} variant="secondary" className="font-normal">{k}</Badge>
              ))}
            </div>
          </div>

          <Button variant="destructive" disabled={selected.length === 0} onClick={() => setOpen(true)}>
            <Trash2 className="w-4 h-4 mr-2" /> ล้างข้อมูลทดสอบที่เลือก
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Images className="w-5 h-5" />
            ล้างรูปภาพทดสอบเท่านั้น
          </CardTitle>
          <CardDescription>
            ลบเฉพาะรูปอุปกรณ์, Media Player / จอภาพ และเครื่องมือ ทั้งไฟล์และรายการรูป โดยไม่ลบสินค้า S/N ธุรกรรม หรือข้อมูลหลัก
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setImageDialogOpen(true)}>
            <Trash2 className="w-4 h-4 mr-2" /> ล้างเฉพาะรูปภาพ
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success" />
              ผลการล้างข้อมูล — ลบทั้งหมด {totalDeleted.toLocaleString()} แถว
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalDeleted === 0 ? (
              <p className="text-sm text-muted-foreground">ไม่มีข้อมูลค้างอยู่ในกลุ่มที่เลือก</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                {Object.entries(result).map(([table, count]) => (
                  <div key={table} className="flex justify-between border rounded px-2 py-1">
                    <span className="truncate">{table}</span>
                    <span className="text-muted-foreground">{Number(count).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setConfirmText(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการล้างข้อมูลทดสอบ</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <div>การลบนี้ย้อนกลับไม่ได้ — กลุ่มที่เลือก:</div>
                <ul className="list-disc pl-5">
                  {SCOPES.filter((s) => selected.includes(s.key)).map((s) => (
                    <li key={s.key}>{s.label}</li>
                  ))}
                </ul>
                <div>พิมพ์คำว่า <strong>RESET</strong> เพื่อยืนยัน</div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="RESET" />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={running}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmText.trim().toUpperCase() !== "RESET" || running}
              onClick={(e) => { e.preventDefault(); handleRun(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              ล้างข้อมูล
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={imageDialogOpen} onOpenChange={(v) => { setImageDialogOpen(v); if (!v) setImageConfirmText(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันล้างเฉพาะรูปภาพ</AlertDialogTitle>
            <AlertDialogDescription>
              รูปอุปกรณ์, Media Player / จอภาพ และเครื่องมือทั้งหมดจะถูกลบถาวร แต่ข้อมูลรายการและธุรกรรมจะไม่ถูกลบ พิมพ์คำว่า IMAGES เพื่อยืนยัน
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input value={imageConfirmText} onChange={(e) => setImageConfirmText(e.target.value)} placeholder="IMAGES" />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearingImages}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              disabled={imageConfirmText.trim().toUpperCase() !== "IMAGES" || clearingImages}
              onClick={(e) => { e.preventDefault(); handleClearImages(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {clearingImages ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              ล้างเฉพาะรูปภาพ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
