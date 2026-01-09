import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface Company {
  id: string;
  code: string;
  name: string;
}

interface CompanyFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function CompanyFilter({ value, onChange }: CompanyFilterProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    const { data } = await supabase
      .from("companies")
      .select("id, code, name")
      .eq("is_active", true)
      .order("code");
    setCompanies(data || []);
    setIsLoading(false);
  };

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder={isLoading ? "กำลังโหลด..." : "ทุกบริษัท"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">ทุกบริษัท</SelectItem>
        {companies.map((company) => (
          <SelectItem key={company.id} value={company.id}>
            {company.code} - {company.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
