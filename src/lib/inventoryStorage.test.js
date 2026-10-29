import { describe, it, expect } from "bun:test";
import {
  buildStorageBalanceMap,
  matchesWarehouse,
  matchesLocation,
  storageDisplayLines,
  scopedStorageLines,
  sumStorageLines,
} from "./inventoryStorage";

const allocRow = (equipment_id, location_id, quantity, warehouseCode, warehouseId, locationCode) => ({
  equipment_id,
  location_id,
  quantity,
  locations: {
    code: locationCode,
    name: `ช่อง ${locationCode}`,
    warehouse_id: warehouseId,
    warehouses: { id: warehouseId, code: warehouseCode, name: `คลัง ${warehouseCode}` },
  },
});

describe("buildStorageBalanceMap", () => {
  it("aggregates quantities per item and location, drops zero balances", () => {
    const map = buildStorageBalanceMap([
      allocRow("EQ1", "LOC-A", 15, "PB-01", "WH1", "G02"),
      allocRow("EQ1", "LOC-A", -5, "PB-01", "WH1", "G02"),
      allocRow("EQ1", "LOC-B", 15, "PB-11", "WH2", "01"),
      allocRow("EQ1", "LOC-C", 3, "PB-01", "WH1", "H01"),
      allocRow("EQ1", "LOC-C", -3, "PB-01", "WH1", "H01"),
    ]);
    expect(map.EQ1).toHaveLength(2);
    const a = map.EQ1.find((b) => b.locationId === "LOC-A");
    const b = map.EQ1.find((b) => b.locationId === "LOC-B");
    expect(a.quantity).toBe(10);
    expect(b.quantity).toBe(15);
    expect(b.warehouseCode).toBe("PB-11");
    // LOC-C nets to 0 → excluded
    expect(map.EQ1.some((x) => x.locationId === "LOC-C")).toBe(false);
  });

  it("keys rows by media_player_id or tool_id when equipment_id is absent", () => {
    const map = buildStorageBalanceMap([
      { media_player_id: "MP1", location_id: "LOC-A", quantity: 2, locations: { code: "A", warehouses: { id: "WH1", code: "PB" } } },
      { tool_id: "T1", location_id: "LOC-A", quantity: 1, locations: { code: "A", warehouses: { id: "WH1", code: "PB" } } },
    ]);
    expect(map.MP1[0].quantity).toBe(2);
    expect(map.T1[0].quantity).toBe(1);
  });
});

describe("matchesWarehouse / matchesLocation", () => {
  const balances = buildStorageBalanceMap([
    allocRow("EQ1", "LOC-B", 15, "PB-11", "WH2", "01"),
  ]).EQ1;

  it("matches the warehouse that actually holds stock even when the default location is elsewhere", () => {
    const input = { defaultLocationId: "LOC-A", defaultWarehouseId: "WH1", balances };
    expect(matchesWarehouse(input, "WH2")).toBe(true);
    expect(matchesWarehouse(input, "WH1")).toBe(false);
  });

  it("falls back to the default location when there are no allocation rows", () => {
    const input = { defaultLocationId: "LOC-A", defaultWarehouseId: "WH1", balances: [] };
    expect(matchesWarehouse(input, "WH1")).toBe(true);
    expect(matchesLocation(input, "LOC-A")).toBe(true);
    expect(matchesLocation(input, "LOC-B")).toBe(false);
  });

  it("matches a specific storage location from real balances", () => {
    const input = { defaultLocationId: "LOC-A", defaultWarehouseId: "WH1", balances };
    expect(matchesLocation(input, "LOC-B")).toBe(true);
    expect(matchesLocation(input, "LOC-A")).toBe(false);
  });

  it("passes through when no filter is set", () => {
    expect(matchesWarehouse({}, "")).toBe(true);
    expect(matchesLocation({}, "")).toBe(true);
  });
});

describe("storageDisplayLines", () => {
  it("returns real balances with quantities when present", () => {
    const balances = buildStorageBalanceMap([
      allocRow("EQ1", "LOC-A", 105, "PB-01", "WH1", "G02"),
      allocRow("EQ1", "LOC-B", 30, "PB-11", "WH2", "01"),
    ]).EQ1;
    const lines = storageDisplayLines({ balances });
    expect(lines).toHaveLength(2);
    expect(lines[0].quantity).toBe(105);
    expect(lines[1].warehouseCode).toBe("PB-11");
  });

  it("falls back to the default location when no allocations exist", () => {
    const lines = storageDisplayLines({
      balances: [],
      defaultLocationId: "LOC-A",
      defaultLocation: { code: "G02", name: "ชั้น G" },
      defaultWarehouse: { code: "PB-01", name: "คลังพระราม 9" },
      fallbackQuantity: 7,
    });
    expect(lines).toHaveLength(1);
    expect(lines[0].locationCode).toBe("G02");
    expect(lines[0].quantity).toBe(7);
  });

  it("returns empty when there is no location at all", () => {
    expect(storageDisplayLines({ balances: [] })).toEqual([]);
  });
});

describe("scopedStorageLines / sumStorageLines", () => {
  const balances = buildStorageBalanceMap([
    allocRow("EQ1", "LOC-A", 105, "PB-01", "WH1", "G02"),
    allocRow("EQ1", "LOC-C", 135, "PB-01", "WH1", "H01"),
    allocRow("EQ1", "LOC-B", 30, "PB-11", "WH2", "01"),
  ]).EQ1;

  it("returns all lines when no warehouse/location filter is set", () => {
    expect(scopedStorageLines(balances)).toHaveLength(3);
    expect(scopedStorageLines(balances, null, null)).toHaveLength(3);
  });

  it("keeps only lines in the selected warehouse (PB-11 → 30)", () => {
    const scoped = scopedStorageLines(balances, "WH2");
    expect(scoped).toHaveLength(1);
    expect(scoped[0].warehouseCode).toBe("PB-11");
    expect(sumStorageLines(scoped)).toBe(30);
  });

  it("keeps only lines in the selected location", () => {
    const scoped = scopedStorageLines(balances, "WH1", "LOC-A");
    expect(scoped).toHaveLength(1);
    expect(scoped[0].locationCode).toBe("G02");
    expect(sumStorageLines(scoped)).toBe(105);
  });

  it("sums multiple lines of the same warehouse", () => {
    expect(sumStorageLines(scopedStorageLines(balances, "WH1"))).toBe(240);
  });
});
