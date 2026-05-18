import React, { useState } from 'react';
import {
  Alert, FlatList, Modal, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Link } from 'expo-router';
import { createGroup, joinGroup } from '../../services/api';
import { useGroupStore } from '../../store/groupStore';

export default function GroupsScreen() {
  const { groups, addGroup } = useGroupStore();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupId, setGroupId] = useState('');

  const handleCreate = async () => {
    if (!groupName.trim()) return;
    try {
      const group = await createGroup(groupName.trim());
      addGroup(group);
      setGroupName('');
      setShowCreate(false);
    } catch {
      Alert.alert('Error', 'Failed to create group');
    }
  };

  const handleJoin = async () => {
    if (!groupId.trim()) return;
    try {
      await joinGroup(groupId.trim());
      setGroupId('');
      setShowJoin(false);
      Alert.alert('Joined', 'Successfully joined the group');
    } catch {
      Alert.alert('Error', 'Could not join group — check the ID');
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={groups}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => (
          <Link href={`/group/${item.id}`} asChild>
            <TouchableOpacity style={styles.row}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.id}>{item.id}</Text>
            </TouchableOpacity>
          </Link>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No groups yet. Create or join one.</Text>
        }
      />

      <View style={styles.actions}>
        <TouchableOpacity style={styles.btn} onPress={() => setShowCreate(true)}>
          <Text style={styles.btnText}>Create Group</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnGreen]} onPress={() => setShowJoin(true)}>
          <Text style={styles.btnText}>Join by ID</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Group</Text>
            <TextInput
              style={styles.input}
              placeholder="Group name"
              value={groupName}
              onChangeText={setGroupName}
            />
            <TouchableOpacity style={styles.btn} onPress={handleCreate}>
              <Text style={styles.btnText}>Create</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCreate(false)}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showJoin} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Join Group</Text>
            <TextInput
              style={styles.input}
              placeholder="Paste group ID"
              value={groupId}
              onChangeText={setGroupId}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.btn} onPress={handleJoin}>
              <Text style={styles.btnText}>Join</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowJoin(false)}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  row: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  name: { fontSize: 16, fontWeight: '600' },
  id: { fontSize: 11, color: '#888', marginTop: 2 },
  empty: { padding: 24, textAlign: 'center', color: '#888' },
  actions: { flexDirection: 'row', padding: 16, gap: 8 },
  btn: { flex: 1, backgroundColor: '#007AFF', padding: 14, borderRadius: 10, alignItems: 'center' },
  btnGreen: { backgroundColor: '#34C759' },
  btnText: { color: '#fff', fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: '#fff', borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 16 },
  cancel: { textAlign: 'center', marginTop: 12, color: '#888', fontSize: 16 },
});
