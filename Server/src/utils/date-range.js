/**
 * Date Range & Period Resolution Utility for Analytics
 * Calculates current and previous comparison periods with ISO YYYY-MM-DD strings.
 */
export function resolveDateRange(period = '7d', customStart = null, customEnd = null) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  let start = new Date(now);
  let end = new Date(now);
  let prevStart = new Date(now);
  let prevEnd = new Date(now);
  let label = 'Last 7 Days';
  let resolvedPeriod = period;

  switch (period) {
    case 'today': {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      prevStart.setDate(prevStart.getDate() - 1);
      prevStart.setHours(0, 0, 0, 0);
      prevEnd.setDate(prevEnd.getDate() - 1);
      prevEnd.setHours(23, 59, 59, 999);
      label = 'Today';
      break;
    }

    case 'this_week': {
      // Monday of current week
      const day = now.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      start.setDate(now.getDate() + diffToMonday);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 7);
      prevEnd = new Date(end);
      prevEnd.setDate(prevEnd.getDate() - 7);
      label = 'This Week';
      break;
    }

    case 'last_week': {
      const day = now.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day - 7;
      start.setDate(now.getDate() + diffToMonday);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 7);
      prevEnd = new Date(end);
      prevEnd.setDate(prevEnd.getDate() - 7);
      label = 'Last Week';
      break;
    }

    case '30d':
    case 'last_30_days': {
      start.setDate(now.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      prevStart.setDate(start.getDate() - 30);
      prevStart.setHours(0, 0, 0, 0);
      prevEnd = new Date(start);
      prevEnd.setDate(prevEnd.getDate() - 1);
      prevEnd.setHours(23, 59, 59, 999);
      label = 'Last 30 Days';
      resolvedPeriod = '30d';
      break;
    }

    case 'this_month': {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      const daysPassed = now.getDate();
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth() - 1, Math.min(daysPassed, 28), 23, 59, 59, 999);
      label = 'This Month';
      break;
    }

    case 'last_month': {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

      prevStart = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
      label = 'Last Month';
      break;
    }

    case 'custom': {
      if (customStart && customEnd) {
        start = new Date(customStart);
        start.setHours(0, 0, 0, 0);
        end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);

        const durationDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
        prevEnd = new Date(start);
        prevEnd.setDate(prevEnd.getDate() - 1);
        prevEnd.setHours(23, 59, 59, 999);
        prevStart = new Date(prevEnd);
        prevStart.setDate(prevStart.getDate() - durationDays + 1);
        prevStart.setHours(0, 0, 0, 0);

        label = `${customStart} to ${customEnd}`;
        resolvedPeriod = 'custom';
      } else {
        // Fallback to 7d
        start.setDate(now.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        label = 'Last 7 Days';
        resolvedPeriod = '7d';
      }
      break;
    }

    case '7d':
    case 'last_7_days':
    default: {
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      prevStart.setDate(start.getDate() - 7);
      prevStart.setHours(0, 0, 0, 0);
      prevEnd = new Date(start);
      prevEnd.setDate(prevEnd.getDate() - 1);
      prevEnd.setHours(23, 59, 59, 999);
      label = 'Last 7 Days';
      resolvedPeriod = '7d';
      break;
    }
  }

  const fmt = (d) => d.toISOString().split('T')[0];

  return {
    period: resolvedPeriod,
    label,
    startDate: fmt(start),
    endDate: fmt(end),
    startDateTime: start,
    endDateTime: end,
    prevStartDate: fmt(prevStart),
    prevEndDate: fmt(prevEnd),
    prevStartDateTime: prevStart,
    prevEndDateTime: prevEnd,
  };
}

/**
 * Calculate mathematical percentage/absolute change safely.
 * Returns null percentage if baseline is zero to avoid misleading infinity%.
 */
export function calculateComparison(current, previous) {
  const diff = current - previous;
  if (previous === 0) {
    if (current === 0) {
      return { diff: 0, pct: 0, formatted: '0%', isPositive: false, isZero: true };
    }
    return {
      diff,
      pct: null,
      formatted: diff > 0 ? `+${diff}` : `${diff}`,
      isPositive: diff > 0,
      isZero: false,
    };
  }

  const pct = Math.round((diff / previous) * 1000) / 10;
  return {
    diff,
    pct,
    formatted: `${pct >= 0 ? '+' : ''}${pct}%`,
    isPositive: pct > 0,
    isZero: pct === 0,
  };
}
