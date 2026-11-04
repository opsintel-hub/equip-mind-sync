import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ToolImageViewer } from "./ToolImageViewer";
import { ToolDocumentViewer } from "./ToolDocumentViewer";
import { outstandingToolLoan, PM_STATES, type ToolMeetingRow } from "@/lib/toolMeetingReport";

export function ToolMeetingDetail({ tool, onClose }: { tool: ToolMeetingRow | null; onClose: () => void }) {
  return <Sheet open={!!tool} onOpenChange={open => { if (!open) onClose(); }}><SheetContent className="w-full sm:max-w-xl overflow-y-auto">
    {tool && <><SheetHeader><SheetTitle>{tool.code} · {tool.name}</SheetTitle><SheetDescription>{tool.departmentName} · {tool.category}</SheetDescription></SheetHeader>
      <div className="space-y-6 py-6">
        <div className="flex flex-wrap gap-2"><ToolImageViewer toolId={tool.id} toolName={tool.name} variant="button"/><ToolDocumentViewer toolId={tool.id} toolName={tool.name} toolCode={tool.code}/></div>
        <dl className="grid grid-cols-2 gap-4 text-sm">{[
          ["S/N",tool.serial_number || "—"],["เลขทรัพย์สิน",tool.asset_code || "—"],["บริษัท",tool.company?.name || "—"],["วันที่นำเข้าคลัง",tool.warehouse_entry_date],["ราคา/หน่วย",`${(tool.unit_price ?? 0).toLocaleString()} บาท`],["ยอดตามทะเบียน",`${tool.total} ${tool.unit}`],["ในคลัง",`${tool.stock} ${tool.unit}`],["ถือครอง",`${tool.held} ${tool.unit}`],["คลัง/ตำแหน่งตั้งต้น",tool.storage],["ผู้รับผิดชอบ/ช่างที่ผูกไว้",tool.owners.join(" · ") || "ไม่ระบุ"],["วันหมดประกัน",tool.warranty_expiry_date || "ไม่ระบุ"],["วันหมดอายุ",tool.expiry_date || "ไม่ระบุ"],["รอบ PM",tool.pm_interval_days ? `${tool.pm_interval_days} วัน` : "ไม่มี"],["PM ครั้งถัดไป",tool.nextPM || "ไม่พบงานตามรอบ"],
        ].map(([label,value]) => <div key={label} className="min-w-0"><dt className="text-muted-foreground text-xs">{label}</dt><dd className="mt-1 break-words whitespace-pre-line font-medium">{value}</dd></div>)}</dl>
        <section className="border-t pt-4 space-y-3"><h3 className="font-semibold">ผู้ถือครองปัจจุบัน</h3>{tool.holdings.length ? tool.holdings.map(l => <div key={l.id} className="border-b pb-3 text-sm"><div className="font-medium">{l.holder_name || l.requester_name} · {outstandingToolLoan(l)} {tool.unit}</div><p className="text-muted-foreground">จ่าย {l.issued_at?.slice(0,10) || l.loan_date} · {l.return_required ? `กำหนดคืน ${l.due_date}` : "ถือครองถาวร"}</p>{l.status === "pending_return" && <Badge variant="outline">แจ้งคืนแล้ว รอคลังรับ</Badge>}</div>) : <p className="text-sm text-muted-foreground">ไม่มีรายการถือครอง</p>}</section>
        <section className="border-t pt-4 space-y-3"><h3 className="font-semibold">ประวัติการยืมล่าสุด</h3>{tool.loanHistory.slice(0,3).map(l => <div key={l.id} className="text-sm border-b pb-3"><div>{l.requester_name} · {l.quantity} {tool.unit}</div><p className="text-muted-foreground">{l.loan_date} · {l.return_date ? `รับคืน ${l.return_date}` : l.issued_at ? "จ่ายแล้ว" : "ยังไม่จ่าย"}</p></div>)}{!tool.loanHistory.length && <p className="text-sm text-muted-foreground">ไม่มีประวัติการยืม</p>}</section>
        <section className="border-t pt-4 space-y-3"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">ประวัติ PM · {tool.pmHistory.length} ครั้ง</h3><Badge variant={tool.pmState === "overdue" ? "destructive" : "secondary"}>{PM_STATES.find(s=>s.value===tool.pmState)?.label}</Badge></div>{tool.pmHistory.map(h => <div key={h.id} className="text-sm border-b pb-3"><div className="font-medium">{h.completed_date} · {h.result?.name || "ไม่ระบุผล"}</div><p className="text-muted-foreground">ผู้ตรวจ {h.inspector_name || "ไม่ระบุ"}</p>{h.notes && <p className="mt-1 whitespace-pre-line">{h.notes}</p>}</div>)}{!tool.pmHistory.length && <p className="text-sm text-muted-foreground">ยังไม่มีประวัติ PM</p>}</section>
      </div>
    </>}
  </SheetContent></Sheet>;
}