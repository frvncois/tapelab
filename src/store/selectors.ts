import { useSessionStore } from './sessionStore';
import type { Track, Region } from '../types/session';

/**
 * Selectors for accessing computed/derived state from the session store
 */

/**
 * Get the currently armed track (if any)
 */
export const useArmedTrack = (): Track | undefined => {
  return useSessionStore((state) => state.session.tracks.find((t) => t.armed));
};

/**
 * Get all regions for a specific track
 */
export const useRegionsByTrack = (trackId: string): Region[] => {
  return useSessionStore((state) => {
    const track = state.session.tracks.find((t) => t.id === trackId);
    return track?.regions || [];
  });
};

/**
 * Get a specific track by ID
 */
export const useTrack = (trackId: string): Track | undefined => {
  return useSessionStore((state) => state.session.tracks.find((t) => t.id === trackId));
};

/**
 * Get all tracks
 */
export const useTracks = (): Track[] => {
  return useSessionStore((state) => state.session.tracks);
};

/**
 * Get session duration
 */
export const useSessionDuration = (): number => {
  return useSessionStore((state) => state.session.duration);
};

/**
 * Get current playhead position
 */
export const usePlayhead = (): number => {
  return useSessionStore((state) => state.session.playhead);
};

/**
 * Get playing state
 */
export const useIsPlaying = (): boolean => {
  return useSessionStore((state) => state.session.isPlaying);
};

/**
 * Get recording state
 */
export const useIsRecording = (): boolean => {
  return useSessionStore((state) => state.session.isRecording);
};

/**
 * Get BPM
 */
export const useBpm = (): number => {
  return useSessionStore((state) => state.session.bpm);
};

/**
 * Get the entire session (use sparingly to avoid unnecessary re-renders)
 */
export const useSession = () => {
  return useSessionStore((state) => state.session);
};
