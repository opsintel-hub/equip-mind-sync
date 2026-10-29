import { describe, it, expect } from "bun:test";
import { requiresEquipmentUnitAssignments, createEquipmentAssignments, equipmentInstallRows } from "./issueAssignmentMode";

describe("equipment issue assignment mode", () => {
  it("consumables never create per-unit assignments even with legacy serial data", () => {
    const perUnit = requiresEquipmentUnitAssignments({ is_consumable: true, serial_number: "OLD", equipment_serial_numbers: [{ id: "SN1" }] });
    expect(perUnit).toBe(false);
    expect(createEquipmentAssignments(100000, perUnit, "")).toEqual([]);
  });
  it("equipment without serial control issues 50000 as an aggregate", () => {
    const perUnit = requiresEquipmentUnitAssignments({ is_consumable: false, serial_number: null, equipment_serial_numbers: [] });
    expect(perUnit).toBe(false);
    expect(createEquipmentAssignments(50000, perUnit, "")).toEqual([]);
  });
  it("serial records retain per-unit assignment even when master serial is empty", () => {
    expect(requiresEquipmentUnitAssignments({ is_consumable: false, equipment_serial_numbers: [{ id: "SN1" }] })).toBe(true);
    expect(createEquipmentAssignments(2, true, "BB1")).toHaveLength(2);
  });
  it("legacy master and requested serials retain per-unit assignment", () => {
    expect(requiresEquipmentUnitAssignments({ is_consumable: false, serial_number: "SN1" })).toBe(true);
    expect(requiresEquipmentUnitAssignments({ is_consumable: false }, "SN2")).toBe(true);
  });
  it("an aggregate billboard installation preserves the full issued quantity in one row", () => {
    expect(equipmentInstallRows([], false, 50000, "BB1")).toEqual([{ billboard_id: "BB1", serial_number: null, quantity: 50000 }]);
  });
  it("aggregate issue without a billboard creates no installation", () => {
    expect(equipmentInstallRows([], false, 100000, "")).toEqual([]);
  });
  it("serialized installations retain one row per serial and billboard", () => {
    const rows = equipmentInstallRows([
      { serial_number: "SN1", serial_number_source: "equipment", billboard_id: "BB1" },
      { serial_number: "SN2", serial_number_source: "equipment", billboard_id: "BB2" },
    ], true, 2, "");
    expect(rows).toEqual([
      { billboard_id: "BB1", serial_number: "SN1", quantity: 1 },
      { billboard_id: "BB2", serial_number: "SN2", quantity: 1 },
    ]);
  });
});