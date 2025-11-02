/**
 * Time formatting utilities for displaying playhead and region times
 */

/**
 * Convert seconds to mm:ss format
 */
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const minsStr = mins.toString().padStart(2, '0');
  const secsStr = secs.toString().padStart(2, '0');
  return minsStr + ':' + secsStr;
};

/**
 * Convert seconds to mm:ss.ms format
 */
export const formatTimeDetailed = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  const minsStr = mins.toString().padStart(2, '0');
  const secsStr = secs.toString().padStart(2, '0');
  const msStr = ms.toString().padStart(2, '0');
  return minsStr + ':' + secsStr + '.' + msStr;
};
