import { useRef, useState, ReactNode, useEffect } from "react";
import { cn } from "@/lib/utils";

interface DraggableScrollTableProps {
  children: ReactNode;
  className?: string;
  maxHeight?: string;
}

/**
 * Click-and-drag horizontal scrolling, with native vertical scroll for sticky header.
 * Uses pointer events + setPointerCapture so dragging continues even outside the container.
 */
export function DraggableScrollTable({
  children,
  className,
  maxHeight = "70vh",
}: DraggableScrollTableProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const state = useRef({ startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0, active: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest("button, a, input, select, textarea, [role='button'], [data-no-drag]")) return;
      state.current.active = true;
      state.current.startX = e.clientX;
      state.current.startY = e.clientY;
      state.current.scrollLeft = el.scrollLeft;
      state.current.scrollTop = el.scrollTop;
      setIsDragging(true);
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!state.current.active) return;
      e.preventDefault();
      const dx = e.clientX - state.current.startX;
      const dy = e.clientY - state.current.startY;
      el.scrollLeft = state.current.scrollLeft - dx;
      el.scrollTop = state.current.scrollTop - dy;
    };

    const stop = (e: PointerEvent) => {
      if (!state.current.active) return;
      state.current.active = false;
      setIsDragging(false);
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", stop);
    el.addEventListener("pointercancel", stop);
    el.addEventListener("pointerleave", stop);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", stop);
      el.removeEventListener("pointercancel", stop);
      el.removeEventListener("pointerleave", stop);
    };
  }, []);

  return (
    <div
      ref={ref}
      style={{ maxHeight, touchAction: "pan-y", WebkitUserSelect: "none", userSelect: "none" }}
      className={cn(
        "rounded-lg border overflow-auto",
        isDragging ? "cursor-grabbing" : "cursor-grab",
        className,
      )}
    >
      {children}
    </div>
  );
}
