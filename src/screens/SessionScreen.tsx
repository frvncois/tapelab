import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession, usePlayhead, useBpm } from '../store/selectors';
import { useSessionStore } from '../store/sessionStore';
import { formatTime } from '../utils/time';
import Timeline from '../components/Timeline';
import Transport from '../components/Transport';
import TapelabAudio from '../native';
import BpmSheetModule from '../native/bpmPicker';

type SessionScreenProps = {
  navigation: any;
};

export default function SessionScreen({ navigation }: SessionScreenProps) {
  const session = useSession();
  const playhead = usePlayhead();
  const bpm = useBpm();
  const setBpm = useSessionStore((state) => state.setBpm);

  const handleBpmPress = async () => {
    try {
      const newBpm = await BpmSheetModule.showPicker(bpm);
      setBpm(newBpm);
    } catch (error) {
      console.error('[SessionScreen] BPM picker error:', error);
    }
  };

  // Don't add test regions - they will be created from actual recordings
  // User needs to record audio first, then regions will appear
  useEffect(() => {
    let mounted = true;

    console.log('[SessionScreen] Session loaded. Record audio to create regions.');

    TapelabAudio.requestRecordPermission()
      .then((granted) => {
        if (!granted && mounted) {
          Alert.alert(
            'Microphone Access Required',
            'Tapelab needs microphone access to record audio. Enable it in Settings > Privacy > Microphone.'
          );
        }
      })
      .catch((error) => {
        console.error('[SessionScreen] Failed to request microphone permission:', error);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.sessionName}>{session.name}</Text>
          <Text style={styles.playheadTime}>{formatTime(playhead)} / {formatTime(session.duration)}</Text>
        </View>
        <TouchableOpacity style={styles.bpmButton} onPress={handleBpmPress}>
          <Text style={styles.bpmLabel}>BPM</Text>
          <Text style={styles.bpmValue}>{bpm}</Text>
        </TouchableOpacity>
      </View>

      {/* Timeline */}
      <Timeline />

      {/* Transport Controls */}
      <Transport />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2a2a2a',
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
  },
  backButton: {
    color: '#007AFF',
    fontSize: 16,
  },
  headerCenter: {
    alignItems: 'center',
  },
  sessionName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  playheadTime: {
    fontSize: 14,
    color: '#888',
    fontFamily: 'Courier',
  },
  bpmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  bpmLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: '500',
    marginRight: 4,
  },
  bpmValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Courier',
  },
});
