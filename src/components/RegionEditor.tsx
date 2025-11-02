import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, PanResponder, Animated } from 'react-native';
import type { Region } from '../types/session';

type RegionEditorProps = {
  region: Region;
  pixelsPerSecond: number;
  mode: 'crop' | 'move';
  onUpdate: (regionId: string, updates: { startTime?: number; endTime?: number; offset?: number }) => void;
};

export default function RegionEditor({ region, pixelsPerSecond, mode, onUpdate }: RegionEditorProps) {
  const [localStartTime, setLocalStartTime] = useState(region.startTime);
  const [localEndTime, setLocalEndTime] = useState(region.endTime);
  const [localOffset, setLocalOffset] = useState(region.offset);

  const left = localStartTime * pixelsPerSecond;
  const width = (localEndTime - localStartTime) * pixelsPerSecond;
  const isLive = region.isLive;

  // Crop mode: drag handles for start/end
  const startHandlePan = useRef(new Animated.Value(0)).current;
  const endHandlePan = useRef(new Animated.Value(0)).current;

  const startHandleResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const deltaSeconds = gestureState.dx / pixelsPerSecond;
        const newStartTime = Math.max(0, region.startTime + deltaSeconds);
        const newOffset = region.offset + deltaSeconds;

        // Don't allow start to go past end
        if (newStartTime < localEndTime - 0.1) {
          setLocalStartTime(newStartTime);
          setLocalOffset(Math.max(0, newOffset));
        }
      },
      onPanResponderRelease: () => {
        onUpdate(region.id, {
          startTime: localStartTime,
          offset: localOffset,
        });
      },
    })
  ).current;

  const endHandleResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const deltaSeconds = gestureState.dx / pixelsPerSecond;
        const newEndTime = region.endTime + deltaSeconds;

        // Don't allow end to go before start
        if (newEndTime > localStartTime + 0.1) {
          setLocalEndTime(newEndTime);
        }
      },
      onPanResponderRelease: () => {
        onUpdate(region.id, {
          endTime: localEndTime,
        });
      },
    })
  ).current;

  // Move mode: drag entire region
  const regionPan = useRef(new Animated.Value(0)).current;

  const moveResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const deltaSeconds = gestureState.dx / pixelsPerSecond;
        const newStartTime = Math.max(0, region.startTime + deltaSeconds);
        const newEndTime = region.endTime + deltaSeconds;

        setLocalStartTime(newStartTime);
        setLocalEndTime(newEndTime);
      },
      onPanResponderRelease: () => {
        onUpdate(region.id, {
          startTime: localStartTime,
          endTime: localEndTime,
        });
      },
    })
  ).current;

  return (
    <View
      style={[
        styles.regionEditor,
        {
          left,
          width: Math.max(width, 12),
          backgroundColor: isLive ? '#e51b1bff' : '#323531ff',
          borderColor: mode === 'crop' ? '#4A90E2' : '#FF9F0A',
          borderWidth: 3,
        },
      ]}
    >
      {mode === 'move' && (
        <View {...moveResponder.panHandlers} style={styles.moveOverlay}>
          <Text style={styles.regionLabel}>{region.id.substring(0, 8)}</Text>
          <Text style={styles.modeLabel}>↔️ MOVE</Text>
        </View>
      )}

      {mode === 'crop' && (
        <>
          <Text style={styles.regionLabel}>{region.id.substring(0, 8)}</Text>
          <Text style={styles.modeLabel}>✂️ CROP</Text>

          {/* Start handle */}
          <View
            {...startHandleResponder.panHandlers}
            style={[styles.cropHandle, styles.cropHandleStart]}
          >
            <View style={styles.cropHandleBar} />
          </View>

          {/* End handle */}
          <View
            {...endHandleResponder.panHandlers}
            style={[styles.cropHandle, styles.cropHandleEnd]}
          >
            <View style={styles.cropHandleBar} />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  regionEditor: {
    position: 'absolute',
    top: '35%',
    bottom: '15%',
    borderRadius: 10,
    justifyContent: 'center',
    paddingHorizontal: 8,
    zIndex: 1000,
  },
  moveOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  regionLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  modeLabel: {
    color: '#4A90E2',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  cropHandle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 144, 226, 0.3)',
  },
  cropHandleStart: {
    left: -2,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  cropHandleEnd: {
    right: -2,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  cropHandleBar: {
    width: 4,
    height: '60%',
    backgroundColor: '#4A90E2',
    borderRadius: 2,
  },
});
