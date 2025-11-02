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

// Fixed zoom scale: 15 pixels per second for a 360s session = 5400px total width
const PIXELS_PER_SECOND = 15;
const RULER_HEIGHT = 30;
const LEFT_GUTTER = 16;
const ARM_BUTTON_SIZE = 32;
const ARM_BUTTON_MARGIN = 16;

export default function Timeline() {
  const tracks = useTracks();
  const duration = useSessionDuration();
  const armTrack = useSessionStore((state) => state.armTrack);
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() => Dimensions.get('window').width);
  const [scrollOffset, setScrollOffset] = useState(0);

  const timelineWidth = PIXELS_PER_SECOND * duration;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollOffset(event.nativeEvent.contentOffset.x);
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    setViewportWidth(event.nativeEvent.layout.width);
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
    const subscription = TapelabAudioEmitter?.addListener('onPlayheadUpdate', (event: { position: number }) => {
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

    return () => {
      subscription?.remove();
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
    <View style={styles.container}>
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
              />
            ))}

            <View
              {...panResponder.panHandlers}
              style={[
                styles.playhead,
                {
                  left: playheadX,
                  top: -RULER_HEIGHT,
                  height: tracks.length * TRACK_ROW_HEIGHT + RULER_HEIGHT,
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
            height: tracks.length * TRACK_ROW_HEIGHT,
          },
        ]}
      >
        {tracks.map((track, index) => {
          const rowTop = index * TRACK_ROW_HEIGHT;
          const isArmed = track.armed;
          return (
            <View
              key={`${track.id}-overlay`}
              pointerEvents="box-none"
              style={[styles.controlRow, { top: rowTop, height: TRACK_ROW_HEIGHT }]}
            >
              <View style={styles.trackLabel} pointerEvents="none">
                <Text style={styles.trackName}>{track.name}</Text>
              </View>

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
          );
        })}
      </View>
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
  armButton: {
    width: ARM_BUTTON_SIZE,
    height: ARM_BUTTON_SIZE,
    borderRadius: ARM_BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginRight: ARM_BUTTON_MARGIN,
  },
  armButtonText: {
    fontSize: 16,
    color: '#888',
  },
  armButtonTextActive: {
    color: '#fff',
  },
});
