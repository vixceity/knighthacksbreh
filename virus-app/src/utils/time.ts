export function displayTime(value: string): string {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return value;
  const [hour, minute] = value.split(':');
  return `${Number(hour) % 12 || 12}:${minute} ${Number(hour) >= 12 ? 'PM' : 'AM'}`;
}

export function parseTime(value: string): string {
  const match = value.trim().match(/^(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(am|pm)$/i);
  if (!match) return '';
  const hour = Number(match[1]) % 12 + (match[3].toLowerCase() === 'pm' ? 12 : 0);
  return `${String(hour).padStart(2, '0')}:${match[2] || '00'}`;
}
