import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useIsPlaying, useIsRecording } from '../store/selectors';
import { transportStore } from '../store/transportStore';
import { TapelabAudioEmitter } from '../native';

export default function Transport() {
  const isPlaying = useIsPlaying();
  const isRecording = useIsRecording();
  const [inputLevel, setInputLevel] = useState(0);

  const handleRewind = async () => {
    console.log('[Transport] Rewind');
    await transportStore.seek(0);
  };

  const handlePlay = async () => {
    console.log('[Transport] Play');
    await transportStore.play();
  };

  const handleStop = async () => {
    console.log('[Transport] Stop');
    await transportStore.stop();
  };

  const handleRecord = async () => {
    console.log('[Transport] Record');
    if (isRecording) {
      await transportStore.recordStop();
    } else {
      await transportStore.recordStart();
    }
  };

  useEffect(() => {
    const subscription = TapelabAudioEmitter?.addListener('onInputLevel', (event: { level: number }) => {
      setInputLevel(event.level);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  // Convert level (0-1) to dB for display
  const levelDb = inputLevel > 0 ? 20 * Math.log10(inputLevel) : -60;
  const levelPercent = Math.max(0, Math.min(100, ((levelDb + 60) / 60) * 100));

  return (
    <View style={styles.container}>
      {/* Status indicators */}
      <View style={styles.statusRow}>
        {isPlaying && (
          <View style={styles.statusIndicator}>
            <View style={styles.playingDot} />
            <Text style={styles.statusText}>Playing</Text>
          </View>
        )}
        {isRecording && (
          <View style={styles.statusIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.statusText}>Recording</Text>
          </View>
        )}
      </View>

      {/* Input Level Meter */}
      {isRecording && (
        <View style={styles.meterContainer}>
          <Text style={styles.meterLabel}>INPUT</Text>
          <View style={styles.meterBar}>
            <View
              style={[
                styles.meterFill,
                {
                  width: `${levelPercent}%`,
                  backgroundColor: levelPercent > 90 ? '#FF3B30' : levelPercent > 70 ? '#FF9500' : '#34C759'
                }
              ]}
            />
          </View>
          <Text style={styles.meterValue}>
            {levelDb > -60 ? `${levelDb.toFixed(1)} dB` : '-∞'}
          </Text>
        </View>
      )}

      {/* Transport controls */}
      <View style={styles.controls}>
        {/* Rewind */}
        <TouchableOpacity style={styles.button} onPress={handleRewind}>
          <Text style={styles.buttonText}>◀◀</Text>
        </TouchableOpacity>

        {/* Play */}
        <TouchableOpacity 
          style={[styles.button, styles.playButton, isPlaying && styles.buttonActive]} 
          onPress={handlePlay}
          disabled={isPlaying}
        >
          <Text style={[styles.buttonText, styles.playButtonText]}>▶</Text>
        </TouchableOpacity>

        {/* Stop */}
        <TouchableOpacity 
          style={[styles.button, styles.stopButton]} 
          onPress={handleStop}
        >
          <Text style={styles.buttonText}>■</Text>
        </TouchableOpacity>

        {/* Record */}
        <TouchableOpacity
          style={[
            styles.button,
            styles.recordButton,
            isRecording && styles.recordButtonActive
          ]}
          onPress={handleRecord}
        >
          <Text style={styles.buttonText}>●</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2a2a2a',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#3a3a3a',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
    minHeight: 20,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  playingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
    marginRight: 6,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    marginRight: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3a3a3a',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#4a4a4a',
  },
  buttonActive: {
    backgroundColor: '#4a4a4a',
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 24,
    color: '#fff',
  },
  playButton: {
    backgroundColor: '#34C759',
    borderColor: '#3DD762',
  },
  playButtonText: {
    color: '#fff',
  },
  stopButton: {
    backgroundColor: '#FF9500',
    borderColor: '#FFA01F',
  },
  recordButton: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF453A',
  },
  recordButtonActive: {
    backgroundColor: '#FF453A',
  },
  meterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  meterLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
    width: 45,
  },
  meterBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 4,
  },
  meterValue: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Courier',
    width: 65,
    textAlign: 'right',
  },
});
