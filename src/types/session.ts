export type Seconds = number;

export type Region = {
  id: string;
  fileUri: string;      // local file path (file://&)
  startTime: Seconds;   // absolute on session timeline
  endTime: Seconds;     // absolute on session timeline
  offset: Seconds;      // offset inside file
  reverse: boolean;
  fadeIn: Seconds;
  fadeOut: Seconds;
  isLive?: boolean;
  effects: {
    reverb?: { wet: number; preset?: string };
    delay?: { time: Seconds; feedback: number; mix: number };
    saturation?: { drive: number; mix: number };
  };
};

export type Track = {
  id: string;
  name: string;
  volume: number; // 0..1 (UI), convert to dB in native
  pan: number;    // -1..1
  eq: { low: number; mid: number; high: number }; // dB offsets
  muted: boolean;
  solo: boolean;
  armed: boolean;
  regions: Region[];
};

export type Session = {
  id: string;
  name: string;
  duration: Seconds; // 360 fixed
  sampleRate: number; // 48000
  bpm: number; // 40-240, default 120
  playhead: Seconds; // 0..duration
  isPlaying: boolean;
  isRecording: boolean;
  tracks: Track[];
  createdAt: number; // epoch
};
