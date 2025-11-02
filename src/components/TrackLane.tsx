import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { Track } from '../types/session';
import RegionView from './RegionView';

export const TRACK_ROW_HEIGHT = 88;

type TrackLaneProps = {
  track: Track;
  pixelsPerSecond: number;
  timelineWidth: number;
};

export default function TrackLane({ track, pixelsPerSecond, timelineWidth }: TrackLaneProps) {
  return (
    <View style={[styles.container, { height: TRACK_ROW_HEIGHT }]} pointerEvents="box-none">
      <View style={[styles.lane, { width: timelineWidth }]}>
        {track.regions.map((region) => (
          <RegionView
            key={region.id}
            region={region}
            pixelsPerSecond={pixelsPerSecond}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
    position: 'relative',
    justifyContent: 'center',
  },
  lane: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    position: 'relative',
  },
});
