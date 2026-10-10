export default function LocationMap({ latitude, longitude }: { latitude: number; longitude: number }) {
  const bbox = [longitude - 0.005, latitude - 0.005, longitude + 0.005, latitude + 0.005];
  const url = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox.join(','))}&layer=mapnik&marker=${latitude},${longitude}`;
  return (
    <iframe
      title="Map of your current location"
      src={url}
      style={{ width: '100%', height: 260, border: 0, borderRadius: 12 }}
    />
  );
}
