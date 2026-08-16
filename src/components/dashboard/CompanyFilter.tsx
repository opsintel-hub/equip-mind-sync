import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface Company {
  id: string;
  code: string;
  name: string;
  department_id: string | null;
}

interface CompanyFilterProps {
  value: string;
  onChange: (value: string) => void;
  /** Department names to scope companies by. Empty = all departments */
  departments?: string[];
}

export function CompanyFilter({ value, onChange, departments = [] }: CompanyFilterProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [deptIds, setDeptIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    const fetchDeptIds = async () => {
      if (departments.length === 0) {
        setDeptIds([]);
        return;
      }
      const { data } = await supabase.from("departments").select("id, name").in("name", departments);
      setDeptIds((data || []).map((d) => d.id));
    };
    fetchDeptIds();
  }, [departments.join("|")]);

  const fetchCompanies = async () => {
    const { data } = await supabase
      .from("companies")
      .select("id, code, name, department_id")
      .eq("is_active", true)
      .order("code");
    setCompanies((data || []) as Company[]);
    setIsLoading(false);
  };

  const filtered =
    departments.length === 0 || deptIds.length === 0
      ? companies
      : companies.filter((c) => c.department_id && deptIds.includes(c.department_id));

  // Reset selection when the chosen company is out of the current department scope
  useEffect(() => {
    if (value !== "all" && filtered.length > 0 && !filtered.some((c) => c.id === value)) {
      onChange("all");
    }
  }, [filtered.length, value]);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder={isLoading ? "กำลังโหลด..." : "ทุกบริษัท"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">ทุกบริษัท</SelectItem>
        {filtered.map((company) => (
          <SelectItem key={company.id} value={company.id}>
            {company.code} - {company.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
