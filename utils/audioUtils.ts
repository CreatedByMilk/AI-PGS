import { Clip } from '../types';
import { getAudioContext } from './audioContext';

/**
 * Decodes a base64 string into a raw byte array (Uint8Array).
 * @param base64 The base64 encoded audio string.
 * @returns The decoded byte array.
 */
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Manually creates an AudioBuffer from raw 16-bit PCM audio data.
 * This is the crucial step to correctly handle the API's raw audio output.
 * @param data The raw audio data as a Uint8Array.
 * @returns A promise that resolves with the playable AudioBuffer.
 */
async function decodeAudioData(data: Uint8Array): Promise<AudioBuffer> {
  const ctx = getAudioContext();
  const sampleRate = 24000; // This must match the TTS model's output sample rate.
  const numChannels = 1;

  // The raw data is 16-bit signed integers (PCM).
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;

  // Create an empty AudioBuffer with the correct parameters.
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  // Manually copy the PCM data into the AudioBuffer, converting each sample
  // from the integer range [-32768, 32767] to the float range [-1.0, 1.0].
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const generateWaveformData = (audioBuffer: AudioBuffer, points: number = 100): number[] => {
  const data = audioBuffer.getChannelData(0);
  const step = Math.floor(data.length / points);
  const waveform = [];
  for (let i = 0; i < points; i++) {
    const blockStart = step * i;
    let max = 0;
    for (let j = 0; j < step; j++) {
      if(blockStart + j < data.length) {
        const val = Math.abs(data[blockStart + j]);
        if (val > max) {
          max = val;
        }
      }
    }
    waveform.push(max);
  }
  return waveform;
};


export const generateNewClip = async (trackId: number, name: string, audioB64: string, mimeType: string): Promise<Omit<Clip, 'start'>> => {
    const rawBytes = decode(audioB64);
    const audioBuffer = await decodeAudioData(rawBytes);
    const waveform = generateWaveformData(audioBuffer);
    return {
        id: `clip-${Date.now()}-${Math.random()}`,
        trackId,
        name,
        duration: audioBuffer.duration,
        audioB64,
        mimeType,
        waveform,
        audioBuffer,
    };
};