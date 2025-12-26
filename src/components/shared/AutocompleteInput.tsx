import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAutocomplete, calculateDropdownPosition } from "../../hooks";

interface AutocompleteInputProps {
  /** Input id for accessibility */
  id: string;
  /** Current value */
  value: string;
  /** Value change handler */
  onChange: (value: string) => void;
  /** Available suggestions */
  suggestions: string[];
  /** Placeholder text */
  placeholder?: string;
  /** Label text */
  label?: string;
  /** Whether field is required */
  required?: boolean;
  /** Error message to display */
  error?: string;
  /** Additional class names for input */
  className?: string;
  /** Disable autocomplete */
  disabled?: boolean;
}

export function AutocompleteInput({
  id,
  value,
  onChange,
  suggestions,
  placeholder,
  label,
  required = false,
  error,
  className = "",
  disabled = false,
}: AutocompleteInputProps) {
  const {
    showSuggestions,
    filteredSuggestions,
    inputRef,
    suggestionsRef,
    handleChange,
    handleSuggestionClick,
    handleFocus,
  } = useAutocomplete(suggestions);

  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Calculate dropdown position when showing suggestions
  useEffect(() => {
    if (showSuggestions && inputRef.current) {
      setDropdownStyle(calculateDropdownPosition(inputRef.current));
    }
  }, [showSuggestions, inputRef]);

  // Sync external value with internal hook
  const handleInputChange = (newValue: string) => {
    handleChange(newValue);
    onChange(newValue);
  };

  const handleSuggestionSelect = (suggestion: string) => {
    handleSuggestionClick(suggestion);
    onChange(suggestion);
  };

  return (
    <div className="relative">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium mb-1.5">
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}
      <input
        ref={inputRef}
        type="text"
        id={id}
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={handleFocus}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
        className={`w-full px-3 py-2 bg-background border rounded-lg input-focus ${
          error ? "border-error" : "border-border"
        } ${disabled ? "opacity-60" : ""} ${className}`}
      />
      {/* Autocomplete suggestions dropdown - rendered as portal */}
      {showSuggestions && filteredSuggestions.length > 0 && createPortal(
        <div
          ref={suggestionsRef}
          style={dropdownStyle}
          className="dropdown-menu"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSuggestionSelect(suggestion)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors cursor-pointer"
            >
              {suggestion}
            </button>
          ))}
        </div>,
        document.body
      )}
      {error && <p className="mt-1 text-sm text-error">{error}</p>}
    </div>
  );
}
