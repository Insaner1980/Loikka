import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { TOAST } from "../../lib/constants";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

function Toast({ id, type: _type, message, duration = TOAST.DURATION_MS, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onClose(id), TOAST.EXIT_ANIMATION_MS);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onClose(id), TOAST.EXIT_ANIMATION_MS);
  };

  return (
    <div
      className={`flex items-center overflow-hidden rounded-xl bg-elevated shadow-lg backdrop-blur-sm transition-all duration-200 ${
        isExiting ? "opacity-0 -translate-x-4" : "opacity-100 translate-x-0"
      }`}
    >
      {/* Accent color left border */}
      <div className="w-1 self-stretch bg-[var(--accent)]" />
      <div className="flex items-center gap-3 px-4 py-3 flex-1">
        <span className="flex-1 text-body font-medium text-foreground">{message}</span>
        <button
          onClick={handleClose}
          className="shrink-0 p-1 rounded-lg hover:bg-border-hover transition-colors text-muted-foreground hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

// Toast container and hook
interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

let toastId = 0;
let listeners: ((toasts: ToastItem[]) => void)[] = [];
let toasts: ToastItem[] = [];

function notify(toastList: ToastItem[]) {
  toasts = toastList;
  listeners.forEach((listener) => listener(toasts));
}

export const toast = {
  success: (message: string) => {
    const id = String(++toastId);
    notify([...toasts, { id, type: "success", message }]);
  },
  error: (message: string) => {
    const id = String(++toastId);
    notify([...toasts, { id, type: "error", message }]);
  },
  warning: (message: string) => {
    const id = String(++toastId);
    notify([...toasts, { id, type: "warning", message }]);
  },
  info: (message: string) => {
    const id = String(++toastId);
    notify([...toasts, { id, type: "info", message }]);
  },
};

export function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    listeners.push(setItems);
    return () => {
      listeners = listeners.filter((l) => l !== setItems);
    };
  }, []);

  const handleClose = (id: string) => {
    notify(toasts.filter((t) => t.id !== id));
  };

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-16 z-50 flex flex-col gap-2 max-w-sm">
      {items.map((item) => (
        <Toast
          key={item.id}
          id={item.id}
          type={item.type}
          message={item.message}
          onClose={handleClose}
        />
      ))}
    </div>
  );
}
