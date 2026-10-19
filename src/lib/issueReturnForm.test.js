import { describe, expect, test } from "bun:test";
import { balanceIssueReturn, defaultReturnBillboard, validReturnBillboard, validateDefectiveAllocations } from "./issueReturnForm";

describe("issue return boundaries", () => {
  test("19 outstanding, zero good means 19 defective", () => {
    expect(balanceIssueReturn(19, "0")).toEqual({ selected: 0, remaining: 19 });
  });
  test("19 outstanding, one good means 18 defective", () => {
    expect(balanceIssueReturn(19, "1")).toEqual({ selected: 1, remaining: 18 });
  });
  test("returns cannot exceed the outstanding quantity", () => {
    expect(balanceIssueReturn(19, "25")).toEqual({ selected: 19, remaining: 0 });
  });
  test("a single issue billboard is automatically selected", () => {
    expect(defaultReturnBillboard([{ id: "issue-A", label: "A", qty: 2 }])).toBe("issue-A");
  });
  test("multiple issue billboards require an explicit choice", () => {
    expect(defaultReturnBillboard([{ id: "A", label: "A", qty: 2 }, { id: "B", label: "B", qty: 1 }])).toBe("");
  });
  test("an unrelated billboard cannot be saved with an issue return", () => {
    expect(validReturnBillboard([{ id: "issue-A", label: "A", qty: 2 }], "unrelated-B")).toBeNull();
  });
  test("an unassigned issue may be returned without a billboard", () => {
    expect(defaultReturnBillboard([])).toBe("");
    expect(validReturnBillboard([], "")).toBeNull();
  });
});

describe("multi billboard defective returns", () => {
  const billboards = [{ id: "A", label: "A", qty: 2 }, { id: "B", label: "B", qty: 8 }];
  test("10 units may return from two billboards in one submission", () => {
    expect(validateDefectiveAllocations(billboards, [{ billboardId: "A", quantity: "2" }, { billboardId: "B", quantity: "8" }], 10)).toBeNull();
  });
  test("a billboard with 2 remaining cannot return 3", () => {
    expect(validateDefectiveAllocations(billboards, [{ billboardId: "A", quantity: "3" }], 3)).not.toBeNull();
  });
  test("an unrelated billboard is rejected", () => {
    expect(validateDefectiveAllocations(billboards, [{ billboardId: "C", quantity: "1" }], 1)).not.toBeNull();
  });
  test("duplicate billboard rows are rejected", () => {
    expect(validateDefectiveAllocations(billboards, [{ billboardId: "A", quantity: "1" }, { billboardId: "A", quantity: "1" }], 2)).not.toBeNull();
  });
  test("allocated total must match defective total", () => {
    expect(validateDefectiveAllocations(billboards, [{ billboardId: "A", quantity: "1" }], 2)).not.toBeNull();
  });
  test("fractional quantities cannot be submitted", () => {
    expect(validateDefectiveAllocations(billboards, [{ billboardId: "A", quantity: "1.5" }], 1.5)).not.toBeNull();
  });
  test("unassigned issues require no invented billboard", () => {
    expect(validateDefectiveAllocations([], [], 19)).toBeNull();
  });
});