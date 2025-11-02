import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { Track } from '../types/session';
import RegionView from './RegionView';
import RegionEditor from './RegionEditor';

export const TRACK_ROW_HEIGHT = 88; // Legacy export, kept for compatibility

type TrackLaneProps = {
  track: Track;
  pixelsPerSecond: number;
  timelineWidth: number;
  trackHeight?: number;
  editingRegionId?: string | null;
  editingMode?: 'crop' | 'move' | null;
  onCrop?: (regionId: string) => void;
  onMove?: (regionId: string) => void;
  onDelete?: (regionId: string) => void;
  onEditUpdate?: (regionId: string, updates: { startTime?: number; endTime?: number; offset?: number }) => void;
};

export default function TrackLane({
  track,
  pixelsPerSecond,
  timelineWidth,
  trackHeight = TRACK_ROW_HEIGHT,
  editingRegionId,
  editingMode,
  onCrop,
  onMove,
  onDelete,
  onEditUpdate,
}: TrackLaneProps) {
  return (
    <View style={[styles.container, { height: trackHeight }]} pointerEvents="box-none">
      <View style={[styles.lane, { width: timelineWidth }]}>
        {track.regions.map((region) => {
          // If this region is being edited, show editor instead
          if (editingRegionId === region.id && editingMode) {
            return (
              <RegionEditor
                key={region.id}
                region={region}
                pixelsPerSecond={pixelsPerSecond}
                mode={editingMode}
                onUpdate={onEditUpdate || (() => {})}
              />
            );
          }

          // Otherwise show normal region view
          return (
            <RegionView
              key={region.id}
              region={region}
              pixelsPerSecond={pixelsPerSecond}
              onCrop={onCrop}
              onMove={onMove}
              onDelete={onDelete}
            />
          );
        })}
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
