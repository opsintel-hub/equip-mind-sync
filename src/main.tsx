// ต้องมาก่อน App/supabase client เสมอ เพื่อกู้ session ให้แท็บใหม่
import "./lib/sessionBridge";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
