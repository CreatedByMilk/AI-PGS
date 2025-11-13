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
 * Generates SFX using jsfxr parameters
 */
export const generateSfxFromParams = (params: SfxrParams): string => {
  // Convert params to jsfxr array format
  const paramsArray = jsfxr.toArray(params);

  // Generate the sound
  const sound = jsfxr(paramsArray);

  return sound;
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
