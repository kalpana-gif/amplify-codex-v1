import { format, formatDistanceToNow, isWithinInterval, parseISO } from "date-fns";

export const formatDate = (value: string, pattern: string = "MMM d, yyyy") =>
  format(parseISO(value), pattern);

export const formatRelativeDate = (value: string) =>
  formatDistanceToNow(parseISO(value), { addSuffix: true });

export const isDateInRange = (
  value: string,
  startDate?: string,
  endDate?: string,
) => {
  if (!startDate && !endDate) {
    return true;
  }

  const date = parseISO(value);

  return isWithinInterval(date, {
    start: startDate ? parseISO(startDate) : new Date(0),
    end: endDate ? parseISO(endDate) : new Date(8640000000000000),
  });
};
