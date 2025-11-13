# Voice Consistency Guide

## Overview

This guide explains how AI-PGS maintains consistent voice characteristics across long narrations, especially when text is split into multiple chunks.

## The Problem

When generating long narrations, text must be split into chunks due to API limitations. Without proper handling, each chunk can be generated with slightly different vocal characteristics, causing:

- **Voice drift**: Pitch, tone, or accent variations between chunks
- **Pacing inconsistency**: Different speaking speeds across parts
- **Energy fluctuations**: Varying enthusiasm or intensity levels
- **Character loss**: The distinctive MLE accent becoming less consistent

## The Solution

AI-PGS implements a multi-layered approach to maintain voice consistency:

### 1. **Enhanced Prompt Engineering**

The voice generation prompt now includes:

- **Detailed character description**: "Middle-aged Black British man from London with authentic MLE accent"
- **Critical consistency rules**: Explicit instructions to maintain exact vocal characteristics
- **Prosody guidance**: Specific pacing, pitch range, and rhythm instructions
- **Performance direction**: Context about storytelling style and emotional tone

### 2. **Chunk Context Awareness**

Each chunk knows its position in the sequence:

```typescript
{
  chunkIndex: 2,           // Current position (0-based)
  totalChunks: 5,          // Total number of chunks
  isFirstChunk: false,     // Is this the opening?
  isLastChunk: false       // Is this the conclusion?
}
```

The prompt adapts based on position:
- **First chunk**: "This is the beginning of a continuous narration"
- **Middle chunks**: "This is part X of Y - maintain consistency with previous parts"
- **Final chunk**: "This is the final part - maintain consistency while providing closure"

### 3. **Sequential Generation**

Instead of generating all chunks in parallel, they're generated one at a time:

```typescript
for (let i = 0; i < chunks.length; i++) {
  const audio = await generateVoice(ai, chunks[i], 'Charon', {
    chunkIndex: i,
    totalChunks: totalChunks,
    isFirstChunk: i === 0,
    isLastChunk: i === totalChunks - 1,
  });
}
```

This allows the model to maintain consistent state between generations.

### 4. **Temperature Control**

Lower temperature (0.3) reduces randomness in voice generation:

```typescript
generationConfig: {
  temperature: 0.3,  // More deterministic, less drift
  candidateCount: 1,
}
```

## Voice Characteristics

### The "Charon" MLE Voice Profile

**Accent**: Authentic Multicultural London English (MLE)
- Natural London inflection patterns
- Slight melodic variation typical of MLE
- Not aggressive or harsh

**Vocal Range**: Lower-mid pitch
- Measured and controlled
- Authoritative but warm
- Suitable for serious storytelling

**Pacing**: Moderate tempo
- Not rushed or slow
- Natural conversational cadence
- Appropriate pauses for emphasis

**Tone**: Wise and compelling
- Like telling an important story to a close friend
- Engaged but not overly enthusiastic
- Maintains steady energy throughout

## Best Practices for Users

### For Best Consistency:

1. **Keep text well-structured**: Clear sentences with proper punctuation
2. **Avoid extreme tone shifts**: Sudden changes in content tone can affect voice
3. **Test with smaller chunks first**: If experiencing drift, try reducing WORD_LIMIT_VOICE
4. **Be patient**: Sequential generation takes longer but produces better results

### Troubleshooting Voice Issues:

**If voice still drifts:**
- Check your text for extreme tonal shifts
- Ensure punctuation is consistent
- Try regenerating the problematic chunk
- Consider breaking very long texts into separate projects

**If accent is inconsistent:**
- The MLE accent is subtle - some variation is natural
- Ensure your API key has access to the latest models
- Try regenerating with the enhanced prompts

**If pacing varies:**
- Check for very short or very long sentences
- Ensure proper punctuation (periods, commas)
- Consider manual editing if specific timing is critical

## Technical Implementation

### Function Signature

```typescript
generateVoice(
  ai: GoogleGenAI,
  text: string,
  voiceName: 'Charon' | 'Zephyr' = 'Charon',
  options?: {
    chunkIndex?: number;
    totalChunks?: number;
    isFirstChunk?: boolean;
    isLastChunk?: boolean;
  }
): Promise<{ audioB64: string; mimeType: string }>
```

### Voice Selection

- **Charon**: MLE narrator voice (enhanced consistency features)
- **Zephyr**: Alternative voice for music/SFX descriptions

## Future Improvements

Potential enhancements for even better consistency:

1. **Voice cloning**: Reference first chunk's characteristics
2. **Prosody markers**: SSML-style tags for fine control
3. **Cross-chunk normalization**: Audio processing to match levels
4. **Speaker embeddings**: If API supports voice fingerprinting
5. **Real-time monitoring**: Alert users to detected voice drift

## Summary

The enhanced voice consistency system ensures that your MLE narrator maintains the same distinctive voice characteristics throughout long narrations, creating a professional, polished listening experience that sounds like a single, cohesive performance rather than multiple disjointed clips.
