import { test, expect } from "bun:test";
import { bangkokInputToISO, inTestWindow, parseTicketCodes } from "./magicTicketTestSession";
test("วันที่ 12 เวลา 10:00 ถึง 12:00 เป็นเวลากรุงเทพ", () => {
  expect(bangkokInputToISO("2026-11-12T10:00")).toBe("2026-11-12T03:00:00.000Z");
  expect(bangkokInputToISO("2026-11-12T12:00")).toBe("2026-11-12T05:00:00.000Z");
});
test("capture starts at 10:00 and excludes 12:00", () => {
  const start = "2026-11-12T03:00:00Z", end = "2026-11-12T05:00:00Z";
  expect(inTestWindow("2026-11-12T02:59:59Z", start, end)).toBe(false);
  expect(inTestWindow(start, start, end)).toBe(true);
  expect(inTestWindow("2026-11-12T04:59:59Z", start, end)).toBe(true);
  expect(inTestWindow(end, start, end)).toBe(false);
});
test("real ticket codes need no Test prefix and duplicates are removed", () => {
  expect(parseTicketCodes(" DGT202611000002\nDGT202611000003 DGT202611000002 ")).toEqual(["DGT202611000002", "DGT202611000003"]);
});