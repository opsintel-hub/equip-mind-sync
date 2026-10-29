import { describe, expect, test } from "bun:test";
import { lineLeft, billboardLeft, issuedDefectiveReturned, returnOutstanding } from "./issueQuantities";

describe("Magic Ticket Swap stock accounting", () => {
  const swap = { issued_quantity: 5, installed_qty: 1, returned_good_qty: 1, returned_defective_qty: 1, swap_returned_defective_qty: 1 };
  test("5 issued, 1 installed, 1 unused good returned and 1 old Swap returned leaves 3", () => {
    expect(lineLeft(swap)).toBe(3);
    expect(billboardLeft(swap)).toBe(3);
  });
  test("an unused issued defective unit still consumes issued stock", () => {
    expect(lineLeft({ ...swap, swap_returned_defective_qty: 0 })).toBe(2);
  });
  test("mixed old and unused defective units only subtract unused defective units", () => {
    expect(lineLeft({ ...swap, returned_defective_qty: 2 })).toBe(2);
  });
  test("reverting an old Swap return leaves the same unused stock", () => {
    expect(lineLeft({ ...swap, returned_defective_qty: 0, swap_returned_defective_qty: 0 })).toBe(3);
  });
  test("all 3 remaining units installed closes unused stock", () => {
    expect(lineLeft({ ...swap, installed_qty: 4 })).toBe(0);
  });
  test("legacy rows without Swap metadata retain existing defective accounting", () => {
    expect(issuedDefectiveReturned({ returned_defective_qty: 1 })).toBe(1);
  });
  test("return dialog can settle the last unit after a Swap old-part return", () => {
    // 5 issued, 1 installed, 1 unused good returned, 1 old Swap part returned:
    // the dialog must allow returning all 3 remaining units, not just 2.
    expect(returnOutstanding(swap, false)).toBe(3);
  });
  test("return dialog for billboard+return purposes also ignores Swap old-part returns", () => {
    expect(returnOutstanding(swap, true)).toBe(3);
  });
});