import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck } from "lucide-react";
import SiteAccessGate from "./SiteAccessGate";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gate-station`;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export default function GateStation() {
  const { code = "" } = useParams();
  const storeKey = `gate-station:${code.toUpperCase()}`;
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(storeKey));
  const [stationName, setStationName] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  const raw = async (action: string, body: Record<string, unknown> = {}, tk = token) => {
    const res = await fetch(FN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: KEY, Authorization: `Bearer ${KEY}`, ...(tk ? { "x-station-token": tk } : {}) },
      body: JSON.stringify({ action, ...body }),
    });
    return res.json().catch(() => ({ ok: false, message: "เชื่อมต่อไม่ได้" }));
  };

  const logout = () => { localStorage.removeItem(storeKey); setToken(null); setPin(""); };

  const call = async (action: string, body?: Record<string, unknown>) => {
    const r = await raw(action, body);
    if (r?.message === "SESSION_EXPIRED") { toast.error("หมดเวลาใช้งาน กรุณาใส่ PIN ใหม่"); logout(); return null; }
    return r;
  };

  useEffect(() => {
    if (!token) return;
    raw("me").then((r) => { if (r?.ok) setStationName(r.station_name); else logout(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await raw("login", { code, pin }, null);
    setBusy(false);
    if (!r?.ok) { toast.error(r?.message || "PIN ไม่ถูกต้อง"); setPin(""); return; }
    localStorage.setItem(storeKey, r.token);
    setStationName(r.station_name);
    setToken(r.token);
  };

  if (token) return <div className="min-h-screen bg-background"><SiteAccessGate station={call} stationName={stationName} onLogout={logout} /></div>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-4 pt-6 text-center">
          <ShieldCheck className="mx-auto h-14 w-14 text-primary" />
          <h1 className="text-2xl font-bold">จุดตรวจ รปภ.</h1>
          <p className="text-muted-foreground">จุด <b className="font-mono">{code.toUpperCase()}</b> — ใส่ PIN 6 หลัก</p>
          <form onSubmit={login} className="space-y-3">
            <Input inputMode="numeric" autoFocus maxLength={6} type="password" value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              className="h-16 text-center text-3xl tracking-[0.5em]" placeholder="••••••" />
            <Button type="submit" className="h-14 w-full text-lg" disabled={busy || pin.length !== 6}>{busy ? "กำลังตรวจสอบ..." : "เข้าใช้งาน"}</Button>
          </form>
          <p className="text-xs text-muted-foreground">ลืม PIN? ติดต่อเจ้าหน้าที่คลัง</p>
        </CardContent>
      </Card>
    </div>
  );
}
