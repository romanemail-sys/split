import React, { useEffect } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import MapView from 'react-native-maps';
import { useLocalSearchParams } from 'expo-router';
import { LiveDot } from '../../components/LiveDot';
import { MemberRow } from '../../components/MemberRow';
import { useGroupMembers } from '../../hooks/useGroupMembers';
import { useGroupStore } from '../../store/groupStore';
import { useDeviceStore } from '../../store/deviceStore';
import { getSocket, joinGroupRoom } from '../../services/socket';
import { blockDevice } from '../../services/api';

export default function GroupDetailScreen() {
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const { deviceId } = useDeviceStore();
  const { liveLocations, updateLiveLocation } = useGroupStore();
  const { members, refresh } = useGroupMembers(groupId);

  useEffect(() => {
    (async () => {
      await joinGroupRoom(groupId);
      const s = await getSocket();
      s.on('location:live', ({ deviceId: fromId, latitude, longitude, timestamp }) => {
        updateLiveLocation(fromId, latitude, longitude, timestamp);
      });
    })();
  }, [groupId]);

  const handleBlock = (targetDeviceId: string) => {
    Alert.alert('Block Device', `Block ${targetDeviceId.slice(0, 8)}…?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          await blockDevice(groupId, targetDeviceId);
          refresh();
        },
      },
    ]);
  };

  const liveEntries = Object.entries(liveLocations).filter(([id]) => id !== deviceId);

  return (
    <View style={styles.container}>
      <MapView style={styles.map}>
        {liveEntries.map(([id, loc]) => (
          <LiveDot key={id} latitude={loc.latitude} longitude={loc.longitude} />
        ))}
      </MapView>
      <FlatList
        style={styles.list}
        data={members.filter((m) => m.deviceId !== deviceId)}
        keyExtractor={(m) => m.deviceId}
        renderItem={({ item }) => (
          <MemberRow
            deviceId={item.deviceId}
            role={item.role}
            isLive={!!liveLocations[item.deviceId]}
            onBlock={() => handleBlock(item.deviceId)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  list: { maxHeight: 240, backgroundColor: '#fff' },
});
