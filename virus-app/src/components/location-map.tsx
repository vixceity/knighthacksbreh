import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import buildings from '@/constants/ucf-buildings.json';
import { ThemedText } from './themed-text';
import { Palette, Radius } from '@/constants/theme';

type UcfBuilding = (typeof buildings)[number];

export default function LocationMap({ latitude, longitude, showUcfBuildings = false, onBuildingSelect }: {
  latitude?: number;
  longitude?: number;
  showUcfBuildings?: boolean;
  onBuildingSelect?: (building: UcfBuilding) => void;
}) {
  const [selected, setSelected] = useState('');
  const hasUserLocation = Number.isFinite(latitude) && Number.isFinite(longitude);
  const center = hasUserLocation
    ? { latitude: latitude!, longitude: longitude! }
    : { latitude: 28.6025, longitude: -81.1995 };
  const map = <MapView
      style={{ width: '100%', height: showUcfBuildings ? 280 : 260 }}
      accessibilityLabel={showUcfBuildings ? 'UCF classroom building map' : 'Map of your current location'}
      region={{ ...center, latitudeDelta: showUcfBuildings ? 0.008 : 0.01, longitudeDelta: showUcfBuildings ? 0.008 : 0.01 }}>
      {hasUserLocation && !showUcfBuildings && <Marker coordinate={center} title="You are here" />}
      {showUcfBuildings && buildings.map(building => <Marker
        key={building.code}
        coordinate={{ latitude: building.latitude, longitude: building.longitude }}
        title={`${building.code} · ${building.name}`}
        description={building.address}
        pinColor={selected === building.code ? Palette.selected : Palette.accent}
        onPress={() => { setSelected(building.code); onBuildingSelect?.(building); }}
      />)}
    </MapView>;

  if (!showUcfBuildings) return map;
  return <View style={{ gap: 8 }}>
    {map}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
      {buildings.map(building => <Pressable key={building.code} accessibilityRole="button" onPress={() => {
        setSelected(building.code);
        onBuildingSelect?.(building);
      }} style={[styles.option, selected === building.code && styles.optionSelected]}>
        <ThemedText type="smallBold">{building.code}</ThemedText>
      </Pressable>)}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  list: { gap: 8, paddingVertical: 4 },
  option: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: Palette.border, borderRadius: Radius.small, backgroundColor: Palette.surface },
  optionSelected: { borderColor: Palette.accentBorder, backgroundColor: Palette.selected },
});
