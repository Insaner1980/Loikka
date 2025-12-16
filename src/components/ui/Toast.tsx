import { useEffect, useState } from "react";
import { CheckCircle, XCircle, AlertCircle, X, Info } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const styles = {
  success: "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400",
  error: "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400",
  warning: "bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400",
  info: "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400",
};

function Toast({ id, type, message, duration = 4000, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);
  const Icon = icons[type];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onClose(id), 200);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onClose(id), 200);
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm transition-all duration-200 ${
        styles[type]
      } ${isExiting ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"}`}
    >
      <Icon size={20} className="shrink-0" />
      <span className="flex-1 text-sm font-medium">{message}</span>
      <button
        onClick={handleClose}
        className="shrink-0 p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
      >
        <X size={16} />
      </button>
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
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
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
