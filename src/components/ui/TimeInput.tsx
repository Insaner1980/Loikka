import { useRef, useState, useEffect } from "react";

interface TimeInputProps {
  value: number | null; // Value in hundredths of seconds (e.g., 8345 = 1:23.45)
  onChange: (value: number | null) => void;
  showMinutes?: boolean;
  error?: boolean;
  disabled?: boolean;
  id?: string;
}

export function TimeInput({
  value,
  onChange,
  showMinutes = true,
  error = false,
  disabled = false,
  id,
}: TimeInputProps) {
  const minutesRef = useRef<HTMLInputElement>(null);
  const secondsRef = useRef<HTMLInputElement>(null);
  const hundredthsRef = useRef<HTMLInputElement>(null);

  // Track which field is being edited
  const [editingField, setEditingField] = useState<"minutes" | "seconds" | "hundredths" | null>(null);

  // Local input values (what user is typing)
  const [localMinutes, setLocalMinutes] = useState("");
  const [localSeconds, setLocalSeconds] = useState("");
  const [localHundredths, setLocalHundredths] = useState("");

  // Parse value into minutes, seconds, hundredths (for display when not editing)
  const parseValue = (val: number | null) => {
    if (val === null) return { minutes: "", seconds: "", hundredths: "" };

    const totalSeconds = Math.floor(val / 100);
    const hundredths = val % 100;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return {
      minutes: showMinutes ? (minutes > 0 ? minutes.toString() : "") : "",
      seconds: seconds.toString(),
      hundredths: hundredths > 0 ? hundredths.toString().padStart(2, "0") : "",
    };
  };

  const parsed = parseValue(value);

  // Sync local state with prop value when not editing
  useEffect(() => {
    if (editingField !== "minutes") setLocalMinutes(parsed.minutes);
    if (editingField !== "seconds") setLocalSeconds(parsed.seconds);
    if (editingField !== "hundredths") setLocalHundredths(parsed.hundredths);
  }, [value, editingField, parsed.minutes, parsed.seconds, parsed.hundredths]);

  // Display values: use local state when editing, otherwise use parsed
  const minutes = editingField === "minutes" ? localMinutes : parsed.minutes;
  const seconds = editingField === "seconds" ? localSeconds : parsed.seconds;
  const hundredths = editingField === "hundredths" ? localHundredths : parsed.hundredths;

  // Combine values into hundredths of seconds
  // When finalizing (on blur), pad hundredths; during editing, use raw value
  const combineValues = (min: string, sec: string, hund: string, finalize: boolean = false) => {
    const minVal = min ? parseInt(min, 10) : 0;
    const secVal = sec ? parseInt(sec, 10) : 0;
    // Only pad hundredths when finalizing (blur) - during typing, treat as-is
    const hundVal = hund
      ? parseInt(finalize ? hund.padEnd(2, "0").slice(0, 2) : hund, 10)
      : 0;

    if (isNaN(minVal) || isNaN(secVal) || isNaN(hundVal)) return null;
    if (!sec && !hund && !min) return null;

    const totalHundredths = (minVal * 60 + secVal) * 100 + hundVal;
    return totalHundredths;
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 2);
    setLocalMinutes(val);
    // Update parent with current values (don't finalize hundredths yet)
    const newValue = combineValues(val, localSeconds, localHundredths, false);
    onChange(newValue);
  };

  const handleSecondsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    const maxLength = showMinutes ? 2 : 3;

    // Allow up to 3 digits for seconds without minutes (e.g., 123 seconds)
    // Or up to 2 digits with minutes (max 59)
    if (showMinutes) {
      // Limit to 59 seconds when minutes are shown
      if (parseInt(val, 10) > 59) {
        val = "59";
      }
    }
    val = val.slice(0, maxLength);

    setLocalSeconds(val);
    const newValue = combineValues(localMinutes, val, localHundredths, false);
    onChange(newValue);
  };

  const handleHundredthsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 2);
    setLocalHundredths(val);
    // Don't pad during typing - user might want to type "26"
    const newValue = combineValues(localMinutes, localSeconds, val, false);
    onChange(newValue);
  };

  // Handle focus - track which field is being edited
  const handleFocus = (field: "minutes" | "seconds" | "hundredths") => {
    setEditingField(field);
  };

  // Handle blur - finalize value with proper padding
  const handleBlur = () => {
    setEditingField(null);
    // Finalize with padding
    const newValue = combineValues(localMinutes, localSeconds, localHundredths, true);
    onChange(newValue);
  };

  // Handle backspace to go to previous field
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    field: "minutes" | "seconds" | "hundredths"
  ) => {
    if (e.key === "Backspace" && e.currentTarget.value === "") {
      e.preventDefault();
      if (field === "hundredths") {
        secondsRef.current?.focus();
      } else if (field === "seconds" && showMinutes) {
        minutesRef.current?.focus();
      }
    }
    // Handle Tab and arrow keys for navigation
    if (e.key === "ArrowRight" && e.currentTarget.selectionStart === e.currentTarget.value.length) {
      e.preventDefault();
      if (field === "minutes") secondsRef.current?.focus();
      else if (field === "seconds") hundredthsRef.current?.focus();
    }
    if (e.key === "ArrowLeft" && e.currentTarget.selectionStart === 0) {
      e.preventDefault();
      if (field === "hundredths") secondsRef.current?.focus();
      else if (field === "seconds" && showMinutes) minutesRef.current?.focus();
    }
  };

  const inputClassName = `w-full text-center bg-background border rounded-lg input-focus ${
    error ? "border-error" : "border-border"
  } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`;

  return (
    <div className="flex items-center gap-1" id={id}>
      {showMinutes && (
        <>
          <div className="flex flex-col items-center">
            <input
              ref={minutesRef}
              type="text"
              inputMode="numeric"
              value={minutes}
              onChange={handleMinutesChange}
              onKeyDown={(e) => handleKeyDown(e, "minutes")}
              onFocus={() => handleFocus("minutes")}
              onBlur={handleBlur}
              placeholder="0"
              disabled={disabled}
              className={`${inputClassName} w-12 px-2 py-2`}
              aria-label="Minuutit"
            />
            <span className="text-xs text-muted-foreground mt-1">min</span>
          </div>
          <span className="text-lg font-medium text-muted-foreground pb-5">:</span>
        </>
      )}
      <div className="flex flex-col items-center">
        <input
          ref={secondsRef}
          type="text"
          inputMode="numeric"
          value={seconds}
          onChange={handleSecondsChange}
          onKeyDown={(e) => handleKeyDown(e, "seconds")}
          onFocus={() => handleFocus("seconds")}
          onBlur={handleBlur}
          placeholder="0"
          disabled={disabled}
          className={`${inputClassName} ${showMinutes ? "w-12" : "w-16"} px-2 py-2`}
          aria-label="Sekunnit"
        />
        <span className="text-xs text-muted-foreground mt-1">s</span>
      </div>
      <span className="text-lg font-medium text-muted-foreground pb-5">.</span>
      <div className="flex flex-col items-center">
        <input
          ref={hundredthsRef}
          type="text"
          inputMode="numeric"
          value={hundredths}
          onChange={handleHundredthsChange}
          onKeyDown={(e) => handleKeyDown(e, "hundredths")}
          onFocus={() => handleFocus("hundredths")}
          onBlur={handleBlur}
          placeholder="00"
          disabled={disabled}
          className={`${inputClassName} w-12 px-2 py-2`}
          aria-label="Sadasosat"
        />
        <span className="text-xs text-muted-foreground mt-1">1/100</span>
      </div>
    </div>
  );
}
