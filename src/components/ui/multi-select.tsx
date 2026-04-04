"use client";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";
import { Button, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

interface MultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  value,
  onChange,
  options,
  placeholder = "Select options...",
  className,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  const handleRemove = (optionValue: string) => {
    onChange(value.filter(v => v !== optionValue));
  };

  const selectedLabels = options
    .filter(option => value.includes(option.value))
    .map(option => option.label);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between"
      >
        <div className="flex flex-wrap gap-1 flex-1 min-w-0">
          {selectedLabels.length > 0 ? (
            selectedLabels.map(label => (
              <Badge key={label} variant="default" className="text-xs">
                {label}
              </Badge>
            ))
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
        </div>
        <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0" />
      </Button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {options.map(option => {
            const isSelected = value.includes(option.value);
            return (
              <div
                key={option.value}
                className={cn(
                  "px-4 py-2 cursor-pointer hover:bg-gray-50 flex items-center justify-between",
                  isSelected && "bg-blue-50"
                )}
                onClick={() => handleToggle(option.value)}
              >
                <span>{option.label}</span>
                {isSelected && <div className="w-2 h-2 bg-blue-600 rounded-full"></div>}
              </div>
            );
          })}
        </div>
      )}

      {selectedLabels.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedLabels.map(label => {
            const option = options.find(o => o.label === label);
            return (
              <Badge key={label} variant="default" className="text-xs">
                {label}
                <button
                  type="button"
                  onClick={() => handleRemove(option!.value)}
                  className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}