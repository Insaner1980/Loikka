import { Loader2 } from "lucide-react";
import { LoadingSpinner } from "./LoadingSpinner";

interface SpinnerProps {
  size?: number;
  className?: string;
}

export function Spinner({ size = 20, className = "" }: SpinnerProps) {
  return (
    <Loader2
      size={size}
      className={`animate-spin text-tertiary ${className}`}
    />
  );
}

interface PageLoaderProps {
  message?: string;
}

export function PageLoader({ message = "Ladataan..." }: PageLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <LoadingSpinner size={64} />
      {message && <p className="mt-4 text-body text-muted-foreground">{message}</p>}
    </div>
  );
}
