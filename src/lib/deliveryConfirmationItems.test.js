import { test, expect } from "bun:test";
import { deliveryConfirmationItems } from "./deliveryConfirmationItems";

test("GI-REQ-000254 shows only the fan: one issued line with two units", () => {
  const items = [
    { pending_id: "254", equipment_code: "SEV00064", quantity: 10, issued_quantity: 0, status: "rejected" },
    { pending_id: "254", equipment_code: "SEV00032", quantity: 2, issued_quantity: 0, status: "rejected" },
    { pending_id: "254", equipment_code: "SEV00020", quantity: 2, issued_quantity: 2, status: "issued" },
  ];
  const result = deliveryConfirmationItems(items, "254");
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({ equipment_code: "SEV00020", issued_quantity: 2 });
  expect(items).toHaveLength(3);
});

test("partially issued lines retain actual quantities, not requested totals", () => {
  const result = deliveryConfirmationItems([
    { pending_id: "a", quantity: 10, issued_quantity: 4, status: "waiting_stock" },
    { pending_id: "a", quantity: 5, issued_quantity: null, status: "pending" },
    { pending_id: "b", quantity: 8, issued_quantity: 8, status: "issued" },
  ], "a");
  expect(result).toHaveLength(1);
  expect(result[0].issued_quantity).toBe(4);
});