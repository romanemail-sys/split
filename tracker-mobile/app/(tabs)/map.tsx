import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import MapView from 'react-native-maps';
import { RoutePolyline } from '../../components/RoutePolyline';
import { fetchLocationHistory } from '../../services/api';
import { useDeviceStore } from '../../store/deviceStore';

interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
}

export default function MapScreen() {
  const { deviceId, ready } = useDeviceStore();
  const [points, setPoints] = useState<LocationPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !deviceId) return;
    fetchLocationHistory(deviceId)
      .then(setPoints)
      .catch(() => setPoints([]))
      .finally(() => setLoading(false));
  }, [ready, deviceId]);

  if (loading) return <ActivityIndicator style={styles.loader} />;

  const lastPoint = points[points.length - 1];
  const initialRegion = lastPoint
    ? { latitude: lastPoint.latitude, longitude: lastPoint.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : { latitude: 32.08, longitude: 34.78, latitudeDelta: 0.5, longitudeDelta: 0.5 };

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={initialRegion}>
        <RoutePolyline points={points} />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loader: { flex: 1 },
});
