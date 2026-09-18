import { useLocation, useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFunctionPermissions } from "@/hooks/useFunctionPermissions";
import { getRouteRule } from "@/lib/routePermissions";

/**
 * Blocks direct URL access to pages the user has no function permission for,
 * matching exactly what the sidebar shows.
 */
const FunctionRouteGuard = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasFunctionAccess, isSuperAdmin, loading } = useFunctionPermissions();

  const rule = getRouteRule(location.pathname);

  if (!rule) return <>{children}</>;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const superAdminOk = !rule.superAdminOnly || isSuperAdmin;
  const fnOk = !rule.fns || rule.fns.length === 0 || rule.fns.some((fn) => hasFunctionAccess(fn));

  if (superAdminOk && fnOk) return <>{children}</>;

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center space-y-3">
          <ShieldAlert className="w-14 h-14 mx-auto text-destructive" />
          <h2 className="text-xl font-semibold">ไม่มีสิทธิ์เข้าถึงหน้านี้</h2>
          <p className="text-muted-foreground text-sm">
            บัญชีของคุณยังไม่ได้รับสิทธิ์สำหรับเมนูนี้ กรุณาติดต่อผู้ดูแลระบบหากต้องการใช้งาน
          </p>
          <Button onClick={() => navigate("/dashboard")}>กลับหน้าแดชบอร์ด</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default FunctionRouteGuard;
