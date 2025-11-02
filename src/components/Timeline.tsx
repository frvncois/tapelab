import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  PanResponder,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useTracks, useSessionDuration } from '../store/selectors';
import TrackLane, { TRACK_ROW_HEIGHT } from './TrackLane';
import { TapelabAudioEmitter } from '../native';
import TapelabAudio from '../native';
import { transportStore } from '../store/transportStore';
import { formatTime } from '../utils/time';
import { useSessionStore } from '../store/sessionStore';
import TrackEditorSheet from './TrackEditorSheet';
import type { Track } from '../types/session';

type EditMode = 'crop' | 'move' | null;
type EditState = {
  regionId: string;
  mode: EditMode;
  pendingUpdates: {
    startTime?: number;
    endTime?: number;
    offset?: number;
  };
} | null;

// Fixed zoom scale: 15 pixels per second for a 360s session = 5400px total width
const PIXELS_PER_SECOND = 15;
const RULER_HEIGHT = 30;
const LEFT_GUTTER = 16;
const ARM_BUTTON_SIZE = 32;
const ARM_BUTTON_MARGIN = 16;
const MIN_TRACK_HEIGHT = 60; // Minimum height per track

export default function Timeline() {
  const tracks = useTracks();
  const duration = useSessionDuration();
  const armTrack = useSessionStore((state) => state.armTrack);
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() => Dimensions.get('window').width);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [editorTrack, setEditorTrack] = useState<Track | null>(null);
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [containerHeight, setContainerHeight] = useState(0);
  const [editState, setEditState] = useState<EditState>(null);

  // Calculate track height dynamically based on available space
  const trackHeight = containerHeight > 0 && tracks.length > 0
    ? Math.max(MIN_TRACK_HEIGHT, (containerHeight - RULER_HEIGHT) / tracks.length)
    : MIN_TRACK_HEIGHT;

  const timelineWidth = PIXELS_PER_SECOND * duration;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollOffset(event.nativeEvent.contentOffset.x);
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    setViewportWidth(event.nativeEvent.layout.width);
  };

  const handleContainerLayout = (event: LayoutChangeEvent) => {
    setContainerHeight(event.nativeEvent.layout.height);
  };

  const handleOpenEditor = (track: Track) => {
    setEditorTrack(track);
    setIsEditorVisible(true);
  };

  const handleCloseEditor = () => {
    setIsEditorVisible(false);
  };

  const handleVolumeChange = (volume: number) => {
    if (editorTrack) {
      useSessionStore.getState().updateTrackVolume(editorTrack.id, volume);
    }
  };

  const handlePanChange = (pan: number) => {
    if (editorTrack) {
      useSessionStore.getState().updateTrackPan(editorTrack.id, pan);
    }
  };

  const handleEQChange = (band: 'low' | 'mid' | 'high', value: number) => {
    if (editorTrack) {
      useSessionStore.getState().updateTrackEQ(editorTrack.id, band, value);
    }
  };

  // Region editing handlers
  const handleCrop = (regionId: string) => {
    setEditState({ regionId, mode: 'crop', pendingUpdates: {} });
  };

  const handleMove = (regionId: string) => {
    setEditState({ regionId, mode: 'move', pendingUpdates: {} });
  };

  const handleDelete = (regionId: string) => {
    useSessionStore.getState().removeRegion(regionId);
  };

  const handleEditUpdate = (regionId: string, updates: { startTime?: number; endTime?: number; offset?: number }) => {
    setEditState((prev) => {
      if (!prev || prev.regionId !== regionId) return prev;
      return {
        ...prev,
        pendingUpdates: { ...prev.pendingUpdates, ...updates },
      };
    });
  };

  const handleApplyEdit = () => {
    if (!editState) return;

    const { regionId, mode, pendingUpdates } = editState;

    if (mode === 'crop') {
      if (pendingUpdates.startTime !== undefined) {
        const delta = pendingUpdates.startTime - useSessionStore.getState().session.tracks
          .flatMap(t => t.regions)
          .find(r => r.id === regionId)!.startTime;
        useSessionStore.getState().cropRegionStart(regionId, delta);
      }
      if (pendingUpdates.endTime !== undefined) {
        const region = useSessionStore.getState().session.tracks
          .flatMap(t => t.regions)
          .find(r => r.id === regionId)!;
        const delta = pendingUpdates.endTime - region.endTime;
        useSessionStore.getState().cropRegionEnd(regionId, delta);
      }
    } else if (mode === 'move') {
      if (pendingUpdates.startTime !== undefined) {
        const region = useSessionStore.getState().session.tracks
          .flatMap(t => t.regions)
          .find(r => r.id === regionId)!;
        const delta = pendingUpdates.startTime - region.startTime;
        useSessionStore.getState().moveRegion(regionId, delta);
      }
    }

    setEditState(null);
  };

  const handleCancelEdit = () => {
    setEditState(null);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsDragging(true);
      },
      onPanResponderMove: (_, gestureState) => {
        const newPlayhead = Math.max(0, Math.min(duration, (gestureState.moveX + scrollOffset) / PIXELS_PER_SECOND));
        setPlayheadPosition(newPlayhead);
      },
      onPanResponderRelease: async (_, gestureState) => {
        const newPlayhead = Math.max(0, Math.min(duration, (gestureState.moveX + scrollOffset) / PIXELS_PER_SECOND));
        setIsDragging(false);
        await TapelabAudio.seek(newPlayhead);
        await transportStore.seek(newPlayhead);
      },
    })
  ).current;

  useEffect(() => {
    const playheadSub = TapelabAudioEmitter?.addListener('onPlayheadUpdate', (event: { position: number }) => {
      const position = event.position;
      if (!isDragging) {
        setPlayheadPosition(position);
      }

      const store = useSessionStore.getState();
      store.setPlayhead(position);

      if (store.activeRecordingRegionId) {
        store.updateRegionEnd(store.activeRecordingRegionId, position);
      }
    });

    const debugSub = TapelabAudioEmitter?.addListener('onRecordingDebug', (event: any) => {
      console.log('[REC DEBUG]', event);
    });

    const startedSub = TapelabAudioEmitter?.addListener('onRecordingStarted', (event: any) => {
      console.log('[REC STARTED]', event);
    });

    return () => {
      playheadSub?.remove();
      debugSub?.remove();
      startedSub?.remove();
    };
  }, [isDragging]);

  const playheadX = playheadPosition * PIXELS_PER_SECOND;

  const ticks = [];
  const labels = [];
  for (let s = 0; s <= duration; s++) {
    const isMajorTick = s % 10 === 0;
    ticks.push(
      <View
        key={`tick-${s}`}
        style={{
          position: 'absolute',
          left: s * PIXELS_PER_SECOND,
          top: RULER_HEIGHT - (isMajorTick ? 12 : 6),
          width: 1,
          height: isMajorTick ? 12 : 6,
          backgroundColor: '#666',
        }}
      />
    );

    if (isMajorTick) {
      labels.push(
        <Text
          key={`label-${s}`}
          style={{
            position: 'absolute',
            left: s * PIXELS_PER_SECOND + 2,
            top: 2,
            color: '#888',
            fontSize: 10,
            fontFamily: 'Courier',
          }}
        >
          {formatTime(s)}
        </Text>
      );
    }
  }

  const overlayWidth = viewportWidth || 0;

  return (
    <View style={styles.container} onLayout={handleContainerLayout}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={{ width: timelineWidth }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onLayout={handleLayout}
      >
        <View style={{ width: timelineWidth }}>
          <View style={[styles.ruler, { width: timelineWidth, height: RULER_HEIGHT }]}>
            {ticks}
            {labels}
          </View>

          <View style={[styles.timeline, { width: timelineWidth }]}>
            {tracks.map((track) => (
              <TrackLane
                key={track.id}
                track={track}
                pixelsPerSecond={PIXELS_PER_SECOND}
                timelineWidth={timelineWidth}
                trackHeight={trackHeight}
                editingRegionId={editState?.regionId}
                editingMode={editState?.mode}
                onCrop={handleCrop}
                onMove={handleMove}
                onDelete={handleDelete}
                onEditUpdate={handleEditUpdate}
              />
            ))}

            <View
              {...panResponder.panHandlers}
              style={[
                styles.playhead,
                {
                  left: playheadX,
                  top: -RULER_HEIGHT,
                  height: tracks.length * trackHeight + RULER_HEIGHT,
                },
              ]}
            >
              <View
                style={{
                  position: 'absolute',
                  left: -10,
                  top: 0,
                  width: 20,
                  height: 30,
                  backgroundColor: '#FF3B30',
                  borderRadius: 4,
                  opacity: isDragging ? 0.8 : 0.5,
                }}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <View
        pointerEvents="box-none"
        style={[
          styles.overlay,
          {
            top: RULER_HEIGHT + 8,
            width: overlayWidth,
            height: tracks.length * trackHeight,
          },
        ]}
      >
        {tracks.map((track, index) => {
          const rowTop = index * trackHeight;
          const isArmed = track.armed;
          return (
            <View
              key={`${track.id}-overlay`}
              pointerEvents="box-none"
              style={[styles.controlRow, { top: rowTop, height: trackHeight }]}
            >
              <View style={styles.trackLabel} pointerEvents="none">
                <Text style={styles.trackName}>{track.name}</Text>
              </View>

              {/* Show Apply/Cancel buttons when editing */}
              {editState && (
                <View style={styles.editButtonGroup}>
                  <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEdit}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.applyButton} onPress={handleApplyEdit}>
                    <Text style={styles.applyButtonText}>Apply</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={styles.editorButton}
                  onPress={() => handleOpenEditor(track)}
                >
                  <Text style={styles.editorButtonText}>⚙</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.armButton,
                    {
                      backgroundColor: isArmed ? '#FF3B30' : '#3a3a3a',
                      borderColor: isArmed ? '#FF453A' : '#4a4a4a',
                    },
                  ]}
                  onPress={() => armTrack(track.id)}
                >
                  <Text style={[styles.armButtonText, isArmed && styles.armButtonTextActive]}>
                    {isArmed ? '●' : '○'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>

      <TrackEditorSheet
        visible={isEditorVisible}
        track={editorTrack}
        onClose={handleCloseEditor}
        onVolumeChange={handleVolumeChange}
        onPanChange={handlePanChange}
        onEQChange={handleEQChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
  ruler: {
    position: 'relative',
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
  },
  timeline: {
    paddingVertical: 8,
    position: 'relative',
  },
  playhead: {
    position: 'absolute',
    width: 2,
    backgroundColor: '#FF3B30',
    zIndex: 1000,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 2000,
  },
  controlRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: LEFT_GUTTER,
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  trackLabel: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
  },
  trackName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  editorButton: {
    width: ARM_BUTTON_SIZE,
    height: ARM_BUTTON_SIZE,
    borderRadius: ARM_BUTTON_SIZE / 2,
    backgroundColor: '#3a3a3a',
    borderColor: '#4a4a4a',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editorButtonText: {
    fontSize: 16,
    color: '#4A90E2',
  },
  armButton: {
    width: ARM_BUTTON_SIZE,
    height: ARM_BUTTON_SIZE,
    borderRadius: ARM_BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  armButtonText: {
    fontSize: 16,
    color: '#888',
  },
  armButtonTextActive: {
    color: '#fff',
  },
  editButtonGroup: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  applyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#34C759',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3DD762',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3a3a3a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4a4a4a',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
