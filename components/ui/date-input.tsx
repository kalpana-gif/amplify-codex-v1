import * as React from "react";
import {
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
} from "date-fns";
import { DayPicker, type Matcher } from "@daypicker/react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

type DateInputProps = {
  className?: string;
  disabled?: boolean;
  max?: string;
  min?: string;
  name?: string;
  onBlur?: () => void;
  onChange?: (value: string) => void;
  placeholder?: string;
  value?: string;
};

const parseDateValue = (value?: string) => {
  if (!value) {
    return null;
  }

  const parsed = parseISO(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export function DateInput({
  className,
  disabled = false,
  max,
  min,
  name,
  onBlur,
  onChange,
  placeholder = "Select date",
  value,
}: DateInputProps) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const selectedDate = React.useMemo(() => parseDateValue(value), [value]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [visibleMonth, setVisibleMonth] = React.useState<Date>(
    selectedDate ? startOfMonth(selectedDate) : startOfMonth(new Date()),
  );

  React.useEffect(() => {
    if (selectedDate) {
      const nextMonth = startOfMonth(selectedDate);

      setVisibleMonth((current) =>
        isSameMonth(current, nextMonth) ? current : nextMonth,
      );
    }
  }, [selectedDate]);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        onBlur?.();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        onBlur?.();
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onBlur]);

  const minDate = React.useMemo(() => parseDateValue(min), [min]);
  const maxDate = React.useMemo(() => parseDateValue(max), [max]);
  const disabledMatchers = React.useMemo<Matcher[]>(
    () => {
      const matchers: Matcher[] = [];

      if (minDate) {
        matchers.push({ before: minDate });
      }

      if (maxDate) {
        matchers.push({ after: maxDate });
      }

      return matchers;
    },
    [maxDate, minDate],
  );

  const commitValue = (nextDate: Date) => {
    onChange?.(format(nextDate, "yyyy-MM-dd"));
    onBlur?.();
    setIsOpen(false);
  };

  const clearValue = () => {
    onChange?.("");
    onBlur?.();
    setIsOpen(false);
  };

  const pickToday = () => {
    const today = new Date();
    setVisibleMonth(startOfMonth(today));
    commitValue(today);
  };

  return (
    <div className={cn("relative", className)} ref={rootRef}>
      <input name={name} readOnly type="hidden" value={value ?? ""} />

      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={cn(
          "flex h-12 w-full items-center justify-between rounded-[1rem] border border-slate-200 bg-white px-3 text-left text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-accent)_20%,transparent)] hover:border-slate-300 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400",
          isOpen &&
            "border-[var(--color-accent)] ring-2 ring-[color-mix(in_srgb,var(--color-accent)_20%,transparent)]",
        )}
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            if (selectedDate) {
              setVisibleMonth(startOfMonth(selectedDate));
            }
            setIsOpen((current) => !current);
          }
        }}
        type="button"
      >
        <span
          className={cn(
            "truncate",
            selectedDate ? "text-slate-900" : "text-slate-400",
          )}
        >
          {selectedDate ? format(selectedDate, "EEEE, MMM d, yyyy") : placeholder}
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700">
          <CalendarDays className="h-4 w-4" />
        </span>
      </button>

      {isOpen ? (
        <div className="date-popover absolute left-0 top-[calc(100%+0.6rem)] z-[100] min-w-[19rem] rounded-[1.25rem] border border-slate-200 bg-white p-3 shadow-[0_20px_50px_rgba(15,23,42,0.16)]">
          <DayPicker
            disabled={disabledMatchers}
            fixedWeeks
            mode="single"
            month={visibleMonth}
            onMonthChange={setVisibleMonth}
            onSelect={(nextDate) => {
              if (nextDate) {
                commitValue(nextDate);
              }
            }}
            selected={selectedDate ?? undefined}
            showOutsideDays
          />

          <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
            <button
              className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
              onClick={clearValue}
              type="button"
            >
              Clear
            </button>
            <button
              className="text-sm font-medium text-[var(--color-primary)] transition hover:opacity-80"
              onClick={pickToday}
              type="button"
            >
              Today
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
