import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  deviceId: string;
  role: string;
  isLive: boolean;
  onBlock: () => void;
}

export function MemberRow({ deviceId, role, isLive, onBlock }: Props) {
  return (
    <View style={styles.row}>
      <View>
        <Text style={styles.id}>{deviceId.slice(0, 8)}…</Text>
        <Text style={styles.meta}>
          {role}
          {isLive ? '  live' : ''}
        </Text>
      </View>
      <TouchableOpacity onPress={onBlock} style={styles.blockBtn}>
        <Text style={styles.blockText}>Block</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  id: { fontFamily: 'monospace', fontSize: 14 },
  meta: { fontSize: 12, color: '#888', marginTop: 2 },
  blockBtn: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  blockText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});
