import { useCallback, useSyncExternalStore } from "react";
import { useQuery, useQueryClient, type QueryKey, type UseQueryOptions } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { REPORT_STALE_TIME, reportScopeKey, summarizeReportQueries } from "@/lib/reportLoading";

export function useReportContext(group: string, scope: string, blocked = false) {
  const { user, loading } = useAuth();
  return { group, scope: reportScopeKey(user?.id, scope), ready: !!user && !loading && !blocked };
}
type ReportContext = ReturnType<typeof useReportContext>;

export function useReportQuery<TQueryFnData = unknown, TError = Error, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, report: ReportContext,
) {
  return useQuery({
    ...options,
    queryKey: [...options.queryKey, report.scope] as unknown as TQueryKey,
    enabled: report.ready && options.enabled !== false,
    staleTime: REPORT_STALE_TIME,
    gcTime: 5 * 60 * 1000,
    // Never carry rows from a different user/permission key into the next one.
    placeholderData: undefined,
    meta: { ...options.meta, reportGroup: report.group, reportScope: report.scope },
  });
}

export function useReportLoading(report: ReportContext) {
  const client = useQueryClient();
  const cache = client.getQueryCache();
  const matching = () => cache.getAll().filter(q => q.meta?.reportGroup === report.group && q.meta?.reportScope === report.scope && q.getObserversCount() > 0 && !q.isDisabled());
  const subscribe = useCallback((notify: () => void) => cache.subscribe(notify), [cache]);
  const snapshot = () => JSON.stringify(matching().map(q => [q.queryHash, q.state.status, q.state.fetchStatus, q.state.dataUpdatedAt, q.state.errorUpdatedAt]));
  useSyncExternalStore(subscribe, snapshot, snapshot);
  const summary = summarizeReportQueries(matching().map(q => ({ status: q.state.status, fetchStatus: q.state.fetchStatus, hasData: q.state.data !== undefined })));
  return {
    ...summary,
    loading: !report.ready || summary.loading,
    blocked: !report.ready,
    reload: () => { for (const query of matching()) void client.invalidateQueries({ queryKey: query.queryKey, exact: true }); },
  };
}