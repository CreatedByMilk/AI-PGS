import { Track, MixerSettings } from './types';

export const DEFAULT_MIXER_SETTINGS: MixerSettings = {
  inputGain: 0.8,
  deEsserOn: false,
  deEsserThreshold: 0.5,
  deEsserRatio: 0.5,
  eqOn: false,
  eqLow: 0.5,
  eqMid: 0.5,
  eqHigh: 0.5,
  peakCompressorOn: false,
  peakThreshold: 0.5,
  peakRatio: 0.5,
  peakAttack: 0.1,
  peakRelease: 0.2,
  glueCompressorOn: false,
  glueThreshold: 0.5,
  glueRatio: 0.5,
  glueAttack: 0.1,
  glueRelease: 0.2,
  saturationOn: false,
  saturationValue: 0.1,
  outputVolume: 0.8,
  normalizeOnExport: true,
  isMuted: false,
  isSoloed: false,
};

export const INITIAL_TRACKS: Track[] = [
  {
    id: 1,
    name: 'Voice 1',
    color: '#3b82f6', // blue-500
    clips: [],
    mixerSettings: { ...DEFAULT_MIXER_SETTINGS },
  },
  {
    id: 2,
    name: 'Music 1',
    color: '#22c55e', // green-500
    clips: [],
    mixerSettings: { ...DEFAULT_MIXER_SETTINGS },
  },
  {
    id: 3,
    name: 'SFX 1',
    color: '#eab308', // yellow-500
    clips: [],
    mixerSettings: { ...DEFAULT_MIXER_SETTINGS },
  },
];

export const PIXELS_PER_SECOND = 100;
export const RULER_HEIGHT = 30;
export const TRACK_HEIGHT = 100;
export const WORD_LIMIT_VOICE = 5000;

export const MODULE_KEYS: { [key: string]: (keyof MixerSettings)[] } = {
  gain: ['inputGain'],
  repair: ['deEsserOn', 'deEsserThreshold', 'deEsserRatio'],
  eq: ['eqOn', 'eqLow', 'eqMid', 'eqHigh'],
  peak: ['peakCompressorOn', 'peakThreshold', 'peakRatio', 'peakAttack', 'peakRelease'],
  glue: ['glueCompressorOn', 'glueThreshold', 'glueRatio', 'glueAttack', 'glueRelease'],
  color: ['saturationOn', 'saturationValue'],
  mastering: ['outputVolume', 'normalizeOnExport'],
};