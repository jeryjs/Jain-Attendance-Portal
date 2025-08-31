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

  const handleDateSelect = (selected: Date | Date[] | DateRange | undefined) => {
    onDateChange?.(selected);
    setIsOpen(false);
  };

  const getDisplayValue = () => {
    if (!date) return "";
    if (mode === "single") return format(date as Date, "PPP");
    if (mode === "multiple") return `${(date as Date[]).length} dates selected`;
    if (mode === "range") {
      const range = date as DateRange;
      return `${range.from ? format(range.from, "PPP") : ""} - ${range.to ? format(range.to, "PPP") : "Select end date"}`;
    }
    return "";
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-datepicker]')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

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
            <DayPicker
              mode="range"
              navLayout="around"
              showOutsideDays={false}
              className={cn("p-3", className)}
              selected={date as DateRange}
              onSelect={(selected) => handleDateSelect(selected)}
              disabled={disabledDates || ((date) => date < new Date('2025-08-24') || date > new Date())}
              required={false}
            />
          )}
        </div>
      )}
    </div>
  );
}