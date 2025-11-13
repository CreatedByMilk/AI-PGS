import { GoogleGenAI, Modality } from '@google/genai';

interface VoiceGenerationOptions {
  chunkIndex?: number;
  totalChunks?: number;
  isFirstChunk?: boolean;
  isLastChunk?: boolean;
}

export const generateVoice = async (
  ai: GoogleGenAI,
  text: string,
  voiceName: 'Charon' | 'Zephyr' = 'Charon',
  options: VoiceGenerationOptions = {}
): Promise<{ audioB64: string; mimeType: string }> => {

  const { chunkIndex = 0, totalChunks = 1, isFirstChunk = true, isLastChunk = true } = options;

  // Enhanced MLE instruction with prosody and consistency guidance
  const mleInstruction = `You are a consistent voice actor performing as a middle-aged Black British man from London with an authentic Multicultural London English (MLE) accent.

CRITICAL VOICE CONSISTENCY RULES:
- Maintain EXACTLY the same vocal characteristics throughout
- Use a measured, wise, and compelling tone suitable for serious storytelling
- Speak naturally with moderate pacing (not rushed, not slow)
- Keep pitch consistent in the lower-mid range
- Maintain steady rhythm and flow
- Avoid aggressive or harsh tones
- Use natural conversational cadence with slight melodic variation typical of MLE

${totalChunks > 1 ? `CONTEXT: This is part ${chunkIndex + 1} of ${totalChunks} in a continuous narration. Maintain EXACT voice consistency with ${isFirstChunk ? 'the beginning' : 'previous parts'}. ${isLastChunk ? 'This is the final part.' : 'More parts will follow, so keep energy consistent.'}` : ''}

PERFORMANCE DIRECTION:
- Speak as if telling an important story to a close friend
- Let sentences breathe naturally with appropriate pauses
- Emphasize key words subtly without overdoing it
- Maintain the same vocal energy from start to finish`;

  // Only apply the detailed instruction to the main 'Charon' voice.
  const promptText = voiceName === 'Charon' ? `${mleInstruction}\n\nNARRATE: "${text}"` : text;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-preview-tts',
    contents: [{ parts: [{ text: promptText }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voiceName },
        },
      },
      // Add generation config for consistency
      generationConfig: {
        temperature: 0.3, // Lower temperature for more consistent output
        candidateCount: 1,
      },
    },
  });

  const part = response.candidates?.[0]?.content?.parts?.[0];
  if (part?.inlineData?.data) {
    return {
      audioB64: part.inlineData.data,
      mimeType: part.inlineData.mimeType,
    };
  }
  throw new Error('No audio data received from API.');
};

export const combineSfxPrompts = async (ai: GoogleGenAI, prompts: string[]): Promise<string> => {
    const prompt = `Create a single, new, and evocative sound effect description that creatively blends the following concepts: ${prompts.join(', ')}. The description should be concise and ready to be used to generate a sound. For example, if given 'door creak' and 'ghostly whisper', you could respond 'The eerie sound of a heavy wooden door groaning open, accompanied by a chilling, ethereal whisper.' Respond only with the new description.`

    const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });

    return result.text;
}