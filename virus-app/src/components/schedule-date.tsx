import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ThemedText } from './themed-text';
import { localDate } from '@/utils/attendance';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function ScheduleDate({ date, days, onDate, onDays }: {
  date?: string; days: number[]; onDate: (date: string | undefined) => void; onDays: (days: number[]) => void;
}) {
  const [month, setMonth] = useState(() => new Date(`${date || localDate(new Date())}T12:00:00`));
  function select(value: Date) { onDate(localDate(value)); setMonth(value); }
  function chip(label: string, selected: boolean, action: () => void) {
    return <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected }} onPress={action}
      style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: selected ? '#2F80ED' : '#8793A5', backgroundColor: selected ? '#2F80ED' : 'transparent' }}>
      <ThemedText type="smallBold" style={selected ? { color: '#FFFFFF' } : undefined}>{label}</ThemedText>
    </Pressable>;
  }
  const first = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return <View style={{ gap: 12 }}>
    <ThemedText type="smallBold">When</ThemedText>
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {chip('Weekly', !date, () => onDate(undefined))}
      {chip('One time', !!date, () => select(new Date()))}
    </View>
    {!date ? <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{DAYS.map((day, index) => chip(day, days.includes(index), () => onDays(days.includes(index) ? days.filter(item => item !== index) : [...days, index].sort())))}</View>
      <ThemedText type="small">{days.length ? `Every ${[...days].sort().map(day => DAYS[day]).join(', ')}` : 'Choose at least one day'}</ThemedText>
    </> : <>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {chip('Today', date === localDate(new Date()), () => select(new Date()))}
        {chip('Tomorrow', false, () => { const next = new Date(); next.setDate(next.getDate() + 1); select(next); })}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {chip('Previous month', false, () => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1)))}
        {chip('Next month', false, () => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1)))}
      </View>
      <ThemedText type="smallBold">{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</ThemedText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {DAYS.map(day => <View key={day} style={{ width: '14.2857%', alignItems: 'center' }}><ThemedText type="small">{day}</ThemedText></View>)}
        {Array.from({ length: first + count }, (_, index) => {
          const day = index - first + 1;
          const value = new Date(month.getFullYear(), month.getMonth(), day);
          return <View key={index} style={{ width: '14.2857%', padding: 2 }}>{day > 0 && chip(String(day), date === localDate(value), () => select(value))}</View>;
        })}
      </View>
      <ThemedText type="small">{new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })} · Does not repeat</ThemedText>
    </>}
  </View>;
}
