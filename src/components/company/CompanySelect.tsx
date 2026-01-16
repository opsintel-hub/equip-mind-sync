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
  placeholder?: string;
  required?: boolean;
}

export function CompanySelect({
  value,
  onChange,
  disabled,
  departmentId,
  placeholder = "เลือกบริษัท",
  required = false,
}: CompanySelectProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCompanies();
  }, [departmentId]);

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
      .order("code");

    if (departmentId) {
      query = query.eq("department_id", departmentId);
    }

    const { data, error } = await query;

    if (!error && data) {
      setCompanies(data as Company[]);
    }
    setIsLoading(false);
  };

  const options = companies.map((company) => ({
    value: company.id,
    label: `${company.code} - ${company.name}`,
    description: company.departments && !departmentId ? company.departments.name : undefined,
  }));

  return (
    <SearchableSelect
      options={options}
      value={value}
      onValueChange={onChange}
      placeholder={placeholder}
      searchPlaceholder="ค้นหาบริษัท..."
      emptyMessage="ไม่พบบริษัท"
      disabled={disabled}
      isLoading={isLoading}
    />
  );
}
