import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
}

const maxWidthClasses = {
  sm: "max-w-sm",      // 384px
  md: "max-w-md",      // 448px
  lg: "max-w-lg",      // 512px
  xl: "max-w-xl",      // 576px
  "2xl": "max-w-2xl",  // 672px
  "3xl": "max-w-3xl",  // 768px
  "4xl": "max-w-4xl",  // 896px
};

export function Dialog({
  open,
  onClose,
  title,
  children,
  maxWidth = "md",
}: DialogProps) {
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

  // Prevent body scroll when dialog is open
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
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[var(--overlay-bg)] backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        className={`relative w-full ${maxWidthClasses[maxWidth]} max-h-[85vh] flex flex-col bg-card rounded-xl animate-scale-in shadow-2xl`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <h2 id="dialog-title" className="text-sm font-medium text-foreground">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-tertiary hover:text-foreground hover:bg-muted transition-colors duration-150 cursor-pointer"
            aria-label="Sulje"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body
  );
}
