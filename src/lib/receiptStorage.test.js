import { describe, expect, test } from "bun:test";
import { receiptStorageDefault, transferReceiptQuantity } from "./receiptStorage";

describe("receipt storage defaults", () => {
  const location = { id: "slot", warehouse_id: "warehouse", is_active: true, warehouses: { department: "A", departments: ["A", "B"], is_active: true } };
  test("existing accessible slot is preselected", () => {
    expect(receiptStorageDefault("A", location, ["A"])).toEqual({ department: "A", warehouseId: "warehouse", locationId: "slot" });
  });
  test("shared warehouse uses an allowed department", () => {
    expect(receiptStorageDefault("A", location, ["B"]).department).toBe("B");
  });
  test("inaccessible slot is never preselected", () => {
    expect(receiptStorageDefault("A", location, ["C"]).locationId).toBe("");
  });
  test("inactive location is not preselected", () => {
    expect(receiptStorageDefault("A", { ...location, is_active: false }, ["A"]).locationId).toBe("");
  });
  test("missing location leaves storage empty", () => {
    expect(receiptStorageDefault("A", null, ["A"])).toEqual({ department: "A", warehouseId: "", locationId: "" });
  });
});
describe("two stage transfer quantities", () => {
  test("dispatch of 10 has 10 awaiting receipt", () => expect(transferReceiptQuantity(10, 0)).toBe(10));
  test("completed receipt has no outstanding transfer", () => expect(transferReceiptQuantity(10, 10)).toBe(0));
});