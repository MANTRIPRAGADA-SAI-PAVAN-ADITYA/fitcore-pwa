import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../constants/theme';

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  destLat?: number | null;
  destLng?: number | null;
  label: string;
  title: string;
};

type Region = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };

type Props = {
  region: Region;
  markers: MapMarker[];
  selectedId: string | null;
  onMarkerPress: (id: string) => void;
  routeColor: string;
};

// react-native-maps has no web implementation, so the web build renders
// markers as a proportionally-positioned overlay over the region's bounding
// box instead of real map tiles.
function project(lat: number, lng: number, region: Region) {
  const left = region.longitude - region.longitudeDelta / 2;
  const top = region.latitude + region.latitudeDelta / 2;
  const x = ((lng - left) / region.longitudeDelta) * 100;
  const y = ((top - lat) / region.latitudeDelta) * 100;
  return { x: Math.min(98, Math.max(2, x)), y: Math.min(98, Math.max(2, y)) };
}

export default function RouteMap({ region, markers, selectedId, onMarkerPress, routeColor }: Props) {
  return (
    <View style={styles.map}>
      <Text style={styles.hint}>Map view is available in the LooP mobile app</Text>
      {markers.map((m) => {
        const pos = project(m.lat, m.lng, region);
        return (
          <View
            key={m.id}
            style={[styles.pin, { left: `${pos.x}%` as any, top: `${pos.y}%` as any }]}
            // @ts-expect-error web-only pointer handler
            onClick={() => onMarkerPress(m.id)}
          >
            <View style={[styles.markerBubble, selectedId === m.id && styles.markerBubbleActive]}>
              <Text style={styles.markerText}>{m.label}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    backgroundColor: '#DCEBFB',
    position: 'relative',
    overflow: 'hidden',
  },
  hint: {
    position: 'absolute',
    bottom: SPACING.md,
    alignSelf: 'center',
    fontSize: 12,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    ...SHADOWS.sm,
  },
  pin: {
    position: 'absolute',
    transform: [{ translateX: -14 }, { translateY: -14 }],
    cursor: 'pointer' as any,
  },
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
