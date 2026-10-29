import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, PackageCheck, Plus, Trash2 } from "lucide-react";
import { SymptomSelect } from "@/components/media-player/SymptomSelect";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ReturnPhotoDropzone } from "./ReturnPhotoDropzone";
import { issuedDefectiveReturned, lineInstalled } from "@/lib/issueQuantities";
import { oldPartRemaining, oldPartUnavailable, twoStepReturnBalance, validateOldPartRows } from "@/lib/issueReturnForm";

interface OldPart { id: string; kind: "equipment" | "media_player" | "unregistered"; billboard_id: string; billboard_label: string; code: string; name: string; serial_number: string | null; quantity: number }
interface OldRow { key: string; asset: string; quantity: string; condition: "used" | "defective" }
const numberOf = (v: string) => Math.max(0, Number(v) || 0);
export interface ReturnItemLine {
  id: string;
  pending_id: string;
  equipment_id: string | null;
  media_player_id?: string | null;
  is_media_player?: boolean | null;
  equipment_code: string | null;
  equipment_name: string | null;
  serial_number: string | null;
  quantity: number;
  issued_quantity: number | null;
  unit: string;
  billboard_id: string | null;
  returned_good_qty?: number | null;
  returned_defective_qty?: number | null;
  swap_returned_defective_qty?: number | null;
  installed_qty?: number | null;
  written_off_qty?: number | null;
  lost_replacement_qty?: number | null;
  transferred_qty?: number | null;
  installation_return_settled_qty?: number | null;
  notes: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  documentNo: string;
  pendingId: string;
  requesterName?: string | null;
  requesterDepartment?: string | null;
  item: ReturnItemLine | null;
  onSaved: () => void;
  /** Purpose needs both billboard + return: installing does not reduce what must be returned */
  independentOfInstall?: boolean;
}

export function ReturnItemDialog({ open, onOpenChange, documentNo, item, onSaved, independentOfInstall = false }: Props) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [installed, setInstalled] = useState("0");
  const [good, setGood] = useState("0");
  const [issuedDefective, setIssuedDefective] = useState("0");
  const [showIssuedDefective, setShowIssuedDefective] = useState(false);
  const [candidates, setCandidates] = useState<OldPart[]>([]);
  const [rows, setRows] = useState<OldRow[]>([]);
  const [noOldEnabled, setNoOldEnabled] = useState(false);
  const [noOld, setNoOld] = useState("0");
  const [noOldReason, setNoOldReason] = useState("");
  const [notes, setNotes] = useState("");
  const [symptomId, setSymptomId] = useState("");
  const [symptomOther, setSymptomOther] = useState("");
  const [goodPhotos, setGoodPhotos] = useState<string[]>([]);
  const [defPhotos, setDefPhotos] = useState<string[]>([]);
  const [usedPhotos, setUsedPhotos] = useState<string[]>([]);
  const [sitePhotos, setSitePhotos] = useState<string[]>([]);
  const [submissionKey, setSubmissionKey] = useState("");
  const issued = Number(item?.issued_quantity ?? item?.quantity ?? 0);
  const priorInstalled = item ? lineInstalled(item) : 0;
  const returned = Number(item?.returned_good_qty || 0) + (item ? issuedDefectiveReturned(item) : 0);
  const otherClosed = Math.max(0, Number(item?.written_off_qty || 0) - Number(item?.lost_replacement_qty || 0)) + Number(item?.transferred_qty || 0);
  const settled = Math.max(Number(item?.installation_return_settled_qty || 0), Number(item?.swap_returned_defective_qty || 0)) + Number(item?.lost_replacement_qty || 0);
  const oldDef = rows.filter(r => r.condition === "defective").reduce((sum,r) => sum + numberOf(r.quantity),0);
  const oldUsed = rows.filter(r => r.condition === "used").reduce((sum,r) => sum + numberOf(r.quantity),0);
  const balance = twoStepReturnBalance(issued, numberOf(installed), returned, otherClosed, numberOf(good), numberOf(issuedDefective), oldDef, oldUsed, numberOf(noOld), settled);
  const allowUnregistered = !!item?.equipment_id && !item?.media_player_id && !item?.is_media_player;
  const options: OldPart[] = allowUnregistered && item?.equipment_id ? [...candidates, { id: item.equipment_id, kind: "unregistered", billboard_id: item.billboard_id || "", billboard_label: "ของเดิมก่อนเริ่มใช้ระบบ (ไม่มีในระบบ)", code: item.equipment_code || "", name: item.equipment_name || "", serial_number: null, quantity: Math.max(0, balance.installationOpen) }] : candidates;
  const legacyEditable = item?.installed_qty == null && !item?.media_player_id && !item?.is_media_player && !item?.serial_number;

  useEffect(() => {
    if (!open || !item) return;
    let cancelled = false;
    setStep(1); setInstalled(String(priorInstalled));
    setGood(String(Math.max(0, issued - priorInstalled - returned - otherClosed)));
    setIssuedDefective("0"); setShowIssuedDefective(false); setRows([]); setCandidates([]);
    setNoOldEnabled(false); setNoOld("0"); setNoOldReason(""); setNotes(""); setSymptomId(""); setSymptomOther("");
    setGoodPhotos([]); setDefPhotos([]); setUsedPhotos([]); setSitePhotos([]); setSubmissionKey(crypto.randomUUID());
    setLoading(true); setLoadError("");
    supabase.rpc("issue_old_part_candidates", { _item_id: item.id }).then(({data,error}) => {
      if (cancelled) return;
      setLoading(false);
      if (error) setLoadError("โหลดอุปกรณ์ที่ป้ายไม่สำเร็จ: " + error.message);
      else setCandidates(Array.isArray(data) ? data as unknown as OldPart[] : []);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open,item?.id]);

  const stepOneError = numberOf(installed) > priorInstalled || numberOf(installed) < settled
    ? "จำนวนใช้จริงไม่ตรงกับประวัติที่บันทึกแล้ว"
    : balance.unusedRemaining < 0 ? "จำนวนคืนเกินของที่เหลือจากใบเบิก"
    : [installed,good,issuedDefective].some(v => !Number.isInteger(Number(v)) || Number(v) < 0) ? "กรุณาระบุจำนวนเต็มตั้งแต่ 0 ขึ้นไป" : null;
  const rowError = validateOldPartRows(options, rows);
  const error = stepOneError || loadError || (loading ? "กำลังโหลดอุปกรณ์ที่ป้าย…" : null) || rowError
    || (balance.installationRemaining < 0 ? "ยอดของเก่ารวมกับไม่มีของคืนเกินยอดใช้จริง" : null)
    || (independentOfInstall && balance.installationRemaining !== 0 ? `ยังไม่ได้สรุปของเดิมอีก ${balance.installationRemaining} ${item?.unit}` : null)
    || (numberOf(noOld)>0 && !noOldReason.trim() ? "กรุณาระบุเหตุผลที่ไม่มีของเดิมคืน" : null)
    || (oldDef+numberOf(issuedDefective)>0 && !symptomId && !symptomOther.trim() ? "กรุณาระบุอาการเสีย" : null)
    || (oldDef+numberOf(issuedDefective)>0 && defPhotos.length===0 ? "กรุณาแนบรูปของเสีย" : null)
    || (numberOf(good)+numberOf(issuedDefective)+oldDef+oldUsed+numberOf(noOld)===0 ? "ยังไม่มีรายการส่งคืนหรือสรุปงาน" : null);

  const handleSave = async () => {
    if (!item || error || saving) return;
    setSaving(true);
    try {
      const {error:saveError} = await supabase.rpc("submit_issue_return_v2", {
        _item_id:item.id, _installed:numberOf(installed), _good:numberOf(good), _issued_defective:numberOf(issuedDefective),
        _old_parts:rows.map(r => { const asset = options.find(c=>c.kind+":"+c.id===r.asset); return {id:asset?.id,kind:asset?.kind,quantity:numberOf(r.quantity),condition:r.condition}; }),
        _no_old:numberOf(noOld), _no_old_reason:noOldReason.trim(), _notes:notes.trim(), _good_photos:goodPhotos,
        _defective_photos:defPhotos, _used_photos:usedPhotos, _site_photos:sitePhotos,
        _symptom_id:symptomId || null, _symptom_other:symptomOther.trim(), _submission_key:submissionKey,
      });
      if (saveError) throw saveError;
      toast.success("บันทึกการส่งคืนแล้ว รอคลังรับสินค้า"); onSaved(); onOpenChange(false);
    } catch(e:unknown) { toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ กรุณาลองใหม่"); }
    finally { setSaving(false); }
  };
  const quantityInput = (id:string, label:string, value:string, change:(v:string)=>void, max:number, disabled=false) => <div className="flex items-center justify-between gap-3 py-3"><Label htmlFor={id} className="leading-relaxed">{label}</Label><div className="flex shrink-0 items-center gap-2"><Input id={id} type="number" min={0} max={max} value={value} disabled={disabled} className="w-24 text-right" onChange={e=>change(e.target.value)} onWheel={e=>e.currentTarget.blur()} /><span className="text-xs text-muted-foreground">{item?.unit}</span></div></div>;

  return <Dialog open={open} onOpenChange={v=>{if(!saving)onOpenChange(v);}}><DialogContent className="max-w-2xl max-h-[90dvh] flex flex-col overflow-hidden p-0">
    <DialogHeader className="px-5 pt-5 shrink-0"><DialogTitle className="flex items-center gap-2"><PackageCheck className="h-5 w-5 text-primary"/>ส่งคืนสินค้า</DialogTitle><DialogDescription>{documentNo} · {item?.equipment_code} {item?.equipment_name}</DialogDescription></DialogHeader>
    <div className="grid grid-cols-2 gap-2 px-5 text-sm shrink-0">
      {["ของที่เบิกไป","ของเก่าจากป้าย"].map((label,i)=><div key={label} className={`flex items-center gap-2 border-b-2 py-2 ${step===i+1?"border-primary text-primary":"border-border text-muted-foreground"}`}><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs">{step>i+1?<Check className="h-3 w-3"/>:i+1}</span>{label}</div>)}
    </div>
    <div className="overflow-y-auto min-h-0 px-5 py-4 space-y-4">
      {item?.serial_number && <Badge variant="outline" className="whitespace-pre-line">S/N: {item.serial_number}</Badge>}
      {step===1 ? <>
        <div className="flex flex-wrap justify-between gap-2 bg-muted/50 rounded-md p-3 text-sm"><span>เบิกทั้งหมด <strong>{issued} {item?.unit}</strong></span><span className="text-muted-foreground">คืนก่อนหน้า {returned} {item?.unit}</span></div>
        <div className="divide-y">
          {quantityInput("installed-actual",legacyEditable?"ใช้จริงที่ป้าย":"ใช้จริงที่ป้าย (บันทึกแล้ว)",installed,v=>{setInstalled(v);setGood(String(Math.max(0,issued-numberOf(v)-returned-otherClosed-numberOf(issuedDefective))));},priorInstalled,!legacyEditable)}
          {legacyEditable && <Badge variant="outline" className="my-2 text-warning">ยอดเดิมอนุมานจากการระบุป้าย · ยืนยันจำนวนใช้จริง</Badge>}
          {quantityInput("unused-good","ของเหลือคืนคลัง",good,setGood,balance.unused)}
        </div>
        <div className="flex items-center gap-2"><Checkbox id="issued-damaged" checked={showIssuedDefective} onCheckedChange={v=>{setShowIssuedDefective(v===true);if(!v)setIssuedDefective("0");}}/><Label htmlFor="issued-damaged">ของที่เบิกเสียก่อนใช้</Label></div>
        {showIssuedDefective && quantityInput("issued-defective","จำนวนเสียจากยอดเบิก",issuedDefective,setIssuedDefective,balance.unused)}
        {numberOf(good)>0 && <ReturnPhotoDropzone required={false} photos={goodPhotos} onChange={setGoodPhotos} folder="good" label="รูปของเหลือคืนคลัง (ไม่บังคับ)"/>}
        <div className={`rounded-md p-3 text-sm ${balance.unusedRemaining<0?"bg-destructive/10 text-destructive":"bg-muted text-foreground"}`}>ใช้จริง {installed} + คืนครั้งนี้ {numberOf(good)+numberOf(issuedDefective)} + คืนก่อนหน้า {returned}{otherClosed>0?` + ปิดยอดอื่น ${otherClosed}`:""} / เบิก {issued}<div className="mt-1 font-medium">เหลือถือไปใช้งาน {Math.max(0,balance.unusedRemaining)} {item?.unit}</div></div>
        {stepOneError && <p role="alert" className="text-sm text-destructive">{stepOneError}</p>}
      </> : <>
        <div className="flex flex-wrap justify-between gap-2 text-sm bg-muted/50 rounded-md p-3"><span>ใช้จริง <strong>{installed} {item?.unit}</strong></span><span>สรุปของเดิมแล้ว {settled} {item?.unit}</span></div>
        <h3 className="font-medium">มีของเก่าถอดกลับจากป้ายไหม?</h3>
        {rows.map((row,index)=><div key={row.key} className="border-b pb-4 space-y-2">
          <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">ของเก่ารายการ {index+1}</span><Button size="icon" variant="ghost" title="ลบรายการ" aria-label={`ลบของเก่ารายการ ${index+1}`} onClick={()=>setRows(rs=>rs.filter(r=>r.key!==row.key))}><Trash2 className="h-4 w-4"/></Button></div>
          <SearchableSelect value={row.asset} placeholder="เลือกอุปกรณ์เดิมที่ป้าย" searchPlaceholder="ค้นหารหัส / ชื่อ / S/N" options={options.map(c=>({value:c.kind+":"+c.id,label:`${c.billboard_label} · ${c.code} ${c.name}`,description:`${c.serial_number?"S/N: "+c.serial_number+" · ":""}เหลือ ${oldPartRemaining(c,rows,index)} ${item?.unit}`,disabled:oldPartUnavailable(c,row.condition,rows,index)}))} onValueChange={v=>setRows(rs=>rs.map(r=>r.key===row.key?{...r,asset:v}:r))}/>
          <div className="flex flex-wrap gap-2"><Button size="sm" variant={row.condition==="defective"?"default":"outline"} onClick={()=>setRows(rs=>rs.map(r=>r.key===row.key?{...r,condition:"defective"}:r))}>เสียจากการใช้งาน</Button><Button size="sm" variant={row.condition==="used"?"default":"outline"} onClick={()=>setRows(rs=>rs.map(r=>r.key===row.key?{...r,condition:"used"}:r))}>PM · ยังใช้งานได้</Button></div>
          {quantityInput(`old-quantity-${index}`,"จำนวนถอดกลับ",row.quantity,v=>setRows(rs=>rs.map(r=>r.key===row.key?{...r,quantity:v}:r)),(()=>{const asset=options.find(c=>c.kind+":"+c.id===row.asset);return asset?oldPartRemaining(asset,rows,index):0;})())}
          {row.condition==="used" && <Badge variant="outline" className="text-primary">SPARE-USED · ใช้งานแล้ว</Badge>}
        </div>)}
        <Button variant="outline" size="sm" disabled={loading} onClick={()=>setRows(rs=>{const choices=options.flatMap(asset=>(["defective","used"] as const).map(condition=>({asset,condition})));const free=choices.find(c=>!oldPartUnavailable(c.asset,c.condition,rs));return [...rs,{key:crypto.randomUUID(),asset:free?free.asset.kind+":"+free.asset.id:"",quantity:"1",condition:free?.condition || "defective"}];})}><Plus className="mr-1 h-4 w-4"/>เพิ่มของเก่าถอดกลับ</Button>
        {!loading && candidates.length===0 && <p className="text-sm text-muted-foreground">ป้ายนี้ยังไม่มีอุปกรณ์เดิมในระบบ · กดเพิ่มเพื่อบันทึกของเดิมก่อนเริ่มใช้ระบบได้</p>}
        {balance.installationOpen>0 && <><div className="flex items-center gap-2"><Checkbox id="no-old-part" checked={noOldEnabled} onCheckedChange={v=>{setNoOldEnabled(v===true);setNoOld(v?String(Math.max(0,balance.installationRemaining)):"0");if(!v)setNoOldReason("");}}/><Label htmlFor="no-old-part">ไม่มีของเดิมส่งคืน</Label></div>
          {noOldEnabled && <div className="space-y-2 border-l-2 border-border pl-3">{quantityInput("no-old-quantity","จำนวนไม่มีของคืน",noOld,setNoOld,balance.installationOpen)}<div className="flex flex-wrap gap-2"><Button size="sm" variant={noOldReason==="ติดตั้งใหม่ ไม่มีอุปกรณ์เดิม"?"default":"outline"} onClick={()=>setNoOldReason("ติดตั้งใหม่ ไม่มีอุปกรณ์เดิม")}>ติดตั้งใหม่</Button><Button size="sm" variant={noOldReason!=="ติดตั้งใหม่ ไม่มีอุปกรณ์เดิม"?"default":"outline"} onClick={()=>setNoOldReason("")}>สูญหาย / ถูกขโมย</Button></div>{noOldReason!=="ติดตั้งใหม่ ไม่มีอุปกรณ์เดิม" && <><Textarea aria-label="เหตุผลไม่มีของเดิมคืน" placeholder="เหตุที่ของเดิมสูญหายหรือถูกขโมย" value={noOldReason} onChange={e=>setNoOldReason(e.target.value)}/><ReturnPhotoDropzone photos={sitePhotos} onChange={setSitePhotos} folder="good" label="รูปหน้างาน (ไม่บังคับ)"/></>}</div>}</>}
        {oldUsed>0 && <ReturnPhotoDropzone required={false} photos={usedPhotos} onChange={setUsedPhotos} folder="good" label="รูปของดีจาก PM (ไม่บังคับ)"/>}
        {oldDef+numberOf(issuedDefective)>0 && <div className="space-y-2"><Label>อาการเสีย</Label><SymptomSelect value={symptomId} onChange={setSymptomId}/><Textarea aria-label="รายละเอียดอาการเสีย" placeholder="รายละเอียดอาการเสีย" value={symptomOther} onChange={e=>setSymptomOther(e.target.value)}/><ReturnPhotoDropzone photos={defPhotos} onChange={setDefPhotos} folder="defective" label="รูปของเสีย (อย่างน้อย 1 รูป)"/></div>}
        <div className="bg-muted rounded-md p-3 text-sm space-y-1"><div className="font-medium">ส่งให้คลัง</div><div>ของเหลือ {good} · ของเก่าเสีย {oldDef} · SPARE-USED {oldUsed} {item?.unit}</div><div className="text-muted-foreground">ไม่มีของเดิมคืน {noOld} · ยังไม่สรุป {Math.max(0,balance.installationRemaining)} {item?.unit}</div></div>
        <Label htmlFor="return-notes">หมายเหตุ (ถ้ามี)</Label><Textarea id="return-notes" value={notes} onChange={e=>setNotes(e.target.value)} rows={2}/>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </>}
    </div>
    <DialogFooter className="border-t px-5 py-3 shrink-0 flex-row justify-between gap-2"><Button variant="outline" disabled={saving} onClick={()=>step===1?onOpenChange(false):setStep(1)}>{step===1?"ยกเลิก":<><ArrowLeft className="mr-1 h-4 w-4"/>ย้อนกลับ</>}</Button>{step===1?<Button disabled={!!stepOneError} onClick={()=>setStep(2)}>ถัดไป<ArrowRight className="ml-1 h-4 w-4"/></Button>:<Button disabled={saving||!!error} onClick={handleSave}>{saving?"กำลังบันทึก…":"ยืนยันส่งคืน"}</Button>}</DialogFooter>
  </DialogContent></Dialog>;
}
