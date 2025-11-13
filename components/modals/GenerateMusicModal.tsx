import React, { useState, useRef, useEffect } from 'react';
import Slider from '../ui/Slider';
import { generateVoice } from '../../services/geminiService';
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

const GenerateMusicModal: React.FC<GenerateMusicModalProps> = ({ onClose, onAddClip, ai }) => {
  const [sliderValues, setSliderValues] = useState<number[]>(() => musicStyles.map(() => 0.5));
  const [isMixing, setIsMixing] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // A simple placeholder beat loop
    audioRef.current = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=");
    audioRef.current.loop = true;
    return () => {
        audioRef.current?.pause();
    }
  }, []);

  const handleSliderChange = (index: number, value: number) => {
    setSliderValues(prev => {
      const newValues = [...prev];
      newValues[index] = value;
      return newValues;
    });
  };

  const handleStartMixing = () => {
    setIsMixing(true);
    audioRef.current?.play();
  };
  
  const handleCapture = async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    audioRef.current?.pause();

    try {
        const activeStyles = musicStyles
            .map((style, index) => ({ style, value: sliderValues[index] }))
            .filter(item => item.value > 0.1)
            .sort((a,b) => b.value - a.value);
        
        const prompt = `Describe a 15-second piece of music featuring these elements with their respective intensity: ${activeStyles.map(s => `${s.style} at ${Math.round(s.value * 100)}%`).join(', ')}. The style should be electronic and atmospheric.`;
        const clipName = activeStyles.map(s => s.style).slice(0, 2).join(' & ') || "Generated Music";

        // We use the TTS model to simulate a music generation API
        const { audioB64, mimeType } = await generateVoice(ai, prompt, 'Zephyr');
        await onAddClip(2, clipName, audioB64, mimeType);
        onClose();
    } catch (error) {
        console.error("Error generating music:", error);
        alert("Failed to generate music. Please check your API key and try again.");
    } finally {
        setIsCapturing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#F5F5F5] border border-black w-full max-w-4xl p-4">
        <h2 className="font-mono text-black">GENERATE MUSIC (REAL-TIME MIXER)</h2>
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
              <button onClick={handleStartMixing} className="font-mono text-sm text-white bg-black px-3 py-1.5">[ START MIX ]</button>
            )}
            {isMixing && (
              <button onClick={handleCapture} className="font-mono text-sm text-white bg-[#FF4F00] px-3 py-1.5" disabled={isCapturing}>
                {isCapturing ? '[ CAPTURING... ]' : '[ CAPTURE_15S ]'}
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