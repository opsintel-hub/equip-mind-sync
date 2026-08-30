import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase จะสร้าง session ชั่วคราวจากลิงก์ recovery ให้อัตโนมัติ
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }
    if (password !== confirm) {
      toast.error("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("ตั้งรหัสผ่านใหม่สำเร็จ กรุณาเข้าสู่ระบบอีกครั้ง");
      await supabase.auth.signOut();
      navigate("/", { replace: true });
    } catch (err: any) {
      const code = err?.code;
      if (code === "weak_password") {
        toast.error("รหัสผ่านนี้ไม่ปลอดภัย กรุณาใช้รหัสผ่านที่คาดเดายากกว่า");
      } else if (code === "same_password") {
        toast.error("รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม");
      } else {
        toast.error(err?.message || "ตั้งรหัสผ่านใหม่ไม่สำเร็จ");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
            <KeyRound className="w-9 h-9 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-semibold">ตั้งรหัสผ่านใหม่</CardTitle>
            <CardDescription className="mt-2">
              {ready
                ? "กรอกรหัสผ่านใหม่ของคุณเพื่อเข้าใช้งานระบบ"
                : "กำลังตรวจสอบลิงก์... หากลิงก์หมดอายุ กรุณาขอลิงก์ใหม่จากหน้าเข้าสู่ระบบ"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">รหัสผ่านใหม่</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || !ready}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">ยืนยันรหัสผ่านใหม่</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={loading || !ready}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !ready}>
              {loading ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => navigate("/")}>
              กลับไปหน้าเข้าสู่ระบบ
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
