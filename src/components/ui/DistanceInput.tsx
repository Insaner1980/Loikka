import { useRef, useState } from "react";

interface DistanceInputProps {
  value: number | null; // Value in centimeters (e.g., 550 = 5.50m)
  onChange: (value: number | null) => void;
  error?: boolean;
  disabled?: boolean;
  id?: string;
  centimetersOnly?: boolean; // For jump disciplines - show only cm input
}

export function DistanceInput({
  value,
  onChange,
  error = false,
  disabled = false,
  id,
  centimetersOnly = false,
}: DistanceInputProps) {
  const metersRef = useRef<HTMLInputElement>(null);
  const centimetersRef = useRef<HTMLInputElement>(null);

  // Track if centimeters field is being edited
  const [cmEditing, setCmEditing] = useState(false);
  const [cmEditValue, setCmEditValue] = useState("");

  // Parse value into meters and centimeters
  const parseValue = (val: number | null) => {
    if (val === null) return { meters: "", centimeters: "" };

    const meters = Math.floor(val / 100);
    const centimeters = val % 100;

    return {
      meters: meters.toString(),
      centimeters: centimeters.toString().padStart(2, "0"),
    };
  };

  const parsed = parseValue(value);
  const meters = parsed.meters;
  // Use edit value while editing, otherwise show parsed value
  const centimeters = cmEditing ? cmEditValue : parsed.centimeters;

  // Combine values into centimeters
  const combineValues = (m: string, cm: string) => {
    const mVal = m ? parseInt(m, 10) : 0;
    // Pad or trim centimeters to 2 digits
    const cmVal = cm ? parseInt(cm.padEnd(2, "0").slice(0, 2), 10) : 0;

    if (isNaN(mVal) || isNaN(cmVal)) return null;
    if (!m && !cm) return null;

    return mVal * 100 + cmVal;
  };

  const handleMetersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 2); // Max 99 meters
    const newValue = combineValues(val, cmEditing ? cmEditValue : parsed.centimeters);
    onChange(newValue);

    // Auto-advance to centimeters only when 2 digits are entered (max 99m)
    if (val.length >= 2) {
      setTimeout(() => {
        centimetersRef.current?.focus();
        // Pre-set editing state for smooth transition
        setCmEditing(true);
        setCmEditValue("");
      }, 0);
    }
  };

  const handleCentimetersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 2);
    setCmEditValue(val);
    const newValue = combineValues(meters, val);
    onChange(newValue);
  };

  const handleCentimetersFocus = () => {
    setCmEditing(true);
    // If current value is "00", start with empty for easier typing
    if (parsed.centimeters === "00") {
      setCmEditValue("");
    } else {
      setCmEditValue(parsed.centimeters);
    }
  };

  const handleCentimetersBlur = () => {
    setCmEditing(false);
  };

  // Handle backspace to go to previous field
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    field: "meters" | "centimeters"
  ) => {
    if (e.key === "Backspace" && e.currentTarget.value === "") {
      e.preventDefault();
      if (field === "centimeters") {
        metersRef.current?.focus();
      }
    }
    // Handle arrow keys for navigation
    if (e.key === "ArrowRight" && e.currentTarget.selectionStart === e.currentTarget.value.length) {
      e.preventDefault();
      if (field === "meters") centimetersRef.current?.focus();
    }
    if (e.key === "ArrowLeft" && e.currentTarget.selectionStart === 0) {
      e.preventDefault();
      if (field === "centimeters") metersRef.current?.focus();
    }
  };

  const inputClassName = `w-full text-center bg-card border rounded-lg input-focus ${
    error ? "border-error" : "border-border"
  } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`;

  // Handle centimeters-only mode for jump disciplines
  const handleCentimetersOnlyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 4); // Max 9999 cm
    if (val === "") {
      onChange(null);
    } else {
      onChange(parseInt(val, 10));
    }
  };

  // Centimeters-only mode for jump disciplines
  if (centimetersOnly) {
    return (
      <div className="flex items-center gap-2" id={id}>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={value !== null ? value.toString() : ""}
          onChange={handleCentimetersOnlyChange}
          placeholder="0"
          disabled={disabled}
          className={`${inputClassName} w-20 px-3 py-2`}
          aria-label="Senttimetrit"
        />
        <span className="text-body text-muted-foreground">cm</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1" id={id}>
      <div className="flex flex-col items-center">
        <input
          ref={metersRef}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={meters}
          onChange={handleMetersChange}
          onKeyDown={(e) => handleKeyDown(e, "meters")}
          placeholder="0"
          disabled={disabled}
          className={`${inputClassName} w-14 px-2 py-2`}
          aria-label="Metrit"
        />
        <span className="text-caption text-muted-foreground mt-1">m</span>
      </div>
      <span className="text-title font-medium text-muted-foreground pb-5">.</span>
      <div className="flex flex-col items-center">
        <input
          ref={centimetersRef}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={centimeters}
          onChange={handleCentimetersChange}
          onFocus={handleCentimetersFocus}
          onBlur={handleCentimetersBlur}
          onKeyDown={(e) => handleKeyDown(e, "centimeters")}
          placeholder="00"
          disabled={disabled}
          className={`${inputClassName} w-14 px-2 py-2`}
          aria-label="Senttimetrit"
        />
        <span className="text-caption text-muted-foreground mt-1">cm</span>
      </div>
    </div>
  );
}
