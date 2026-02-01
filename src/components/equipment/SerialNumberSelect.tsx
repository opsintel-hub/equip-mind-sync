import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SearchableSelect, SearchableSelectOption } from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";

interface SerialNumberItem {
  id: string;
  serial_number: string;
  code: string;
  name: string;
  unit: string;
  quantity_in_stock: number;
  is_media_player: boolean;
  source: "equipment" | "media_player_sn1" | "media_player_sn2";
}

interface SerialNumberSelectProps {
  value: string;
  onChange: (item: SerialNumberItem | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function SerialNumberSelect({
  value,
  onChange,
  disabled = false,
  placeholder = "ค้นหา Serial Number...",
}: SerialNumberSelectProps) {
  // Fetch equipment with serial numbers
  const { data: equipmentData, isLoading: loadingEquipment } = useQuery({
    queryKey: ["equipment-serial-numbers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select("id, code, name, serial_number, unit, quantity_in_stock")
        .eq("is_active", true)
        .gt("quantity_in_stock", 0)
        .not("serial_number", "is", null)
        .neq("serial_number", "")
        .order("code");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch media players with serial numbers
  const { data: mediaPlayersData, isLoading: loadingMediaPlayers } = useQuery({
    queryKey: ["media-players-serial-numbers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_players")
        .select("id, code, name, serial_number_1, serial_number_2, unit, quantity")
        .eq("is_active", true)
        .gt("quantity", 0)
        .order("code");
      if (error) throw error;
      return data || [];
    },
  });

  // Combine all serial numbers into a unified list
  const serialNumberItems = useMemo<SerialNumberItem[]>(() => {
    const items: SerialNumberItem[] = [];

    // Add equipment serial numbers
    equipmentData?.forEach((eq) => {
      if (eq.serial_number) {
        items.push({
          id: eq.id,
          serial_number: eq.serial_number,
          code: eq.code,
          name: eq.name,
          unit: eq.unit,
          quantity_in_stock: eq.quantity_in_stock,
          is_media_player: false,
          source: "equipment",
        });
      }
    });

    // Add media player serial numbers (S/N 1)
    mediaPlayersData?.forEach((mp) => {
      if (mp.serial_number_1) {
        items.push({
          id: mp.id,
          serial_number: mp.serial_number_1,
          code: mp.code,
          name: mp.name,
          unit: mp.unit,
          quantity_in_stock: mp.quantity,
          is_media_player: true,
          source: "media_player_sn1",
        });
      }
    });

    // Add media player serial numbers (S/N 2)
    mediaPlayersData?.forEach((mp) => {
      if (mp.serial_number_2 && mp.serial_number_2 !== mp.serial_number_1) {
        items.push({
          id: mp.id,
          serial_number: mp.serial_number_2,
          code: mp.code,
          name: mp.name,
          unit: mp.unit,
          quantity_in_stock: mp.quantity,
          is_media_player: true,
          source: "media_player_sn2",
        });
      }
    });

    return items;
  }, [equipmentData, mediaPlayersData]);

  // Map serial number items to dropdown options
  const options: SearchableSelectOption[] = useMemo(() => {
    return serialNumberItems.map((item) => ({
      value: `${item.source}:${item.id}:${item.serial_number}`,
      label: item.serial_number,
      description: `${item.code} - ${item.name}${item.is_media_player ? " [Media Player]" : ""} (คงเหลือ: ${item.quantity_in_stock})`,
    }));
  }, [serialNumberItems]);

  const handleValueChange = (selectedValue: string) => {
    if (!selectedValue) {
      onChange(null);
      return;
    }

    // Parse the value to find the selected item
    const [source, id, ...snParts] = selectedValue.split(":");
    const serialNumber = snParts.join(":"); // Handle serial numbers that may contain colons
    
    const selectedItem = serialNumberItems.find(
      (item) => item.source === source && item.id === id && item.serial_number === serialNumber
    );

    onChange(selectedItem || null);
  };

  const isLoading = loadingEquipment || loadingMediaPlayers;

  return (
    <SearchableSelect
      options={options}
      value={value}
      onValueChange={handleValueChange}
      placeholder={placeholder}
      searchPlaceholder="พิมพ์เพื่อค้นหา S/N..."
      emptyMessage="ไม่พบ Serial Number"
      disabled={disabled}
      isLoading={isLoading}
    />
  );
}

export type { SerialNumberItem };
