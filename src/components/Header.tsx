import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useBpm } from '../store/selectors';
import { useSessionStore } from '../store/sessionStore';
import BpmSheetModule from '../native/bpmPicker';

export default function Header() {
  const bpm = useBpm();
  const setBpm = useSessionStore((state) => state.setBpm);

  const handleBpmPress = async () => {
    try {
      const newBpm = await BpmSheetModule.showPicker(bpm);
      setBpm(newBpm);
    } catch (error) {
      console.error('[Header] BPM picker error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tapelab</Text>

      <TouchableOpacity style={styles.bpmButton} onPress={handleBpmPress}>
        <Text style={styles.bpmLabel}>BPM</Text>
        <Text style={styles.bpmValue}>{bpm}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 60,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  bpmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  bpmLabel: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
    marginRight: 6,
  },
  bpmValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Courier',
  },
});
