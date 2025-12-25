import spinnerIcon from "../../assets/spinner-icon.png";

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
}

export function LoadingSpinner({ size = 64, className = "" }: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img
        src={spinnerIcon}
        alt="Ladataan..."
        width={size}
        height={size}
        className="animate-spin"
        style={{ animationDuration: "1.5s" }}
        loading="eager"
      />
    </div>
  );
}
