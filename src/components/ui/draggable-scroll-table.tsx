import { useRef, useState, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DraggableScrollTableProps {
  children: ReactNode;
  className?: string;
  /** Max height for vertical scrolling (so sticky header works) */
  maxHeight?: string;
}

/**
 * Wrapper that enables click-and-drag horizontal scrolling on a table container,
 * while keeping native vertical scrolling for sticky headers.
 */
export function DraggableScrollTable({
  children,
  className,
  maxHeight = "70vh",
}: DraggableScrollTableProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef({ startX: 0, scrollLeft: 0, moved: false });

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only left button; ignore drags starting on interactive elements
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea, [role='button']")) return;
    if (!ref.current) return;
    setIsDragging(true);
    dragState.current.startX = e.pageX - ref.current.offsetLeft;
    dragState.current.scrollLeft = ref.current.scrollLeft;
    dragState.current.moved = false;
  };

  const onMouseLeave = () => setIsDragging(false);
  const onMouseUp = () => setIsDragging(false);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !ref.current) return;
    e.preventDefault();
    const x = e.pageX - ref.current.offsetLeft;
    const walk = x - dragState.current.startX;
    if (Math.abs(walk) > 3) dragState.current.moved = true;
    ref.current.scrollLeft = dragState.current.scrollLeft - walk;
  };

  return (
    <div
      ref={ref}
      onMouseDown={onMouseDown}
      onMouseLeave={onMouseLeave}
      onMouseUp={onMouseUp}
      onMouseMove={onMouseMove}
      style={{ maxHeight }}
      className={cn(
        "rounded-lg border overflow-auto select-none",
        isDragging ? "cursor-grabbing" : "cursor-grab",
        className,
      )}
    >
      {children}
    </div>
  );
}
