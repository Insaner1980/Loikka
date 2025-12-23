import { useState, useRef, useEffect, useCallback } from "react";

interface UseAutocompleteOptions {
  /** Minimum characters before showing suggestions */
  minChars?: number;
  /** Case-insensitive matching */
  caseInsensitive?: boolean;
}

interface UseAutocompleteReturn {
  /** Current input value */
  value: string;
  /** Set input value */
  setValue: (value: string) => void;
  /** Whether suggestions dropdown is visible */
  showSuggestions: boolean;
  /** Filtered suggestions based on current input */
  filteredSuggestions: string[];
  /** Ref for input element */
  inputRef: React.RefObject<HTMLInputElement | null>;
  /** Ref for suggestions dropdown */
  suggestionsRef: React.RefObject<HTMLDivElement | null>;
  /** Handle input change - updates value and filters suggestions */
  handleChange: (newValue: string) => void;
  /** Handle suggestion click - sets value and closes dropdown */
  handleSuggestionClick: (suggestion: string) => void;
  /** Handle input focus - shows suggestions if applicable */
  handleFocus: () => void;
  /** Close suggestions dropdown */
  closeSuggestions: () => void;
}

/**
 * Generic autocomplete hook that handles:
 * - Filtering suggestions based on input
 * - Click outside detection to close dropdown
 * - Refs for input and suggestions elements
 */
export function useAutocomplete(
  suggestions: string[],
  options: UseAutocompleteOptions = {}
): UseAutocompleteReturn {
  const { minChars = 1, caseInsensitive = true } = options;

  const [value, setValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on current value
  const filterSuggestions = useCallback(
    (inputValue: string) => {
      if (inputValue.trim().length < minChars) {
        return [];
      }

      const searchValue = caseInsensitive
        ? inputValue.toLowerCase()
        : inputValue;

      return suggestions.filter((s) => {
        const suggestionValue = caseInsensitive ? s.toLowerCase() : s;
        return suggestionValue.includes(searchValue);
      });
    },
    [suggestions, minChars, caseInsensitive]
  );

  // Handle input change
  const handleChange = useCallback(
    (newValue: string) => {
      setValue(newValue);

      const filtered = filterSuggestions(newValue);
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0 && newValue.trim().length >= minChars);
    },
    [filterSuggestions, minChars]
  );

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: string) => {
    setValue(suggestion);
    setFilteredSuggestions([]);
    setShowSuggestions(false);
  }, []);

  // Handle focus
  const handleFocus = useCallback(() => {
    if (value.trim().length >= minChars && filteredSuggestions.length > 0) {
      setShowSuggestions(true);
    }
  }, [value, minChars, filteredSuggestions.length]);

  // Close suggestions
  const closeSuggestions = useCallback(() => {
    setShowSuggestions(false);
  }, []);

  // Click outside detection
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return {
    value,
    setValue,
    showSuggestions,
    filteredSuggestions,
    inputRef,
    suggestionsRef,
    handleChange,
    handleSuggestionClick,
    handleFocus,
    closeSuggestions,
  };
}
