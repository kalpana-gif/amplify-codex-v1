"use client";

import { useEffect, useId } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  title,
  description,
  onClose,
  className,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-8 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className={cn(
          "w-full max-w-lg rounded-[2rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] p-6 shadow-[0_30px_100px_rgba(15,23,42,0.28)]",
          className,
        )}
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950" id={titleId}>
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm leading-6 text-slate-600" id={descriptionId}>
                {description}
              </p>
            ) : null}
          </div>
          <Button
            aria-label="Close modal"
            className="h-10 w-10 rounded-full p-0"
            size="sm"
            variant="ghost"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
