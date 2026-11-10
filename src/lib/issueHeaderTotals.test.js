import { test, expect } from "bun:test";
import { issueHeaderTotals } from "./issueHeaderTotals";

const line = (quantity, issued_quantity, remaining_quantity, status) => ({ quantity, issued_quantity, remaining_quantity, status });

test("GI-REQ-000254: rejected 10 and 2 plus issued 2 closes with zero waiting stock", () => {
  expect(issueHeaderTotals([line(10, 0, 10, "rejected"), line(2, 0, 2, "rejected"), line(2, 2, 0, "issued")]))
    .toEqual({ quantity: 14, issued_quantity: 2, remaining_quantity: 0, total_items: 3, status: "issued", anyIssued: true });
});
test("all rejected lines stay rejected without waiting quantities", () => {
  expect(issueHeaderTotals([line(10, 0, 10, "rejected"), line(2, 0, 2, "rejected")]))
    .toMatchObject({ status: "rejected", issued_quantity: 0, remaining_quantity: 0 });
});
test("partial issue and rejection retain only the active remainder", () => {
  expect(issueHeaderTotals([line(10, 4, 6, "waiting_stock"), line(2, 0, 2, "rejected")]))
    .toMatchObject({ status: "waiting_stock", issued_quantity: 4, remaining_quantity: 6 });
});
test("issued and pending lines must not close early", () => {
  expect(issueHeaderTotals([line(2, 2, 0, "issued"), line(10, 0, null, "pending")]))
    .toMatchObject({ status: "waiting_stock", remaining_quantity: 10 });
});
test("untouched requests remain pending", () => {
  expect(issueHeaderTotals([line(10, 0, null, "pending")])).toMatchObject({ status: "pending", remaining_quantity: 10 });
});
test("all issued lines close with no pending quantity", () => {
  expect(issueHeaderTotals([line(2, 2, 0, "issued")])).toMatchObject({ status: "issued", remaining_quantity: 0 });
});