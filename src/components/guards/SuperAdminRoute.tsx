import { Navigate } from "react-router-dom";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";

export default function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { isSuperAdmin, loading } = useIsSuperAdmin();
  if (loading) return null;
  return isSuperAdmin ? <>{children}</> : <Navigate to="/site-access-report" replace />;
}
