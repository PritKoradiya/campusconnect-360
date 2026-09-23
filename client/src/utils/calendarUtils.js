/**
 * Calendar utilities for CampusConnect 360 Campus Calendar
 * Handles timezone-resilient date operations, grid calculations, and event categorization.
 */

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SHORT_DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Get date key string formatted as YYYY-MM-DD
 */
export function formatDateKey(year, month, day) {
  const y = String(year);
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parses any date value (ISO string, Date object, or date key) into YYYY-MM-DD string.
 * Resilient against UTC vs local timezone shifts for date-only values.
 */
export function parseDateKey(dateValue) {
  if (!dateValue) return '';

  if (typeof dateValue === 'string') {
    const isoMatch = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }
  }

  try {
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}

/**
 * Get today's date key in YYYY-MM-DD
 */
export function getTodayKey() {
  const now = new Date();
  return formatDateKey(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Format month and year display (e.g., "September 2026")
 */
export function formatMonthTitle(year, month) {
  return `${MONTH_NAMES[month]} ${year}`;
}

/**
 * Format human readable date for display (e.g., "Tuesday, 22 September 2026")
 */
export function formatDisplayDate(dateKey) {
  if (!dateKey) return 'No date selected';
  const parts = dateKey.split('-');
  if (parts.length !== 3) return dateKey;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const d = new Date(year, month, day);
  const dayName = d.toLocaleDateString(undefined, { weekday: 'long' });
  const monthName = MONTH_NAMES[month] || '';

  return `${dayName}, ${day} ${monthName} ${year}`;
}

/**
 * Format short date (e.g. "Sep 22")
 */
export function formatShortDate(dateKey) {
  if (!dateKey) return '';
  const parts = dateKey.split('-');
  if (parts.length !== 3) return dateKey;
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const monthName = MONTH_NAMES[month]?.slice(0, 3) || '';
  return `${monthName} ${day}`;
}

/**
 * Generate 35 or 42 grid cells for Monday-first Month View
 */
export function getMonthGrid(year, month) {
  const todayKey = getTodayKey();

  // First day of month (0 = Sunday, 1 = Monday, ... 6 = Saturday)
  const firstDay = new Date(year, month, 1).getDay();
  // Adjust so Monday is 0:
  // Sunday (0) -> 6, Monday (1) -> 0, etc.
  const startingDayIndex = (firstDay + 6) % 7;

  // Number of days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Number of days in previous month
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const grid = [];

  // Previous month trailing days
  for (let i = startingDayIndex - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const dateKey = formatDateKey(prevYear, prevMonth, day);

    grid.push({
      dateKey,
      dayNumber: day,
      month: prevMonth,
      year: prevYear,
      isCurrentMonth: false,
      isToday: dateKey === todayKey
    });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = formatDateKey(year, month, day);

    grid.push({
      dateKey,
      dayNumber: day,
      month,
      year,
      isCurrentMonth: true,
      isToday: dateKey === todayKey
    });
  }

  // Next month leading days to complete grid (multiples of 7: 35 or 42)
  const totalSlots = grid.length > 35 ? 42 : 35;
  const remaining = totalSlots - grid.length;
  for (let day = 1; day <= remaining; day++) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const dateKey = formatDateKey(nextYear, nextMonth, day);

    grid.push({
      dateKey,
      dayNumber: day,
      month: nextMonth,
      year: nextYear,
      isCurrentMonth: false,
      isToday: dateKey === todayKey
    });
  }

  return grid;
}

/**
 * Get 7 days for the week containing a specific dateKey (Monday to Sunday)
 */
export function getWeekDays(dateKey) {
  const parts = (dateKey || getTodayKey()).split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const current = new Date(year, month, day);
  const dayOfWeek = (current.getDay() + 6) % 7; // Monday = 0

  const monday = new Date(year, month, day - dayOfWeek);
  const weekDays = [];
  const todayKey = getTodayKey();

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const y = d.getFullYear();
    const m = d.getMonth();
    const dt = d.getDate();
    const key = formatDateKey(y, m, dt);

    weekDays.push({
      dateKey: key,
      dayNumber: dt,
      dayName: DAY_NAMES[i],
      shortDayName: SHORT_DAY_NAMES[i],
      month: m,
      year: y,
      isToday: key === todayKey
    });
  }

  return weekDays;
}

/**
 * Determine event category and color styling
 */
export function getEventCategory(item) {
  if (!item) return 'event';

  if (item._isNotice || item.isNotice) {
    if (item.priority === 'Urgent' || item._isDeadline) {
      return 'deadline';
    }
    return 'notice';
  }

  const title = (item.title || '').toLowerCase();
  const desc = (item.description || '').toLowerCase();

  if (title.includes('deadline') || title.includes('due') || desc.includes('submission deadline')) {
    return 'deadline';
  }

  if (title.includes('workshop') || desc.includes('hands-on workshop')) {
    return 'workshop';
  }

  if (title.includes('seminar') || title.includes('webinar') || title.includes('conference') || title.includes('talk')) {
    return 'seminar';
  }

  if (title.includes('hackathon') || title.includes('competition') || title.includes('contest')) {
    return 'important';
  }

  return 'event';
}

/**
 * Category metadata: labels and styling classes
 */
export const CATEGORY_CONFIG = {
  event: {
    label: 'Campus Event',
    badgeClass: 'cal-cat-event',
    dotColor: '#38bdf8' // Cyan/Blue
  },
  workshop: {
    label: 'Workshop',
    badgeClass: 'cal-cat-workshop',
    dotColor: '#22d3ee' // Cyan
  },
  seminar: {
    label: 'Seminar',
    badgeClass: 'cal-cat-seminar',
    dotColor: '#c084fc' // Purple
  },
  notice: {
    label: 'Notice / Expiry',
    badgeClass: 'cal-cat-notice',
    dotColor: '#fbbf24' // Amber/Orange
  },
  deadline: {
    label: 'Deadline',
    badgeClass: 'cal-cat-deadline',
    dotColor: '#f43f5e' // Rose/Red
  },
  important: {
    label: 'Important',
    badgeClass: 'cal-cat-important',
    dotColor: '#fb923c' // Orange
  }
};

/**
 * Group events by dateKey: { "2026-09-22": [event1, event2] }
 */
export function groupEventsByDate(eventsList) {
  const map = {};

  if (!Array.isArray(eventsList)) return map;

  eventsList.forEach((item) => {
    const rawDate = item.eventDate || item.date || item.expiryDate;
    const dateKey = parseDateKey(rawDate);
    if (!dateKey) return;

    if (!map[dateKey]) {
      map[dateKey] = [];
    }
    map[dateKey].push(item);
  });

  // Sort events within each date by time
  Object.keys(map).forEach((dateKey) => {
    map[dateKey].sort((a, b) => {
      const timeA = (a.eventTime || a.time || '00:00').toLowerCase();
      const timeB = (b.eventTime || b.time || '00:00').toLowerCase();
      return timeA.localeCompare(timeB);
    });
  });

  return map;
}

/**
 * Check if a dateKey is upcoming (today or future)
 */
export function isDateUpcoming(dateKey) {
  if (!dateKey) return false;
  const todayKey = getTodayKey();
  return dateKey >= todayKey;
}
