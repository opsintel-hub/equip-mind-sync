import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { ALLOWED_EMAIL_DOMAIN } from "@/lib/authDomain";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
    <path fill="#4285F4" d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.55-5.17 3.55-8.87Z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.27v3.09A12 12 0 0 0 12 24Z" />
    <path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.27a12 12 0 0 0 0 10.76l4-3.09Z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.18 15.24 0 12 0A12 12 0 0 0 1.27 6.62l4 3.09C6.22 6.86 8.87 4.75 12 4.75Z" />
  </svg>
);

const loginSchema = z.object({
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง"),
  password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
});

const signupSchema = loginSchema.extend({
  email: z
    .string()
    .email("รูปแบบอีเมลไม่ถูกต้อง")
    .refine(isAllowedEmail, `อนุญาตเฉพาะอีเมลบริษัท @${ALLOWED_EMAIL_DOMAIN} เท่านั้น`),
  fullName: z.string().min(2, "กรุณากรอกชื่อ-นามสกุล"),
  displayName: z.string().min(1, "กรุณากรอกชื่อที่ต้องการให้แสดงในระบบ").max(50, "ชื่อที่แสดงต้องไม่เกิน 50 ตัวอักษร"),
  phone: z.string().trim().min(9, "กรุณากรอกเบอร์โทรศัพท์").max(20, "เบอร์โทรศัพท์ยาวเกินไป"),
  requestedJobRole: z.string().min(1, "กรุณาเลือกตำแหน่งงาน"),
  requestedDepartment: z.string().min(1, "กรุณาเลือกฝ่ายที่สังกัด"),
});


interface JobRoleTemplate {
  template_key: string;
  label: string;
  description: string | null;
}

const Login = () => {
  const navigate = useNavigate();
  const { user, signIn, signUp } = useAuth();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [requestedJobRole, setRequestedJobRole] = useState("");
  const [requestedDepartment, setRequestedDepartment] = useState("");
  const [jobRoles, setJobRoles] = useState<JobRoleTemplate[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSending, setForgotSending] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
        extraParams: {
          hd: ALLOWED_EMAIL_DOMAIN,
          prompt: "select_account",
        },
      });
      if (result.error) {
        toast.error("เข้าสู่ระบบด้วย Google ไม่สำเร็จ");
        return;
      }
      if (result.redirected) return;
    } catch (e: any) {
      toast.error(e?.message || "เข้าสู่ระบบด้วย Google ไม่สำเร็จ");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = forgotEmail.trim();
    if (!z.string().email().safeParse(email).success) {
      toast.error("รูปแบบอีเมลไม่ถูกต้อง");
      return;
    }
    setForgotSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลแล้ว กรุณาตรวจสอบกล่องจดหมาย (รวมถึง Junk/Spam)");
      setForgotOpen(false);
      setForgotEmail("");
    } catch (e: any) {
      toast.error(e?.message || "ส่งลิงก์รีเซ็ตรหัสผ่านไม่สำเร็จ");
    } finally {
      setForgotSending(false);
    }
  };

  useEffect(() => {
    if (user) {
      let target = "/dashboard";
      try {
        const last = localStorage.getItem("lastRoute");
        if (last && last !== "/") target = last;
      } catch { /* ignore */ }
      navigate(target, { replace: true });
    }
  }, [user, navigate]);


  // Load templates + departments for signup form
  useEffect(() => {
    const loadOptions = async () => {
      setOptionsLoading(true);
      setOptionsError(false);
      try {
        const [tplRes, deptRes] = await Promise.all([
          (supabase as any)
            .from("permission_templates")
            .select("template_key, label, description")
            .eq("is_active", true)
            .order("display_order"),
          supabase.from("departments").select("name").eq("is_active", true).order("name"),
        ]);
        if (tplRes.error || deptRes.error) throw tplRes.error || deptRes.error;
        if (tplRes.data) setJobRoles(tplRes.data as JobRoleTemplate[]);
        if (deptRes.data) setDepartments(deptRes.data.map((d: any) => d.name));
      } catch (e) {
        console.error("Failed loading signup options", e);
        setOptionsError(true);
      } finally {
        setOptionsLoading(false);
      }
    };
    loadOptions();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      loginSchema.parse({ email: loginEmail, password: loginPassword });
      await signIn(loginEmail, loginPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          toast.error(err.message);
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      signupSchema.parse({
        email: signupEmail,
        password: signupPassword,
        fullName,
        displayName,
        phone,
        requestedJobRole,
        requestedDepartment,
      });
      await signUp(
        signupEmail,
        signupPassword,
        fullName,
        displayName,
        phone,
        requestedJobRole,
        requestedDepartment,
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          toast.error(err.message);
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
            <Package className="w-10 h-10 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-semibold">Equipment Tracking</CardTitle>
            <CardDescription className="text-base mt-2">
              ระบบจัดการคลังสินค้าอัจฉริยะ
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">เข้าสู่ระบบ</TabsTrigger>
              <TabsTrigger value="signup">สมัครสมาชิก</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <div className="space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  disabled={isLoading || googleLoading}
                  onClick={handleGoogleSignIn}
                >
                  <GoogleIcon />
                  {googleLoading ? "กำลังเปิด Google..." : "เข้าสู่ระบบด้วย Google (อีเมลบริษัท)"}
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">หรือ</span>
                  </div>
                </div>
              </div>
              <form onSubmit={handleLogin} className="space-y-4 mt-4">

                <div className="space-y-2">
                  <Label htmlFor="login-email">อีเมล</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">รหัสผ่าน</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                </Button>
                <button
                  type="button"
                  className="w-full text-sm text-primary hover:underline"
                  onClick={() => {
                    setForgotEmail(loginEmail);
                    setForgotOpen(true);
                  }}
                >
                  ลืมรหัสผ่าน?
                </button>
                <p className="text-xs text-muted-foreground text-center">
                  🔒 เปิดแท็บงานเพิ่มได้โดยไม่ต้องเข้าสู่ระบบซ้ำ และระบบจะออกจากระบบเมื่อปิดโปรแกรมทั้งหมด
                </p>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullname">ชื่อ-นามสกุล</Label>
                  <Input
                    id="fullname"
                    type="text"
                    placeholder="นาย สมชาย ใจดี"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="display-name">ชื่อที่ต้องการให้แสดงในระบบ</Label>
                  <Input
                    id="display-name"
                    type="text"
                    placeholder="เช่น สมชาย, Boy, Aey"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="08-XXXX-XXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">อีเมล</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">รหัสผ่าน</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-3 py-2 text-[11px] leading-relaxed text-amber-900 dark:text-amber-200 space-y-1">
                    <div className="font-medium">ข้อกำหนดรหัสผ่าน</div>
                    <ul className="list-disc pl-4 space-y-0.5">
                      <li>อย่างน้อย 8 ตัวอักษร ผสมตัวอักษร + ตัวเลข + สัญลักษณ์</li>
                      <li>ห้ามใช้รหัสผ่านที่พบได้ง่ายหรือเคยรั่วไหล (เช่น <code>password</code>, <code>12345678</code>, <code>qwerty</code>)</li>
                      <li>ตัวอย่างที่ดี: <code>Kx9!mPq2#vLr</code>, <code>Sunny@2569!ok</code>, <code>Bl@ckC0ffee2026</code></li>
                    </ul>
                  </div>
                </div>

                {/* Job Role */}
                <div className="space-y-2">
                  <Label htmlFor="job-role">ตำแหน่งงาน / หน้าที่ที่ต้องการ</Label>
                  <Select
                    value={requestedJobRole}
                    onValueChange={setRequestedJobRole}
                    disabled={isLoading || optionsLoading || jobRoles.length === 0}
                  >
                    <SelectTrigger id="job-role">
                      <SelectValue placeholder={optionsLoading ? "กำลังโหลดตำแหน่งงาน..." : "เลือกตำแหน่งงาน..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {jobRoles.map((r) => (
                        <SelectItem key={r.template_key} value={r.template_key}>
                          <div className="flex flex-col">
                            <span>{r.label}</span>
                            {r.description && (
                              <span className="text-xs text-muted-foreground">
                                {r.description}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Department */}
                <div className="space-y-2">
                  <Label htmlFor="department">ฝ่ายที่สังกัด</Label>
                  <Select
                    value={requestedDepartment}
                    onValueChange={setRequestedDepartment}
                    disabled={isLoading || optionsLoading || departments.length === 0}
                  >
                    <SelectTrigger id="department">
                      <SelectValue placeholder={optionsLoading ? "กำลังโหลดฝ่าย..." : "เลือกฝ่าย..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {optionsError && (
                  <div className="flex gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                    <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>โหลดรายการตำแหน่งงานหรือฝ่ายไม่สำเร็จ กรุณารีเฟรชหน้าแล้วลองใหม่</span>
                  </div>
                )}

                {/* Info banner */}
                <div className="flex gap-2 p-3 rounded-md bg-primary/10 border border-primary/20 text-xs text-primary">
                  <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>
                    ข้อมูลนี้เป็นเพียง <strong>คำขอ</strong> ผู้ดูแลระบบจะตรวจสอบและกำหนดสิทธิ์การใช้งานให้ก่อนเริ่มใช้งานจริง
                  </span>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading || optionsLoading || optionsError}>
                  {isLoading ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ลืมรหัสผ่าน</DialogTitle>
            <DialogDescription>
              กรอกอีเมลที่ใช้สมัคร ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="forgot-email">อีเมล</Label>
            <Input
              id="forgot-email"
              type="email"
              placeholder="your.email@example.com"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              disabled={forgotSending}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForgotOpen(false)} disabled={forgotSending}>
              ยกเลิก
            </Button>
            <Button onClick={handleForgotPassword} disabled={forgotSending}>
              {forgotSending ? "กำลังส่ง..." : "ส่งลิงก์รีเซ็ตรหัสผ่าน"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
