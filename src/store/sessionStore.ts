import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Session, Track, Region } from '../types/session';

interface SessionState {
  sessions: Session[];
  session: Session;
  currentSessionId: string;
  activeRecordingRegionId: string | null;
  // Actions
  addRegion: (trackId: string, regionPartial: Partial<Region> & { fileUri: string }) => string;
  moveRegion: (regionId: string, deltaSeconds: number) => void;
  cropRegionStart: (regionId: string, delta: number) => void;
  cropRegionEnd: (regionId: string, delta: number) => void;
  armTrack: (trackId: string) => void;
  updateTrackVolume: (trackId: string, volume: number) => void;
  updateTrackPan: (trackId: string, pan: number) => void;
  updateTrackEQ: (trackId: string, band: 'low' | 'mid' | 'high', value: number) => void;
  setPlayhead: (seconds: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setIsRecording: (isRecording: boolean) => void;
  setBpm: (bpm: number) => void;
  setActiveRecordingRegion: (regionId: string | null) => void;
  updateRegionEnd: (regionId: string, endTime: number) => void;
  updateRegionFileUri: (regionId: string, fileUri: string) => void;
  setRegionLive: (regionId: string, isLive: boolean) => void;
  removeRegion: (regionId: string) => void;
  createSession: (name?: string) => Session;
  openSession: (sessionId: string) => void;
  renameSession: (sessionId: string, name: string) => void;
}

// Initialize default session with 4 tracks, 360s duration, 48kHz
const createDefaultSession = (name?: string): Session => {
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const makeTrack = (index: number): Track => ({
    id: `${sessionId}-track-${index + 1}`,
    name: `Track ${String(index + 1).padStart(2, '0')}`,
    volume: 0.8,
    pan: 0,
    eq: { low: 0, mid: 0, high: 0 },
    muted: false,
    solo: false,
    armed: index === 0,
    regions: [],
  });

  return {
    id: sessionId,
    name: name ?? 'New Session',
    duration: 360, // 6:00 minutes
    sampleRate: 48000,
    bpm: 120, // default BPM
    playhead: 0,
    isPlaying: false,
    isRecording: false,
    createdAt: Date.now(),
    tracks: Array.from({ length: 4 }, (_, index) => makeTrack(index)),
  };
};

const formatSessionName = (index: number) => `Session ${String(index).padStart(2, '0')}`;

const initialSession = createDefaultSession(formatSessionName(1));

export const useSessionStore = create<SessionState>()(
  immer((set, get) => ({
    sessions: [initialSession],
    session: initialSession,
    currentSessionId: initialSession.id,
    activeRecordingRegionId: null,

    // Add a region to a track, returns the regionId
    addRegion: (trackId: string, regionPartial: Partial<Region> & { fileUri: string }) => {
      const regionId = 'region-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      
      set((state) => {
        const track = state.session.tracks.find((t) => t.id === trackId);
        if (!track) {
          console.error('[sessionStore] Track not found:', trackId);
          return;
        }

        const newRegion: Region = {
          id: regionId,
          fileUri: regionPartial.fileUri,
          startTime: regionPartial.startTime ?? 0,
          endTime: regionPartial.endTime ?? 10,
          offset: regionPartial.offset ?? 0,
          reverse: regionPartial.reverse ?? false,
          fadeIn: regionPartial.fadeIn ?? 0,
          fadeOut: regionPartial.fadeOut ?? 0,
          isLive: regionPartial.isLive ?? false,
          effects: regionPartial.effects ?? {},
        };

        track.regions.push(newRegion);
        console.log('[sessionStore] Added region:', regionId, 'to track:', trackId);
      });

      return regionId;
    },

    // Move a region by delta seconds (adds to both startTime and endTime)
    moveRegion: (regionId: string, deltaSeconds: number) => {
      set((state) => {
        for (const track of state.session.tracks) {
          const region = track.regions.find((r) => r.id === regionId);
          if (region) {
            region.startTime += deltaSeconds;
            region.endTime += deltaSeconds;
            console.log('[sessionStore] Moved region:', regionId, 'by', deltaSeconds);
            return;
          }
        }
        console.error('[sessionStore] Region not found:', regionId);
      });
    },

    // Crop region start: increases offset and startTime
    cropRegionStart: (regionId: string, delta: number) => {
      set((state) => {
        for (const track of state.session.tracks) {
          const region = track.regions.find((r) => r.id === regionId);
          if (region) {
            region.offset += delta;
            region.startTime += delta;
            console.log('[sessionStore] Cropped region start:', regionId, 'by', delta);
            return;
          }
        }
        console.error('[sessionStore] Region not found:', regionId);
      });
    },

    // Crop region end: decreases endTime
    cropRegionEnd: (regionId: string, delta: number) => {
      set((state) => {
        for (const track of state.session.tracks) {
          const region = track.regions.find((r) => r.id === regionId);
          if (region) {
            region.endTime += delta; // delta can be negative to shorten
            console.log('[sessionStore] Cropped region end:', regionId, 'by', delta);
            return;
          }
        }
        console.error('[sessionStore] Region not found:', regionId);
      });
    },

    // Arm a track (set armed = true, others = false)
    armTrack: (trackId: string) => {
      set((state) => {
        for (const track of state.session.tracks) {
          track.armed = track.id === trackId;
        }
        console.log('[sessionStore] Armed track:', trackId);
      });
    },

    // Update track volume (0..1)
    updateTrackVolume: (trackId: string, volume: number) => {
      set((state) => {
        const track = state.session.tracks.find((t) => t.id === trackId);
        if (track) {
          track.volume = Math.max(0, Math.min(1, volume));
          console.log('[sessionStore] Updated track volume:', trackId, track.volume);
        }
      });
    },

    // Update track pan (-1..1)
    updateTrackPan: (trackId: string, pan: number) => {
      set((state) => {
        const track = state.session.tracks.find((t) => t.id === trackId);
        if (track) {
          track.pan = Math.max(-1, Math.min(1, pan));
          console.log('[sessionStore] Updated track pan:', trackId, track.pan);
        }
      });
    },

    // Update track EQ band
    updateTrackEQ: (trackId: string, band: 'low' | 'mid' | 'high', value: number) => {
      set((state) => {
        const track = state.session.tracks.find((t) => t.id === trackId);
        if (track) {
          track.eq[band] = Math.max(-12, Math.min(12, value));
          console.log('[sessionStore] Updated track EQ:', trackId, band, track.eq[band]);
        }
      });
    },

    // Update playhead position
    setPlayhead: (seconds: number) => {
      set((state) => {
        state.session.playhead = Math.max(0, Math.min(seconds, state.session.duration));
      });
    },

    // Set playing state
    setIsPlaying: (isPlaying: boolean) => {
      set((state) => {
        state.session.isPlaying = isPlaying;
      });
    },

    // Set recording state
    setIsRecording: (isRecording: boolean) => {
      set((state) => {
        state.session.isRecording = isRecording;
      });
    },

    // Set BPM
    setBpm: (bpm: number) => {
      set((state) => {
        state.session.bpm = Math.max(40, Math.min(240, bpm));
        console.log('[sessionStore] BPM set to:', state.session.bpm);
      });
    },

    setActiveRecordingRegion: (regionId: string | null) => {
      set((state) => {
        state.activeRecordingRegionId = regionId;
      });
    },

    updateRegionEnd: (regionId: string, endTime: number) => {
      set((state) => {
        for (const track of state.session.tracks) {
          const region = track.regions.find((r) => r.id === regionId);
          if (region) {
            region.endTime = Math.max(region.startTime, endTime);
            return;
          }
        }
      });
    },

    updateRegionFileUri: (regionId: string, fileUri: string) => {
      set((state) => {
        for (const track of state.session.tracks) {
          const region = track.regions.find((r) => r.id === regionId);
          if (region) {
            region.fileUri = fileUri;
            console.log('[sessionStore] Updated region fileUri:', regionId, 'to', fileUri);
            return;
          }
        }
      });
    },

    setRegionLive: (regionId: string, isLive: boolean) => {
      set((state) => {
        for (const track of state.session.tracks) {
          const region = track.regions.find((r) => r.id === regionId);
          if (region) {
            region.isLive = isLive;
            return;
          }
        }
      });
    },

    removeRegion: (regionId: string) => {
      set((state) => {
        for (const track of state.session.tracks) {
          const index = track.regions.findIndex((r) => r.id === regionId);
          if (index !== -1) {
            track.regions.splice(index, 1);
            if (state.activeRecordingRegionId === regionId) {
              state.activeRecordingRegionId = null;
            }
            return;
          }
        }
      });
    },

    createSession: (name?: string) => {
      const { sessions } = get();
      const defaultName = name ?? formatSessionName(Math.max(1, sessions.length + 1));
      const newSession = createDefaultSession(defaultName);

      set((state) => {
        state.sessions.unshift(newSession);
        state.session = newSession;
        state.currentSessionId = newSession.id;
        state.session.playhead = 0;
        state.session.isPlaying = false;
        state.session.isRecording = false;
        state.activeRecordingRegionId = null;
      });

      return newSession;
    },

    openSession: (sessionId: string) => {
      set((state) => {
        const target = state.sessions.find((s) => s.id === sessionId);
        if (!target) {
          console.warn('[sessionStore] Session not found:', sessionId);
          return;
        }
        state.session = target;
        state.currentSessionId = target.id;
        state.activeRecordingRegionId = null;
      });
    },

    renameSession: (sessionId: string, name: string) => {
      set((state) => {
        const target = state.sessions.find((s) => s.id === sessionId);
        if (!target) {
          console.warn('[sessionStore] Cannot rename missing session:', sessionId);
          return;
        }
        target.name = name;
        if (state.session.id === sessionId) {
          state.session.name = name;
        }
      });
    },
  }))
);
