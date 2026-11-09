import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import * as XLSX from "xlsx";
import { Download, ArrowDown, ArrowUpRight, Maximize, Minimize, X, Users, FileText, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { TablePagination } from "@/components/TablePagination";
import { useTablePagination } from "@/hooks/useTablePagination";
import { AGING_BUCKETS, quantityByUnit, summarizeFollowUp, type FollowUpRow } from "@/lib/incompleteIssueReport";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export function IssueMeetingReport({ rows, loading, error, refreshedAt, onAction, onRetry }: {
  rows: FollowUpRow[]; loading: boolean; error: boolean; refreshedAt?: string;
  onAction: (row: FollowUpRow, stage: string) => void; onRetry: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [meeting, setMeeting] = useState(false);
  useEffect(() => {
    const changed = () => setMeeting(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange",changed);
    return () => document.removeEventListener("fullscreenchange",changed);
  }, []);
  const [agenda,setAgenda] = useState("departments");
  const [side,setSide] = useState("requester");
  const [department, setDepartment] = useState<string | null>(null);
  const [bucket, setBucket] = useState<string | null>(null);
  const [person, setPerson] = useState<string | null>(null);
  const focused = rows.filter(r => (!department || r.department === department) && (!bucket || r.bucket === bucket) && (!person || r.person === person));
  const selected = agenda==="actions" ? focused.filter(r=>side==="warehouse" ? r.receiptQty>0 : r.receiptQty===0 && (r.billboardQty>0 || r.returnQty>0 || r.usageQty>0)) : focused;
  const summary = summarizeFollowUp(focused);
  const groups = useMemo(() => [...new Set(rows.map(r => r.department))].map(name => {
    const group = rows.filter(r => r.department === name);
    return { name, rows: group, ...summarizeFollowUp(group) };
  }).sort((a,b) => b.criticalDocuments-a.criticalDocuments || b.oldest-a.oldest || b.documents-a.documents),[rows]);
  const people = [...new Set(focused.map(r => `${r.department}\u0000${r.person}`))].map(key => {
    const [dept,name] = key.split("\u0000"); const group = focused.filter(r => r.department===dept && r.person===name);
    return { dept, name, rows:group, ...summarizeFollowUp(group) };
  }).sort((a,b) => b.oldest-a.oldest || b.documents-a.documents);
  const sorted = [...selected].sort((a,b) => (b.days ?? -1)-(a.days ?? -1) || b.documentNo.localeCompare(a.documentNo));
  const pagination = useTablePagination(sorted,20);
  const drill = (dept: string, age: string | null = null) => {
    setAgenda("people"); setDepartment(dept); setBucket(age); setPerson(null); pagination.handlePageChange(1);

  };
  const exportExcel = (exportRows = selected, label = department || "ทุกฝ่าย") => {
    try {
      const workbook = XLSX.utils.book_new();
      const append = (name:string, data:Record<string, unknown>[]) => {
        const sheet = XLSX.utils.json_to_sheet(data); sheet["!cols"] = Object.keys(data[0] || {}).map(() => ({wch:24}));
        XLSX.utils.book_append_sheet(workbook,sheet,name);
      };
      append("สรุปฝ่าย",[...new Set(exportRows.map(r=>r.department))].map(dept => {
        const group=exportRows.filter(r=>r.department===dept); const s=summarizeFollowUp(group);
        return {"ฝ่าย":dept,"เอกสารค้าง":s.documents,"รายการค้าง":s.lines,"ยอดค้างแยกหน่วย":quantityByUnit(group),"ค้างนานสุด (วัน)":s.oldest,...Object.fromEntries(AGING_BUCKETS.map(b=>[b.label+" (เอกสาร)",s.buckets[b.value]]))};
      }));
      append("ผู้รับผิดชอบ",[...new Set(exportRows.map(r=>`${r.department}\u0000${r.person}`))].map(key => {
        const [dept,name]=key.split("\u0000"); const group=exportRows.filter(r=>r.department===dept&&r.person===name);
        return {"ฝ่าย":dept,"ผู้เบิก / ผู้ส่งคืน":name,"เอกสารค้าง":summarizeFollowUp(group).documents,"รอระบุป้าย":quantityByUnit(group,"billboardQty"),"รอส่งคืน":quantityByUnit(group,"returnQty"),"รอเข้าคลัง":quantityByUnit(group,"receiptQty"),"รอใช้งาน":quantityByUnit(group,"usageQty"),"ค้างนานสุด (วัน)":summarizeFollowUp(group).oldest};
      }));
      append("รายละเอียดติดตาม",exportRows.map(r=>({"เลขที่เอกสาร":r.documentNo,"ฝ่าย":r.department,"ผู้เบิก / ผู้ส่งคืน":r.person,"วัตถุประสงค์":r.purpose,"วันที่จ่าย":r.issuedAt ? format(new Date(r.issuedAt),"dd/MM/yyyy") : "ไม่ทราบ","วันค้าง":r.days ?? "ไม่ทราบ","ช่วงเวลาค้าง":AGING_BUCKETS.find(b=>b.value===r.bucket)?.label,"รหัสสินค้า":r.code,"ชื่อสินค้า":r.name,"S/N":r.serial,"หน่วย":r.unit,"รอระบุป้าย":r.billboardQty,"รอส่งคืน":r.returnQty,"รอเข้าคลัง":r.receiptQty,"รอใช้งาน":r.usageQty,"งานถัดไป":r.receiptQty ? "คลังตรวจรับสินค้า" : r.billboardQty ? "ผู้เบิกระบุป้าย / บันทึกใช้จริง" : r.returnQty ? "ผู้เบิกบันทึกคืน / ปิดผลการใช้งาน" : "ผู้เบิกยืนยันใช้จริงหรือคืนของเหลือ"})));
      append("ข้อมูลรายงาน",[{"วันที่รายงาน":format(new Date(),"dd/MM/yyyy HH:mm"),"ขอบเขต":label,"เอกสาร":summarizeFollowUp(exportRows).documents,"เกณฑ์วันค้าง":"นับวันปฏิทินไทยจากวันที่จ่ายสินค้า","ยอดแต่ละขั้นตอน":"อาจเป็นสินค้ารายการเดียวกัน ไม่บวกยอดระบุป้ายกับยอดคืน","มูลค่า":"ไม่มีราคาต่อรายการที่เชื่อถือได้ในใบเบิก จึงไม่ประมาณมูลค่า"}]);
      XLSX.writeFile(workbook,`ติดตามงานเบิก_${format(new Date(),"yyyyMMdd_HHmmss")}.xlsx`);
      toast.success(`ส่งออก ${exportRows.length} รายการแล้ว`);
    } catch { toast.error("ส่งออกไม่สำเร็จ กรุณาลองใหม่"); }
  };
  const toggleMeeting = async () => {
    if (document.fullscreenElement) { await document.exitFullscreen(); setMeeting(false); }
    else { try { await container.current?.requestFullscreen(); setMeeting(true); } catch { setMeeting(v=>!v); } }
  };
  return <div ref={container} className={`space-y-7 bg-background ${meeting ? "fixed inset-0 z-50 overflow-auto p-6 md:p-10" : "py-3"}`}>
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><div className="mb-1 text-sm font-medium text-primary">การประชุมติดตามงานข้ามฝ่าย</div><h2 className="text-2xl font-semibold">ภาพรวมงานค้างและผู้รับผิดชอบ</h2><p className="mt-2 text-sm text-muted-foreground">ณ {format(new Date(),"d MMMM yyyy",{locale:th})} · นับวันค้างจากวันที่จ่ายสินค้า{refreshedAt ? ` · อัปเดต ${format(new Date(refreshedAt),"HH:mm")}` : ""}</p></div>
      <div className="flex gap-2"><Button variant="outline" onClick={()=>void toggleMeeting()} title={meeting ? "ออกจากมุมมองประชุม" : "มุมมองประชุมเต็มจอ"}>{meeting ? <Minimize className="mr-2 h-4 w-4"/> : <Maximize className="mr-2 h-4 w-4"/>}มุมมองประชุม</Button><Button onClick={()=>exportExcel()} disabled={loading||error||!selected.length}><Download className="mr-2 h-4 w-4"/>Export Excel</Button></div>
    </header>
    {loading ? <div className="py-12 text-center text-muted-foreground">กำลังรวบรวมงานค้าง...</div> : error ? <div className="py-8 text-center text-destructive">โหลดรายงานไม่สำเร็จ <Button variant="outline" onClick={onRetry}>ลองใหม่</Button></div> : <>
      <nav aria-label="ฝ่ายที่ประชุม" className="flex flex-wrap gap-2"><Button variant={department===null?"default":"outline"} onClick={()=>{setDepartment(null);setBucket(null);setPerson(null);pagination.handlePageChange(1);}}>ทุกฝ่าย</Button>{groups.map(g=><Button key={g.name} variant={department===g.name?"default":"outline"} className="h-auto min-h-9 whitespace-normal text-left" onClick={()=>{setDepartment(g.name);setBucket(null);setPerson(null);pagination.handlePageChange(1);}}>{g.name}<Badge variant="secondary" className="ml-2">{g.documents}</Badge></Button>)}</nav>
      <div className="flex flex-wrap items-center gap-2"><h3 className="text-xl font-semibold">{department||"ภาพรวมทุกฝ่าย"}</h3>{bucket&&<Badge variant="secondary">{AGING_BUCKETS.find(b=>b.value===bucket)?.label}</Badge>}{person&&<Badge variant="secondary">{person}</Badge>}{(bucket||person)&&<Button variant="ghost" size="sm" onClick={()=>{setBucket(null);setPerson(null);}}>ล้างผู้รับผิดชอบ / ช่วงเวลา<X className="ml-1 h-4 w-4"/></Button>}</div>
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {label:"เอกสารที่ต้องติดตาม",value:summary.documents,unit:"ใบเบิก",detail:`รวม ${focused.length.toLocaleString()} รายการ · ${new Set(focused.map(r=>r.department)).size} ฝ่าย`,icon:FileText,tone:"text-primary"},
          {label:"รอระบุป้าย",value:focused.filter(r=>r.billboardQty>0).length,unit:"รายการ",detail:`จำนวนค้าง ${quantityByUnit(focused,"billboardQty")}`,icon:ArrowUpRight,tone:"text-primary"},
          {label:"รอส่งคืน / ปิดผลใช้งาน",value:focused.filter(r=>r.returnQty>0).length,unit:"รายการ",detail:`จำนวนค้าง ${quantityByUnit(focused,"returnQty")}`,icon:Users,tone:"text-warning"},
          {label:"เอกสารค้างเกิน 30 วัน",value:summary.criticalDocuments,unit:"ใบเบิก",detail:`ค้างนานสุด ${summary.oldest} วัน`,icon:AlertTriangle,tone:"text-destructive"},
        ].map(k=><div key={k.label} className="rounded-lg border bg-card p-4 md:p-5"><div className="flex items-start justify-between gap-2 text-sm text-muted-foreground"><span>{k.label}</span><k.icon className={`h-5 w-5 shrink-0 ${k.tone}`}/></div><div className={`my-3 text-4xl font-semibold tabular-nums ${k.tone}`}>{k.value.toLocaleString()} <span className="text-base font-normal text-muted-foreground">{k.unit}</span></div><div className="break-words text-sm text-muted-foreground">{k.detail}</div></div>)}
      </section>
      <div className="flex flex-wrap gap-x-8 gap-y-2 border-b pb-4 text-sm"><span>รอเข้าคลัง <strong>{quantityByUnit(focused,"receiptQty")}</strong></span><span>รอใช้งาน <strong>{focused.filter(r=>r.usageQty>0).length} รายการ</strong></span><span>ไม่ทราบวันที่จ่าย <strong>{summary.buckets.unknown} เอกสาร</strong> · จ่ายวันนี้ <strong>{summary.buckets.today} เอกสาร</strong></span></div>
      <Tabs value={agenda} onValueChange={v=>{setAgenda(v);pagination.handlePageChange(1);}}><TabsList className="flex h-auto flex-wrap justify-start gap-1"><TabsTrigger value="departments">สรุปตามฝ่าย</TabsTrigger><TabsTrigger value="people">ผู้รับผิดชอบ</TabsTrigger><TabsTrigger value="actions">งานที่ต้องปิด</TabsTrigger></TabsList></Tabs>
      {agenda==="departments"&&<section className="space-y-4"><h3 className="text-xl font-semibold">ฝ่ายไหนต้องติดตามเรื่องอะไร</h3><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{groups.filter(g=>!department||g.name===department).map(g=><article key={g.name} className="rounded-lg border bg-card p-5 space-y-4 min-w-0"><h4 className="text-lg font-semibold break-words">{g.name}</h4><div className="flex items-end justify-between gap-3"><strong className="text-3xl">{g.documents} <span className="text-sm font-normal">เอกสาร</span></strong><span className="text-sm text-muted-foreground">{g.lines} รายการ</span></div><div className="border-t pt-3 space-y-2 text-sm"><p>รอระบุป้าย <strong>{g.rows.filter(r=>r.billboardQty>0).length} รายการ</strong></p><p>รอส่งคืน / ปิดผล <strong>{g.rows.filter(r=>r.returnQty>0).length} รายการ</strong></p><p>รอใช้งาน <strong>{g.rows.filter(r=>r.usageQty>0).length} รายการ</strong></p><p className="text-warning">รอคลังตรวจรับ <strong>{g.rows.filter(r=>r.receiptQty>0).length} รายการ</strong></p></div><div className="flex flex-wrap gap-2"><Badge variant={g.criticalDocuments?"destructive":"secondary"}>เกิน 30 วัน {g.criticalDocuments} เอกสาร</Badge><Badge variant="outline">นานสุด {g.oldest} วัน</Badge></div><div className="flex flex-wrap gap-1">{AGING_BUCKETS.filter(b=>g.buckets[b.value]>0).map(b=><Button key={b.value} variant="ghost" size="sm" className="text-xs h-auto py-1" onClick={()=>drill(g.name,b.value)}>{b.label} · {g.buckets[b.value]}</Button>)}</div><div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={()=>drill(g.name)}>ติดตามฝ่ายนี้<ArrowUpRight className="ml-2 h-4 w-4"/></Button><Button variant="outline" size="icon" aria-label={`ส่งออก ${g.name}`} title={`ส่งออก ${g.name}`} onClick={()=>exportExcel(g.rows,g.name)}><Download className="h-4 w-4"/></Button></div></article>)}</div>{!groups.length&&<p className="py-8 text-center text-muted-foreground">ไม่มีงานค้างตามตัวกรอง</p>}</section>}
      {agenda==="people"&&      <section id="follow-up-people" className="scroll-mt-4 space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-semibold">ผู้รับผิดชอบ{department ? ` · ${department}` : "ทุกฝ่าย"}</h3>{(department||bucket||person)&&<Button size="sm" variant="outline" onClick={()=>{setDepartment(null);setBucket(null);setPerson(null);}}><X className="mr-1 h-4 w-4"/>ล้างการเจาะลึก</Button>}</div>
        {bucket&&<Badge variant={bucket===">30"?"destructive":"secondary"}>{AGING_BUCKETS.find(b=>b.value===bucket)?.label}</Badge>}
        <div className="overflow-x-auto rounded-md border"><Table className="min-w-[800px]"><TableHeader><TableRow><TableHead>ผู้เบิก / ผู้ส่งคืน</TableHead><TableHead>ฝ่าย</TableHead><TableHead>เอกสาร</TableHead><TableHead>รอระบุป้าย</TableHead><TableHead>รอส่งคืน</TableHead><TableHead>รอเข้าคลัง</TableHead><TableHead>รอใช้งาน</TableHead><TableHead>นานสุด</TableHead><TableHead/></TableRow></TableHeader><TableBody>{people.map(p=><TableRow key={`${p.dept}:${p.name}`}><TableCell className="font-medium">{p.name}</TableCell><TableCell>{p.dept}</TableCell><TableCell>{p.documents}</TableCell><TableCell>{quantityByUnit(p.rows,"billboardQty")}</TableCell><TableCell>{quantityByUnit(p.rows,"returnQty")}</TableCell><TableCell>{quantityByUnit(p.rows,"receiptQty")}</TableCell><TableCell>{quantityByUnit(p.rows,"usageQty")}</TableCell><TableCell className="whitespace-nowrap">{p.oldest} วัน</TableCell><TableCell><Button variant="ghost" size="icon" aria-label={`ดูงานของ ${p.name}`} title={`ดูงานของ ${p.name}`} onClick={()=>{setAgenda("actions");setSide("requester");setDepartment(p.dept);setPerson(p.name);pagination.handlePageChange(1);}}><ArrowDown className="h-4 w-4"/></Button></TableCell></TableRow>)}{!people.length&&<TableRow><TableCell colSpan={9} className="py-6 text-center text-muted-foreground">ไม่มีผู้รับผิดชอบตามตัวกรอง</TableCell></TableRow>}</TableBody></Table></div>
      </section>
      }
      {agenda==="actions"&&<section id="follow-up-detail" className="scroll-mt-4 space-y-3"><h3 className="text-lg font-semibold">งานที่ต้องปิด{person ? ` · ${person}` : ""} <span className="text-sm font-normal text-muted-foreground">({selected.length} รายการ)</span></h3>
        <Tabs value={side} onValueChange={v=>{setSide(v);pagination.handlePageChange(1);}}><TabsList className="flex flex-wrap h-auto justify-start"><TabsTrigger value="requester">ค้างฝั่งผู้เบิก ({focused.filter(r=>r.receiptQty===0&&(r.billboardQty>0||r.returnQty>0||r.usageQty>0)).length})</TabsTrigger><TabsTrigger value="warehouse">ค้างฝั่งคลัง ({focused.filter(r=>r.receiptQty>0).length})</TabsTrigger></TabsList></Tabs>
        <div className="overflow-x-auto rounded-md border"><Table className="min-w-[850px]"><TableHeader><TableRow><TableHead>เอกสาร / วันที่จ่าย</TableHead><TableHead>ผู้รับผิดชอบ / ฝ่าย</TableHead><TableHead>สินค้า / S/N</TableHead><TableHead>ค้างมา</TableHead>{side==="warehouse"?<TableHead>รอคลังตรวจรับ</TableHead>:<><TableHead>รอระบุป้าย</TableHead><TableHead>รอส่งคืน</TableHead><TableHead>รอใช้งาน</TableHead></>}<TableHead className="sticky right-0 bg-background">ดำเนินการถัดไป</TableHead></TableRow></TableHeader><TableBody>{pagination.paginatedData.map(r=><TableRow key={r.id}><TableCell><div className="font-mono">{r.documentNo}</div><div className="text-xs text-muted-foreground">{r.issuedAt ? format(new Date(r.issuedAt),"d MMM yy",{locale:th}):"ไม่ทราบวันที่จ่าย"}</div></TableCell><TableCell><div className="font-medium">{r.person}</div><div className="text-xs text-muted-foreground">{r.department}</div></TableCell><TableCell className="max-w-64 break-words"><div className="font-mono text-xs">{r.code}</div><div>{r.name}</div><div className="whitespace-pre-line text-xs text-muted-foreground">{r.serial}</div></TableCell><TableCell><Badge variant={r.bucket===">30"?"destructive":"secondary"} className="whitespace-nowrap">{r.days===null?"ไม่ทราบ":`${r.days} วัน`}</Badge></TableCell>{(side==="warehouse" ? ["receiptQty"] as const : ["billboardQty","returnQty","usageQty"] as const).map(key=><TableCell key={key} className="whitespace-nowrap tabular-nums">{r[key] ? `${r[key].toLocaleString()} ${r.unit}` : "—"}</TableCell>)}<TableCell className="sticky right-0 bg-background"><div className="flex flex-col gap-1">{r.receiptQty>0 ? <Button size="sm" variant="outline" onClick={()=>onAction(r,"warehouse")}>คลังตรวจรับ<ArrowUpRight className="ml-1 h-3 w-3"/></Button> : <>{r.billboardQty>0&&<Button size="sm" variant="outline" onClick={()=>onAction(r,"billboard")}>ระบุป้าย<ArrowUpRight className="ml-1 h-3 w-3"/></Button>}{r.returnQty>0&&<Button size="sm" variant="outline" onClick={()=>onAction(r,"return")}>คืน / ปิดผลใช้งาน<ArrowUpRight className="ml-1 h-3 w-3"/></Button>}{!r.billboardQty&&!r.returnQty&&<Button size="sm" variant="outline" onClick={()=>onAction(r,"awaiting-usage")}>ดูสินค้ารอใช้งาน<ArrowUpRight className="ml-1 h-3 w-3"/></Button>}</>}</div></TableCell></TableRow>)}{!selected.length&&<TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground">ไม่มีงานค้างตามตัวกรอง</TableCell></TableRow>}</TableBody></Table></div>
        <TablePagination currentPage={pagination.currentPage} totalPages={pagination.totalPages} pageSize={pagination.pageSize} totalItems={pagination.totalItems} onPageChange={pagination.handlePageChange} onPageSizeChange={pagination.handlePageSizeChange}/>
      </section>}
      <footer className="border-t pt-4 text-xs leading-relaxed text-muted-foreground">ยอดรอระบุป้าย รอส่งคืน และรอใช้งานอาจเป็นสินค้ารายการเดียวกัน จึงไม่รวมยอดแต่ละขั้นตอนเข้าด้วยกัน · แยกจำนวนตามหน่วยสินค้า · งานรอเข้าคลังเป็นหน้าที่คลังตรวจรับ ไม่ใช่ผู้เบิกยังไม่ได้ส่งคืน · เอกสารเดียวอาจอยู่หลายช่วงเมื่อมีรายการรับโอนคนละวัน · ไม่แสดงมูลค่าประมาณเมื่อไม่มีราคาต่อรายการที่เชื่อถือได้</footer>
    </>}
  </div>;
}