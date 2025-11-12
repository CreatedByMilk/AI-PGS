export interface Clip {
  id: string;
  trackId: number;
  name: string;
  start: number; // in seconds
  duration: number; // in seconds
  audioB64: string; // base64 encoded audio
  mimeType: string;
  waveform: number[]; // Simplified waveform data [0-1]
  audioBuffer?: AudioBuffer;
}

export interface MixerSettings {
  inputGain: number; // 0-1
  deEsserOn: boolean;
  deEsserThreshold: number; // 0-1
  deEsserRatio: number; // 0-1
  eqOn: boolean;
  eqLow: number; // 0-1
  eqMid: number; // 0-1
  eqHigh: number; // 0-1
  peakCompressorOn: boolean;
  peakThreshold: number; // 0-1
  peakRatio: number; // 0-1
  peakAttack: number; // 0-1
  peakRelease: number; // 0-1
  glueCompressorOn: boolean;
  glueThreshold: number; // 0-1
  glueRatio: number; // 0-1
  glueAttack: number; // 0-1
  glueRelease: number; // 0-1
  saturationOn: boolean;
  saturationValue: number; // 0-1
  outputVolume: number; // 0-1
  normalizeOnExport: boolean;
  isMuted: boolean;
  isSoloed: boolean;
}

export interface Track {
  id: number;
  name: string;
  color: string;
  clips: Clip[];
  mixerSettings: MixerSettings;
}

export interface SfxAsset {
    id: string;
    name: string;
    audioB64: string;
    mimeType: string;
}

export interface ProjectState {
  projectName: string;
  tracks: Track[];
}