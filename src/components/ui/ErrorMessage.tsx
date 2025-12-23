import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({
  title = "Virhe",
  message,
  onRetry,
}: ErrorMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-[var(--accent)]/10 flex items-center justify-center mb-4">
        <AlertCircle size={32} className="text-[var(--accent)]" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4 max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-secondary font-medium rounded-xl hover:bg-primary/90 transition-colors"
        >
          <RefreshCw size={18} />
          Yritä uudelleen
        </button>
      )}
    </div>
  );
}
