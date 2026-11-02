import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Building2 } from "lucide-react";

interface Props {
  departmentIds: string[];
  sectionIds: string[];
  onChange: (next: { departmentIds: string[]; sectionIds: string[] }) => void;
}

export function PurposeScopePicker({ departmentIds, sectionIds, onChange }: Props) {
  const { data: departments = [] } = useQuery({
    queryKey: ["departments-active-scope"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("id, name").eq("is_active", true).order("name");
      if (error) throw error;
      return data || [];
    },
  });
  const { data: sections = [] } = useQuery({
    queryKey: ["sections-active-scope"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sections").select("id, name, department_id").eq("is_active", true).order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const toggleDept = (id: string) => {
    if (departmentIds.includes(id)) {
      const drop = new Set(sections.filter((s) => s.department_id === id).map((s) => s.id));
      onChange({ departmentIds: departmentIds.filter((d) => d !== id), sectionIds: sectionIds.filter((s) => !drop.has(s)) });
    } else onChange({ departmentIds: [...departmentIds, id], sectionIds });
  };
  const toggleSection = (id: string) =>
    onChange({ departmentIds, sectionIds: sectionIds.includes(id) ? sectionIds.filter((s) => s !== id) : [...sectionIds, id] });

  const allMode = departmentIds.length === 0;

  return (
    <div className="space-y-3 pt-2 border-t">
      <Label className="text-sm font-medium flex items-center gap-2">
        <Building2 className="h-4 w-4" />
        ฝ่าย & แผนกที่ใช้ได้:
      </Label>
      <div className="flex items-center space-x-2">
        <Checkbox id="scope_all" checked={allMode} onCheckedChange={(c) => c && onChange({ departmentIds: [], sectionIds: [] })} />
        <Label htmlFor="scope_all" className="text-sm font-normal text-primary">ทุกฝ่ายใช้ได้</Label>
      </div>
      <div className="max-h-56 overflow-y-auto rounded-md border p-3 bg-muted/20 space-y-2">
        {departments.map((d) => {
          const checked = departmentIds.includes(d.id);
          const deptSections = sections.filter((s) => s.department_id === d.id);
          return (
            <div key={d.id} className="space-y-1">
              <div className="flex items-center space-x-2">
                <Checkbox id={`dept-${d.id}`} checked={checked} onCheckedChange={() => toggleDept(d.id)} />
                <Label htmlFor={`dept-${d.id}`} className="text-sm font-medium cursor-pointer">{d.name}</Label>
              </div>
              {checked && deptSections.length > 0 && (
                <div className="ml-6 grid grid-cols-2 gap-1">
                  {deptSections.map((s) => (
                    <div key={s.id} className="flex items-center space-x-2">
                      <Checkbox id={`sec-${s.id}`} checked={sectionIds.includes(s.id)} onCheckedChange={() => toggleSection(s.id)} />
                      <Label htmlFor={`sec-${s.id}`} className="text-xs font-normal cursor-pointer">{s.name}</Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {allMode ? "ทุกฝ่ายเห็นวัตถุประสงค์นี้" : `จำกัด ${departmentIds.length} ฝ่าย — ถ้าไม่เลือกแผนก แปลว่าทุกแผนกในฝ่ายนั้นใช้ได้`}
      </p>
    </div>
  );
}
