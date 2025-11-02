import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Region } from '../types/session';

type RegionViewProps = {
  region: Region;
  pixelsPerSecond: number;
};

export default function RegionView({ region, pixelsPerSecond }: RegionViewProps) {
  const left = region.startTime * pixelsPerSecond;
  const width = (region.endTime - region.startTime) * pixelsPerSecond;
  const isLive = region.isLive;

  return (
    <View 
      style={[
        styles.region,
        {
          left,
          width: Math.max(width, 12), // minimum width for visibility
          backgroundColor: isLive ? '#FF9F0A' : '#4A90E2',
          borderColor: isLive ? '#FFB347' : '#5AA3F7',
          opacity: isLive ? 0.8 : 1,
        },
      ]}
    >
      <Text style={styles.regionLabel} numberOfLines={1}>
        {region.id.substring(0, 8)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  region: {
    position: 'absolute',
    height: 50,
    backgroundColor: '#4A90E2',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#5AA3F7',
    justifyContent: 'center',
    paddingHorizontal: 8,
    bottom: 10,
  },
  regionLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },
});
