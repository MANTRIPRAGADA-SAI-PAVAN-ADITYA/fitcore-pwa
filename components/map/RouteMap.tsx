import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import { COLORS, RADIUS, SHADOWS } from '../../constants/theme';

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  destLat?: number | null;
  destLng?: number | null;
  label: string;
  title: string;
};

type Props = {
  region: Region;
  markers: MapMarker[];
  selectedId: string | null;
  onMarkerPress: (id: string) => void;
  routeColor: string;
};

export default function RouteMap({ region, markers, selectedId, onMarkerPress, routeColor }: Props) {
  return (
    <MapView
      style={styles.map}
      provider={PROVIDER_DEFAULT}
      initialRegion={region}
      showsUserLocation
      showsMyLocationButton={false}
    >
      {markers.map((m) => (
        <React.Fragment key={m.id}>
          <Marker
            coordinate={{ latitude: m.lat, longitude: m.lng }}
            onPress={() => onMarkerPress(m.id)}
          >
            <View style={[styles.markerBubble, selectedId === m.id && styles.markerBubbleActive]}>
              <Text style={styles.markerText}>{m.label}</Text>
            </View>
          </Marker>
          {m.destLat && m.destLng && (
            <Polyline
              coordinates={[
                { latitude: m.lat, longitude: m.lng },
                { latitude: m.destLat, longitude: m.destLng },
              ]}
              strokeColor={routeColor}
              strokeWidth={selectedId === m.id ? 3 : 1.5}
              lineDashPattern={[5, 5]}
            />
          )}
        </React.Fragment>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  markerBubble: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    padding: 6,
    ...SHADOWS.sm,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  markerBubbleActive: { borderColor: COLORS.primary, backgroundColor: '#EEF5FF' },
  markerText: { fontSize: 18 },
});
