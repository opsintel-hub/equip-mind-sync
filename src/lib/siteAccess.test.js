import { test, expect } from "bun:test";
import { leadTier, leadHours } from "./siteAccess";

test("booking lead time tiers follow 48/24/12 hour thresholds", () => {
  expect(leadTier(49)).toBe("gt48");
  expect(leadTier(48)).toBe("h24_48");
  expect(leadTier(24)).toBe("h24_48");
  expect(leadTier(23.9)).toBe("h12_24");
  expect(leadTier(12)).toBe("h12_24");
  expect(leadTier(11.9)).toBe("lt12");
  expect(leadTier(1)).toBe("walkin");
  expect(leadTier(0)).toBe("walkin");
  expect(leadTier(-5)).toBe("walkin");
});

test("lead hours measured from booking time to planned start", () => {
  expect(leadHours("2026-10-01T00:00:00Z", "2026-10-03T06:00:00Z")).toBe(54);
});
