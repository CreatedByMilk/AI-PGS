import { Track } from '../types';
import { getAudioContext } from './audioContext';

/**
 * Builds an audio processing graph for a track with all mixer settings applied.
 * This is similar to the buildAudioGraphForTrack in TimelinePanel but returns
 * the full chain for offline rendering.
 */
const buildExportAudioGraph = (track: Track, offlineContext: OfflineAudioContext) => {
  const settings = track.mixerSettings;

  // Input Gain
  const inputGainNode = offlineContext.createGain();
  inputGainNode.gain.value = settings.inputGain / 0.8;

  let currentNode: AudioNode = inputGainNode;

  // Equalizer
  if (settings.eqOn) {
    const eqLow = offlineContext.createBiquadFilter();
    eqLow.type = 'lowshelf';
    eqLow.frequency.value = 300;
    eqLow.gain.value = (settings.eqLow - 0.5) * 24;

    const eqMid = offlineContext.createBiquadFilter();
    eqMid.type = 'peaking';
    eqMid.frequency.value = 1500;
    eqMid.Q.value = 1;
    eqMid.gain.value = (settings.eqMid - 0.5) * 24;

    const eqHigh = offlineContext.createBiquadFilter();
    eqHigh.type = 'highshelf';
    eqHigh.frequency.value = 5000;
    eqHigh.gain.value = (settings.eqHigh - 0.5) * 24;

    currentNode.connect(eqLow);
    eqLow.connect(eqMid);
    eqMid.connect(eqHigh);
    currentNode = eqHigh;
  }

  // Peak Compressor
  if (settings.peakCompressorOn) {
    const peakCompressor = offlineContext.createDynamicsCompressor();
    peakCompressor.threshold.value = (settings.peakThreshold - 1) * 100;
    peakCompressor.ratio.value = 1 + settings.peakRatio * 19;
    peakCompressor.attack.value = settings.peakAttack * 0.1;
    peakCompressor.release.value = settings.peakRelease * 0.5;
    currentNode.connect(peakCompressor);
    currentNode = peakCompressor;
  }

  // Glue Compressor
  if (settings.glueCompressorOn) {
    const glueCompressor = offlineContext.createDynamicsCompressor();
    glueCompressor.threshold.value = (settings.glueThreshold - 1) * 100;
    glueCompressor.ratio.value = 1 + settings.glueRatio * 19;
    glueCompressor.attack.value = settings.glueAttack * 0.2 + 0.01;
    glueCompressor.release.value = settings.glueRelease * 0.8 + 0.1;
    currentNode.connect(glueCompressor);
    currentNode = glueCompressor;
  }

  // Saturation
  if (settings.saturationOn) {
    const saturationNode = offlineContext.createWaveShaper();
    const amount = settings.saturationValue * 100;
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = i * 2 / n_samples - 1;
      curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
    }
    saturationNode.curve = curve;
    saturationNode.oversample = '4x';
    currentNode.connect(saturationNode);
    currentNode = saturationNode;
  }

  // Output Volume
  const outputGainNode = offlineContext.createGain();
  outputGainNode.gain.value = settings.outputVolume / 0.8;
  currentNode.connect(outputGainNode);
  currentNode = outputGainNode;

  return { inputNode: inputGainNode, outputNode: currentNode };
};

/**
 * Normalizes an audio buffer to the maximum possible amplitude without clipping.
 */
const normalizeBuffer = (buffer: AudioBuffer): AudioBuffer => {
  let maxAmplitude = 0;

  // Find the maximum amplitude across all channels
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < data.length; i++) {
      const amplitude = Math.abs(data[i]);
      if (amplitude > maxAmplitude) {
        maxAmplitude = amplitude;
      }
    }
  }

  // If already at max or silent, return as is
  if (maxAmplitude === 0 || maxAmplitude >= 0.99) {
    return buffer;
  }

  // Calculate normalization factor
  const normalizationFactor = 0.99 / maxAmplitude;

  // Create a new buffer and apply normalization
  const audioContext = getAudioContext();
  const normalizedBuffer = audioContext.createBuffer(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate
  );

  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const inputData = buffer.getChannelData(channel);
    const outputData = normalizedBuffer.getChannelData(channel);
    for (let i = 0; i < buffer.length; i++) {
      outputData[i] = inputData[i] * normalizationFactor;
    }
  }

  return normalizedBuffer;
};

/**
 * Converts an AudioBuffer to a WAV file Blob.
 */
const bufferToWav = (buffer: AudioBuffer): Blob => {
  const length = buffer.length * buffer.numberOfChannels * 2;
  const arrayBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(arrayBuffer);

  // Write WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const sampleRate = buffer.sampleRate;
  const numChannels = buffer.numberOfChannels;

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM format
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true); // Byte rate
  view.setUint16(32, numChannels * 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  writeString(36, 'data');
  view.setUint32(40, length, true);

  // Write interleaved audio data
  const offset = 44;
  let index = 0;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = buffer.getChannelData(channel)[i];
      const intSample = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset + index * 2, intSample < 0 ? intSample * 0x8000 : intSample * 0x7FFF, true);
      index++;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
};

/**
 * Exports the project as a WAV file.
 * Renders all tracks with their mixer settings applied into a single audio file.
 */
export const exportProjectToWav = async (
  tracks: Track[],
  projectName: string
): Promise<void> => {
  try {
    // Calculate total duration
    const totalDuration = Math.max(
      1, // Minimum 1 second
      ...tracks.flatMap(t => t.clips.map(c => c.start + c.duration))
    );

    // Use a high sample rate for quality
    const sampleRate = 48000;
    const offlineContext = new OfflineAudioContext(
      2, // Stereo
      Math.ceil(totalDuration * sampleRate),
      sampleRate
    );

    // Check if any track is soloed
    const isAnyTrackSoloed = tracks.some(t => t.mixerSettings.isSoloed);

    // Process each track
    tracks.forEach(track => {
      // Skip muted tracks, or non-soloed tracks when solo is active
      if (isAnyTrackSoloed && !track.mixerSettings.isSoloed) return;
      if (track.mixerSettings.isMuted) return;

      // Build the audio graph for this track
      const { inputNode, outputNode } = buildExportAudioGraph(track, offlineContext);
      outputNode.connect(offlineContext.destination);

      // Schedule all clips
      track.clips.forEach(clip => {
        if (clip.audioBuffer) {
          const source = offlineContext.createBufferSource();
          source.buffer = clip.audioBuffer;
          source.connect(inputNode);
          source.start(clip.start);
        }
      });
    });

    // Render the audio
    const renderedBuffer = await offlineContext.startRendering();

    // Normalize if any track has normalization enabled
    const shouldNormalize = tracks.some(
      t => t.mixerSettings.normalizeOnExport &&
          (!isAnyTrackSoloed || t.mixerSettings.isSoloed) &&
          !t.mixerSettings.isMuted
    );

    const finalBuffer = shouldNormalize ? normalizeBuffer(renderedBuffer) : renderedBuffer;

    // Convert to WAV and download
    const wavBlob = bufferToWav(finalBuffer);
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert('Export complete! Your WAV file has been downloaded.');
  } catch (error) {
    console.error('Error exporting project:', error);
    alert('Failed to export project. Please try again.');
  }
};
