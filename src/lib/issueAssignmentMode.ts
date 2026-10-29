type EquipmentSerialControl = {
  is_consumable: boolean;
  serial_number?: string | null;
  equipment_serial_numbers?: readonly { id: string }[];
};

export type EquipmentUnitAssignment = {
  serial_number: string;
  serial_number_source: string;
  billboard_id: string;
};

export function requiresEquipmentUnitAssignments(
  equipment: EquipmentSerialControl,
  requestedSerial?: string | null,
): boolean {
  if (equipment.is_consumable) return false;
  return Boolean(equipment.serial_number?.trim() || requestedSerial?.trim() || equipment.equipment_serial_numbers?.length);
}

export function createEquipmentAssignments(quantity: number, perUnit: boolean, billboardId: string): EquipmentUnitAssignment[] {
  if (!perUnit) return [];
  return Array.from({ length: quantity }, () => ({
    serial_number: "",
    serial_number_source: "equipment",
    billboard_id: billboardId,
  }));
}

export function equipmentInstallRows(
  assignments: readonly EquipmentUnitAssignment[],
  perUnit: boolean,
  quantity: number,
  billboardId: string,
) {
  if (!perUnit) {
    return billboardId ? [{ billboard_id: billboardId, serial_number: null, quantity }] : [];
  }
  return assignments.map(a => ({
    billboard_id: a.billboard_id || billboardId,
    serial_number: a.serial_number || null,
    quantity: 1,
  })).filter(row => row.billboard_id);
}