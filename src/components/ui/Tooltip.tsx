import { useState, ReactNode } from "react";

interface TooltipProps {
  content: string;
  side?: "right" | "left" | "top" | "bottom";
  children: ReactNode;
}

export function Tooltip({ content, side = "right", children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    right: "left-full ml-2 top-1/2 -translate-y-1/2",
    left: "right-full mr-2 top-1/2 -translate-y-1/2",
    top: "bottom-full mb-2 left-1/2 -translate-x-1/2",
    bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={`absolute z-50 px-2 py-1 text-xs whitespace-nowrap text-muted-foreground
            ${positionClasses[side]}`}
          role="tooltip"
        >
          {content}
        </div>
      )}
    </div>
  );
}
