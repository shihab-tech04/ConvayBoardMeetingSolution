// Shared date/time formatting for dashboard pages.

export function friendlyDate(iso: string): string {
  if (!iso) return "—";
  const todayMs   = new Date().setHours(0, 0, 0, 0);
  const targetMs  = new Date(iso + "T12:00:00").setHours(0, 0, 0, 0);
  const diffDays  = Math.round((targetMs - todayMs) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  return new Date(iso + "T12:00:00").toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export function friendlyDue(iso: string): string {
  if (!iso) return "—";
  const todayMs  = new Date().setHours(0, 0, 0, 0);
  const targetMs = new Date(iso + "T12:00:00").setHours(0, 0, 0, 0);
  const diffDays = Math.round((targetMs - todayMs) / 86400000);
  if (diffDays < 0) {
    const n = -diffDays;
    if (n > 30) return "Overdue";
    if (n === 1) return "Overdue by 1 day";
    return `Overdue by ${n} days`;
  }
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 6) return `In ${diffDays} days`;
  return new Date(iso + "T12:00:00").toLocaleDateString("en-GB", {
    day: "numeric", month: "short",
  });
}

export function friendlyTime(timeStr: string): string {
  if (!timeStr) return "";
  const [hStr, mStr] = timeStr.split(":");
  const h = parseInt(hStr ?? "0", 10);
  const m = parseInt(mStr ?? "0", 10);
  const period = h >= 12 ? "PM" : "AM";
  const h12    = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export function timeAgo(iso: string): string {
  if (!iso) return "";
  const diffMs   = Date.now() - new Date(iso).getTime();
  const diffMin  = Math.floor(diffMs / 60000);
  if (diffMin < 1)  return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs  = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return friendlyDate(iso.slice(0, 10));
}

export function monthLabel(iso: string): string {
  if (!iso) return "—";
  return new Date(iso + "T12:00:00").toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}
