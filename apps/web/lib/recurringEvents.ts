export type RecurrencePattern = "weekly" | "bi-weekly" | "monthly" | "3-months";
export type EndDateOption = "no-end" | "after-count" | "by-date";

export interface RecurringEventConfig {
  isRecurring: boolean;
  pattern?: RecurrencePattern;
  endOption?: EndDateOption;
  endCount?: number;
  endDate?: string;
}

/**
 * Generate array of dates for recurring event based on pattern and end conditions.
 * Returns array of yyyy-mm-dd strings.
 */
export function generateRecurrenceDates(
  startDate: string, // yyyy-mm-dd
  pattern: RecurrencePattern,
  endOption: EndDateOption,
  endCount?: number,
  endDate?: string
): string[] {
  const dates: string[] = [];
  let current = new Date(startDate + "T00:00:00Z");
  
  const daysToAdd: Record<RecurrencePattern, number | null> = {
    "weekly": 7,
    "bi-weekly": 14,
    "monthly": null,
    "3-months": null,
  };
  
  let count = 0;
  const limit = 366;
  
  while (count < limit) {
    // Format date as yyyy-mm-dd (UTC)
    const year = current.getUTCFullYear();
    const month = String(current.getUTCMonth() + 1).padStart(2, "0");
    const day = String(current.getUTCDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;
    
    dates.push(dateStr);
    count++;
    
    // Check end conditions
    if (endOption === "after-count" && count >= (endCount || 1)) {
      break;
    }
    if (endOption === "by-date" && dateStr >= (endDate || "9999-12-31")) {
      break;
    }
    
    // Calculate next date
    if (pattern === "monthly") {
      current.setUTCMonth(current.getUTCMonth() + 1);
    } else if (pattern === "3-months") {
      current.setUTCMonth(current.getUTCMonth() + 3);
    } else if (daysToAdd[pattern] !== null) {
      current.setUTCDate(current.getUTCDate() + daysToAdd[pattern]!);
    }
  }
  
  return dates;
}

/**
 * Get human-readable preview of recurrence pattern.
 */
export function getRecurrencePreview(
  pattern: RecurrencePattern,
  endOption: EndDateOption,
  endCount?: number,
  endDate?: string,
  startDate?: string
): string {
  const patterns: Record<RecurrencePattern, string> = {
    "weekly": "Every week",
    "bi-weekly": "Every 2 weeks",
    "monthly": "Every month",
    "3-months": "Every 3 months",
  };
  
  let preview = patterns[pattern];
  
  if (endOption === "after-count") {
    preview += ` for ${endCount || 1} occurrence${(endCount || 1) > 1 ? "s" : ""}`;
  } else if (endOption === "by-date" && endDate && startDate) {
    try {
      const dates = generateRecurrenceDates(startDate, pattern, endOption, undefined, endDate);
      preview += ` through ${endDate} (${dates.length} total)`;
    } catch {
      preview += ` through ${endDate}`;
    }
  } else {
    preview += " (no end date)";
  }
  
  return preview;
}
