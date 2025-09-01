import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import * as React from "react";
import { DayPicker, Mode, DateRange } from "react-day-picker";
import "react-day-picker/style.css";

interface DatePickerProps {
  date?: Date | Date[] | DateRange;
  onDateChange?: (date: Date | Date[] | DateRange | undefined) => void;
  mode?: Mode;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  disabledDates?: (date: Date) => boolean;
}

export function DatePicker({
  date,
  onDateChange,
  mode = "single",
  placeholder = "Pick a date",
  disabled = false,
  className,
  disabledDates,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [tempRange, setTempRange] = React.useState<DateRange | undefined>(
    mode === "range" ? (date as DateRange) : undefined
  );

  const handleDateSelect = (selected: Date | Date[] | DateRange | undefined) => {
    if (mode === "range") {
      const newRange = selected as DateRange;
      if (!newRange) {
        setTempRange(undefined);
        return;
      }

      // Smart range selection logic
      if (!tempRange?.from || !tempRange?.to) {
        // First selection or incomplete range
        setTempRange(newRange);
      } else {
        // Complete range exists, determine intent
        const clickedDate = newRange.to || newRange.from;
        if (!clickedDate) return;

        const currentStart = tempRange.from;
        const currentEnd = tempRange.to;

        if (clickedDate < currentStart!) {
          // Clicked before start, update start date
          setTempRange({ from: clickedDate, to: currentEnd });
        } else if (clickedDate > currentEnd!) {
          // Clicked after end, update end date
          setTempRange({ from: currentStart, to: clickedDate });
        } else {
          // Clicked within range, start new selection
          setTempRange({ from: clickedDate, to: undefined });
        }
      }
    } else {
      // Non-range modes work as before
      onDateChange?.(selected);
      setIsOpen(false);
    }
  };

  // Handle closing and committing the range
  const handleClose = () => {
    setIsOpen(false);
    if (mode === "range" && tempRange) {
      onDateChange?.(tempRange);
    }
  };

  const getDisplayValue = () => {
    if (!date && mode !== "range") return "";
    if (mode === "single") return format(date as Date, "PPP");
    if (mode === "multiple") return `${(date as Date[]).length} dates selected`;
    if (mode === "range") {
      const displayRange = tempRange || (date as DateRange);
      if (!displayRange) return "";
      return `${displayRange.from ? format(displayRange.from, "PPP") : ""} - ${displayRange.to ? format(displayRange.to, "PPP") : "Select end date"}`;
    }
    return "";
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-datepicker]')) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, mode, tempRange]);

  // Sync tempRange with date prop when it changes externally
  React.useEffect(() => {
    if (mode === "range") {
      setTempRange(date as DateRange);
    }
  }, [date, mode]);

  return (
    <div className="relative" data-datepicker>
      <div className="relative">
        <input
          type="text"
          readOnly
          value={getDisplayValue()}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "flex h-10 w-full rounded-md border border-cyber-gray-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-cyber-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-yellow focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-10",
            isOpen && "ring-2 ring-cyber-yellow ring-offset-2 border-cyber-yellow",
            className
          )}
          // Prevent text selection on focus
          onFocus={(e) => { e.target.blur() }}
          onClick={() => setIsOpen(!isOpen)}
        />
        <CalendarIcon
          className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyber-gray-500 cursor-pointer hover:text-cyber-yellow transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 bg-white border border-cyber-gray-200 rounded-lg shadow-xl min-w-[280px] sm:min-w-[320px]">
          {mode === "single" && (
            <DayPicker
              mode="single"
              navLayout="around"
              showOutsideDays={false}
              className={cn("p-3", className)}
              selected={date as Date | undefined}
              onSelect={(selected) => handleDateSelect(selected)}
              disabled={disabledDates || ((date) => date < new Date('2025-08-24') || date > new Date())}
              required={false}
            />
          )}
          {mode === "multiple" && (
            <DayPicker
              mode="multiple"
              navLayout="around"
              showOutsideDays={false}
              className={cn("p-3", className)}
              selected={date as Date[]}
              onSelect={(selected) => handleDateSelect(selected)}
              disabled={disabledDates || ((date) => date < new Date('2025-08-24') || date > new Date())}
              required={false}
            />
          )}
          {mode === "range" && (
            <div>
              <DayPicker
                mode="range"
                navLayout="around"
                showOutsideDays={false}
                className={cn("p-3", className)}
                selected={tempRange}
                onSelect={(selected) => handleDateSelect(selected)}
                disabled={disabledDates || ((date) => date < new Date('2025-08-24') || date > new Date())}
                required={false}
              />
              <div className="border-t border-cyber-gray-200 p-3 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setTempRange(undefined);
                    onDateChange?.(undefined);
                    setIsOpen(false);
                  }}
                  className="px-3 py-1 text-sm text-cyber-gray-600 hover:text-cyber-gray-900 transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={handleClose}
                  disabled={!tempRange?.from || !tempRange?.to}
                  className="px-3 py-1 text-sm bg-cyber-yellow text-cyber-gray-900 rounded hover:bg-cyber-yellow-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}