import { describe, it, expect } from "bun:test";
import { reportScopeKey, summarizeReportQueries, REPORT_STALE_TIME } from "./reportLoading";

describe("report loading and cache isolation", () => {
  it("does not reuse another account's permission-scoped cache", () => {
    expect(reportScopeKey("alice", "Digital")).not.toBe(reportScopeKey("bob", "Digital"));
  });
  it("does not reuse a previous permission scope", () => {
    expect(reportScopeKey("alice", "Digital")).not.toBe(reportScopeKey("alice", "Bus"));
  });
  it("uses a bounded three-minute freshness interval", () => {
    expect(REPORT_STALE_TIME).toBe(180000);
  });
  it("counts completed datasets rather than inventing elapsed-time progress", () => {
    expect(summarizeReportQueries([{status:"success",fetchStatus:"idle",hasData:true},{status:"pending",fetchStatus:"fetching",hasData:false}])).toMatchObject({percent:50,loading:true,completed:1,total:2});
  });
  it("keeps cached rows readable during background refresh", () => {
    expect(summarizeReportQueries([{status:"success",fetchStatus:"fetching",hasData:true}])).toMatchObject({loading:false,refreshing:true});
  });
  it("never treats failed data as complete", () => {
    expect(summarizeReportQueries([{status:"error",fetchStatus:"idle",hasData:false}])).toMatchObject({percent:0,error:true});
  });
});