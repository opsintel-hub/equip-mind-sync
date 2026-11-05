import { describe, it, expect } from "bun:test";
import {
  resolveStockStatusQuantity,
  getStockStatusTone,
  STOCK_STATUS_LABEL,
} from "./inventoryStockStatus";

describe("resolveStockStatusQuantity", () => {
  it("uses the real warehouse balance instead of the single S/N row (DGT0002: 1 row vs 32 in stock)", () => {
    expect(
      resolveStockStatusQuantity({
        allocationsTotal: 32,
        itemTotalQuantity: 32,
        rowQuantity: 1,
      })
    ).toBe(32);
  });

  it("falls back to the item total when the item has no storage-location rows", () => {
    expect(
      resolveStockStatusQuantity({
        allocationsTotal: null,
        itemTotalQuantity: 32,
        rowQuantity: 1,
      })
    ).toBe(32);
  });

  it("keeps a genuinely out-of-stock item at 0", () => {
    expect(
      resolveStockStatusQuantity({
        allocationsTotal: null,
        itemTotalQuantity: 0,
        rowQuantity: 0,
      })
    ).toBe(0);
  });

  it("respects an allocation total of exactly 0 over the item total", () => {
    expect(
      resolveStockStatusQuantity({
        allocationsTotal: 0,
        itemTotalQuantity: 12,
        rowQuantity: 1,
      })
    ).toBe(0);
  });

  it("uses the row quantity when no total is known", () => {
    expect(
      resolveStockStatusQuantity({
        allocationsTotal: null,
        itemTotalQuantity: 0,
        rowQuantity: 7,
      })
    ).toBe(7);
  });
});

describe("getStockStatusTone", () => {
  it("marks 32 in stock with Min 5 as normal (the bug: every row said ใกล้หมด)", () => {
    expect(getStockStatusTone(32, 5)).toBe("normal");
  });

  it("marks an empty item as out", () => {
    expect(getStockStatusTone(0, 5)).toBe("out");
  });

  it("marks stock at or below Min as low", () => {
    expect(getStockStatusTone(3, 5)).toBe("low");
    expect(getStockStatusTone(5, 5)).toBe("low");
  });

  it("marks stock above Min as normal even when Min is 0", () => {
    expect(getStockStatusTone(1, 0)).toBe("normal");
  });

  it("labels the tones in Thai", () => {
    expect(STOCK_STATUS_LABEL.out).toBe("หมด");
    expect(STOCK_STATUS_LABEL.low).toBe("ใกล้หมด");
    expect(STOCK_STATUS_LABEL.normal).toBe("ปกติ");
  });
});
