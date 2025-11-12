const AudioCtxt = window.AudioContext || (window as any).webkitAudioContext;

// Create a single AudioContext instance at the browser's native sample rate.
// This provides the best performance and stability. The browser's audio engine
// is highly optimized to handle resampling from the 24kHz clip buffers during playback.
const audioContext = new AudioCtxt();

/**
 * Returns the singleton AudioContext instance.
 * Resumes the context if it's suspended (e.g., due to browser autoplay policies).
 */
export const getAudioContext = () => {
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
};