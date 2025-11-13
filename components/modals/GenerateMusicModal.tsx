import React, { useState, useRef, useEffect } from 'react';
import Slider from '../ui/Slider';
import { getAudioContext } from '../../utils/audioContext';
import { generateMusicFromSliders, initMagentaModel } from '../../services/magentaService';
import { GoogleGenAI } from '@google/genai';

interface GenerateMusicModalProps {
  onClose: () => void;
  onAddClip: (trackId: number, name: string, audioB64: string, mimeType: string) => Promise<void>;
  ai: GoogleGenAI;
}

const musicStyles = [
  "Lush Strings",
  "Punchy Kick",
  "Minimal Techno",
  "Ambient Pads",
  "8-bit Lead",
  "Jazzy Piano",
  "Distorted Guitar",
  "Funky Bassline"
];

// Audio synthesis parameters for each style
const styleParams = [
  { freq: 220, type: 'sine' as OscillatorType, detune: 0, filterFreq: 800 },     // Lush Strings
  { freq: 55, type: 'sine' as OscillatorType, detune: 0, filterFreq: 150 },      // Punchy Kick (low)
  { freq: 130.81, type: 'square' as OscillatorType, detune: 0, filterFreq: 1200 }, // Minimal Techno
  { freq: 110, type: 'sine' as OscillatorType, detune: 5, filterFreq: 600 },     // Ambient Pads
  { freq: 523.25, type: 'square' as OscillatorType, detune: 0, filterFreq: 2000 }, // 8-bit Lead
  { freq: 261.63, type: 'triangle' as OscillatorType, detune: 0, filterFreq: 1500 }, // Jazzy Piano
  { freq: 82.41, type: 'sawtooth' as OscillatorType, detune: -10, filterFreq: 1800 }, // Distorted Guitar
  { freq: 65.41, type: 'sawtooth' as OscillatorType, detune: 0, filterFreq: 400 }  // Funky Bassline
];

const GenerateMusicModal: React.FC<GenerateMusicModalProps> = ({ onClose, onAddClip, ai }) => {
  const [sliderValues, setSliderValues] = useState<number[]>(() => musicStyles.map(() => 0.5));
  const [isMixing, setIsMixing] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [loadingText, setLoadingText] = useState('Loading AI model...');

  const oscillatorsRef = useRef<Array<{
    osc: OscillatorNode;
    gain: GainNode;
    filter: BiquadFilterNode;
  }>>([]);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Initialize Magenta model on mount
    const loadModel = async () => {
      try {
        setLoadingText('Loading AI music model...');
        await initMagentaModel();
        setIsModelLoaded(true);
        setLoadingText('');
      } catch (error) {
        console.error('Failed to load music model:', error);
        setLoadingText('Model load failed - using fallback');
        setIsModelLoaded(true); // Allow fallback generation
      }
    };
    loadModel();

    return () => {
      // Cleanup on unmount
      oscillatorsRef.current.forEach(({ osc }) => {
        try { osc.stop(); } catch (e) {}
      });
      oscillatorsRef.current = [];
    };
  }, []);

  const handleSliderChange = (index: number, value: number) => {
    setSliderValues(prev => {
      const newValues = [...prev];
      newValues[index] = value;
      return newValues;
    });

    // Update gain in real-time if mixing
    if (isMixing && oscillatorsRef.current[index]) {
      oscillatorsRef.current[index].gain.gain.setTargetAtTime(
        value * 0.15, // Scale down for pleasant mixing
        audioContextRef.current!.currentTime,
        0.05
      );
    }
  };

  const handleStartMixing = () => {
    setIsMixing(true);

    const audioContext = getAudioContext();
    audioContextRef.current = audioContext;

    // Create oscillators for each style with LFO for musical variation
    styleParams.forEach((params, index) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();

      // Add LFO (Low Frequency Oscillator) for pitch variation
      const lfo = audioContext.createOscillator();
      const lfoGain = audioContext.createGain();

      lfo.frequency.value = 0.5 + Math.random() * 2; // Random slow modulation
      lfoGain.gain.value = params.detune + 10; // Slight pitch modulation

      osc.type = params.type;
      osc.frequency.value = params.freq;
      osc.detune.value = params.detune;

      filter.type = 'lowpass';
      filter.frequency.value = params.filterFreq;
      filter.Q.value = 1;

      // Add tremolo effect for rhythm
      const tremoloLfo = audioContext.createOscillator();
      const tremoloGain = audioContext.createGain();
      tremoloLfo.frequency.value = 4; // 4 Hz tremolo
      tremoloGain.gain.value = 0.3; // Modulation depth

      const tremoloOffset = audioContext.createGain();
      tremoloOffset.gain.value = 0.7; // Base level

      // Connect tremolo: LFO -> tremoloGain -> tremoloOffset
      tremoloLfo.connect(tremoloGain);
      tremoloGain.connect(tremoloOffset.gain);

      // Connect pitch LFO
      lfo.connect(lfoGain);
      lfoGain.connect(osc.detune);

      gain.gain.value = sliderValues[index] * 0.12; // Slightly lower volume

      // Audio path: osc -> filter -> tremoloOffset -> gain -> destination
      osc.connect(filter);
      filter.connect(tremoloOffset);
      tremoloOffset.connect(gain);
      gain.connect(audioContext.destination);

      osc.start();
      lfo.start();
      tremoloLfo.start();

      oscillatorsRef.current.push({ osc, gain, filter });
    });
  };
  
  const handleCapture = async () => {
    if (isCapturing || !isModelLoaded) return;
    setIsCapturing(true);

    // Stop all oscillators
    oscillatorsRef.current.forEach(({ osc }) => {
      try { osc.stop(); } catch (e) {}
    });
    oscillatorsRef.current = [];
    setIsMixing(false);

    try {
        const activeStyles = musicStyles
            .map((style, index) => ({ style, value: sliderValues[index] }))
            .filter(item => item.value > 0.1)
            .sort((a,b) => b.value - a.value);

        const clipName = activeStyles.map(s => s.style).slice(0, 2).join(' & ') || "Generated Music";

        // Generate music using Magenta.js AI model
        const { audioB64, mimeType } = await generateMusicFromSliders(sliderValues, 15);
        await onAddClip(2, clipName, audioB64, mimeType);
        onClose();
    } catch (error) {
        console.error("Error generating music:", error);
        alert("Failed to generate music. The AI model may still be loading.");
    } finally {
        setIsCapturing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#F5F5F5] border border-black w-full max-w-4xl p-4">
        <h2 className="font-mono text-black">GENERATE MUSIC (AI-POWERED MIXER)</h2>
        {loadingText && (
          <div className="font-mono text-xs text-[#FF4F00] my-2">
            {loadingText}
          </div>
        )}
        {!loadingText && (
          <div className="font-mono text-xs text-gray-600 my-2">
            MODEL: MAGENTA_MUSIC_VAE | MODE: REAL-TIME_SYNTHESIS + AI_GENERATION
          </div>
        )}
        <div className="grid grid-cols-4 md:grid-cols-8 gap-4 my-4">
          {musicStyles.map((style, index) => (
            <div key={style} className="text-center">
              <Slider
                label={`FDR_0${index + 1}`}
                value={sliderValues[index]}
                onChange={v => handleSliderChange(index, v)}
                vertical
              />
              <span className="font-mono text-xs text-black mt-2 block">{style}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center mt-4">
          <div>
            {!isMixing && (
              <button onClick={handleStartMixing} className="font-mono text-sm text-white bg-black px-3 py-1.5" disabled={!isModelLoaded}>[ START MIX ]</button>
            )}
            {isMixing && (
              <button onClick={handleCapture} className="font-mono text-sm text-white bg-[#FF4F00] px-3 py-1.5" disabled={isCapturing || !isModelLoaded}>
                {isCapturing ? '[ GENERATING AI MUSIC... ]' : '[ CAPTURE_15S (AI) ]'}
              </button>
            )}
          </div>
          <button onClick={onClose} className="font-mono text-sm text-black border border-black px-3 py-1.5" disabled={isCapturing}>
            [ CANCEL ]
          </button>
        </div>
      </div>
    </div>
  );
};

export default GenerateMusicModal;