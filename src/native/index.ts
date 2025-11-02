import { NativeModules, NativeEventEmitter } from 'react-native';
import type { ScheduleRegion } from '../types/audio';

export interface TapelabAPI {
  startAt(seconds: number, hostStartTime?: number | null): Promise<boolean>;
  seek(seconds: number): Promise<boolean>;
  stop(): Promise<boolean>;
  setSpeed(rate: number): void;
  clearSchedule(): void;
  scheduleRegions(regions: ScheduleRegion[], fromSeconds: number): void;
  startRecording(fileUri: string, playhead: number, trackId: string): Promise<boolean>;
  startRecordingWithCountIn(fileUri: string, playhead: number, trackId: string, bpm: number): Promise<{ recordStartHostTime: number; countInDuration: number }>;
  stopRecording(): Promise<{ duration: number; fileUri?: string }>;
  requestRecordPermission(): Promise<boolean>;
  setTrackVolume(trackId: string, volume: number): void;
  setTrackPan(trackId: string, pan: number): void;
  setTrackEQ(trackId: string, low: number, mid: number, high: number): void;
  setRegionFade(regionId: string, fadeIn: number, fadeOut: number): void;
  setRegionReverse(regionId: string, reverse: boolean): void;
  setRegionReverb(regionId: string, wet: number, preset?: string): void;
  setRegionDelay(regionId: string, time: number, feedback: number, mix: number): void;
  getRoundtripLatency(): Promise<number>;
  getCurrentRoute(): Promise<string>;
  generateWaveform(fileUri: string, samplesPerPixel: number): Promise<{ fileUri: string; peaks: number[]; duration: number }>;
  bounceSession(outputUri: string, duration: number): Promise<{ fileUri: string; duration: number }>;
}

// Mock implementation for now (will be replaced by native module in Milestone C)
const TapelabAudio: TapelabAPI = NativeModules.TapelabAudio || {
  startAt: async (seconds: number, hostStartTime?: number | null) => {
    console.log('[TapelabAudio] startAt:', seconds, hostStartTime);
    return true;
  },
  seek: async (seconds: number) => {
    console.log('[TapelabAudio] seek:', seconds);
    return true;
  },
  stop: async () => {
    console.log('[TapelabAudio] stop');
    return true;
  },
  setSpeed: (rate: number) => {
    console.log('[TapelabAudio] setSpeed:', rate);
  },
  clearSchedule: () => {
    console.log('[TapelabAudio] clearSchedule');
  },
  scheduleRegions: (regions: ScheduleRegion[], fromSeconds: number) => {
    console.log('[TapelabAudio] scheduleRegions:', regions.length, 'from', fromSeconds);
  },
  startRecording: async (fileUri: string, playhead: number, trackId: string) => {
    console.log('[TapelabAudio] startRecording:', { fileUri, playhead, trackId });
    return true;
  },
  startRecordingWithCountIn: async (fileUri: string, playhead: number, trackId: string, bpm: number) => {
    console.log('[TapelabAudio] startRecordingWithCountIn:', { fileUri, playhead, trackId, bpm });
    const countInDuration = (60 / bpm) * 4; // 4 beats
    const recordStartHostTime = Date.now() * 1000000; // Mock hostTime in nanoseconds
    return { recordStartHostTime, countInDuration };
  },
  stopRecording: async () => {
    console.log('[TapelabAudio] stopRecording');
    return { duration: 0, fileUri: '' };
  },
  requestRecordPermission: async () => {
    console.log('[TapelabAudio] requestRecordPermission (mock)');
    return true;
  },
  setTrackVolume: (trackId: string, volume: number) => {
    console.log('[TapelabAudio] setTrackVolume:', trackId, volume);
  },
  setTrackPan: (trackId: string, pan: number) => {
    console.log('[TapelabAudio] setTrackPan:', trackId, pan);
  },
  setTrackEQ: (trackId: string, low: number, mid: number, high: number) => {
    console.log('[TapelabAudio] setTrackEQ:', trackId, { low, mid, high });
  },
  setRegionFade: (regionId: string, fadeIn: number, fadeOut: number) => {
    console.log('[TapelabAudio] setRegionFade:', regionId, { fadeIn, fadeOut });
  },
  setRegionReverse: (regionId: string, reverse: boolean) => {
    console.log('[TapelabAudio] setRegionReverse:', regionId, reverse);
  },
  setRegionReverb: (regionId: string, wet: number, preset?: string) => {
    console.log('[TapelabAudio] setRegionReverb:', regionId, { wet, preset });
  },
  setRegionDelay: (regionId: string, time: number, feedback: number, mix: number) => {
    console.log('[TapelabAudio] setRegionDelay:', regionId, { time, feedback, mix });
  },
  getRoundtripLatency: async () => {
    console.log('[TapelabAudio] getRoundtripLatency');
    return 0;
  },
  getCurrentRoute: async () => {
    console.log('[TapelabAudio] getCurrentRoute');
    return 'speaker';
  },
  generateWaveform: async (fileUri: string, samplesPerPixel: number) => {
    console.log('[TapelabAudio] generateWaveform:', fileUri, samplesPerPixel);
    return { fileUri: '', peaks: [], duration: 0 };
  },
  bounceSession: async (outputUri: string, duration: number) => {
    console.log('[TapelabAudio] bounceSession:', outputUri, duration);
    return { fileUri: outputUri, duration };
  },
};

// Event emitter for playhead updates
export const TapelabAudioEmitter = NativeModules.TapelabAudio
  ? new NativeEventEmitter(NativeModules.TapelabAudio)
  : null;

export default TapelabAudio;
