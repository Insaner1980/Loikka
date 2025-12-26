import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface SlidePanelProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  width?: "sm" | "md" | "lg";
  showCloseButton?: boolean;
}

const widthClasses = {
  sm: "w-[360px]",
  md: "w-[420px]",
  lg: "w-[500px]",
};

export function SlidePanel({
  open,
  onClose,
  title,
  children,
  width = "md",
  showCloseButton = true,
}: SlidePanelProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[var(--overlay-bg)] animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`absolute top-0 right-0 h-full ${widthClasses[width]} max-w-[90vw] flex flex-col bg-card border-l border-border-subtle shadow-2xl animate-slide-in-right`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <div className="flex-1 min-w-0">{title}</div>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="flex-shrink-0 p-1.5 rounded-md text-tertiary hover:text-foreground hover:bg-muted transition-colors duration-150 cursor-pointer ml-3"
              aria-label="Sulje"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body
  );
}
