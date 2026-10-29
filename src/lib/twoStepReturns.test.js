import { expect, test } from "bun:test";
import { oldPartRemaining, oldPartUnavailable, twoStepReturnBalance, validateOldPartRows } from "./issueReturnForm";
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

const oldLamp = { id: "lamp", kind: "equipment", quantity: 5, serial_number: null };
const splitRows = [{ asset: "equipment:lamp", quantity: "2", condition: "defective" }, { asset: "equipment:lamp", quantity: "3", condition: "used" }];
test("same old lamp supports defective 2 and PM used 3 with one no-return outcome", () => {
  expect(validateOldPartRows([oldLamp], splitRows)).toBeNull();
  expect(twoStepReturnBalance(10,6,0,0,4,0,2,3,1).installationRemaining).toBe(0);
});
test("second condition defaults to the same available old asset", () => {
  expect(oldPartUnavailable(oldLamp,"used",splitRows.slice(0,1))).toBe(false);
  expect(oldPartUnavailable(oldLamp,"defective",splitRows.slice(0,1))).toBe(true);
  expect(oldPartRemaining(oldLamp,splitRows,1)).toBe(3);
});
test("split conditions cannot exceed combined old asset stock", () => {
  expect(validateOldPartRows([oldLamp],[splitRows[0],{...splitRows[1],quantity:"4"}])).not.toBeNull();
});
test("same asset and condition cannot be returned twice", () => {
  expect(validateOldPartRows([oldLamp],[splitRows[0],{...splitRows[1],condition:"defective"}])).not.toBeNull();
});
test("serialized old assets cannot be split across conditions", () => {
  expect(validateOldPartRows([{...oldLamp,serial_number:"SN-1"}],splitRows)).not.toBeNull();
});
test("unregistered old lamps support the same two-condition split", () => {
  expect(validateOldPartRows([{...oldLamp,kind:"unregistered"}],splitRows.map(r=>({...r,asset:"unregistered:lamp"})))).toBeNull();
});