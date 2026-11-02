import { describe, it, expect } from "vitest";
import { purposeAllowedFor } from "./purposeScope";

const map = { secBus1: "bus", secBus2: "bus", secBB: "bb" };

describe("purposeAllowedFor", () => {
  it("no departments selected allows everyone", () => {
    expect(purposeAllowedFor({ allowed_department_ids: [] }, "bb", null, map)).toBe(true);
  });
  it("Bus-only purpose hidden from Billboard", () => {
    expect(purposeAllowedFor({ allowed_department_ids: ["bus"] }, "bb", null, map)).toBe(false);
    expect(purposeAllowedFor({ allowed_department_ids: ["bus"] }, "bus", null, map)).toBe(true);
  });
  it("selected sections narrow only their own department", () => {
    const p = { allowed_department_ids: ["bus", "bb"], allowed_section_ids: ["secBus1"] };
    expect(purposeAllowedFor(p, "bus", "secBus1", map)).toBe(true);
    expect(purposeAllowedFor(p, "bus", "secBus2", map)).toBe(false);
    expect(purposeAllowedFor(p, "bb", "secBB", map)).toBe(true);
  });
  it("super admin bypass", () => {
    expect(purposeAllowedFor({ allowed_department_ids: ["bus"] }, "bb", null, map, true)).toBe(true);
  });
});
