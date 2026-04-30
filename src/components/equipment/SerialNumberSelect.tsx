import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SearchableSelect, SearchableSelectOption } from "@/components/ui/searchable-select";

interface SerialNumberItem {
  id: string;
  serial_number: string;
  code: string;
  name: string;
  unit: string;
  quantity_in_stock: number;
  is_media_player: boolean;
  source: "equipment" | "equipment_sn_table" | "media_player_sn1" | "media_player_sn2" | "media_player_serial";
  sn_record_id?: string;
}

interface SerialNumberSelectProps {
  value: string;
  onChange: (item: SerialNumberItem | null) => void;
  disabled?: boolean;
  placeholder?: string;
  equipmentId?: string;
  isMediaPlayer?: boolean;
  mediaPlayerIds?: string[];
}

export function SerialNumberSelect({
  value,
  onChange,
  disabled = false,
  placeholder = "ค้นหา Serial Number...",
  equipmentId,
  isMediaPlayer,
  mediaPlayerIds,
}: SerialNumberSelectProps) {
  const scopedMediaPlayerIds = useMemo(
    () => Array.from(new Set((mediaPlayerIds || []).filter(Boolean))).sort(),
    [mediaPlayerIds]
  );
  const scopedMediaPlayerKey = scopedMediaPlayerIds.join("|");

  // Fetch from equipment_serial_numbers table (primary source - in_stock only)
  const { data: snTableData, isLoading: loadingSnTable } = useQuery({
    queryKey: ["equipment-sn-table", equipmentId, isMediaPlayer],
    queryFn: async () => {
      let query = supabase
        .from("equipment_serial_numbers")
        .select("id, equipment_id, serial_number, status, location_id, equipment:equipment!inner(id, code, name, unit, quantity_in_stock, is_active)")
        .eq("status", "in_stock");

      if (equipmentId) query = query.eq("equipment_id", equipmentId);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: isMediaPlayer !== true,
  });

  // Fallback: Fetch equipment with serial_number field (legacy records)
  const { data: equipmentData, isLoading: loadingEquipment } = useQuery({
    queryKey: ["equipment-serial-numbers", equipmentId, isMediaPlayer],
    queryFn: async () => {
      let query = supabase
        .from("equipment")
        .select("id, code, name, serial_number, unit, quantity_in_stock")
        .eq("is_active", true)
        .gt("quantity_in_stock", 0)
        .not("serial_number", "is", null)
        .neq("serial_number", "")
        .order("code");

      if (equipmentId) query = query.eq("id", equipmentId);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: isMediaPlayer !== true,
  });

  // Fetch received Media Player serials (authoritative serial source)
  const { data: receivedMediaSerials, isLoading: loadingReceivedMediaSerials } = useQuery({
    queryKey: ["media-players-received-serials", equipmentId, scopedMediaPlayerKey, isMediaPlayer],
    queryFn: async () => {
      let query = supabase
        .from("goods_receipt_pending")
        .select(`
          media_player_id,
          serial_number,
          received_at,
          created_at,
          media_players!inner(id, code, name, unit, quantity, is_active)
        `)
        .eq("is_media_player", true)
        .eq("status", "received")
        .not("serial_number", "is", null)
        .neq("serial_number", "");

      if (scopedMediaPlayerIds.length > 0) query = query.in("media_player_id", scopedMediaPlayerIds);
      else if (equipmentId) query = query.eq("media_player_id", equipmentId);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: isMediaPlayer !== false,
  });

  // Fetch already requested/issued serials to exclude S/N that are not freely available anymore
  const { data: consumedSerials, isLoading: loadingConsumedSerials } = useQuery({
    queryKey: ["consumed-issue-serials", equipmentId, scopedMediaPlayerKey, isMediaPlayer],
    queryFn: async () => {
      let query = supabase
        .from("goods_issue_pending_items")
        .select("id, equipment_id, media_player_id, is_media_player, serial_number, issued_quantity, status")
        .not("serial_number", "is", null)
        .neq("serial_number", "")
        .neq("status", "rejected");

      if (isMediaPlayer === true && scopedMediaPlayerIds.length > 0) query = query.in("media_player_id", scopedMediaPlayerIds);
      else if (equipmentId && isMediaPlayer === true) query = query.eq("media_player_id", equipmentId);
      else if (equipmentId && isMediaPlayer === false) query = query.eq("equipment_id", equipmentId);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fallback for legacy Media Player rows
  const { data: mediaPlayersData, isLoading: loadingMediaPlayers } = useQuery({
    queryKey: ["media-players-legacy-serial-fallback", equipmentId, scopedMediaPlayerKey, isMediaPlayer],
    queryFn: async () => {
      let query = supabase
        .from("media_players")
        .select("id, code, name, serial_number_1, serial_number_2, unit, quantity")
        .eq("is_active", true)
        .gt("quantity", 0)
        .order("code");

      if (scopedMediaPlayerIds.length > 0) query = query.in("id", scopedMediaPlayerIds);
      else if (equipmentId) query = query.eq("id", equipmentId);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: isMediaPlayer !== false,
  });

  // Combine all serial numbers into a unified list
  const serialNumberItems = useMemo<SerialNumberItem[]>(() => {
    const items: SerialNumberItem[] = [];
    const seenKeys = new Set<string>();

    // Priority 1: equipment_serial_numbers table (most reliable)
    (snTableData || []).forEach((sn: any) => {
      const eq = sn.equipment;
      if (!eq || !eq.is_active) return;
      const key = `eq::${eq.id}::${sn.serial_number}`;
      if (seenKeys.has(key)) return;
      seenKeys.add(key);
      items.push({
        id: eq.id,
        serial_number: sn.serial_number,
        code: eq.code,
        name: eq.name,
        unit: eq.unit,
        quantity_in_stock: eq.quantity_in_stock,
        is_media_player: false,
        source: "equipment_sn_table",
        sn_record_id: sn.id,
      });
    });

    // Priority 2: Legacy equipment serial_number field (fallback)
    equipmentData?.forEach((eq) => {
      if (!eq.serial_number) return;
      const key = `eq::${eq.id}::${eq.serial_number}`;
      if (seenKeys.has(key)) return;
      seenKeys.add(key);
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
    });

    // Media Player serials (unchanged logic)
    const consumedMediaSerialKeys = new Set(
      (issuedMediaSerials || [])
        .filter((row: any) => row.media_player_id && row.serial_number)
        .map((row: any) => `${row.media_player_id}::${row.serial_number}`)
    );

    const latestReceivedByKey = new Map<string, any>();
    (receivedMediaSerials || [])
      .slice()
      .sort((a: any, b: any) => {
        const aTime = new Date(a.received_at || a.created_at).getTime();
        const bTime = new Date(b.received_at || b.created_at).getTime();
        return bTime - aTime;
      })
      .forEach((row: any) => {
        const serial = row.serial_number?.trim();
        const mp = row.media_players;
        if (!serial || !mp?.id) return;

        const key = `${mp.id}::${serial}`;
        if (latestReceivedByKey.has(key)) return;
        if (consumedMediaSerialKeys.has(key)) return;

        latestReceivedByKey.set(key, row);
        items.push({
          id: mp.id,
          serial_number: serial,
          code: mp.code,
          name: mp.name,
          unit: mp.unit,
          quantity_in_stock: mp.quantity || 0,
          is_media_player: true,
          source: "media_player_serial",
        });
      });

    // Fallback: add legacy serial fields only if still in stock and not already represented
    mediaPlayersData?.forEach((mp) => {
      const serials: Array<{ value: string | null; source: "media_player_sn1" | "media_player_sn2" }> = [
        { value: mp.serial_number_1, source: "media_player_sn1" },
        { value: mp.serial_number_2, source: "media_player_sn2" },
      ];

      serials.forEach(({ value, source }) => {
        const serial = value?.trim();
        if (!serial) return;

        const key = `${mp.id}::${serial}`;
        if (latestReceivedByKey.has(key)) return;
        if (consumedMediaSerialKeys.has(key)) return;

        items.push({
          id: mp.id,
          serial_number: serial,
          code: mp.code,
          name: mp.name,
          unit: mp.unit,
          quantity_in_stock: mp.quantity,
          is_media_player: true,
          source,
        });
      });
    });

    // Filter by equipmentId if provided
    if (equipmentId) {
      return items.filter((item) => item.id === equipmentId);
    }

    return items;
  }, [snTableData, equipmentData, receivedMediaSerials, issuedMediaSerials, mediaPlayersData, equipmentId]);

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

  const isLoading = loadingSnTable || loadingEquipment || loadingReceivedMediaSerials || loadingIssuedMediaSerials || loadingMediaPlayers;

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
