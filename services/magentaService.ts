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
 * Creates a musical audio buffer as fallback
 * Generates an actual melody with rhythm and harmony
 */
const createFallbackAudioBuffer = (
  audioContext: AudioContext,
  duration: number
): AudioBuffer => {
  const sampleRate = audioContext.sampleRate;
  const buffer = audioContext.createBuffer(2, sampleRate * duration, sampleRate);

  // Musical notes (C major scale + some variations)
  const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25]; // C4 to C5
  const chordNotes = [
    [261.63, 329.63, 392.00], // C major
    [293.66, 349.23, 440.00], // D minor
    [329.63, 392.00, 493.88], // E minor
    [349.23, 440.00, 523.25], // F major
  ];

  for (let channel = 0; channel < 2; channel++) {
    const channelData = buffer.getChannelData(channel);

    for (let i = 0; i < channelData.length; i++) {
      const t = i / sampleRate;

      // Rhythm: 4 beats per second (120 BPM)
      const beatTime = 0.25; // 250ms per beat
      const currentBeat = Math.floor(t / beatTime);
      const beatProgress = (t % beatTime) / beatTime;

      // Melody note (changes every beat)
      const melodyNote = notes[currentBeat % 8];

      // Chord (changes every 4 beats)
      const chordIndex = Math.floor(currentBeat / 4) % 4;
      const chord = chordNotes[chordIndex];

      // Envelope: attack, decay, sustain for each beat
      let envelope = 0;
      if (beatProgress < 0.05) {
        // Quick attack
        envelope = beatProgress / 0.05;
      } else if (beatProgress < 0.7) {
        // Sustain
        envelope = 1.0 - (beatProgress - 0.05) * 0.3;
      } else {
        // Decay
        envelope = 0.7 - ((beatProgress - 0.7) / 0.3) * 0.7;
      }

      // Melody (lead)
      const melody = Math.sin(2 * Math.PI * melodyNote * t) * envelope * 0.25;

      // Chords (background)
      const harmonyEnvelope = 0.7; // Sustained background
      const harmony = (
        Math.sin(2 * Math.PI * chord[0] * t) * 0.15 +
        Math.sin(2 * Math.PI * chord[1] * t) * 0.12 +
        Math.sin(2 * Math.PI * chord[2] * t) * 0.10
      ) * harmonyEnvelope;

      // Bass (octave below root)
      const bass = Math.sin(2 * Math.PI * (chord[0] / 2) * t) * 0.2 * harmonyEnvelope;

      // Light arpeggio effect
      const arpTime = (t * 8) % 1;
      const arpNote = chord[Math.floor(arpTime * 3)];
      const arpEnvelope = Math.exp(-arpTime * 5);
      const arp = Math.sin(2 * Math.PI * arpNote * t) * arpEnvelope * 0.08;

      // Mix all elements
      channelData[i] = melody + harmony + bass + arp;

      // Pan slightly (channel 0 left, channel 1 right)
      if (channel === 0) {
        channelData[i] *= 0.9; // Melody slightly left
      } else {
        channelData[i] *= 1.0; // Harmony slightly right
      }

      // Master volume
      channelData[i] *= 0.4;
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
