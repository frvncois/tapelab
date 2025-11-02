import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import TapelabAudio from '../native';

type WaveformViewProps = {
  fileUri: string;
  width: number;
  height: number;
  samplesPerPixel?: number;
  color?: string;
};

export default function WaveformView({
  fileUri,
  width,
  height,
  samplesPerPixel = 512,
  color = '#34C759',
}: WaveformViewProps) {
  const [peaks, setPeaks] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    generateWaveform();
  }, [fileUri, samplesPerPixel]);

  const generateWaveform = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await TapelabAudio.generateWaveform(fileUri, samplesPerPixel);
      setPeaks(result.peaks);
      setLoading(false);
    } catch (err) {
      console.error('[WaveformView] Error generating waveform:', err);
      setError('Failed to generate waveform');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { width, height }]}>
        <ActivityIndicator size="small" color={color} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { width, height }]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (peaks.length === 0) {
    return (
      <View style={[styles.container, { width, height }]}>
        <Text style={styles.emptyText}>No waveform data</Text>
      </View>
    );
  }

  // Convert peaks to SVG polyline points
  const centerY = height / 2;
  const scaleX = width / peaks.length;
  const scaleY = height / 2;

  // Create points for both positive and negative waveform
  const points = peaks
    .map((peak, index) => {
      const x = index * scaleX;
      const y = centerY - peak * scaleY;
      return `${x},${y}`;
    })
    .join(' ');

  // Mirror points for the bottom half
  const mirrorPoints = peaks
    .map((peak, index) => {
      const x = index * scaleX;
      const y = centerY + peak * scaleY;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        {/* Top half of waveform */}
        <Polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={1}
        />
        {/* Bottom half of waveform (mirrored) */}
        <Polyline
          points={mirrorPoints}
          fill="none"
          stroke={color}
          strokeWidth={1}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
  },
  emptyText: {
    color: '#666',
    fontSize: 12,
  },
});
