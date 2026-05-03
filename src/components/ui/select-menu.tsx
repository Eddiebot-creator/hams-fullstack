import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/src/lib/utils";

export type SelectMenuOption = {
  value: string;
  label: string;
  description?: string;
};

export function SelectMenu({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: string;
  options: SelectMenuOption[];
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div ref={rootRef} className={cn("relative min-w-56", className)}>
      {label && <p className="mb-1 text-xs font-bold uppercase tracking-wide text-neutral-500">{label}</p>}
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-3 rounded-xl border bg-white px-4 text-left shadow-sm transition-all",
          isOpen
            ? "border-indigo-300 ring-4 ring-indigo-500/15"
            : "border-neutral-200 hover:border-indigo-200 hover:bg-indigo-50/40 hover:shadow-md"
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>
          <span className="block text-sm font-bold text-neutral-900">{selected?.label}</span>
          {selected?.description && <span className="block text-xs text-neutral-500">{selected.description}</span>}
        </span>
        <span className={cn("rounded-lg bg-indigo-50 p-1 text-indigo-600 transition-transform", isOpen && "rotate-180")}>
          <ChevronDown className="h-4 w-4" />
        </span>
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute right-0 z-40 mt-2 w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-2xl shadow-neutral-900/12"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                  isSelected ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" : "text-neutral-700 hover:bg-neutral-100"
                )}
              >
                <span>
                  <span className="block text-sm font-bold">{option.label}</span>
                  {option.description && <span className={cn("block text-xs", isSelected ? "text-indigo-100" : "text-neutral-500")}>{option.description}</span>}
                </span>
                {isSelected && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
