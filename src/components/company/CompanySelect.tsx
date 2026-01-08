import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

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

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled || isLoading}>
      <SelectTrigger>
        <SelectValue placeholder={isLoading ? "กำลังโหลด..." : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {companies.length === 0 ? (
          <SelectItem value="no-data" disabled>
            ไม่พบบริษัท
          </SelectItem>
        ) : (
          companies.map((company) => (
            <SelectItem key={company.id} value={company.id}>
              <div className="flex items-center gap-2">
                <span className="font-medium">{company.code}</span>
                <span>- {company.name}</span>
                {company.departments && !departmentId && (
                  <Badge variant="outline" className="text-xs">
                    {company.departments.name}
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
