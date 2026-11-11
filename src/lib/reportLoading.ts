export const REPORT_STALE_TIME = 3 * 60 * 1000;

export function reportScopeKey(userId: string | undefined, scope: string) {
  return JSON.stringify([userId || "signed-out", scope]);
}

export function summarizeReportQueries(states: { status: string; fetchStatus: string; hasData: boolean }[]) {
  const total = states.length;
  const completed = states.filter(s => s.status === "success").length;
  return {
    total, completed,
    percent: total ? Math.floor(completed / total * 100) : 0,
    loading: states.some(s => !s.hasData && s.status === "pending"),
    refreshing: states.some(s => s.fetchStatus === "fetching" && s.hasData),
    error: states.some(s => s.status === "error"),
  };
}