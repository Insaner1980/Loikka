import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "default";
}

export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = "OK",
  cancelText = "Peruuta",
  variant = "default",
}: ConfirmDialogProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onCancel]);

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

  const confirmButtonClass =
    variant === "danger"
      ? "bg-error hover:bg-error/90 text-white"
      : variant === "warning"
        ? "bg-warning hover:bg-warning/90 text-black"
        : "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--btn-primary-text)]";

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[var(--overlay-bg)] backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        className="relative w-full max-w-sm bg-card rounded-xl animate-scale-in shadow-2xl"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        {/* Content */}
        <div className="p-5">
          {/* Icon and title */}
          <div className="flex items-start gap-3 mb-3">
            {variant === "danger" && (
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-error/15 flex items-center justify-center">
                <AlertTriangle size={20} className="text-error" />
              </div>
            )}
            {variant === "warning" && (
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-warning/15 flex items-center justify-center">
                <AlertTriangle size={20} className="text-warning" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3
                id="confirm-dialog-title"
                className="text-sm font-medium text-foreground"
              >
                {title}
              </h3>
              <p
                id="confirm-dialog-message"
                className="mt-1 text-body text-muted-foreground"
              >
                {message}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 mt-5">
            <button
              onClick={onCancel}
              className="btn-secondary btn-press"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex items-center gap-2 px-3.5 py-2 text-body font-medium rounded-md transition-all duration-150 cursor-pointer btn-press ${confirmButtonClass}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
