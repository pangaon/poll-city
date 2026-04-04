"use client";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui";
import { useDebounce } from "@/lib/hooks/useDebounce";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
}

interface ContactAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (contact: Contact) => void;
  campaignId: string;
  placeholder?: string;
  className?: string;
}

export function ContactAutocomplete({
  value,
  onChange,
  onSelect,
  campaignId,
  placeholder = "Search contacts...",
  className,
}: ContactAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const debouncedValue = useDebounce(value, 300);

  useEffect(() => {
    if (debouncedValue.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/contacts?campaignId=${campaignId}&search=${encodeURIComponent(debouncedValue)}&limit=10`
        );
        const data = await res.json();
        setSuggestions(data.data || []);
        setShowSuggestions(true);
      } catch (error) {
        console.error("Failed to fetch contact suggestions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedValue, campaignId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSelect = (contact: Contact) => {
    onSelect(contact);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setSelectedIndex(-1);
  };

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    // Delay hiding to allow click on suggestions
    setTimeout(() => setShowSuggestions(false), 150);
  };

  return (
    <div className={`relative ${className}`}>
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="w-full"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      )}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((contact, index) => (
            <div
              key={contact.id}
              className={`px-4 py-2 cursor-pointer hover:bg-gray-50 ${
                index === selectedIndex ? "bg-blue-50" : ""
              }`}
              onClick={() => handleSelect(contact)}
            >
              <div className="font-medium">
                {contact.firstName} {contact.lastName}
              </div>
              {contact.email && (
                <div className="text-sm text-gray-500">{contact.email}</div>
              )}
              {contact.phone && (
                <div className="text-sm text-gray-500">{contact.phone}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}