import React from 'react';
import * as Clipboard from 'expo-clipboard';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDeviceStore } from '../../store/deviceStore';
import { startLocationTracking, stopLocationTracking } from '../../services/locationTask';

export default function SettingsScreen() {
  const { deviceId, trackingIntervalSeconds } = useDeviceStore();

  const copyDeviceId = () => {
    if (!deviceId) return;
    Clipboard.setStringAsync(deviceId);
    Alert.alert('Copied', 'Device ID copied to clipboard');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.label}>Your Device ID</Text>
        <Text style={styles.value} selectable>
          {deviceId ?? 'Initializing…'}
        </Text>
        <TouchableOpacity style={styles.btn} onPress={copyDeviceId}>
          <Text style={styles.btnText}>Copy Device ID</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>
          Share this ID with others so they can add you to their group, or give it to an admin
          to view your location history.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Tracking Interval</Text>
        <Text style={styles.value}>{trackingIntervalSeconds}s (configured by admin)</Text>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.btn, styles.btnRed]}
          onPress={() => stopLocationTracking().then(() => Alert.alert('Paused', 'Location tracking paused'))}
        >
          <Text style={styles.btnText}>Pause Tracking</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnGreen, { marginTop: 8 }]}
          onPress={() =>
            startLocationTracking(trackingIntervalSeconds).then(() =>
              Alert.alert('Resumed', 'Location tracking resumed'),
            )
          }
        >
          <Text style={styles.btnText}>Resume Tracking</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  section: { backgroundColor: '#fff', margin: 16, padding: 16, borderRadius: 12 },
  label: { fontSize: 13, color: '#888', textTransform: 'uppercase', marginBottom: 4 },
  value: { fontSize: 14, fontFamily: 'monospace', marginBottom: 12 },
  btn: { backgroundColor: '#007AFF', padding: 14, borderRadius: 10, alignItems: 'center' },
  btnRed: { backgroundColor: '#FF3B30' },
  btnGreen: { backgroundColor: '#34C759' },
  btnText: { color: '#fff', fontWeight: '600' },
  hint: { fontSize: 12, color: '#888', marginTop: 8, lineHeight: 18 },
});
