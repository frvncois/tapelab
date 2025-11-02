export type ScheduleRegion = {
  trackId: string;
  regionId: string;
  fileUri: string;
  startTime: number; // absolute
  endTime: number;   // absolute
  offset: number;    // in file
  reverse: boolean;
  fadeIn: number;
  fadeOut: number;
  track: { volume: number; pan: number; eq: { low: number; mid: number; high: number } };
  regionFx?: { reverb?: any; delay?: any; saturation?: any };
};

export type RecordStopResult = { duration: number };
