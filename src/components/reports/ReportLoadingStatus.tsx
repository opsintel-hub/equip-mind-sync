import { Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { useReportLoading } from "@/hooks/useReportQuery";

export function ReportLoadingStatus({ state }: { state: ReturnType<typeof useReportLoading> }) {
  const busy = state.loading || state.refreshing;
  return <div className="space-y-2" aria-busy={busy}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div role={state.error ? "alert" : "status"} aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground">
        {state.error ? <><AlertTriangle className="h-4 w-4 text-destructive" />โหลดข้อมูลไม่ครบ กรุณาลองใหม่</> : busy ? <>
          <Loader2 className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none text-primary" />
          <span>{state.blocked ? "กำลังตรวจสอบสิทธิ์..." : state.refreshing ? "กำลังอัปเดตข้อมูล..." : `กำลังโหลดข้อมูล ${state.percent}% (${state.completed}/${state.total} ชุด)`}</span>
        </> : <span>โหลดข้อมูลครบแล้ว</span>}
      </div>
      <Button size="sm" variant="outline" disabled={busy} onClick={state.reload} className="gap-2">
        <RefreshCw className="h-4 w-4" />{state.error ? "ลองใหม่" : "อัปเดตข้อมูล"}
      </Button>
    </div>
    {busy && !state.blocked && <progress aria-label="ความคืบหน้าการโหลดชุดข้อมูล" className="h-1.5 w-full accent-primary" max={100} value={state.percent} />}
  </div>;
}

export function LoadingValue({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return pending ? <Skeleton className="inline-block h-7 w-16 align-middle motion-reduce:animate-none" /> : <>{children}</>;
}