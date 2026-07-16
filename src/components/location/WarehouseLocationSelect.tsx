import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Label } from "@/components/ui/label";

interface WarehouseLocationSelectProps {
  department: string;
  warehouseId: string;
  onWarehouseChange: (value: string) => void;
  locationId: string;
  onLocationChange: (value: string) => void;
  disabled?: boolean;
}

export function WarehouseLocationSelect({
  department,
  warehouseId,
  onWarehouseChange,
  locationId,
  onLocationChange,
  disabled,
}: WarehouseLocationSelectProps) {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Fetch warehouses when department changes
  useEffect(() => {
    if (!department) {
      setWarehouses([]);
      return;
    }
    const fetchWarehouses = async () => {
      setLoadingWarehouses(true);
      const { data, error } = await supabase
        .from("warehouses")
        .select("id, code, name")
        .eq("is_active", true)
        .eq("department", department)
        .order("code");
      if (!error) setWarehouses(data || []);
      setLoadingWarehouses(false);
    };
    fetchWarehouses();
  }, [department]);

  // Reset warehouse & location when department changes
  useEffect(() => {
    // Only reset if current warehouse doesn't belong to new department
    if (warehouseId && warehouses.length > 0) {
      const exists = warehouses.some((w) => w.id === warehouseId);
      if (!exists) {
        onWarehouseChange("");
        onLocationChange("");
      }
    } else if (!department) {
      onWarehouseChange("");
      onLocationChange("");
    }
  }, [warehouses]);

  // Fetch locations when warehouse changes
  useEffect(() => {
    if (!warehouseId) {
      setLocations([]);
      return;
    }
    const fetchLocations = async () => {
      setLoadingLocations(true);
      const { data, error } = await supabase
        .from("locations")
        .select("id, code, name, zones:zone_id(code, name)")
        .eq("is_active", true)
        .eq("warehouse_id", warehouseId)
        .order("code");
      if (!error) setLocations(data || []);
      setLoadingLocations(false);
    };
    fetchLocations();
  }, [warehouseId]);

  // Reset location when warehouse changes
  useEffect(() => {
    if (locationId && locations.length > 0) {
      const exists = locations.some((l) => l.id === locationId);
      if (!exists) {
        onLocationChange("");
      }
    }
  }, [locations]);

  const warehouseOptions = warehouses.map((w) => ({
    value: w.id,
    label: `${w.code} - ${w.name}`,
  }));

  const locationOptions = locations
    .slice()
    .sort((a, b) => {
      const az = a.zones?.code || "zzz";
      const bz = b.zones?.code || "zzz";
      if (az !== bz) return az.localeCompare(bz);
      return (a.code || "").localeCompare(b.code || "");
    })
    .map((l) => ({
      value: l.id,
      label: `${l.zones?.code ? `${l.zones.code}${l.code}` : l.code} - ${l.name}${l.zones?.name ? ` (โซน ${l.zones.code} · ${l.zones.name})` : ""}`,
    }));


  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>คลังสินค้า</Label>
        <SearchableSelect
          options={warehouseOptions}
          value={warehouseId}
          onValueChange={(val) => {
            onWarehouseChange(val);
            onLocationChange("");
          }}
          placeholder={!department ? "เลือกฝ่ายก่อน" : "เลือกคลังสินค้า"}
          searchPlaceholder="ค้นหาคลังสินค้า..."
          emptyMessage="ไม่พบคลังสินค้า"
          disabled={disabled || !department}
          isLoading={loadingWarehouses}
        />
      </div>
      <div className="space-y-2">
        <Label>ตำแหน่งจัดเก็บ</Label>
        <SearchableSelect
          options={locationOptions}
          value={locationId}
          onValueChange={onLocationChange}
          placeholder={!warehouseId ? "เลือกคลังก่อน" : "เลือกตำแหน่ง"}
          searchPlaceholder="ค้นหาตำแหน่ง..."
          emptyMessage="ไม่พบตำแหน่ง"
          disabled={disabled || !warehouseId}
          isLoading={loadingLocations}
        />
      </div>
    </div>
  );
}
