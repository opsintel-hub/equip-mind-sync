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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, X, Filter, ChevronDown, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface InventoryFiltersState {
  companyId: string;
  department: string;
  categoryId: string;
  subcategoryId: string;
  warehouseId: string;
  locationId: string;
  stockStatus: string;
  search: string;
  itemType: string; // 'all' | 'equipment' | 'media_player'
  statusFilters: string[]; // Multi-select: expired, warranty_expired, near_expiry, near_warranty, out_of_stock
  advanceDays?: number; // Custom days for near expiry/warranty calculation
  issueStatus: string; // '' | 'in_stock' | 'issued' | 'partial'
}

export const STATUS_FILTER_OPTIONS = [
  { value: "expired", label: "หมดอายุแล้ว" },
  { value: "warranty_expired", label: "หมดประกันแล้ว" },
  { value: "near_expiry", label: "ใกล้หมดอายุ" },
  { value: "near_warranty", label: "ใกล้หมดประกัน" },
  { value: "out_of_stock", label: "สินค้าหมด" },
];

export const ADVANCE_DAYS_OPTIONS = [
  { value: 30, label: "30 วัน" },
  { value: 60, label: "60 วัน" },
  { value: 90, label: "90 วัน" },
  { value: 120, label: "120 วัน" },
];

export const ITEM_TYPE_OPTIONS = [
  { value: "all", label: "ทั้งหมด" },
  { value: "equipment", label: "อะไหล่หรืออุปกรณ์" },
  { value: "tools", label: "เครื่องมือ" },
  { value: "media_player", label: "Media Player" },
];

export const ISSUE_STATUS_OPTIONS = [
  { value: "all", label: "ทุกสถานะ" },
  { value: "in_stock", label: "อยู่ในคลัง" },
  { value: "issued", label: "ถูกเบิกออก" },
  { value: "partial", label: "เบิกบางส่วน" },
];

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
      itemType: "",
      statusFilters: [],
      advanceDays: 30,
      issueStatus: "",
    });
  };

  const handleStatusFilterChange = (value: string, checked: boolean) => {
    const currentFilters = filters.statusFilters || [];
    let newFilters: string[];
    
    if (checked) {
      newFilters = [...currentFilters, value];
    } else {
      newFilters = currentFilters.filter(f => f !== value);
    }
    
    onFiltersChange({ ...filters, statusFilters: newFilters });
  };

  const hasActiveFilters = Object.entries(filters).some(([key, v]) => {
    if (key === 'statusFilters') {
      return Array.isArray(v) && v.length > 0;
    }
    return v !== "";
  });

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

        {/* Item Type Filter - after ฝ่าย */}
        <Select
          value={filters.itemType || "all"}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, itemType: value === "all" ? "" : value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="ประเภทสินค้า" />
          </SelectTrigger>
          <SelectContent>
            {ITEM_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
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

      {/* Row 2: Multi-select status filter, Stock status & Search */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Multi-select Status Filter with Days Setting */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="min-w-[200px] justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span>สถานะสินค้า</span>
                {(filters.statusFilters?.length || 0) > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {filters.statusFilters?.length}
                  </Badge>
                )}
              </div>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-3" align="start">
            <div className="space-y-3">
              <div className="font-medium text-sm">เลือกสถานะ (เลือกได้หลายรายการ)</div>
              {STATUS_FILTER_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${option.value}`}
                    checked={(filters.statusFilters || []).includes(option.value)}
                    onCheckedChange={(checked) => 
                      handleStatusFilterChange(option.value, checked === true)
                    }
                  />
                  <Label 
                    htmlFor={`status-${option.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
              {(filters.statusFilters?.length || 0) > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => onFiltersChange({ ...filters, statusFilters: [] })}
                >
                  ล้างการเลือก
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Days Setting Dropdown */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="min-w-[120px] justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span>ค่าตั้ง ({filters.advanceDays || 30})</span>
              </div>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-3" align="start">
            <div className="space-y-3">
              <div className="font-medium text-sm">ระยะเวลาแจ้งเตือนล่วงหน้า</div>
              <div className="text-xs text-muted-foreground">
                สำหรับ "ใกล้หมดอายุ" และ "ใกล้หมดประกัน"
              </div>
              <div className="flex flex-wrap gap-2">
                {ADVANCE_DAYS_OPTIONS.map((option) => (
                  <Badge
                    key={option.value}
                    variant={(filters.advanceDays || 30) === option.value ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                    onClick={() => onFiltersChange({ ...filters, advanceDays: option.value })}
                  >
                    {option.label}
                  </Badge>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

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

        <Select
          value={filters.issueStatus || "all"}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, issueStatus: value === "all" ? "" : value })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="สถานะการเบิก" />
          </SelectTrigger>
          <SelectContent>
            {ISSUE_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
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

      {/* Selected Status Filters Display */}
      {(filters.statusFilters?.length || 0) > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.statusFilters?.map((filter) => {
            const option = STATUS_FILTER_OPTIONS.find(o => o.value === filter);
            return option ? (
              <Badge 
                key={filter} 
                variant="secondary"
                className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => handleStatusFilterChange(filter, false)}
              >
                {option.label}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}
