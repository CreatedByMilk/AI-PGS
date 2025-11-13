// @ts-ignore
import * as jsfxrPkg from 'jsfxr';
const jsfxr = (jsfxrPkg as any).default || jsfxrPkg;

/**
 * jsfxr parameter presets for different sound effect types
 * Based on: https://github.com/chr15m/jsfxr
 */

export interface SfxrParams {
  wave_type?: number;        // 0=square, 1=sawtooth, 2=sine, 3=noise
  p_base_freq?: number;      // Base frequency (0-1)
  p_freq_ramp?: number;      // Frequency ramp (-1 to 1)
  p_freq_dramp?: number;     // Frequency delta ramp (-1 to 1)
  p_duty?: number;           // Square duty (0-1)
  p_duty_ramp?: number;      // Duty ramp (-1 to 1)
  p_vib_strength?: number;   // Vibrato strength (0-1)
  p_vib_speed?: number;      // Vibrato speed (0-1)
  p_env_attack?: number;     // Attack time (0-1)
  p_env_sustain?: number;    // Sustain time (0-1)
  p_env_decay?: number;      // Decay time (0-1)
  p_env_punch?: number;      // Sustain punch (0-1)
  p_lpf_resonance?: number;  // Low-pass filter resonance (0-1)
  p_lpf_freq?: number;       // Low-pass filter cutoff (0-1)
  p_lpf_ramp?: number;       // Low-pass filter ramp (-1 to 1)
  p_hpf_freq?: number;       // High-pass filter cutoff (0-1)
  p_hpf_ramp?: number;       // High-pass filter ramp (-1 to 1)
  p_pha_offset?: number;     // Phaser offset (-1 to 1)
  p_pha_ramp?: number;       // Phaser sweep (-1 to 1)
  p_repeat_speed?: number;   // Repeat speed (0-1)
  p_arp_speed?: number;      // Arpeggio/chord speed (0-1)
  p_arp_mod?: number;        // Arpeggio/chord change amount (-1 to 1)
}

// Preset templates for common sound effects
export const sfxrPresets: { [key: string]: SfxrParams } = {
  pickup: {
    wave_type: 0,
    p_base_freq: 0.4,
    p_freq_ramp: 0.5,
    p_env_attack: 0,
    p_env_sustain: 0.1,
    p_env_decay: 0.3,
    p_lpf_freq: 1,
  },
  laser: {
    wave_type: 0,
    p_base_freq: 0.8,
    p_freq_ramp: -0.5,
    p_env_attack: 0,
    p_env_sustain: 0.1,
    p_env_decay: 0.2,
    p_lpf_freq: 1,
  },
  explosion: {
    wave_type: 3,
    p_base_freq: 0.3,
    p_freq_ramp: -0.3,
    p_env_attack: 0,
    p_env_sustain: 0.4,
    p_env_decay: 0.5,
    p_lpf_freq: 0.8,
    p_hpf_freq: 0.1,
  },
  powerup: {
    wave_type: 0,
    p_base_freq: 0.2,
    p_freq_ramp: 0.4,
    p_env_attack: 0,
    p_env_sustain: 0.3,
    p_env_decay: 0.4,
    p_vib_strength: 0.5,
    p_vib_speed: 0.5,
  },
  hit: {
    wave_type: 3,
    p_base_freq: 0.3,
    p_freq_ramp: -0.7,
    p_env_attack: 0,
    p_env_sustain: 0.05,
    p_env_decay: 0.2,
    p_hpf_freq: 0.3,
  },
  jump: {
    wave_type: 0,
    p_base_freq: 0.4,
    p_freq_ramp: 0.3,
    p_env_attack: 0,
    p_env_sustain: 0.1,
    p_env_decay: 0.3,
    p_lpf_freq: 1,
  },
  blip: {
    wave_type: 0,
    p_base_freq: 0.6,
    p_env_attack: 0,
    p_env_sustain: 0.05,
    p_env_decay: 0.1,
    p_lpf_freq: 1,
  },
  random: {
    wave_type: Math.floor(Math.random() * 4),
    p_base_freq: Math.random(),
    p_freq_ramp: Math.random() * 2 - 1,
    p_env_attack: Math.random() * 0.3,
    p_env_sustain: Math.random() * 0.5,
    p_env_decay: Math.random() * 0.5,
  },
};

/**
 * Fallback: Generate SFX using Web Audio API when jsfxr fails
 */
const generateSfxFallback = (params: SfxrParams): string => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const sampleRate = audioContext.sampleRate;
  const duration = (params.p_env_attack || 0) + (params.p_env_sustain || 0.1) + (params.p_env_decay || 0.2);
  const bufferSize = Math.floor(sampleRate * duration);

  const buffer = audioContext.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);

  const baseFreq = 440 * Math.pow(2, ((params.p_base_freq || 0.5) - 0.5) * 4);
  const freqRamp = params.p_freq_ramp || 0;

  // Accumulate phase for smooth frequency transitions
  let phase = 0;
  let prevFreq = baseFreq;

  for (let i = 0; i < bufferSize; i++) {
    const t = i / sampleRate;
    const progress = i / bufferSize;

    // Frequency with smooth ramp
    const freq = baseFreq * (1 + freqRamp * progress);

    // Update phase (prevents clicking during frequency changes)
    phase += (2 * Math.PI * freq) / sampleRate;

    // Generate waveform based on wave_type
    let sample = 0;

    switch (params.wave_type || 0) {
      case 0: // Square
        sample = Math.sin(phase) > 0 ? 1 : -1;
        break;
      case 1: // Sawtooth
        sample = 2 * ((phase / (2 * Math.PI)) % 1) - 1;
        break;
      case 2: // Sine
        sample = Math.sin(phase);
        break;
      case 3: // Noise
        sample = Math.random() * 2 - 1;
        break;
    }

    // Apply envelope with punch
    const attack = Math.max(0.001, params.p_env_attack || 0.01);
    const sustain = params.p_env_sustain || 0.1;
    const decay = Math.max(0.01, params.p_env_decay || 0.2);
    const punch = params.p_env_punch || 0;

    let envelope = 0;
    if (t < attack) {
      // Attack phase
      envelope = t / attack;
    } else if (t < attack + sustain) {
      // Sustain phase with punch
      const punchValue = punch * (1 - (t - attack) / sustain);
      envelope = 1 + punchValue;
    } else {
      // Decay phase
      const decayProgress = (t - attack - sustain) / decay;
      envelope = Math.max(0, 1 - decayProgress);
    }

    // Apply vibrato if specified
    const vibStrength = params.p_vib_strength || 0;
    const vibSpeed = params.p_vib_speed || 0;
    if (vibStrength > 0) {
      const vibrato = Math.sin(2 * Math.PI * vibSpeed * 10 * t) * vibStrength;
      sample *= 1 + vibrato;
    }

    data[i] = sample * envelope * 0.5;

    prevFreq = freq;
  }

  // Convert buffer to WAV data URL
  const wav = bufferToWav(buffer);
  return arrayBufferToDataUrl(wav);
};

/**
 * Helper: Convert AudioBuffer to WAV
 */
const bufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
  const length = buffer.length * 2;
  const arrayBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(arrayBuffer);
  const data = buffer.getChannelData(0);

  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, length, true);

  // Write audio data
  let offset = 44;
  for (let i = 0; i < data.length; i++) {
    const sample = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    offset += 2;
  }

  return arrayBuffer;
};

/**
 * Helper: Convert ArrayBuffer to Data URL
 */
const arrayBufferToDataUrl = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
};

/**
 * Generates SFX using jsfxr parameters (with fallback)
 */
export const generateSfxFromParams = (params: SfxrParams): string => {
  // Try jsfxr first
  if (jsfxr && typeof jsfxr === 'function') {
    try {
      const paramsArray = jsfxr.toArray ? jsfxr.toArray(params) : params;
      const sound = jsfxr(paramsArray);
      return sound;
    } catch (e) {
      console.warn('jsfxr failed, using fallback:', e);
    }
  }

  // Use Web Audio API fallback
  return generateSfxFallback(params);
};

/**
 * Generates SFX from a preset name
 */
export const generateSfxFromPreset = (presetName: string): string => {
  const preset = sfxrPresets[presetName.toLowerCase()] || sfxrPresets.blip;
  return generateSfxFromParams(preset);
};

/**
 * Uses Gemini AI to analyze text and suggest sfxr parameters
 */
export const textToSfxrParams = async (
  ai: any,
  description: string
): Promise<SfxrParams> => {
  try {
    const prompt = `You are a sound designer. Given this sound effect description: "${description}"

Generate jsfxr parameters as JSON. Return ONLY valid JSON with these exact keys:
{
  "wave_type": 0-3 (0=square, 1=sawtooth, 2=sine, 3=noise),
  "p_base_freq": 0-1 (pitch, higher = higher pitch),
  "p_freq_ramp": -1 to 1 (pitch slide, positive = up),
  "p_env_attack": 0-1 (fade in time),
  "p_env_sustain": 0-1 (hold time),
  "p_env_decay": 0-1 (fade out time),
  "p_lpf_freq": 0-1 (brightness, higher = brighter),
  "p_hpf_freq": 0-1 (remove bass)
}

Guidelines:
- Explosions: noise wave, low freq, long decay, mid lpf
- Lasers: square wave, high freq, negative ramp, short decay
- Pickups: square wave, mid freq, positive ramp, medium sustain
- Hits: noise wave, low-mid freq, negative ramp, very short decay
- Blips/UI: square wave, high freq, no ramp, very short decay

Return ONLY the JSON object, no explanation.`;

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const jsonText = result.text.trim();
    // Remove markdown code blocks if present
    const cleanJson = jsonText.replace(/```json\n?|\n?```/g, '');
    const params = JSON.parse(cleanJson);

    return params;
  } catch (error) {
    console.error('Error generating SFX params:', error);
    // Return a safe default
    return sfxrPresets.blip;
  }
};

/**
 * Converts WAV data URL to base64 audio data
 */
export const wavDataUrlToBase64 = (dataUrl: string): { audioB64: string; mimeType: string } => {
  // jsfxr returns data URL format: "data:audio/wav;base64,..."
  const parts = dataUrl.split(',');
  const mimeType = parts[0].split(':')[1].split(';')[0];
  const audioB64 = parts[1];

  return { audioB64, mimeType };
};

/**
 * Complete pipeline: text description -> AI params -> jsfxr sound -> base64
 */
export const generateSfxFromText = async (
  ai: any,
  description: string
): Promise<{ audioB64: string; mimeType: string }> => {
  // Get AI-suggested parameters
  const params = await textToSfxrParams(ai, description);

  // Generate sound
  const wavDataUrl = generateSfxFromParams(params);

  // Convert to base64
  return wavDataUrlToBase64(wavDataUrl);
};

/**
 * Combines multiple sets of parameters by averaging them
 */
export const combineParams = (paramsArray: SfxrParams[]): SfxrParams => {
  if (paramsArray.length === 0) return sfxrPresets.blip;
  if (paramsArray.length === 1) return paramsArray[0];

  const combined: SfxrParams = {};
  const keys = Object.keys(paramsArray[0]) as (keyof SfxrParams)[];

  keys.forEach(key => {
    const values = paramsArray
      .map(p => p[key])
      .filter((v): v is number => typeof v === 'number');

    if (values.length > 0) {
      combined[key] = values.reduce((sum, val) => sum + val, 0) / values.length;
    }
  });

  return combined;
};
