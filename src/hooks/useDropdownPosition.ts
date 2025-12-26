import { useState, useEffect, useRef, useCallback } from "react";

interface DropdownPositionOptions {
  /** Minimum dropdown height in pixels */
  minHeight?: number;
  /** Minimum dropdown width in pixels */
  minWidth?: number;
  /** Margin from dialog/window edges in pixels */
  margin?: number;
  /** Gap between input and dropdown */
  gap?: number;
}

interface UseDropdownPositionReturn {
  /** Whether dropdown is open */
  isOpen: boolean;
  /** Open the dropdown */
  open: () => void;
  /** Close the dropdown */
  close: () => void;
  /** Toggle the dropdown */
  toggle: () => void;
  /** Ref for the container/trigger element */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Ref for the dropdown element */
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  /** Calculated dropdown style (includes position and maxHeight) */
  dropdownStyle: React.CSSProperties;
}

const DEFAULT_OPTIONS: Required<DropdownPositionOptions> = {
  minHeight: 150,
  minWidth: 0,
  margin: 20,
  gap: 4,
};

/**
 * Calculates dropdown position and dynamic maxHeight within dialog/window bounds.
 */
function calculatePosition(
  triggerElement: HTMLElement,
  options: Required<DropdownPositionOptions>
): React.CSSProperties {
  const { minHeight, minWidth, margin, gap } = options;
  const rect = triggerElement.getBoundingClientRect();

  // Find the dialog container to constrain within
  const dialog = triggerElement.closest('[role="dialog"]');
  const dialogRect = dialog?.getBoundingClientRect();

  // Use dialog bounds if available, otherwise window bounds
  const topBound = dialogRect ? dialogRect.top + margin : margin;
  const bottomBound = dialogRect ? dialogRect.bottom - margin : window.innerHeight - margin;
  const leftBound = dialogRect ? dialogRect.left + margin : margin;
  const rightBound = dialogRect ? dialogRect.right - margin : window.innerWidth - margin;

  // Calculate horizontal position - use at least minWidth or input width
  let left = rect.left;
  let width = Math.max(rect.width, minWidth);

  // Ensure it doesn't go past horizontal bounds
  if (left + width > rightBound) {
    // Try shifting left first
    left = rightBound - width;
  }
  if (left < leftBound) {
    left = leftBound;
    // Constrain width if still too wide
    width = Math.min(width, rightBound - leftBound);
  }

  // Calculate available space in both directions
  const spaceBelow = bottomBound - rect.bottom - gap;
  const spaceAbove = rect.top - topBound - gap;

  // Choose direction with more space
  let top: number;
  let maxHeight: number;

  if (spaceBelow >= spaceAbove || spaceBelow >= minHeight) {
    // Position below input (preferred if equal or enough space)
    top = rect.bottom + gap;
    maxHeight = Math.max(spaceBelow, minHeight);
  } else {
    // Position above input
    maxHeight = Math.max(spaceAbove, minHeight);
    top = rect.top - gap - Math.min(maxHeight, spaceAbove);
  }

  return {
    position: "fixed",
    top: `${top}px`,
    left: `${left}px`,
    width: `${width}px`,
    maxHeight: `${maxHeight}px`,
  };
}

/**
 * Utility function to calculate dropdown position within dialog/window bounds.
 * Can be used standalone without the hook.
 */
export function calculateDropdownPosition(
  triggerElement: HTMLElement,
  options: DropdownPositionOptions = {}
): React.CSSProperties {
  return calculatePosition(triggerElement, { ...DEFAULT_OPTIONS, ...options });
}

/**
 * Hook for calculating dropdown position within dialog/window bounds.
 * Ensures dropdown stays within bounds and close to the trigger element.
 * Returns dynamic maxHeight based on available space.
 */
export function useDropdownPosition(
  options: DropdownPositionOptions = {}
): UseDropdownPositionReturn {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutsideContainer = containerRef.current && !containerRef.current.contains(target);
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);

      if (isOutsideContainer && isOutsideDropdown) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Calculate dropdown position when opening
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    setDropdownStyle(calculatePosition(containerRef.current, mergedOptions));
  }, [isOpen, mergedOptions.minHeight, mergedOptions.minWidth, mergedOptions.margin, mergedOptions.gap]);

  return {
    isOpen,
    open,
    close,
    toggle,
    containerRef,
    dropdownRef,
    dropdownStyle,
  };
}
