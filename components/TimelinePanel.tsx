import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Track, Clip, MixerSettings } from '../types';
import TrackLane from './TrackLane';
import { PIXELS_PER_SECOND, RULER_HEIGHT, TRACK_HEIGHT } from '../constants';
import GenerateVoiceModal from './modals/GenerateVoiceModal';
import GenerateMusicModal from './modals/GenerateMusicModal';
import GenerateSfxModal from './modals/GenerateSfxModal';
import { GoogleGenAI } from '@google/genai';
import { getAudioContext } from '../utils/audioContext';

interface TimelinePanelProps {
  tracks: Track[];
  playheadPosition: number;
  // FIX: Corrected typo in React type from SetSetStateAction to SetStateAction.
  setPlayheadPosition: React.Dispatch<React.SetStateAction<number>>;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  onUpdateClipPosition: (clipId: string, newStart: number) => void;
  onUpdateClipDuration: (clipId: string, newDuration: number) => void;
  onAddClip: (trackId: number, name: string, audioB64: string, mimeType: string) => Promise<void>;
  onAddMultipleClips: (trackId: number, clipsData: { name: string; audioB64: string; mimeType: string }[]) => Promise<void>;
  onDeleteClip: (clipId: string) => void;
  onSelectTrack: (trackId: number) => void;
  selectedTrackId: number;
  ai: GoogleGenAI;
  onCopyClip: (clip: Clip) => void;
  onCutClip: (clip: Clip) => void;
  onPasteClip: (trackId: number, startTime: number) => void;
  onAddTrack: (type: 'Voice' | 'Music' | 'SFX') => void;
  onUpdateMixerSettings: (trackId: number, newSettings: Partial<any>) => void;
  onUpdateTrackName: (trackId: number, newName: string) => void;
  canPaste: boolean;
}

const buildAudioGraphForTrack = (track: Track, audioContext: AudioContext) => {
    const settings = track.mixerSettings;
    const nodes: AudioNode[] = [];
  
    // Input Gain
    const inputGainNode = audioContext.createGain();
    // Convert linear [0, 1] to dB-like scale, e.g., mapping 0.8 to 0dB (1.0 gain)
    inputGainNode.gain.value = settings.inputGain / 0.8; 
    nodes.push(inputGainNode);
  
    let currentNode: AudioNode = inputGainNode;
  
    // TODO: Implement De-Esser (requires more complex DSP)
  
    // Equalizer
    if (settings.eqOn) {
      const eqLow = audioContext.createBiquadFilter();
      eqLow.type = 'lowshelf';
      eqLow.frequency.value = 300;
      eqLow.gain.value = (settings.eqLow - 0.5) * 24; // +/- 12dB
  
      const eqMid = audioContext.createBiquadFilter();
      eqMid.type = 'peaking';
      eqMid.frequency.value = 1500;
      eqMid.Q.value = 1;
      eqMid.gain.value = (settings.eqMid - 0.5) * 24;
  
      const eqHigh = audioContext.createBiquadFilter();
      eqHigh.type = 'highshelf';
      eqHigh.frequency.value = 5000;
      eqHigh.gain.value = (settings.eqHigh - 0.5) * 24;
  
      currentNode.connect(eqLow);
      eqLow.connect(eqMid);
      eqMid.connect(eqHigh);
      currentNode = eqHigh;
    }
  
    // Peak Compressor
    if (settings.peakCompressorOn) {
      const peakCompressor = audioContext.createDynamicsCompressor();
      peakCompressor.threshold.value = (settings.peakThreshold - 1) * 100; // -100 to 0 dB
      peakCompressor.ratio.value = 1 + settings.peakRatio * 19; // 1 to 20
      peakCompressor.attack.value = settings.peakAttack * 0.1; // 0 to 0.1s
      peakCompressor.release.value = settings.peakRelease * 0.5; // 0 to 0.5s
      currentNode.connect(peakCompressor);
      currentNode = peakCompressor;
    }
  
    // Glue Compressor (simulated with another compressor)
    if (settings.glueCompressorOn) {
      const glueCompressor = audioContext.createDynamicsCompressor();
      glueCompressor.threshold.value = (settings.glueThreshold - 1) * 100;
      glueCompressor.ratio.value = 1 + settings.glueRatio * 19;
      glueCompressor.attack.value = settings.glueAttack * 0.2 + 0.01; // Slower attack
      glueCompressor.release.value = settings.glueRelease * 0.8 + 0.1; // Slower release
      currentNode.connect(glueCompressor);
      currentNode = glueCompressor;
    }
  
    // Saturation
    if (settings.saturationOn) {
      const saturationNode = audioContext.createWaveShaper();
      const amount = settings.saturationValue * 100;
      const k = typeof amount === 'number' ? amount : 50;
      const n_samples = 44100;
      const curve = new Float32Array(n_samples);
      const deg = Math.PI / 180;
      for (let i = 0; i < n_samples; ++i) {
        const x = i * 2 / n_samples - 1;
        curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
      }
      saturationNode.curve = curve;
      saturationNode.oversample = '4x';
      currentNode.connect(saturationNode);
      currentNode = saturationNode;
    }

    // Output Volume
    const outputGainNode = audioContext.createGain();
    outputGainNode.gain.value = settings.outputVolume / 0.8;
    currentNode.connect(outputGainNode);
    currentNode = outputGainNode;
  
    return { inputNode: inputGainNode, outputNode: currentNode };
};


const TimelinePanel: React.FC<TimelinePanelProps> = (props) => {
  const {
    tracks, playheadPosition, setPlayheadPosition, isPlaying, setIsPlaying,
    onUpdateClipPosition, onUpdateClipDuration, onAddClip, onAddMultipleClips, onDeleteClip, onSelectTrack,
    selectedTrackId, ai, onCopyClip, onCutClip, onPasteClip, onAddTrack,
    onUpdateMixerSettings, onUpdateTrackName, canPaste,
  } = props;

  const [timelineDuration, setTimelineDuration] = useState(60);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  
  const activeSourcesRef = useRef<Map<string, AudioBufferSourceNode>>(new Map());
  const playbackStartRef = useRef<{ contextTime: number; position: number } | null>(null);

  const [isVoiceModalOpen, setVoiceModalOpen] = useState(false);
  const [isMusicModalOpen, setMusicModalOpen] = useState(false);
  const [isSfxModalOpen, setSfxModalOpen] = useState(false);
  const [isAddTrackOpen, setAddTrackOpen] = useState(false);
  const [pasteContextMenu, setPasteContextMenu] = useState<{x: number, y: number} | null>(null);
  const [renamingTrackId, setRenamingTrackId] = useState<number | null>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  
  useEffect(() => {
    const closeMenu = () => setPasteContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => {
      window.removeEventListener('click', closeMenu);
    };
  }, []);

  useEffect(() => {
    const maxTime = Math.max(
      60,
      ...tracks.flatMap(t => t.clips.map(c => c.start + c.duration))
    );
    setTimelineDuration(Math.ceil(maxTime / 60) * 60);
  }, [tracks]);

  const handleRulerOrTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.currentTarget as HTMLDivElement;
    const rect = target.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const scrollOffset = e.currentTarget.parentElement?.scrollLeft || 0;
    const newPosition = (clickX + scrollOffset) / PIXELS_PER_SECOND;
    setPlayheadPosition(newPosition);
  };
  
  const stopPlayback = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
    activeSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
      source.disconnect();
    });
    activeSourcesRef.current.clear();
    playbackStartRef.current = null;
  }, []);

  const startPlayback = useCallback(() => {
    const audioContext = getAudioContext();
    stopPlayback();

    const currentContextTime = audioContext.currentTime;
    playbackStartRef.current = { contextTime: currentContextTime, position: playheadPosition };

    const isAnyTrackSoloed = tracks.some(t => t.mixerSettings.isSoloed);
    const playableTracks = tracks.filter(track => {
        if (isAnyTrackSoloed) return track.mixerSettings.isSoloed;
        return !track.mixerSettings.isMuted;
    });

    playableTracks.forEach(track => {
      const { inputNode, outputNode } = buildAudioGraphForTrack(track, audioContext);
      outputNode.connect(audioContext.destination);

      track.clips.forEach(clip => {
        if (clip.audioBuffer && (clip.start + clip.duration) > playheadPosition) {
          const source = audioContext.createBufferSource();
          source.buffer = clip.audioBuffer;
          source.connect(inputNode);

          const offset = Math.max(0, playheadPosition - clip.start);
          const startTime = currentContextTime + Math.max(0, clip.start - playheadPosition);

          source.start(startTime, offset);
          activeSourcesRef.current.set(clip.id, source);
        }
      });
    });

    const animate = () => {
        if (playbackStartRef.current && audioContext) {
            const elapsedTime = audioContext.currentTime - playbackStartRef.current.contextTime;
            const newPosition = playbackStartRef.current.position + elapsedTime;

            if (timelineContainerRef.current) {
              const container = timelineContainerRef.current;
              const playheadPx = newPosition * PIXELS_PER_SECOND;
              const containerWidth = container.clientWidth;
              const scrollMargin = containerWidth / 3;
              if (playheadPx > container.scrollLeft + containerWidth - scrollMargin) {
                  container.scrollLeft = playheadPx - containerWidth + scrollMargin;
              } else if (playheadPx < container.scrollLeft + scrollMargin) {
                  container.scrollLeft = Math.max(0, playheadPx - scrollMargin);
              }
            }

            if (newPosition >= timelineDuration) {
                setIsPlaying(false);
                setPlayheadPosition(0);
            } else {
                setPlayheadPosition(newPosition);
                animationFrameRef.current = requestAnimationFrame(animate);
            }
        }
    };
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [tracks, playheadPosition, timelineDuration, stopPlayback, setPlayheadPosition, setIsPlaying]);

  useEffect(() => {
    if (isPlaying) startPlayback();
    else stopPlayback();
    return () => stopPlayback();
  }, [isPlaying, startPlayback, stopPlayback]);

  const handleTogglePlay = () => setIsPlaying(prev => !prev);
  const handleStop = () => { setIsPlaying(false); setPlayheadPosition(0); };
  
  const handleTimelineContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setPasteContextMenu({ x: e.clientX, y: e.clientY });
  };
  
  const handlePasteClick = () => {
      const targetTrack = tracks.find(t => t.id === selectedTrackId) || tracks[0];
      if(targetTrack) {
        onPasteClip(targetTrack.id, playheadPosition);
      }
      setPasteContextMenu(null);
  };
  
  const handlePlayheadDrag = useCallback((e: MouseEvent) => {
    if (timelineContainerRef.current) {
      const rect = timelineContainerRef.current.getBoundingClientRect();
      const scrollOffset = timelineContainerRef.current.scrollLeft;
      const clickX = e.clientX - rect.left;
      const newPosition = Math.max(0, (clickX + scrollOffset) / PIXELS_PER_SECOND);
      setPlayheadPosition(newPosition);

      // Auto-scroll logic
      const containerWidth = rect.width;
      const scrollMargin = 50; // px
      if (clickX > containerWidth - scrollMargin) {
        timelineContainerRef.current.scrollLeft += 15;
      } else if (clickX < scrollMargin) {
        timelineContainerRef.current.scrollLeft -= 15;
      }
    }
  }, [setPlayheadPosition]);

  const handlePlayheadMouseUp = useCallback(() => {
    setIsDraggingPlayhead(false);
    window.removeEventListener('mousemove', handlePlayheadDrag);
    window.removeEventListener('mouseup', handlePlayheadMouseUp);
  }, [handlePlayheadDrag]);
  
  const handlePlayheadMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingPlayhead(true);
    window.addEventListener('mousemove', handlePlayheadDrag);
    window.addEventListener('mouseup', handlePlayheadMouseUp);
  }, [handlePlayheadDrag, handlePlayheadMouseUp]);

  return (
    <>
    <div className="bg-[#F5F5F5] border border-black flex flex-col flex-grow min-h-0">
      <div className="flex flex-grow overflow-hidden">
        <div className="w-48 flex-shrink-0 bg-gray-200 border-r border-black flex flex-col z-10">
          <div style={{ height: RULER_HEIGHT }} className="border-b border-black flex items-center justify-center font-mono text-xs text-black bg-gray-300">TRACKS</div>
          <div className="flex-grow overflow-y-auto">
            {tracks.map(track => (
              <div 
                key={track.id}
                onClick={() => onSelectTrack(track.id)}
                className={`p-2 flex flex-col justify-between cursor-pointer border-b border-black ${track.id === selectedTrackId ? 'bg-orange-100' : 'bg-gray-300'}`}
                style={{ height: TRACK_HEIGHT, minHeight: TRACK_HEIGHT }}
                onDoubleClick={() => setRenamingTrackId(track.id)}
              >
                <div className="flex justify-between items-start">
                    {renamingTrackId === track.id ? (
                      <input
                        type="text"
                        defaultValue={track.name}
                        className="bg-white border border-black text-black font-bold font-sans w-full p-1"
                        autoFocus
                        onBlur={(e) => {
                          onUpdateTrackName(track.id, e.target.value || track.name);
                          setRenamingTrackId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            onUpdateTrackName(track.id, e.currentTarget.value || track.name);
                            setRenamingTrackId(null);
                          } else if (e.key === 'Escape') {
                            setRenamingTrackId(null);
                          }
                        }}
                      />
                    ) : (
                      <h2 className="font-bold font-sans text-black">{track.name}</h2>
                    )}
                    <div className="flex space-x-1 flex-shrink-0 ml-2">
                        <button onClick={(e) => { e.stopPropagation(); onUpdateMixerSettings(track.id, { isMuted: !track.mixerSettings.isMuted }); }} className={`font-mono text-xs w-6 h-6 border border-black ${track.mixerSettings.isMuted ? 'bg-[#FF4F00] text-white' : 'bg-black text-white'}`}>M</button>
                        <button onClick={(e) => { e.stopPropagation(); onUpdateMixerSettings(track.id, { isSoloed: !track.mixerSettings.isSoloed }); }} className={`font-mono text-xs w-6 h-6 border border-black ${track.mixerSettings.isSoloed ? 'bg-[#FF4F00] text-white' : 'bg-black text-white'}`}>S</button>
                    </div>
                </div>
                {track.name.startsWith('Voice') && <button onClick={(e) => { e.stopPropagation(); setVoiceModalOpen(true); }} className="bg-[#FF4F00] text-white font-mono px-2 py-1 text-xs w-full mt-1">[ GENERATE VOICE ]</button>}
                {track.name.startsWith('Music') && <button onClick={(e) => { e.stopPropagation(); setMusicModalOpen(true); }} className="bg-[#FF4F00] text-white font-mono px-2 py-1 text-xs w-full mt-1">[ GENERATE MUSIC ]</button>}
                {track.name.startsWith('SFX') && <button onClick={(e) => { e.stopPropagation(); setSfxModalOpen(true); }} className="bg-[#FF4F00] text-white font-mono px-2 py-1 text-xs w-full mt-1">[ GENERATE SFX ]</button>}
              </div>
            ))}
          </div>
          <div className="p-2 border-t border-black">
            {isAddTrackOpen ? (
                <div className="flex flex-col space-y-1">
                    <button onClick={() => { onAddTrack('Voice'); setAddTrackOpen(false); }} className="font-mono text-xs text-white bg-black w-full py-1">[ + VOICE ]</button>
                    <button onClick={() => { onAddTrack('Music'); setAddTrackOpen(false); }} className="font-mono text-xs text-white bg-black w-full py-1">[ + MUSIC ]</button>
                    <button onClick={() => { onAddTrack('SFX'); setAddTrackOpen(false); }} className="font-mono text-xs text-white bg-black w-full py-1">[ + SFX ]</button>
                    <button onClick={() => setAddTrackOpen(false)} className="font-mono text-xs text-black border border-black w-full py-1 mt-1">[ CANCEL ]</button>
                </div>
            ) : (
                <button onClick={() => setAddTrackOpen(true)} className="font-mono text-sm text-white bg-black w-full py-1.5">[ + ADD TRACK ]</button>
            )}
          </div>
        </div>
        <div ref={timelineContainerRef} onContextMenu={handleTimelineContextMenu} className="flex-grow overflow-x-auto overflow-y-hidden relative">
          <div className="relative" style={{ width: `${timelineDuration * PIXELS_PER_SECOND}px`, height: `${tracks.length * TRACK_HEIGHT + RULER_HEIGHT}px` }}>
            <div onClick={handleRulerOrTimelineClick} className="sticky top-0 h-[30px] bg-gray-200 border-b border-black z-10 cursor-pointer" style={{ height: RULER_HEIGHT, width: `${timelineDuration * PIXELS_PER_SECOND}px` }}>
              {Array.from({ length: timelineDuration + 1 }).map((_, sec) => (
                <div key={sec} className="absolute top-0 h-full" style={{ left: `${sec * PIXELS_PER_SECOND}px` }}>
                  <div className="w-px h-full bg-gray-400"></div>
                  {sec % 5 === 0 && <span className="absolute top-0 left-1 font-mono text-xs text-black">{new Date(sec * 1000).toISOString().substr(14, 5)}</span>}
                </div>
              ))}
            </div>
            <div onClick={handleRulerOrTimelineClick} className="relative">
              {tracks.map((track) => (
                <TrackLane key={track.id} track={track} onUpdateClipPosition={onUpdateClipPosition} onUpdateClipDuration={onUpdateClipDuration} onDeleteClip={onDeleteClip} onCopyClip={onCopyClip} onCutClip={onCutClip}/>
              ))}
            </div>
            <div className="absolute top-0 w-0.5 bg-[#FF4F00] z-30 pointer-events-none" style={{ left: `${playheadPosition * PIXELS_PER_SECOND}px`, height: '100%' }}>
               <div onMouseDown={handlePlayheadMouseDown} className="absolute top-0 -left-1 w-3 h-3 bg-[#FF4F00] border border-white rounded-full cursor-grab active:cursor-grabbing pointer-events-auto" />
            </div>
          </div>
        </div>
      </div>
      <div className="bg-gray-200 border-t border-black p-2 flex justify-start items-center">
        <div className="flex space-x-2">
            <button onClick={handleTogglePlay} className={`font-mono text-white px-3 py-1.5 ${isPlaying ? 'bg-[#FF4F00]' : 'bg-black'}`}>[ {isPlaying ? 'PAUSE' : 'PLAY'} ]</button>
            <button onClick={handleStop} className="font-mono text-white bg-black px-3 py-1.5">[ STOP ]</button>
        </div>
      </div>
    </div>
    {pasteContextMenu && canPaste && (
        <div className="fixed bg-black border border-[#FF4F00] text-white z-50" style={{ top: pasteContextMenu.y, left: pasteContextMenu.x }}>
             <button onClick={handlePasteClick} className="block w-full text-left px-3 py-1.5 font-mono text-sm hover:bg-[#FF4F00]">[ PASTE ]</button>
        </div>
    )}
    {isVoiceModalOpen && <GenerateVoiceModal ai={ai} onClose={() => setVoiceModalOpen(false)} onAddMultipleClips={onAddMultipleClips} />}
    {isMusicModalOpen && <GenerateMusicModal ai={ai} onClose={() => setMusicModalOpen(false)} onAddClip={onAddClip} />}
    {isSfxModalOpen && <GenerateSfxModal ai={ai} onClose={() => setSfxModalOpen(false)} onAddClip={onAddClip} />}
    </>
  );
};

export default TimelinePanel;
