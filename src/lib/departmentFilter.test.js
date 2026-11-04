import { describe, it, expect } from "bun:test";
import { filterDepartmentOptions, normalizeDepartmentSearch } from "./departmentFilter";

const DEPTS = [
  "Airport Media",
  "Bus Media",
  "Hello-Installation",
  "Hello-LED",
  "Operation 7-Eleven",
  "Operation Support",
  "Static Media",
  "บางเสาธง",
];

describe("normalizeDepartmentSearch", () => {
  it("keeps Thai letters and marks, drops spaces and punctuation", () => {
    expect(normalizeDepartmentSearch("  Operation  7-Eleven ")).toBe("operation7eleven");
    expect(normalizeDepartmentSearch("บางเสาธง")).toBe("บางเสาธง");
  });
});

describe("filterDepartmentOptions", () => {
  it("returns every department for an empty or whitespace query", () => {
    expect(filterDepartmentOptions(DEPTS, "")).toEqual(DEPTS);
    expect(filterDepartmentOptions(DEPTS, "   ")).toEqual(DEPTS);
  });
  it("matches case-insensitively", () => {
    expect(filterDepartmentOptions(DEPTS, "operation")).toEqual(["Operation 7-Eleven", "Operation Support"]);
  });
  it("ignores spaces and hyphens so '7 eleven' finds Operation 7-Eleven", () => {
    for (const q of ["7 eleven", "7-eleven", "7eleven", " 7 ELEVEN "]) {
      expect(filterDepartmentOptions(DEPTS, q)).toEqual(["Operation 7-Eleven"]);
    }
  });
  it("matches Thai department names", () => {
    expect(filterDepartmentOptions(DEPTS, "บางเสา")).toEqual(["บางเสาธง"]);
  });
  it("returns nothing when no department matches", () => {
    expect(filterDepartmentOptions(DEPTS, "zzz")).toEqual([]);
  });
  it("keeps the original order", () => {
    expect(filterDepartmentOptions(DEPTS, "media")).toEqual(["Airport Media", "Bus Media", "Static Media"]);
  });
});
