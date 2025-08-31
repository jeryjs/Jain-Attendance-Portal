import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import * as React from "react";

interface DatePickerProps {
  date?: Date;
  onDateChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  disabledDates?: (date: Date) => boolean;
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Pick a date",
  disabled = false,
  className,
  disabledDates,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    onDateChange?.(selectedDate);
    setIsOpen(false);
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
          value={date ? format(date, "PPP") : ""}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "flex h-10 w-full rounded-md border border-cyber-gray-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-cyber-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-yellow focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-10",
            className
          )}
          onClick={() => setIsOpen(!isOpen)}
        />
        <CalendarIcon
          className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyber-gray-500 cursor-pointer hover:text-cyber-yellow transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 bg-white border border-cyber-gray-200 rounded-lg shadow-xl min-w-[280px] sm:min-w-[320px]">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            initialFocus
            disabled={disabledDates || ((date) => {
              const today = new Date();
              const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
              const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
              return date < twoWeeksAgo || date > tomorrow || date.getDay() === 0;
            })}
          />
        </div>
      )}
    </div>
  );
}