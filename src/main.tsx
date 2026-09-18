// ต้องมาก่อน App/supabase client เสมอ เพื่อกู้ session ให้แท็บใหม่
import "./lib/sessionBridge";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// เมื่อมีเวอร์ชันใหม่ ไฟล์ chunk เก่าจะหายไป -> โหลดหน้าใหม่อัตโนมัติ 1 ครั้ง
const RELOAD_KEY = "chunk-reload-at";
const handleChunkError = () => {
  const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
  if (Date.now() - last < 10000) return;
  sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  window.location.reload();
};

window.addEventListener("vite:preloadError", handleChunkError);
window.addEventListener("unhandledrejection", (e) => {
  const msg = String((e.reason as Error)?.message || e.reason || "");
  if (msg.includes("Failed to fetch dynamically imported module") || msg.includes("Importing a module script failed")) {
    handleChunkError();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
