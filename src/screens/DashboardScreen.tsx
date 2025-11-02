import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useSessionStore } from '../store/sessionStore';
import type { Session } from '../types/session';

type DashboardScreenProps = {
  navigation: any;
};

export default function DashboardScreen({ navigation }: DashboardScreenProps) {
  const sessions = useSessionStore((state) => state.sessions);
  const currentSessionId = useSessionStore((state) => state.currentSessionId);
  const createSession = useSessionStore((state) => state.createSession);
  const openSession = useSessionStore((state) => state.openSession);

  const orderedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => b.createdAt - a.createdAt);
  }, [sessions]);

  const handleNewSession = () => {
    console.log('[Dashboard] Creating new session');
    const session = createSession();
    openSession(session.id);
    navigation.navigate('Session');
  };

  const handleOpenSession = (sessionId: string) => {
    openSession(sessionId);
    navigation.navigate('Session');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tapelab</Text>
        <Text style={styles.subtitle}>Multi-Track Audio Recorder</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Sessions</Text>
        <FlatList
          data={orderedSessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.sessionList}
          renderItem={({ item }) => (
            <SessionCard
              session={item}
              isActive={item.id === currentSessionId}
              onOpen={() => handleOpenSession(item.id)}
            />
          )}
          ListEmptyComponent={
            <Text style={styles.emptyState}>No sessions yet. Create one to get started.</Text>
          }
        />

        <TouchableOpacity 
          style={styles.newSessionButton}
          onPress={handleNewSession}
        >
          <Text style={styles.newSessionButtonText}>+ New Session</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sessionList: {
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  sessionCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sessionName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  sessionInfo: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#333',
    marginBottom: 8,
  },
  badgeActive: {
    backgroundColor: '#FF9500',
  },
  badgeText: {
    color: '#bbb',
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextActive: {
    color: '#1a1a1a',
  },
  openButton: {
    backgroundColor: '#4a4a4a',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  openButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  newSessionButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  newSessionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 32,
  },
});

type SessionCardProps = {
  session: Session;
  isActive: boolean;
  onOpen: () => void;
};

function SessionCard({ session, isActive, onOpen }: SessionCardProps) {
  return (
    <View style={[styles.sessionCard, isActive && { borderColor: '#FF9500', borderWidth: 1 }] }>
      <View style={[styles.badge, isActive && styles.badgeActive]}>
        <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>
          {isActive ? 'Current Session' : 'Saved Session'}
        </Text>
      </View>
      <Text style={styles.sessionName}>{session.name}</Text>
      <Text style={styles.sessionInfo}>
        {session.tracks.length} tracks • {session.duration}s • {session.sampleRate / 1000}kHz
      </Text>
      <TouchableOpacity style={styles.openButton} onPress={onOpen}>
        <Text style={styles.openButtonText}>Open Session</Text>
      </TouchableOpacity>
    </View>
  );
}
