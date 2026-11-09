import { expect, test } from "bun:test";
import { agingBucket, issueAge, followUpQuantities, uniqueOutstanding, quantityByUnit, matchesFollowUp, emptyFollowUpFilters, summarizeFollowUp, followUpDepartment } from "./incompleteIssueReport";

for (const [days, bucket] of [[0,"today"],[1,"1-2"],[2,"1-2"],[3,"3-5"],[5,"3-5"],[6,"6-10"],[10,"6-10"],[11,"11-15"],[15,"11-15"],[16,"16-30"],[30,"16-30"],[31,">30"],[null,"unknown"]]) {
  test(`aging ${days} days belongs only to ${bucket}`, () => expect(agingBucket(days)).toBe(bucket));
}
test("age uses issue date and Bangkok midnight", () => expect(issueAge("2026-11-03T16:59:00Z", new Date("2026-11-03T17:01:00Z"))).toBe(1));
test("missing issue date is unknown", () => expect(issueAge(null)).toBe(null));
const base = { id: "line", documentId: "doc", documentNo: "GI-001", department: "Bus Media", person: "A", purpose: "ซ่อม", issuedAt: null, days: 31, bucket: ">30", code: "C", name: "สายไฟ", serial: "SN1", unit: "เมตร", isMediaPlayer: false, billboardQty: 60, returnQty: 100, usageQty: 60, receiptQty: 0 };
test("100m issued, 40m installed retains 60m assignment and 100m independent return", () => {
  expect(followUpQuantities({issued_quantity:100, installed_qty:40}, {requires_billboard:true, requires_return:true})).toEqual({billboardQty:60,returnQty:100,usageQty:60,receiptQty:0});
});
test("multiple obligations do not inflate 100m to 220m", () => expect(uniqueOutstanding(base)).toBe(100));
test("consumable no-return still has unused stock", () => expect(followUpQuantities({issued_quantity:100,installed_qty:40,needs_return:false},{requires_billboard:true,requires_return:true}).returnQty).toBe(0));
test("general-use purpose (no billboard, no return) closes at issue with no outstanding", () => {
  expect(followUpQuantities({issued_quantity:100}, {requires_billboard:false, requires_return:false})).toEqual({billboardQty:0,returnQty:0,usageQty:0,receiptQty:0});
});
test("return-only purpose still tracks unused stock awaiting return", () => {
  expect(followUpQuantities({issued_quantity:100,returned_good_qty:30},{requires_billboard:false,requires_return:true}).usageQty).toBe(70);
});
test("different units are never combined as pieces", () => expect(quantityByUnit([base,{...base,id:"other",unit:"เครื่อง",returnQty:2,billboardQty:0,usageQty:0}])).toBe("100 เมตร · 2 เครื่อง"));
test("department multiselect excludes unrelated department", () => expect(matchesFollowUp(base,{...emptyFollowUpFilters(),departments:["Airport Media","Static Media"]})).toBe(false));
test("serial alias is searchable", () => expect(matchesFollowUp({...base,aliases:["Alias 2"]},{...emptyFollowUpFilters(),serial:"alias 2"})).toBe(true));
test("document count deduplicates lines and receipt rows", () => expect(summarizeFollowUp([base,{...base,id:"receipt",receiptQty:4}]).documents).toBe(1));
test("STT0200 follows Static Media ownership, not Bus Media requester", () => {
  expect(followUpDepartment({equipment_id:"STT0200"}, "Bus Media", {equipment:{STT0200:"Static Media"},mediaPlayers:{}})).toBe("Static Media");
});
test("Media Player follows its own department rather than equipment fallback", () => {
  expect(followUpDepartment({equipment_id:"E",media_player_id:"MP"},"Bus Media",{equipment:{E:"Static Media"},mediaPlayers:{MP:"Digital Media"}})).toBe("Digital Media");
});
test("missing owner retains document department for legacy issues", () => {
  expect(followUpDepartment({equipment_id:"missing"},"Bus Media",{equipment:{},mediaPlayers:{}})).toBe("Bus Media");
});
test("unknown owner and requester remain unassigned", () => {
  expect(followUpDepartment({},null,{equipment:{},mediaPlayers:{}})).toBe("ไม่ระบุฝ่าย");
});