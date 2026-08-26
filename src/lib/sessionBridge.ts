/**
 * Session bridge
 * -------------------------------------------------------------
 * Supabase client เก็บ session ใน sessionStorage (เพื่อบังคับ login ใหม่
 * เมื่อปิด browser) แต่ sessionStorage ไม่ถูกแชร์ข้ามแท็บ ทำให้เปิดแท็บใหม่
 * แล้วเด้งไปหน้า Login ทั้งที่ยังใช้งานอยู่
 *
 * โมดูลนี้ mirror session ไปที่ localStorage พร้อม heartbeat:
 *  - แท็บใหม่: ถ้ายังมีแท็บอื่นเปิดอยู่ (heartbeat สด) จะ restore session ทันที
 *  - ปิด browser ทั้งหมด: heartbeat หยุด -> เกินเวลาแล้ว mirror ใช้ไม่ได้ ต้อง login ใหม่
 *
 * ต้อง import ไฟล์นี้ "ก่อน" supabase client ถูกสร้าง (ดู main.tsx)
 */

const MIRROR_KEY = "sb-session-mirror";
const HEARTBEAT_KEY = "sb-session-heartbeat";
const HEARTBEAT_INTERVAL = 3000;
// ถือว่า "ยังมีแท็บเปิดอยู่" ถ้า heartbeat ใหม่กว่านี้
const HEARTBEAT_TTL = 20000;

const isAuthKey = (k: string) => k.startsWith("sb-") && k.endsWith("-auth-token");

const findAuthKey = (store: Storage): string | null => {
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i);
    if (k && isAuthKey(k)) return k;
  }
  return null;
};

const readMirror = (): { key: string; value: string } | null => {
  try {
    const raw = localStorage.getItem(MIRROR_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.key && parsed?.value) return parsed;
  } catch { /* ignore */ }
  return null;
};

const heartbeatFresh = () => {
  try {
    const ts = Number(localStorage.getItem(HEARTBEAT_KEY) || 0);
    return ts > 0 && Date.now() - ts < HEARTBEAT_TTL;
  } catch {
    return false;
  }
};

export const syncAuthSessionToBridge = () => {
  try {
    const key = findAuthKey(sessionStorage);
    if (key) {
      const value = sessionStorage.getItem(key);
      if (value) {
        localStorage.setItem(MIRROR_KEY, JSON.stringify({ key, value }));
        localStorage.setItem(HEARTBEAT_KEY, String(Date.now()));
        return;
      }
    }
    // ไม่มี session ในแท็บนี้ (logout) -> ล้าง mirror ให้แท็บอื่นด้วย
    if (localStorage.getItem(MIRROR_KEY)) {
      localStorage.removeItem(MIRROR_KEY);
      localStorage.removeItem(HEARTBEAT_KEY);
    }
  } catch { /* ignore */ }
};

export const initSessionBridge = () => {
  if (typeof window === "undefined") return;

  // 1) แท็บใหม่: restore session จาก mirror ถ้ายังมีแท็บอื่นใช้งานอยู่
  try {
    if (!findAuthKey(sessionStorage) && heartbeatFresh()) {
      const mirror = readMirror();
      if (mirror) sessionStorage.setItem(mirror.key, mirror.value);
    }
  } catch { /* ignore */ }

  // 2) เขียน mirror + heartbeat ต่อเนื่อง
  syncAuthSessionToBridge();
  window.setInterval(syncAuthSessionToBridge, HEARTBEAT_INTERVAL);
  window.addEventListener("focus", syncAuthSessionToBridge);
  window.addEventListener("pagehide", syncAuthSessionToBridge);

  // 3) แท็บอื่น logout -> ล้าง session ของแท็บนี้ด้วย
  window.addEventListener("storage", (e) => {
    if (e.key === MIRROR_KEY && e.newValue === null) {
      try {
        const key = findAuthKey(sessionStorage);
        if (key) {
          sessionStorage.removeItem(key);
          window.location.replace("/");
        }
      } catch { /* ignore */ }
    }
  });
};

initSessionBridge();
