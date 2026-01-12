import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";

export interface InventoryFiltersState {
  companyId: string;
  department: string;
  categoryId: string;
  subcategoryId: string;
  warehouseId: string;
  locationId: string;
  stockStatus: string;
  search: string;
}

interface InventoryFiltersProps {
  filters: InventoryFiltersState;
  onFiltersChange: (filters: InventoryFiltersState) => void;
}

export function InventoryFilters({ filters, onFiltersChange }: InventoryFiltersProps) {
  const [localSearch, setLocalSearch] = useState(filters.search);

  // Fetch companies
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, code")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch subcategories based on selected category
  const { data: subcategories = [] } = useQuery({
    queryKey: ["subcategories", filters.categoryId],
    queryFn: async () => {
      let query = supabase
        .from("subcategories")
        .select("id, name, category_id")
        .eq("is_active", true)
        .order("name");
      
      if (filters.categoryId) {
        query = query.eq("category_id", filters.categoryId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch warehouses
  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouses")
        .select("id, name, code")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch locations based on selected warehouse
  const { data: locations = [] } = useQuery({
    queryKey: ["locations", filters.warehouseId],
    queryFn: async () => {
      let query = supabase
        .from("locations")
        .select("id, name, code, warehouse_id")
        .eq("is_active", true)
        .order("name");
      
      if (filters.warehouseId) {
        query = query.eq("warehouse_id", filters.warehouseId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Reset subcategory when category changes
  useEffect(() => {
    if (filters.categoryId === "") {
      onFiltersChange({ ...filters, subcategoryId: "" });
    }
  }, [filters.categoryId]);

  // Reset location when warehouse changes
  useEffect(() => {
    if (filters.warehouseId === "") {
      onFiltersChange({ ...filters, locationId: "" });
    }
  }, [filters.warehouseId]);

  const handleSearchSubmit = () => {
    onFiltersChange({ ...filters, search: localSearch });
  };

  const handleClearFilters = () => {
    setLocalSearch("");
    onFiltersChange({
      companyId: "",
      department: "",
      categoryId: "",
      subcategoryId: "",
      warehouseId: "",
      locationId: "",
      stockStatus: "",
      search: "",
    });
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  return (
    <div className="space-y-4">
      {/* Row 1: Main filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Select
          value={filters.companyId}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, companyId: value === "all" ? "" : value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="บริษัท" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">บริษัททั้งหมด</SelectItem>
            {companies.map((company) => (
              <SelectItem key={company.id} value={company.id}>
                {company.code} - {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.department}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, department: value === "all" ? "" : value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="ฝ่าย" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ฝ่ายทั้งหมด</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.name}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.categoryId}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              categoryId: value === "all" ? "" : value,
              subcategoryId: "",
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="หมวดหมู่" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">หมวดหมู่ทั้งหมด</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.subcategoryId}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, subcategoryId: value === "all" ? "" : value })
          }
          disabled={!filters.categoryId}
        >
          <SelectTrigger>
            <SelectValue placeholder="หมวดหมู่ย่อย" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">หมวดหมู่ย่อยทั้งหมด</SelectItem>
            {subcategories.map((sub) => (
              <SelectItem key={sub.id} value={sub.id}>
                {sub.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.warehouseId}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              warehouseId: value === "all" ? "" : value,
              locationId: "",
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="คลังสินค้า" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">คลังทั้งหมด</SelectItem>
            {warehouses.map((wh) => (
              <SelectItem key={wh.id} value={wh.id}>
                {wh.code} - {wh.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.locationId}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, locationId: value === "all" ? "" : value })
          }
          disabled={!filters.warehouseId}
        >
          <SelectTrigger>
            <SelectValue placeholder="ตำแหน่งจัดเก็บ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ตำแหน่งทั้งหมด</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.code} - {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Row 2: Stock status & Search */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select
          value={filters.stockStatus}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, stockStatus: value === "all" ? "" : value })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="สถานะ Stock" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">สถานะทั้งหมด</SelectItem>
            <SelectItem value="normal">ปกติ</SelectItem>
            <SelectItem value="low">ใกล้หมด</SelectItem>
            <SelectItem value="out">หมด</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-2 flex-1 max-w-md">
          <Input
            placeholder="ค้นหารหัส, ชื่อ, ยี่ห้อ..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
            className="flex-1"
          />
          <Button variant="outline" size="icon" onClick={handleSearchSubmit}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            <X className="h-4 w-4 mr-1" />
            ล้างตัวกรอง
          </Button>
        )}
      </div>
    </div>
  );
}
