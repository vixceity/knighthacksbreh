import MapView, { Marker } from 'react-native-maps';

export default function LocationMap({ latitude, longitude }: { latitude: number; longitude: number }) {
  return (
    <MapView
      style={{ width: '100%', height: 260 }}
      accessibilityLabel="Map of your current location"
      region={{ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }}>
      <Marker coordinate={{ latitude, longitude }} title="You are here" />
    </MapView>
  );
}
