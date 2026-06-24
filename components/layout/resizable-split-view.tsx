"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const HANDLE_WIDTH = 18;

export function ResizableSplitView({
  left,
  right,
  className,
  initialLeftWidth = 420,
  leftClassName,
  minLeftWidth = 360,
  minRightWidth = 640,
  rightClassName,
  storageKey = "resizable-split-view",
}: {
  left: ReactNode;
  right: ReactNode;
  className?: string;
  initialLeftWidth?: number;
  leftClassName?: string;
  minLeftWidth?: number;
  minRightWidth?: number;
  rightClassName?: string;
  storageKey?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth);

  const clampWidth = useCallback((nextWidth: number) => {
    const containerWidth = containerRef.current?.clientWidth ?? 0;

    if (!containerWidth) {
      return Math.max(nextWidth, minLeftWidth);
    }

    const maxLeftWidth = Math.max(
      minLeftWidth,
      containerWidth - minRightWidth - HANDLE_WIDTH,
    );

    return Math.min(Math.max(nextWidth, minLeftWidth), maxLeftWidth);
  }, [minLeftWidth, minRightWidth]);

  useEffect(() => {
    const savedWidth = window.localStorage.getItem(storageKey);

    if (!savedWidth) {
      return;
    }

    const parsedWidth = Number(savedWidth);

    if (Number.isFinite(parsedWidth)) {
      setLeftWidth(parsedWidth);
    }
  }, [storageKey]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, String(leftWidth));
  }, [leftWidth, storageKey]);

  useEffect(() => {
    const syncWidth = () => {
      setLeftWidth((current) => clampWidth(current));
    };

    syncWidth();
    window.addEventListener("resize", syncWidth);

    return () => {
      window.removeEventListener("resize", syncWidth);
    };
  }, [clampWidth]);

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging]);

  return (
    <div className={className}>
      <div
        ref={containerRef}
        className="flex flex-col gap-6 xl:grid xl:items-start"
        style={{
          gridTemplateColumns: `${leftWidth}px ${HANDLE_WIDTH}px minmax(0, 1fr)`,
        }}
      >
        <div className={cn("min-w-0", leftClassName)}>{left}</div>

        <div className="hidden xl:flex min-h-full items-stretch justify-center">
          <button
            aria-label="Resize expense layout"
            className={cn(
              "group relative flex w-full cursor-col-resize items-center justify-center rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-[rgba(46,117,182,0.22)]",
              isDragging ? "bg-[rgba(46,117,182,0.06)]" : "hover:bg-slate-100/70",
            )}
            onDoubleClick={() => setLeftWidth(clampWidth(initialLeftWidth))}
            onPointerDown={(event) => {
              const startX = event.clientX;
              const startWidth = leftWidth;

              setIsDragging(true);

              const handlePointerMove = (moveEvent: PointerEvent) => {
                setLeftWidth(clampWidth(startWidth + moveEvent.clientX - startX));
              };

              const handlePointerUp = () => {
                setIsDragging(false);
                window.removeEventListener("pointermove", handlePointerMove);
                window.removeEventListener("pointerup", handlePointerUp);
              };

              window.addEventListener("pointermove", handlePointerMove);
              window.addEventListener("pointerup", handlePointerUp);
            }}
            type="button"
          >
            <span
              className={cn(
                "absolute inset-y-4 left-1/2 w-px -translate-x-1/2 transition-all duration-200",
                isDragging ? "bg-[var(--color-accent)]" : "bg-slate-200 group-hover:bg-slate-300",
              )}
            />
            <span
              className={cn(
                "relative flex h-16 w-3 items-center justify-center rounded-full border bg-white shadow-[0_12px_28px_rgba(15,23,42,0.1)] transition-all duration-200",
                isDragging
                  ? "scale-[1.04] border-[rgba(46,117,182,0.24)] shadow-[0_18px_36px_rgba(46,117,182,0.16)]"
                  : "border-slate-200 group-hover:scale-[1.03] group-hover:border-slate-300",
              )}
            >
              <span className="flex flex-col gap-1.5">
                <span className="h-1 w-1 rounded-full bg-slate-400" />
                <span className="h-1 w-1 rounded-full bg-slate-400" />
                <span className="h-1 w-1 rounded-full bg-slate-400" />
              </span>
            </span>
          </button>
        </div>

        <div className={cn("min-w-0", rightClassName)}>{right}</div>
      </div>
    </div>
  );
}
