import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface Department {
  id: string;
  name: string;
  description: string | null;
}

interface SimpleDepartmentSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function SimpleDepartmentSelect({ value, onChange, disabled }: SimpleDepartmentSelectProps) {
  const [departments, setDepartments] = useState<Department[]>([]);

  const fetchDepartments = async () => {
    const { data, error } = await supabase
      .from("departments")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Error fetching departments:", error);
      toast.error("ไม่สามารถโหลดข้อมูลฝ่ายได้");
    } else {
      setDepartments(data || []);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const options = departments.map((dept) => ({
    value: dept.name,
    label: dept.name,
    description: dept.description || undefined,
  }));

  return (
    <SearchableSelect
      options={options}
      value={value}
      onValueChange={onChange}
      placeholder="เลือกฝ่าย"
      searchPlaceholder="ค้นหาฝ่าย..."
      emptyMessage="ไม่พบฝ่าย"
      disabled={disabled}
    />
  );
}
