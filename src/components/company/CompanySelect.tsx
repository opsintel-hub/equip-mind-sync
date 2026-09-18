import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface Company {
  id: string;
  code: string;
  name: string;
  department_id: string | null;
  departments: {
    id: string;
    name: string;
  } | null;
}

interface CompanySelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  departmentId?: string;
  /** Department name (when the form stores the name instead of the id) */
  departmentName?: string;
  placeholder?: string;
  required?: boolean;
}

export function CompanySelect({
  value,
  onChange,
  disabled,
  departmentId,
  departmentName,
  placeholder = "เลือกบริษัท",
  required = false,
}: CompanySelectProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCompanies();
  }, [departmentId, departmentName]);

  const fetchCompanies = async () => {
    setIsLoading(true);
    let query = supabase
      .from("companies")
      .select(`
        id,
        code,
        name,
        department_id,
        departments (id, name)
      `)
      .eq("is_active", true)
      .eq("is_hidden", false)
      .order("code");


    if (departmentId) {
      query = query.eq("department_id", departmentId);
    }

    const { data, error } = await query;

    if (!error && data) {
      const rows = data as unknown as Company[];
      const scoped =
        !departmentId && departmentName
          ? rows.filter((c) => !c.department_id || c.departments?.name === departmentName)
          : rows;
      setCompanies(scoped);
    }
    setIsLoading(false);
  };

  const isScoped = Boolean(departmentId || departmentName);

  // Clear a selection that falls outside the current department scope
  useEffect(() => {
    if (isLoading || !isScoped || !value) return;
    if (!companies.some((c) => c.id === value)) onChange("");
  }, [isLoading, isScoped, value, companies]);

  const options = companies.map((company) => ({
    value: company.id,
    label: `${company.code} - ${company.name}`,
    description: company.departments && !isScoped ? company.departments.name : undefined,
  }));

  return (
    <SearchableSelect
      options={options}
      value={value}
      onValueChange={onChange}
      placeholder={placeholder}
      searchPlaceholder="ค้นหาบริษัท..."
      emptyMessage={isScoped ? "ไม่มีข้อมูลในฝ่ายนี้" : "ไม่พบบริษัท"}
      disabled={disabled}
      isLoading={isLoading}
    />
  );
}
