import { Alert } from 'react-native';
import TapelabAudio from '../native';
import { useSessionStore } from './sessionStore';
import type { ScheduleRegion } from '../types/audio';
import type { Session } from '../types/session';

/**
 * Transport controls for playback and recording.
 * This store manages transport state and communicates with the native audio engine.
 */

export const transportStore = {
  /**
   * Start playback from current playhead position
   */
  play: async () => {
    const { session, setIsPlaying } = useSessionStore.getState();

    console.log('[transport] play() at playhead:', session.playhead);

    schedulePlayback(session, session.playhead);

    // Update state
    setIsPlaying(true);

    // Call native bridge
    try {
      await TapelabAudio.startAt(session.playhead, null);
      console.log('[transport] Playback started successfully');
    } catch (error) {
      console.error('[transport] Failed to start playback:', error);
      setIsPlaying(false);
    }
  },

  /**
   * Stop playback or recording
   */
  stop: async () => {
    const { session, setIsPlaying } = useSessionStore.getState();

    console.log('[transport] stop()');

    // If recording, call recordStop which handles both
    if (session.isRecording) {
      await transportStore.recordStop();
      return;
    }

    // Update state
    setIsPlaying(false);

    // Call native bridge
    try {
      await TapelabAudio.stop();
      console.log('[transport] Stopped successfully');
    } catch (error) {
      console.error('[transport] Failed to stop:', error);
    }
  },

  /**
   * Seek to a specific time position
   */
  seek: async (seconds: number) => {
    const { setPlayhead } = useSessionStore.getState();
    
    console.log('[transport] seek() to:', seconds);
    
    // Update playhead in state
    setPlayhead(seconds);
    
    // Call native bridge
    try {
      await TapelabAudio.seek(seconds);
      console.log('[transport] Seeked to:', seconds);
    } catch (error) {
      console.error('[transport] Failed to seek:', error);
    }
  },

  // Track current recording file URI
  _currentRecordingUri: null as string | null,
  _currentRecordingRegionId: null as string | null,
  _recordingStartPlayhead: null as number | null,

  /**
   * Start recording on the armed track
   */
  recordStart: async () => {
    const {
      session,
      setIsRecording,
      setIsPlaying,
      addRegion,
      setActiveRecordingRegion,
      setRegionLive,
    } = useSessionStore.getState();

    // Find armed track
    const armedTrack = session.tracks.find((t) => t.armed);
    if (!armedTrack) {
      console.error('[transport] No track armed for recording');
      return;
    }

    const hasPermission = await TapelabAudio.requestRecordPermission();
    if (!hasPermission) {
      Alert.alert(
        'Microphone Access Needed',
        'Enable microphone access in Settings to record audio in Tapelab.'
      );
      return;
    }

    // Generate file URI for recording
    const timestamp = Date.now();
    const fileUri = 'file://recordings/recording-' + timestamp + '.wav';
    transportStore._currentRecordingUri = fileUri;

    const startPosition = session.playhead;
    console.log('[transport] recordStart() on track:', armedTrack.id, 'at playhead:', startPosition);

    const regionId = addRegion(armedTrack.id, {
      fileUri,
      startTime: startPosition,
      endTime: startPosition,
      offset: 0,
      isLive: true,
    });

    setActiveRecordingRegion(regionId);
    setRegionLive(regionId, true);
    transportStore._currentRecordingRegionId = regionId;
    transportStore._recordingStartPlayhead = startPosition;

    // Update state
    setIsRecording(true);
    setIsPlaying(true); // Recording implies playback of other tracks

    schedulePlayback(session, startPosition);

    // Call native bridge with count-in
    try {
      // Use count-in recording which returns duration to wait before starting playback
      const result = await TapelabAudio.startRecordingWithCountIn(
        fileUri,
        startPosition,
        armedTrack.id,
        session.bpm
      );
      const countInDuration = result.recordWillStartIn || result.countInDuration;
      console.log('[transport] Count-in started at', session.bpm, 'BPM, duration:', countInDuration, 's');

      // Wait for count-in to finish, then start playback for synchronized timing
      setTimeout(async () => {
        try {
          await TapelabAudio.startAt(startPosition, null);
          console.log('[transport] Playback started after count-in - synchronized with recording');
        } catch (err) {
          console.error('[transport] Failed to start playback after count-in:', err);
        }
      }, countInDuration * 1000);

      console.log('[transport] Recording started successfully with hidden click track count-in');
    } catch (error) {
      console.error('[transport] Failed to start count-in recording:', error);
      setIsRecording(false);
      setIsPlaying(false);
      transportStore._currentRecordingUri = null;
      transportStore._currentRecordingRegionId = null;
      transportStore._recordingStartPlayhead = null;
      useSessionStore.getState().setActiveRecordingRegion(null);
      useSessionStore.getState().removeRegion(regionId);
    }
  },

  /**
   * Stop recording and create region
   */
  recordStop: async () => {
    const {
      session,
      setIsRecording,
      setIsPlaying,
      updateRegionEnd,
      updateRegionFileUri,
      setRegionLive,
      removeRegion,
      setActiveRecordingRegion,
    } = useSessionStore.getState();

    console.log('[transport] recordStop() - isRecording:', session.isRecording);

    // Verify we're actually recording
    if (!session.isRecording) {
      console.error('[transport] recordStop called but isRecording is false');
      return;
    }

    const regionId = transportStore._currentRecordingRegionId;
    const recordingStartPlayhead = transportStore._recordingStartPlayhead ?? session.playhead;

    // STEP 1: Stop recording FIRST (native call)
    try {
      const result = await TapelabAudio.stopRecording();
      console.log('[transport] Recording stopped, duration:', result.duration);

      const recordedUri = (result as { duration: number; fileUri?: string }).fileUri ?? transportStore._currentRecordingUri;

      // Verify duration is > 0
      if (result.duration === 0) {
        console.error('[transport] ❌ Recording duration is 0! No audio was captured.');
      } else {
        console.log('[transport] ✅ Recording duration:', result.duration, 'seconds');
      }

      // Update state
      setIsRecording(false);

      if (regionId) {
        if (result.duration > 0 && recordedUri) {
          updateRegionEnd(regionId, recordingStartPlayhead + result.duration);
          updateRegionFileUri(regionId, recordedUri);
          setRegionLive(regionId, false);
        } else {
          removeRegion(regionId);
        }
      }

      transportStore._currentRecordingUri = null;
      transportStore._currentRecordingRegionId = null;
      transportStore._recordingStartPlayhead = null;
      setActiveRecordingRegion(null);

      // STEP 2: Stop transport SECOND (native call)
      setIsPlaying(false);
      await TapelabAudio.stop();
      console.log('[transport] Transport stopped after recording');

    } catch (error) {
      console.error('[transport] Failed to stop recording:', error);
      setIsRecording(false);
      setIsPlaying(false);
      transportStore._currentRecordingUri = null;
      if (transportStore._currentRecordingRegionId) {
        removeRegion(transportStore._currentRecordingRegionId);
      }
      transportStore._currentRecordingRegionId = null;
      transportStore._recordingStartPlayhead = null;
      setActiveRecordingRegion(null);
    }
  },
};

const buildScheduleRegions = (session: Session): ScheduleRegion[] => {
  const regions: ScheduleRegion[] = [];
  session.tracks.forEach((track) => {
    track.regions.forEach((region) => {
      if (!region.fileUri) return;
      if (region.endTime <= region.startTime) return;
      regions.push({
        trackId: track.id,
        regionId: region.id,
        fileUri: region.fileUri,
        startTime: region.startTime,
        endTime: region.endTime,
        offset: region.offset,
        reverse: region.reverse ?? false,
        fadeIn: region.fadeIn ?? 0,
        fadeOut: region.fadeOut ?? 0,
        track: {
          volume: track.volume,
          pan: track.pan,
          eq: track.eq,
        },
        regionFx: region.effects,
      });
    });
  });
  return regions;
};

const schedulePlayback = (session: Session, startAt: number) => {
  const regions = buildScheduleRegions(session);
  TapelabAudio.clearSchedule();
  if (regions.length > 0) {
    TapelabAudio.scheduleRegions(regions, startAt);
  }
};
