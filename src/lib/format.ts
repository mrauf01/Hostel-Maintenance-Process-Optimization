import { formatDistanceToNowStrict, format } from "date-fns";

export function relativeTime(iso: string): string {
  try {
    return formatDistanceToNowStrict(new Date(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

export function formatDateTime(iso: string): string {
  try {
    return format(new Date(iso), "d MMM yyyy, HH:mm");
  } catch {
    return iso;
  }
}

export function formatHoursAsDays(hours: number): string {
  return `${(hours / 24).toFixed(2)} days`;
}
