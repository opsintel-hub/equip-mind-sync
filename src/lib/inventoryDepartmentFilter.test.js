import { describe, it, expect } from "bun:test";
import { inventoryWarehouseMatchesDepartments } from "./inventoryDepartmentFilter";
import { companyIsAvailableToDepartments } from "./companyDepartments";

describe("inventory multi-department dependencies", () => {
  const selected = ["Digital Media", "Static Media"];
  it("includes warehouses from either selected department, not other departments", () => {
    expect(inventoryWarehouseMatchesDepartments({ department: "Digital Media" }, selected)).toBe(true);
    expect(inventoryWarehouseMatchesDepartments({ departments: ["Airport Media", "Static Media"] }, selected)).toBe(true);
    expect(inventoryWarehouseMatchesDepartments({ department: "Bus Media" }, selected)).toBe(false);
  });
  it("keeps unfiltered warehouses when the selection is cleared", () => {
    expect(inventoryWarehouseMatchesDepartments({ department: "Bus Media" }, [])).toBe(true);
  });
  it("includes companies from either selected department and shared companies", () => {
    expect(companyIsAvailableToDepartments({ department_id: "digital" }, ["digital", "static"])).toBe(true);
    expect(companyIsAvailableToDepartments({ department_id: "static" }, ["digital", "static"])).toBe(true);
    expect(companyIsAvailableToDepartments({ department_id: null }, ["digital", "static"])).toBe(true);
    expect(companyIsAvailableToDepartments({ department_id: "bus" }, ["digital", "static"])).toBe(false);
  });
});