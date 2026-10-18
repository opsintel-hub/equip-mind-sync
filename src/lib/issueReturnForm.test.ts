import { describe, expect, test } from "bun:test";
import { balanceIssueReturn, defaultReturnBillboard, validReturnBillboard } from "./issueReturnForm";

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