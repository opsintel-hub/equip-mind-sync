import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "sidebar-width-rem";
const MIN_REM = 12;
const MAX_REM = 28;
const DEFAULT_REM = 16;

export function getStoredSidebarWidthRem(): number {
  if (typeof window === "undefined") return DEFAULT_REM;
  const v = parseFloat(localStorage.getItem(STORAGE_KEY) || "");
  if (Number.isFinite(v) && v >= MIN_REM && v <= MAX_REM) return v;
  return DEFAULT_REM;
}

/**
 * Draggable handle on the right edge of the sidebar that resizes it
 * by writing to the `--sidebar-width` CSS var on the wrapper.
 */
export function SidebarResizer() {
  const [widthRem, setWidthRem] = useState<number>(() => getStoredSidebarWidthRem());
  const draggingRef = useRef(false);

  // Apply width to the SidebarProvider wrapper via CSS var
  useEffect(() => {
    const wrapper = document.querySelector<HTMLElement>(".group\\/sidebar-wrapper");
    if (wrapper) {
      wrapper.style.setProperty("--sidebar-width", `${widthRem}rem`);
    }
  }, [widthRem]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const px = e.clientX;
      const rem = Math.max(MIN_REM, Math.min(MAX_REM, px / 16));
      setWidthRem(rem);
    };
    const onUp = () => {
      if (draggingRef.current) {
        draggingRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        localStorage.setItem(STORAGE_KEY, String(widthRem));
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [widthRem]);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const onDoubleClick = () => {
    setWidthRem(DEFAULT_REM);
    localStorage.setItem(STORAGE_KEY, String(DEFAULT_REM));
  };

  return (
    <div
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      title="ลากเพื่อปรับขนาดเมนู • ดับเบิลคลิกเพื่อรีเซ็ต"
      className="hidden md:block fixed top-0 z-30 h-svh w-1.5 cursor-col-resize bg-transparent hover:bg-primary/40 transition-colors"
      style={{ left: `calc(${widthRem}rem - 3px)` }}
    />
  );
}
