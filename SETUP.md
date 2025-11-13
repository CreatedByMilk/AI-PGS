# AI-PGS Setup Guide

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Google Gemini API key

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure API Key

1. Copy the `.env.example` file to create a new `.env` file:
   ```bash
   cp .env.example .env
   ```

2. Get your Gemini API key from: https://aistudio.google.com/apikey

3. Open `.env` and replace `your_gemini_api_key_here` with your actual API key:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```

### 3. Run the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### 4. Build for Production

```bash
npm run build
```

The production build will be in the `dist/` directory.

To preview the production build:
```bash
npm run preview
```

## Features

✅ **AI Voice Generation**: Convert text or PDF content into narration
✅ **AI Music Generation**: Create custom music using the real-time mixer
✅ **AI Sound Effects**: Generate any sound effect from text prompts
✅ **Multi-track Timeline**: Arrange audio clips on a professional timeline
✅ **Professional Mixer**: EQ, compression, saturation, and more
✅ **Project Save/Load**: Save your work as `.aipgs` files
✅ **WAV Export**: Export your final mix as high-quality WAV audio

## Usage Tips

1. **Generate Voice**: Click the `[GENERATE VOICE]` button on any Voice track to create narration
2. **Generate Music**: Click the `[GENERATE MUSIC]` button on any Music track to create background music
3. **Generate SFX**: Click the `[GENERATE SFX]` button on any SFX track to create sound effects
4. **Arrange Clips**: Drag and drop clips on the timeline to arrange them
5. **Mix**: Use the mixer panel at the bottom to adjust EQ, compression, and other effects
6. **Export**: Click the `[EXPORT]` button in the top bar to download your final mix as a WAV file

## Keyboard Shortcuts

- **Space**: Play/Pause
- **Delete**: Delete selected clip
- **Ctrl/Cmd + C**: Copy clip
- **Ctrl/Cmd + X**: Cut clip
- **Ctrl/Cmd + V**: Paste clip (right-click on timeline)

## Troubleshooting

### API Key Issues

If you get errors about API key:
1. Make sure you created the `.env` file (not just `.env.example`)
2. Verify your API key is correct
3. Restart the development server after adding the API key

### Audio Not Playing

If audio doesn't play:
1. Click anywhere on the page first (browser autoplay policy)
2. Check that your browser supports Web Audio API
3. Make sure clips have been generated successfully

### Build Errors

If you encounter build errors:
1. Delete `node_modules` and `package-lock.json`
2. Run `npm install` again
3. Try `npm run build` again

## Browser Compatibility

AI-PGS works best in modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari (some audio features may have limitations)

## Need Help?

Check the main README.md for more information about the project goals and features.
