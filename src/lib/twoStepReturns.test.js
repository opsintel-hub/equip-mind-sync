import { expect, test } from "bun:test";
import { twoStepReturnBalance } from "./issueReturnForm";
import { lineLeft, returnLeftIndependent } from "./issueQuantities";

test("10 issued: repair 2, PM 3, stolen 1 installs 6 and returns 4 unused", () => {
  expect(twoStepReturnBalance(10, 6, 0, 0, 4, 0, 2, 3, 1)).toEqual({ unused: 4, installationOpen: 6, unusedRemaining: 0, oldTotal: 5, installationRemaining: 0 });
});
test("old used PM returns never reduce unused stock a second time", () => {
  expect(twoStepReturnBalance(10, 6, 0, 0, 0, 0, 2, 3, 1).unusedRemaining).toBe(4);
});
test("old defective returns are not defective units of issued stock", () => {
  expect(lineLeft({ issued_quantity: 10, installed_qty: 6, returned_good_qty: 4, returned_defective_qty: 2, swap_returned_defective_qty: 2 })).toBe(0);
});
test("six installation outcomes plus four unused returns close a return-required issue", () => {
  expect(returnLeftIndependent({ issued_quantity: 10, installed_qty: 6, returned_good_qty: 4, returned_defective_qty: 2, swap_returned_defective_qty: 2, installation_return_settled_qty: 6 })).toBe(0);
});
test("no automatic defective balancing: returning 1 of 4 leaves 3 outstanding", () => {
  expect(twoStepReturnBalance(10, 6, 0, 0, 1, 0, 0, 0, 0).unusedRemaining).toBe(3);
});
test("old parts cannot exceed the unreconciled installation quantity", () => {
  expect(twoStepReturnBalance(10, 6, 0, 0, 4, 0, 2, 4, 1).installationRemaining).toBe(-1);
});
test("100 metres issued with confirmed 40 used leaves 60 good and no defective", () => {
  expect(twoStepReturnBalance(100, 40, 0, 0, 60, 0, 0, 0, 40).unusedRemaining).toBe(0);
  expect(twoStepReturnBalance(100, 40, 0, 0, 60, 0, 0, 0, 40).installationRemaining).toBe(0);
});