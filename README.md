AI-PGS (AI Podcast Generation Studio)

AI-PGS is is an ambitious and impressive AI-Powered Digital Audio Workstation (DAW) that runs entirely in the browser. It's designed to make podcasting and audio creation incredibly easy by combining a simple, intuitive multi-track timeline with powerful, AI-driven content generation and a professional-grade mixing console.

Core of the experience is a familiar timeline where users can arrange voice, music, and sound effect clips.
However, its standout feature is the deep integration of Google's Gemini API, allowing creators to: Generate Narration: Instantly convert typed text—or even text extracted directly from an uploaded PDF—into high-quality voiceovers. Create Music: Use a unique "real-time mixer" to blend musical ideas, which are then used to generate custom music tracks. Design Sound Effects: Generate any sound effect imaginable from a simple text prompt, and even combine existing sounds to create new, complex effects. The app is not just about creating content; it's also about polishing it. A comprehensive virtual mixing board gives users fine-grained control over their sound, with modules for equalization, compression, saturation, and more, all processed in real-time.

It is a one-stop shop for audio creation that aims to democratize the production process, putting advanced AI tools and professional audio effects into a clean, accessible, web-based interface.

## The Final Goal of the App

When everything is running properly, the final goal of this application is to be a complete, end-to-end platform for audio storytelling. A creator could open their browser with nothing but a script and, without any external tools or audio assets, produce a fully-finished, professionally mixed audio project. The ideal workflow would be:

**Content Creation**: The user generates all necessary audio directly within the app—a compelling narration for their story, a custom background score that fits the mood, and all the required sound effects to bring the scene to life.

**Arrangement & Editing**: They arrange these AI-generated clips on the timeline, trimming and positioning them to perfection.

**Mixing & Mastering**: They use the mixer panel to ensure every track sits perfectly in the mix, making the voice clear, the music supportive, and the sound effects impactful.

**Final Export**: With a single click, they export the final, polished product as a high-quality WAV file, ready to be published as a podcast, used in a video, or shared with the world.

The ultimate vision is to create a seamless, powerful, and intelligent tool that radically simplifies the entire audio production pipeline, empowering anyone to create rich, immersive audio experiences with ease.

## 🙏 Credits & Open Source Technologies

This project is built on top of amazing open-source technologies:

### AI & Audio Generation
- **[Google Gemini](https://ai.google.dev/)** - AI text-to-speech for voice narration with MLE accent consistency
- **[Magenta.js](https://magenta.tensorflow.org/js)** by Google - AI music generation using MusicVAE models
- **[jsfxr](https://github.com/chr15m/jsfxr)** - JavaScript port of [sfxr](https://github.com/grimfang4/sfxr) for procedural sound effect generation

### Frontend & Build Tools
- **React 19** with TypeScript
- **Vite** - Fast build tooling
- **Tailwind CSS** - Utility-first styling
- **Web Audio API** - Real-time audio processing and effects

### Audio Processing
All professional mixing effects (EQ, compression, saturation) are implemented using the native Web Audio API, providing studio-quality processing entirely in the browser.

### License & Attribution
Each dependency is used in accordance with its respective license. We're grateful to these projects and their contributors for making browser-based professional audio production possible.

**Special Thanks:**
- The Magenta team at Google for pioneering browser-based AI music generation
- The sfxr/jsfxr community for democratizing sound effect creation
- The Web Audio API specification authors for providing powerful audio primitives
