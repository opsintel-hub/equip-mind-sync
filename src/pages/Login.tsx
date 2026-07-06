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
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const loginSchema = z.object({
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง"),
  password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, "กรุณากรอกชื่อ-นามสกุล"),
  displayName: z.string().min(1, "กรุณากรอกชื่อที่ต้องการให้แสดงในระบบ").max(50, "ชื่อที่แสดงต้องไม่เกิน 50 ตัวอักษร"),
  phone: z.string().optional(),
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
  const [phone, setPhone] = useState("");
  const [requestedJobRole, setRequestedJobRole] = useState("");
  const [requestedDepartment, setRequestedDepartment] = useState("");
  const [jobRoles, setJobRoles] = useState<JobRoleTemplate[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
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
        phone,
        requestedJobRole,
        requestedDepartment,
      });
      await signUp(
        signupEmail,
        signupPassword,
        fullName,
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
              <form onSubmit={handleLogin} className="space-y-4">
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
                  <Label htmlFor="phone">เบอร์โทรศัพท์ (ไม่บังคับ)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="08-XXXX-XXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isLoading}
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
    </div>
  );
};

export default Login;
