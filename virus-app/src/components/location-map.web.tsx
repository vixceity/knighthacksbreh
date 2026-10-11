import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import buildings from '@/constants/ucf-buildings.json';
import { ThemedText } from './themed-text';

type UcfBuilding = (typeof buildings)[number];
const ucfBounds = { north: 28.606, south: 28.598, west: -81.204, east: -81.194 };

export default function LocationMap({ latitude, longitude, showUcfBuildings = false, onBuildingSelect }: {
  latitude?: number;
  longitude?: number;
  showUcfBuildings?: boolean;
  onBuildingSelect?: (building: UcfBuilding) => void;
}) {
  const hasUserLocation = Number.isFinite(latitude) && Number.isFinite(longitude);
  const bounds = showUcfBuildings || !hasUserLocation
    ? ucfBounds
    : { north: latitude! + 0.005, south: latitude! - 0.005, west: longitude! - 0.005, east: longitude! + 0.005 };
  const marker = hasUserLocation && !showUcfBuildings ? `&marker=${latitude},${longitude}` : '';
  const url = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent([bounds.west, bounds.south, bounds.east, bounds.north].join(','))}&layer=mapnik${marker}`;
  const height = showUcfBuildings ? 280 : 260;
  return <View style={showUcfBuildings ? { gap: 8 } : undefined}>
    <View style={[styles.map, { height }]}>
      <iframe title={showUcfBuildings ? 'UCF classroom building map' : 'Map of your current location'} src={url}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, borderRadius: 8 }} />
      {showUcfBuildings && buildings.map(building => <Pressable
        key={building.code}
        accessibilityRole="button"
        accessibilityLabel={`Select ${building.code}, ${building.name}`}
        onPress={() => onBuildingSelect?.(building)}
        style={[styles.pin, {
          left: `${((building.longitude - bounds.west) / (bounds.east - bounds.west)) * 100}%`,
          top: `${((bounds.north - building.latitude) / (bounds.north - bounds.south)) * 100}%`,
        }]}>
        <ThemedText style={styles.pinText}>{building.code}</ThemedText>
      </Pressable>)}
    </View>
    {showUcfBuildings && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
      {buildings.map(building => <Pressable key={building.code} accessibilityRole="button" onPress={() => onBuildingSelect?.(building)} style={styles.option}>
        <ThemedText type="smallBold">{building.code}</ThemedText>
      </Pressable>)}
    </ScrollView>}
  </View>;
}

const styles = StyleSheet.create({
  map: { position: 'relative', overflow: 'hidden', borderRadius: 8, borderWidth: 1, borderColor: '#8C9BB0' },
  pin: { position: 'absolute', minWidth: 30, height: 30, borderRadius: 15, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2F80ED', borderWidth: 1, borderColor: '#0B0B0C' },
  pinText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  list: { gap: 6, paddingVertical: 2 },
  option: { minHeight: 36, minWidth: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderWidth: 1, borderColor: '#34343A', borderRadius: 6, backgroundColor: '#141416' },
});
