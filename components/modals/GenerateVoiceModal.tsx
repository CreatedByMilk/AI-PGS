import React, { useState } from 'react';
import { generateVoice } from '../../services/geminiService';
import { WORD_LIMIT_VOICE } from '../../constants';
import { GoogleGenAI } from '@google/genai';
import { fileToGenerativePart } from '../../utils/fileUtils';

interface GenerateVoiceModalProps {
  onClose: () => void;
  onAddMultipleClips: (trackId: number, clipsData: { name: string; audioB64: string; mimeType: string }[]) => Promise<void>;
  ai: GoogleGenAI;
}

const GenerateVoiceModal: React.FC<GenerateVoiceModalProps> = ({ onClose, onAddMultipleClips, ai }) => {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('[ GENERATE ]');
  const [fileName, setFileName] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsLoading(true);
      setLoadingText('[ PROCESSING FILE... ]');
      setFileName(file.name);
      try {
        const part = await fileToGenerativePart(file);
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [part, { text: "Extract all text content from this document. Respond only with the text." }] }
        });
        setText(result.text);
      } catch (error) {
        console.error("Error processing file:", error);
        alert("Failed to extract text from file.");
      }
      setIsLoading(false);
      setLoadingText('[ GENERATE ]');
    }
  };

  const handleGenerate = async () => {
    if (!text.trim() || isLoading) return;
    setIsLoading(true);
    setLoadingText('[ GENERATING... ]');

    const startTime = Date.now();

    try {
      const words = text.split(/\s+/).filter(Boolean);
      const chunks: string[] = [];
      for (let i = 0; i < words.length; i += WORD_LIMIT_VOICE) {
        chunks.push(words.slice(i, i + WORD_LIMIT_VOICE).join(' '));
      }

      // Generate chunks sequentially with context for better voice consistency
      const generatedAudios = [];
      const totalChunks = chunks.length;

      for (let i = 0; i < chunks.length; i++) {
        const chunkStartTime = Date.now();
        const progress = Math.round((i / totalChunks) * 100);
        setLoadingText(`[ ${progress}% - PART ${i + 1}/${totalChunks}... ]`);

        const audio = await generateVoice(ai, chunks[i], 'Charon', {
          chunkIndex: i,
          totalChunks: totalChunks,
          isFirstChunk: i === 0,
          isLastChunk: i === totalChunks - 1,
        });

        generatedAudios.push(audio);

        // Show timing feedback for user
        const chunkTime = ((Date.now() - chunkStartTime) / 1000).toFixed(1);
        console.log(`Chunk ${i + 1}/${totalChunks} generated in ${chunkTime}s`);
      }

      const clipsData = generatedAudios.map((audio, i) => ({
          name: chunks.length > 1 ? `Narration Pt. ${i + 1}` : "Narration",
          audioB64: audio.audioB64,
          mimeType: audio.mimeType,
      }));

      // The voice track is always trackId 1 in this modal
      await onAddMultipleClips(1, clipsData);

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`Total generation time: ${totalTime}s for ${totalChunks} chunks`);

      onClose();
    } catch (error) {
      console.error("Error generating voice:", error);
      alert("Failed to generate voice. Please check your API key and try again.");
    } finally {
      setIsLoading(false);
      setLoadingText('[ GENERATE ]');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#F5F5F5] border border-black w-full max-w-2xl p-4">
        <h2 className="font-mono text-black">GENERATE VOICE</h2>
        <div className="font-mono text-xs text-gray-600 my-2">
          MODEL_ID: CHARON (MLE-SPEC-A) | VOICE_PROFILE: BRITISH_MLE_NARRATOR | MAX_INPUT: {WORD_LIMIT_VOICE}_WORDS
        </div>
        <textarea
          className="w-full h-64 p-2 border border-black bg-white text-black font-mono"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text here or upload a PDF..."
          disabled={isLoading}
        />
        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center space-x-2">
            <label htmlFor="pdf-upload" className={`font-mono text-sm text-white bg-black px-3 py-1.5 ${isLoading ? 'opacity-50' : 'cursor-pointer'}`}>
              [ UPLOAD_PDF ]
            </label>
            <input id="pdf-upload" type="file" accept=".pdf" className="hidden" onChange={handleFileChange} disabled={isLoading} />
            {fileName && <span className="font-mono text-xs text-black">{fileName}</span>}
          </div>
          <div className="flex space-x-2">
            <button onClick={onClose} className="font-mono text-sm text-black border border-black px-3 py-1.5" disabled={isLoading}>
              [ CANCEL ]
            </button>
            <button onClick={handleGenerate} className="font-mono text-sm text-white bg-[#FF4F00] px-3 py-1.5" disabled={isLoading || !text.trim()}>
              {loadingText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenerateVoiceModal;