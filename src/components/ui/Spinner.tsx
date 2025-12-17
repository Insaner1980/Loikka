import { Loader2 } from "lucide-react";

interface SpinnerProps {
  size?: number;
  className?: string;
}

export function Spinner({ size = 20, className = "" }: SpinnerProps) {
  return (
    <Loader2
      size={size}
      className={`animate-spin text-[#555555] ${className}`}
    />
  );
}

interface PageLoaderProps {
  message?: string;
}

export function PageLoader({ message = "Ladataan..." }: PageLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Spinner size={24} />
      <p className="mt-4 text-[13px] text-[#666666]">{message}</p>
    </div>
  );
}
