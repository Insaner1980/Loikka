import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "default";
  /** Loading state - disables buttons */
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = "OK",
  cancelText = "Peruuta",
  loading = false,
}: ConfirmDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle async confirm
  const handleConfirm = async () => {
    const result = onConfirm();
    if (result instanceof Promise) {
      setIsSubmitting(true);
      try {
        await result;
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const isLoading = loading || isSubmitting;
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

  // Button styling - always use accent color (blue) per UI spec
  const confirmButtonClass = "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--btn-primary-text)]";

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
          {/* Title and message */}
          <div className="mb-4">
            <h3
              id="confirm-dialog-title"
              className="text-body font-medium text-foreground"
            >
              {title}
            </h3>
            <p
              id="confirm-dialog-message"
              className="mt-1.5 text-body text-muted-foreground"
            >
              {message}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 mt-5">
            <button
              onClick={onCancel}
              className="btn-secondary btn-press"
              disabled={isLoading}
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className={`flex items-center gap-2 px-3.5 py-2 text-body font-medium rounded-md transition-all duration-150 cursor-pointer btn-press disabled:opacity-50 disabled:cursor-not-allowed ${confirmButtonClass}`}
            >
              {isLoading ? "Odota..." : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
