import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DepartmentMultiFilter } from "@/components/DepartmentMultiFilter";
import { SearchableMultiSelect } from "@/components/ui/searchable-select";
import { AGING_BUCKETS, PROBLEM_TYPES, emptyFollowUpFilters, type FollowUpFilters } from "@/lib/incompleteIssueReport";
import { RotateCcw, Search } from "lucide-react";

export function IssueFollowUpFilters({ value, onChange, purposes }: { value: FollowUpFilters; onChange: (v: FollowUpFilters) => void; purposes: string[] }) {
  const set = <K extends keyof FollowUpFilters>(key: K, next: FollowUpFilters[K]) => onChange({ ...value, [key]: next });
  return <div className="space-y-3 border-y py-4">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="space-y-1.5"><Label>ฝ่าย</Label><div className="[&_button]:w-full"><DepartmentMultiFilter value={value.departments} onChange={v => set("departments", v)} /></div></div>
      <div className="space-y-1.5"><Label>วัตถุประสงค์การเบิก</Label><SearchableMultiSelect values={value.purposes} onValuesChange={v => set("purposes", v)} options={purposes.map(p => ({ value:p, label:p }))} placeholder="ทุกวัตถุประสงค์" maxDisplay={1} /></div>
      <div className="space-y-1.5"><Label>ระยะเวลาค้าง</Label><SearchableMultiSelect values={value.ages} onValuesChange={v => set("ages", v)} options={AGING_BUCKETS} placeholder="ทุกช่วงเวลา" maxDisplay={1} /></div>
      <div className="space-y-1.5"><Label>ประเภทงานค้าง</Label><SearchableMultiSelect values={value.problems} onValuesChange={v => set("problems", v)} options={PROBLEM_TYPES} placeholder="ทุกประเภท" maxDisplay={1} /></div>
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-44 flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="ค้นหา S/N หรือ Alias" placeholder="S/N หรือ Alias" className="pl-9" value={value.serial} onChange={e => set("serial",e.target.value)} /></div>
      <div className="relative min-w-56 flex-[2]"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="ค้นหารายการเบิก" placeholder="เลขเอกสาร, รหัส, ชื่อสินค้า, ผู้เบิก" className="pl-9" value={value.search} onChange={e => set("search",e.target.value)} /></div>
      <Button variant="ghost" size="sm" onClick={() => onChange(emptyFollowUpFilters())}><RotateCcw className="mr-2 h-4 w-4" />ล้างตัวกรอง</Button>
    </div>
  </div>;
}