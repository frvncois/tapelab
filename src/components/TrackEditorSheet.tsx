import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import type { Track } from '../types/session';
import TrackSlider from './TrackSlider';

interface TrackEditorSheetProps {
  visible: boolean;
  track: Track | null;
  onClose: () => void;
  onVolumeChange: (volume: number) => void;
  onPanChange: (pan: number) => void;
  onEQChange: (band: 'low' | 'mid' | 'high', value: number) => void;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT = 500;

export default function TrackEditorSheet({
  visible,
  track,
  onClose,
  onVolumeChange,
  onPanChange,
  onEQChange,
}: TrackEditorSheetProps) {
  const translateY = React.useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const [localVolume, setLocalVolume] = React.useState(track?.volume ?? 0.8);
  const [localPan, setLocalPan] = React.useState(track?.pan ?? 0);
  const [localEQ, setLocalEQ] = React.useState(track?.eq ?? { low: 0, mid: 0, high: 0 });

  React.useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, translateY]);

  React.useEffect(() => {
    if (track) {
      setLocalVolume(track.volume);
      setLocalPan(track.pan);
      setLocalEQ(track.eq);
    }
  }, [track]);

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          onClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 20,
            stiffness: 200,
          }).start();
        }
      },
    })
  ).current;

  if (!track) return null;

  // Convert 0..1 volume to dB (-60 to 0 dB)
  const volumeDB = localVolume === 0 ? -60 : 20 * Math.log10(localVolume);
  const panPercent = Math.round(localPan * 100);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY }],
            },
          ]}
        >
          <View {...panResponder.panHandlers} style={styles.handle}>
            <View style={styles.handleBar} />
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>{track.name}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* Volume Control */}
            <View style={styles.controlSection}>
              <View style={styles.controlHeader}>
                <Text style={styles.controlLabel}>Volume</Text>
                <Text style={styles.controlValue}>{volumeDB.toFixed(1)} dB</Text>
              </View>
              <TrackSlider
                type="volume"
                value={localVolume}
                minimumValue={0}
                maximumValue={1}
                onValueChange={(event) => {
                  const newVolume = event.nativeEvent.value;
                  setLocalVolume(newVolume);
                  onVolumeChange(newVolume);
                }}
              />
            </View>

            {/* Pan Control */}
            <View style={styles.controlSection}>
              <View style={styles.controlHeader}>
                <Text style={styles.controlLabel}>Pan</Text>
                <Text style={styles.controlValue}>
                  {panPercent === 0 ? 'C' : panPercent > 0 ? `${panPercent}R` : `${-panPercent}L`}
                </Text>
              </View>
              <TrackSlider
                type="pan"
                value={localPan}
                minimumValue={-1}
                maximumValue={1}
                onValueChange={(event) => {
                  const newPan = event.nativeEvent.value;
                  setLocalPan(newPan);
                  onPanChange(newPan);
                }}
              />
            </View>

            {/* EQ Controls */}
            <View style={styles.controlSection}>
              <Text style={styles.sectionTitle}>3-Band EQ</Text>

              <View style={styles.eqControl}>
                <View style={styles.controlHeader}>
                  <Text style={styles.controlLabel}>Low</Text>
                  <Text style={styles.controlValue}>{localEQ.low.toFixed(1)} dB</Text>
                </View>
                <TrackSlider
                  type="eq"
                  value={localEQ.low}
                  minimumValue={-12}
                  maximumValue={12}
                  onValueChange={(event) => {
                    const newLow = event.nativeEvent.value;
                    setLocalEQ({ ...localEQ, low: newLow });
                    onEQChange('low', newLow);
                  }}
                />
              </View>

              <View style={styles.eqControl}>
                <View style={styles.controlHeader}>
                  <Text style={styles.controlLabel}>Mid</Text>
                  <Text style={styles.controlValue}>{localEQ.mid.toFixed(1)} dB</Text>
                </View>
                <TrackSlider
                  type="eq"
                  value={localEQ.mid}
                  minimumValue={-12}
                  maximumValue={12}
                  onValueChange={(event) => {
                    const newMid = event.nativeEvent.value;
                    setLocalEQ({ ...localEQ, mid: newMid });
                    onEQChange('mid', newMid);
                  }}
                />
              </View>

              <View style={styles.eqControl}>
                <View style={styles.controlHeader}>
                  <Text style={styles.controlLabel}>High</Text>
                  <Text style={styles.controlValue}>{localEQ.high.toFixed(1)} dB</Text>
                </View>
                <TrackSlider
                  type="eq"
                  value={localEQ.high}
                  minimumValue={-12}
                  maximumValue={12}
                  onValueChange={(event) => {
                    const newHigh = event.nativeEvent.value;
                    setLocalEQ({ ...localEQ, high: newHigh });
                    onEQChange('high', newHigh);
                  }}
                />
              </View>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: SHEET_HEIGHT,
    paddingBottom: 34, // Safe area bottom
  },
  handle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: '#3a3a3a',
    borderRadius: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#888',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  controlSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  controlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  controlLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ccc',
  },
  controlValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A90E2',
    fontFamily: 'Courier',
  },
  eqControl: {
    marginBottom: 12,
  },
});
