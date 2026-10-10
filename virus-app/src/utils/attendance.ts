export type ClassEntry = {
  id: string; name: string; place: string; days: number[];
  start: string; end: string; latitude: number; longitude: number; radius: number;
};
export type Position = { timestamp: number; coords: { latitude: number; longitude: number; accuracy: number | null } };
export const minutes = (time: string) => Number(time.split(':')[0]) * 60 + Number(time.split(':')[1]);
export function validClass(value: ClassEntry): boolean {
  return !!value && typeof value.id === 'string' && typeof value.name === 'string' && !!value.name.trim()
    && typeof value.place === 'string' && !!value.place.trim() && Array.isArray(value.days) && value.days.length > 0
    && value.days.every(day => Number.isInteger(day) && day >= 0 && day <= 6)
    && /^([01]\d|2[0-3]):[0-5]\d$/.test(value.start) && /^([01]\d|2[0-3]):[0-5]\d$/.test(value.end)
    && minutes(value.end) > minutes(value.start)
    && Number.isFinite(value.latitude) && Math.abs(value.latitude) <= 90
    && Number.isFinite(value.longitude) && Math.abs(value.longitude) <= 180
    && Number.isFinite(value.radius) && value.radius >= 20 && value.radius <= 5000;
}
export function attendance(entry: ClassEntry, position: Position | null, now: Date) {
  const time = now.getHours() * 60 + now.getMinutes();
  if (!entry.days.includes(now.getDay()) || time < minutes(entry.start) || time >= minutes(entry.end)) return 'inactive';
  if (!position || now.getTime() - position.timestamp > 30000 || position.coords.accuracy == null) return 'unknown';
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const a = Math.sin(radians(entry.latitude - position.coords.latitude) / 2) ** 2
    + Math.cos(radians(entry.latitude)) * Math.cos(radians(position.coords.latitude))
    * Math.sin(radians(entry.longitude - position.coords.longitude) / 2) ** 2;
  const distance = 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
  if (distance + position.coords.accuracy <= entry.radius) return 'present';
  if (distance - position.coords.accuracy > entry.radius) return 'absent';
  return 'unknown';
}
