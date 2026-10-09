import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';

export function formatFriendlyDate(date) {
  if (!date) return '';
  const d = new Date(date);
  
  if (isToday(d)) {
    return `Today at ${format(d, 'h:mm a')}`;
  }
  if (isYesterday(d)) {
    return `Yesterday at ${format(d, 'h:mm a')}`;
  }
  return format(d, 'MMM d, yyyy');
}

export function formatDistance(date) {
  if (!date) return '';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}
