import { ReactNode, forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface DraggableScrollTableProps {
  children: ReactNode;
  className?: string;
  maxHeight?: string;
}

export const DraggableScrollTable = forwardRef<HTMLDivElement, DraggableScrollTableProps>(
  function DraggableScrollTable({ children, className, maxHeight = "70vh" }, forwardedRef) {
    const innerRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(forwardedRef, () => innerRef.current as HTMLDivElement);

    const [isDragging, setIsDragging] = useState(false);
    const dragState = useRef({
      active: false,
      startX: 0,
      startY: 0,
      scrollLeft: 0,
      scrollTop: 0,
    });

    useEffect(() => {
      const el = innerRef.current;
      if (!el) return;

      const onMouseDown = (event: MouseEvent) => {
        if (event.button !== 0) return;
        const target = event.target as HTMLElement;
        if (target.closest("button, a, input, select, textarea, [role='button'], [data-no-drag]")) return;

        dragState.current.active = true;
        dragState.current.startX = event.clientX;
        dragState.current.startY = event.clientY;
        dragState.current.scrollLeft = el.scrollLeft;
        dragState.current.scrollTop = el.scrollTop;
        setIsDragging(true);
        document.body.style.userSelect = "none";
      };

      const onMouseMove = (event: MouseEvent) => {
        if (!dragState.current.active) return;
        event.preventDefault();
        const deltaX = event.clientX - dragState.current.startX;
        const deltaY = event.clientY - dragState.current.startY;
        el.scrollLeft = dragState.current.scrollLeft - deltaX;
        el.scrollTop = dragState.current.scrollTop - deltaY;
      };

      const stopDragging = () => {
        if (!dragState.current.active) return;
        dragState.current.active = false;
        setIsDragging(false);
        document.body.style.userSelect = "";
      };

      el.addEventListener("mousedown", onMouseDown);
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", stopDragging);

      return () => {
        el.removeEventListener("mousedown", onMouseDown);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", stopDragging);
        document.body.style.userSelect = "";
      };
    }, []);

    return (
      <div
        ref={innerRef}
        style={{ maxHeight }}
        className={cn(
          "max-w-full overflow-auto rounded-lg border",
          isDragging ? "cursor-grabbing" : "cursor-grab",
          className,
        )}
      >
        {children}
      </div>
    );
  },
);
