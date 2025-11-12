import { GoogleGenAI, Modality } from '@google/genai';

export const generateVoice = async (
  ai: GoogleGenAI,
  text: string,
  voiceName: 'Charon' | 'Zephyr' = 'Charon'
): Promise<{ audioB64: string; mimeType: string }> => {
  
  // A more direct prompt to guide the model, which can help reduce audio artifacts.
  const mleInstruction = `Narrate the following in an authentic Multicultural London English (MLE) accent, spoken by a middle-aged Black British man from London. The tone should be measured, wise, and compelling for a serious story. Voice the text naturally, not aggressively.`;

  // Only apply the detailed instruction to the main 'Charon' voice.
  const promptText = voiceName === 'Charon' ? `${mleInstruction}\n\nTEXT: "${text}"` : text;

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