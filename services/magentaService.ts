import * as mm from '@magenta/music';

/**
 * Magenta.js Music Generation Service
 * Uses MusicVAE for AI-powered music generation
 */

let musicVAE: mm.MusicVAE | null = null;
let isModelLoaded = false;

/**
 * Initializes the MusicVAE model (call once on app start)
 */
export const initMagentaModel = async (): Promise<void> => {
  if (isModelLoaded) return;

  try {
    console.log('Loading Magenta MusicVAE model...');

    // Use the 2bar_small model - faster, good for short clips
    musicVAE = new mm.MusicVAE(
      'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_2bar_small'
    );

    await musicVAE.initialize();
    isModelLoaded = true;
    console.log('Magenta model loaded successfully!');
  } catch (error) {
    console.error('Error loading Magenta model:', error);
    throw new Error('Failed to load AI music model');
  }
};

/**
 * Generates music based on style parameters
 */
export const generateMusicFromParams = async (params: {
  temperature?: number;        // 0-2, higher = more random/creative
  numSteps?: number;           // Number of notes to generate
  stepsPerQuarter?: number;    // Tempo control
}): Promise<mm.INoteSequence> => {
  if (!musicVAE || !isModelLoaded) {
    await initMagentaModel();
  }

  const { temperature = 1.0, numSteps = 32, stepsPerQuarter = 4 } = params;

  try {
    // Sample from the model
    const samples = await musicVAE!.sample(1, temperature);
    const sequence = samples[0];

    // Set tempo
    if (sequence.tempos && sequence.tempos.length > 0) {
      sequence.tempos[0].qpm = 120; // 120 BPM default
    }

    return sequence;
  } catch (error) {
    console.error('Error generating music:', error);
    throw new Error('Failed to generate music');
  }
};

/**
 * Converts slider values to music generation parameters
 */
export const sliderValuesToMusicParams = (
  sliderValues: number[]
): { temperature: number; complexity: number; energy: number } => {
  // Map the 8 sliders to musical parameters
  // Sliders: Strings, Kick, Techno, Pads, Lead, Piano, Guitar, Bass

  const avgValue = sliderValues.reduce((sum, val) => sum + val, 0) / sliderValues.length;

  // Temperature: based on variety (how different the slider values are)
  const variance = sliderValues.reduce((sum, val) => sum + Math.pow(val - avgValue, 2), 0) / sliderValues.length;
  const temperature = Math.max(0.5, Math.min(1.5, 0.5 + variance * 2));

  // Complexity: based on number of active sliders
  const activeCount = sliderValues.filter(v => v > 0.2).length;
  const complexity = activeCount / sliderValues.length;

  // Energy: based on average slider position
  const energy = avgValue;

  return { temperature, complexity, energy };
};

/**
 * Converts a NoteSequence to AudioBuffer using Web Audio API
 */
export const noteSequenceToAudioBuffer = async (
  sequence: mm.INoteSequence,
  audioContext: AudioContext,
  duration: number = 15
): Promise<AudioBuffer> => {
  try {
    // Use Magenta's SoundFont player
    const player = new mm.SoundFontPlayer(
      'https://storage.googleapis.com/magentadata/js/soundfonts/sgm_plus'
    );

    await player.loadSamples(sequence);

    // Create an offline context for rendering
    const sampleRate = audioContext.sampleRate;
    const offlineContext = new OfflineAudioContext(
      2, // stereo
      sampleRate * duration,
      sampleRate
    );

    // Create a destination node
    const gainNode = offlineContext.createGain();
    gainNode.connect(offlineContext.destination);

    // Start playback into offline context
    await player.start(sequence, undefined, offlineContext as any);

    // Render the audio
    const renderedBuffer = await offlineContext.startRendering();

    return renderedBuffer;
  } catch (error) {
    console.error('Error rendering note sequence:', error);
    // Fallback: create a simple synthesized buffer
    return createFallbackAudioBuffer(audioContext, duration);
  }
};

/**
 * Creates a simple synthesized audio buffer as fallback
 */
const createFallbackAudioBuffer = (
  audioContext: AudioContext,
  duration: number
): AudioBuffer => {
  const sampleRate = audioContext.sampleRate;
  const buffer = audioContext.createBuffer(2, sampleRate * duration, sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const channelData = buffer.getChannelData(channel);

    // Create a simple melody with multiple sine waves
    for (let i = 0; i < channelData.length; i++) {
      const t = i / sampleRate;

      // Simple chord progression
      const freq1 = 440 * Math.pow(2, Math.floor(t * 2) % 4 / 12); // Changes every 0.5s
      const freq2 = freq1 * 1.25; // Perfect fourth
      const freq3 = freq1 * 1.5;  // Perfect fifth

      // Envelope
      const envelope = Math.exp(-t * 0.5) * Math.sin(t * 8 * Math.PI); // Decay with vibrato

      channelData[i] = (
        Math.sin(2 * Math.PI * freq1 * t) * 0.3 +
        Math.sin(2 * Math.PI * freq2 * t) * 0.2 +
        Math.sin(2 * Math.PI * freq3 * t) * 0.1
      ) * envelope * 0.3;
    }
  }

  return buffer;
};

/**
 * Converts AudioBuffer to base64 WAV
 */
export const audioBufferToBase64 = (buffer: AudioBuffer): { audioB64: string; mimeType: string } => {
  // Convert AudioBuffer to WAV
  const wav = audioBufferToWav(buffer);

  // Convert to base64
  const base64 = arrayBufferToBase64(wav);

  return {
    audioB64: base64,
    mimeType: 'audio/wav',
  };
};

/**
 * Converts AudioBuffer to WAV ArrayBuffer
 */
const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const data = interleave(buffer);
  const dataLength = data.length * bytesPerSample;
  const headerLength = 44;
  const totalLength = headerLength + dataLength;

  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);

  // Write WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalLength - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // Write audio data
  floatTo16BitPCM(view, 44, data);

  return arrayBuffer;
};

const interleave = (buffer: AudioBuffer): Float32Array => {
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length * numChannels;
  const result = new Float32Array(length);

  let offset = 0;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      result[offset++] = buffer.getChannelData(channel)[i];
    }
  }

  return result;
};

const writeString = (view: DataView, offset: number, string: string): void => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

const floatTo16BitPCM = (view: DataView, offset: number, input: Float32Array): void => {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

/**
 * Main function: Generate music from slider values
 */
export const generateMusicFromSliders = async (
  sliderValues: number[],
  duration: number = 15
): Promise<{ audioB64: string; mimeType: string }> => {
  // Convert sliders to music parameters
  const { temperature } = sliderValuesToMusicParams(sliderValues);

  // Generate note sequence
  const sequence = await generateMusicFromParams({
    temperature,
    numSteps: 32,
    stepsPerQuarter: 4,
  });

  // Create audio context
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

  // Convert to audio buffer
  const audioBuffer = await noteSequenceToAudioBuffer(sequence, audioContext, duration);

  // Convert to base64
  return audioBufferToBase64(audioBuffer);
};
