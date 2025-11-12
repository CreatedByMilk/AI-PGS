import React, { useState, useCallback } from 'react';
import TopBar from './components/TopBar';
import TimelinePanel from './components/TimelinePanel';
import MixerPanel from './components/MixerPanel';
import { Track, Clip, MixerSettings } from './types';
import { INITIAL_TRACKS, DEFAULT_MIXER_SETTINGS } from './constants';
import { generateNewClip } from './utils/audioUtils';
import { GoogleGenAI } from '@google/genai';

const App: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>(INITIAL_TRACKS);
  const [selectedTrackId, setSelectedTrackId] = useState<number>(1);
  const [playheadPosition, setPlayheadPosition] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [projectName, setProjectName] = useState('Untitled_Project');
  const [copiedClip, setCopiedClip] = useState<Omit<Clip, 'id' | 'start' | 'trackId'> | null>(null);

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const updateClipPosition = useCallback((clipId: string, newStart: number) => {
    setTracks(prevTracks =>
      prevTracks.map(track => ({
        ...track,
        clips: track.clips.map(clip =>
          clip.id === clipId ? { ...clip, start: newStart } : clip
        ),
      }))
    );
  }, []);

  const updateClipDuration = useCallback((clipId: string, newDuration: number) => {
    setTracks(prevTracks =>
      prevTracks.map(track => ({
        ...track,
        clips: track.clips.map(clip =>
          clip.id === clipId ? { ...clip, duration: newDuration } : clip
        ),
      }))
    );
  }, []);

  const addClip = useCallback(async (trackId: number, name: string, audioB64: string, mimeType: string) => {
    try {
        const newClipData = await generateNewClip(trackId, name, audioB64, mimeType);
        setTracks(prevTracks => {
            const targetTrack = prevTracks.find(t => t.id === trackId);
            const lastClipEnd = targetTrack ? Math.max(0, ...targetTrack.clips.map(c => c.start + c.duration)) : 0;
            
            const newClip: Clip = {
                ...newClipData,
                start: lastClipEnd,
            };

            return prevTracks.map(track =>
                track.id === trackId ? { ...track, clips: [...track.clips, newClip] } : track
            );
        });
    } catch (error) {
        console.error("Error adding clip:", error);
        alert("Failed to process audio file.");
    }
  }, []);
  
  const addMultipleClips = useCallback(async (trackId: number, clipsData: { name: string; audioB64: string; mimeType: string }[]) => {
    try {
        // Parallelize audio decoding
        const processedClipsPromises = clipsData.map(clipData => 
            generateNewClip(trackId, clipData.name, clipData.audioB64, clipData.mimeType)
        );
        const processedClips = await Promise.all(processedClipsPromises);

        setTracks(prevTracks => {
            const newTracks = prevTracks.map(t => ({...t, clips: [...t.clips]})); 
            const targetTrack = newTracks.find(t => t.id === trackId);
            
            if (!targetTrack) {
                console.warn(`Track with id ${trackId} not found.`);
                return prevTracks;
            }
            
            let lastClipEnd = Math.max(0, ...targetTrack.clips.map(c => c.start + c.duration));
            
            const clipsToAdd: Clip[] = processedClips.map(clipData => {
                const newClip = { ...clipData, start: lastClipEnd };
                lastClipEnd += clipData.duration;
                return newClip;
            });

            targetTrack.clips.push(...clipsToAdd);
            return newTracks;
        });
    } catch (error) {
        console.error("Error adding clips:", error);
        alert("Failed to process audio files.");
    }
  }, []);


  const deleteClip = useCallback((clipId: string) => {
    setTracks(prevTracks =>
      prevTracks.map(track => ({
        ...track,
        clips: track.clips.filter(clip => clip.id !== clipId),
      }))
    );
  }, []);

  const updateMixerSettings = useCallback((trackId: number, newSettings: Partial<MixerSettings>) => {
    setTracks(prevTracks =>
      prevTracks.map(track =>
        track.id === trackId
          ? { ...track, mixerSettings: { ...track.mixerSettings, ...newSettings } }
          : track
      )
    );
  }, []);
  
  const handleCopy = useCallback((clip: Clip) => {
    const { id, start, trackId, ...clipToCopy } = clip;
    setCopiedClip(clipToCopy);
  }, []);
  
  const handleCut = useCallback((clip: Clip) => {
    handleCopy(clip);
    deleteClip(clip.id);
  }, [handleCopy, deleteClip]);

  const handlePaste = useCallback((trackId: number, startTime: number) => {
    if (!copiedClip) return;
    
    const newClip: Clip = {
        ...copiedClip,
        id: `clip-${Date.now()}`,
        trackId,
        start: startTime,
    };

    setTracks(prevTracks => prevTracks.map(track => 
        track.id === trackId ? { ...track, clips: [...track.clips, newClip] } : track
    ));
  }, [copiedClip]);

  const addTrack = (type: 'Voice' | 'Music' | 'SFX') => {
    const newTrackId = tracks.length > 0 ? Math.max(...tracks.map(t => t.id)) + 1 : 1;
    let newTrack: Track;
    const existingTypeCount = tracks.filter(t => t.name.startsWith(type)).length;
    const newName = `${type} ${existingTypeCount + 1}`;

    switch(type) {
      case 'Voice':
        newTrack = { id: newTrackId, name: newName, color: '#3b82f6', clips: [], mixerSettings: { ...DEFAULT_MIXER_SETTINGS } };
        break;
      case 'Music':
        newTrack = { id: newTrackId, name: newName, color: '#22c55e', clips: [], mixerSettings: { ...DEFAULT_MIXER_SETTINGS } };
        break;
      case 'SFX':
        newTrack = { id: newTrackId, name: newName, color: '#eab308', clips: [], mixerSettings: { ...DEFAULT_MIXER_SETTINGS } };
        break;
    }
    setTracks(prev => [...prev, newTrack]);
  };

  const updateTrackName = useCallback((trackId: number, newName: string) => {
    setTracks(prevTracks => prevTracks.map(track => 
      track.id === trackId ? { ...track, name: newName } : track
    ));
  }, []);

  const selectedTrack = tracks.find(t => t.id === selectedTrackId) || tracks[0];

  const newProject = () => {
    if (window.confirm("Are you sure you want to start a new project? All unsaved changes will be lost.")) {
      setTracks(INITIAL_TRACKS);
      setSelectedTrackId(1);
      setPlayheadPosition(0);
      setIsPlaying(false);
      setProjectName('Untitled_Project');
    }
  };

  const saveProject = () => alert("Save Project: This feature is in development.");
  const loadProject = () => alert("Load Project: This feature is in development.");
  const exportProject = () => alert("Export Project: This feature is in development.");

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex flex-col">
      <TopBar 
        projectName={projectName}
        onNew={newProject}
        onSave={saveProject}
        onLoad={loadProject}
        onExport={exportProject}
      />
      <main className="flex-grow flex flex-col p-4 space-y-4">
        <TimelinePanel
          tracks={tracks}
          playheadPosition={playheadPosition}
          setPlayheadPosition={setPlayheadPosition}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          onUpdateClipPosition={updateClipPosition}
          onUpdateClipDuration={updateClipDuration}
          onAddClip={addClip}
          onAddMultipleClips={addMultipleClips}
          onDeleteClip={deleteClip}
          onSelectTrack={setSelectedTrackId}
          selectedTrackId={selectedTrackId}
          ai={ai}
          onCopyClip={handleCopy}
          onCutClip={handleCut}
          onPasteClip={handlePaste}
          onAddTrack={addTrack}
          onUpdateMixerSettings={updateMixerSettings}
          onUpdateTrackName={updateTrackName}
          canPaste={!!copiedClip}
        />
        {selectedTrack && (
          <MixerPanel
            selectedTrack={selectedTrack}
            onUpdateSettings={updateMixerSettings}
            onSelectTrack={setSelectedTrackId}
            tracks={tracks}
          />
        )}
      </main>
    </div>
  );
};

export default App;