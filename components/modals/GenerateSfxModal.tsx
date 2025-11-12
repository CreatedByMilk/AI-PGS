import React, { useState } from 'react';
import { SfxAsset } from '../../types';
import { generateVoice, combineSfxPrompts } from '../../services/geminiService';
import { GoogleGenAI } from '@google/genai';

interface GenerateSfxModalProps {
  onClose: () => void;
  onAddClip: (trackId: number, name: string, audioB64: string, mimeType: string) => Promise<void>;
  ai: GoogleGenAI;
}

const GenerateSfxModal: React.FC<GenerateSfxModalProps> = ({ onClose, onAddClip, ai }) => {
  const [prompt, setPrompt] = useState('');
  const [assets, setAssets] = useState<SfxAsset[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const { audioB64, mimeType } = await generateVoice(ai, prompt, "Zephyr"); // Use a different voice for SFX
      const newAsset: SfxAsset = {
        id: `sfx-${Date.now()}`,
        name: prompt,
        audioB64,
        mimeType,
      };
      setAssets(prev => [...prev, newAsset]);
      setPrompt('');
    } catch (error) {
      console.error("Error generating SFX:", error);
      alert("Failed to generate SFX.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCombine = async () => {
    if (selectedAssets.size < 2 || isLoading) return;
    setIsLoading(true);
    try {
        const promptsToCombine = assets.filter(a => selectedAssets.has(a.id)).map(a => a.name);
        const combinedPrompt = await combineSfxPrompts(ai, promptsToCombine);
        const { audioB64, mimeType } = await generateVoice(ai, combinedPrompt, "Zephyr");
        const newAsset: SfxAsset = {
            id: `sfx-combined-${Date.now()}`,
            name: combinedPrompt.substring(0, 50),
            audioB64,
            mimeType,
        };
        setAssets(prev => [...prev, newAsset]);
        setSelectedAssets(new Set());
    } catch (error) {
        console.error("Error combining SFX:", error);
        alert("Failed to combine SFX.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleAssetClick = (id: string) => {
    setSelectedAssets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, asset: SfxAsset) => {
    e.dataTransfer.setData('application/json', JSON.stringify(asset));
  };
  
  // This is a placeholder for dropping on the timeline. Real implementation would be more complex.
  const handleAddToTimeline = (asset: SfxAsset) => {
    onAddClip(3, asset.name, asset.audioB64, asset.mimeType);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#F5F5F5] border border-black w-full max-w-2xl p-4 flex flex-col" style={{ height: '70vh' }}>
        <h2 className="font-mono text-black">GENERATE SFX</h2>
        <div className="flex my-2">
          <input
            type="text"
            className="flex-grow p-2 border border-black bg-white text-black font-mono"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., door creak, footsteps, laser blast"
            disabled={isLoading}
          />
          <button onClick={handleGenerate} className="font-mono text-sm text-white bg-black px-3 py-1.5" disabled={isLoading}>
            {isLoading ? '[ ... ]' : '[ GENERATE ]'}
          </button>
        </div>
        <div className="flex-grow border border-black bg-white p-2 overflow-y-auto">
            <h3 className="font-mono text-xs text-black">ASSET BIN (Click to select, double-click to add to timeline)</h3>
            {assets.map(asset => (
                <div 
                    key={asset.id} 
                    className={`p-1 mt-1 border font-mono text-xs cursor-pointer ${selectedAssets.has(asset.id) ? 'bg-[#FF4F00] text-white' : 'text-black bg-gray-100'}`}
                    onClick={() => handleAssetClick(asset.id)}
                    onDoubleClick={() => handleAddToTimeline(asset)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, asset)}
                >
                    {asset.name}
                </div>
            ))}
        </div>
        <div className="flex justify-between items-center mt-4">
          <button onClick={handleCombine} className="font-mono text-sm text-white bg-[#FF4F00] px-3 py-1.5" disabled={selectedAssets.size < 2 || isLoading}>
            [ COMBINE_FX ]
          </button>
          <button onClick={onClose} className="font-mono text-sm text-black border border-black px-3 py-1.5" disabled={isLoading}>
            [ CLOSE ]
          </button>
        </div>
      </div>
    </div>
  );
};

export default GenerateSfxModal;