import React, { useState, useCallback } from 'react';
import TopBar from './components/TopBar';
import TimelinePanel from './components/TimelinePanel';
import MixerPanel from './components/MixerPanel';
import { Track, Clip, MixerSettings } from './types';
import { INITIAL_TRACKS, DEFAULT_MIXER_SETTINGS } from './constants';
import { generateNewClip } from './utils/audioUtils';
import { exportProjectToWav } from './utils/exportUtils';
import { GoogleGenAI } from '@google/genai';

const App: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>(INITIAL_TRACKS);
  const [selectedTrackId, setSelectedTrackId] = useState<number>(1);
  const [playheadPosition, setPlayheadPosition] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [projectName, setProjectName] = useState('Untitled_Project');
  const [copiedClip, setCopiedClip] = useState<Omit<Clip, 'id' | 'start' | 'trackId'> | null>(null);

  const ai: any = process.env.API_KEY ? new GoogleGenAI({ apiKey: process.env.API_KEY as string }) : null;

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

  const saveProject = () => {
    try {
      const projectData = {
        projectName,
        tracks: tracks.map(track => ({
          ...track,
          clips: track.clips.map(clip => ({
            ...clip,
            audioBuffer: undefined, // Can't serialize AudioBuffer
          })),
        })),
      };
      const dataStr = JSON.stringify(projectData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName}.aipgs`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert('Project saved successfully!');
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Failed to save project.');
    }
  };

  const loadProject = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.aipgs';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const projectData = JSON.parse(text);

        // Reload audio buffers
        const loadedTracks = await Promise.all(
          projectData.tracks.map(async (track: Track) => ({
            ...track,
            clips: await Promise.all(
              track.clips.map(async (clip: Clip) => {
                const newClipData = await generateNewClip(
                  track.id,
                  clip.name,
                  clip.audioB64,
                  clip.mimeType
                );
                return {
                  ...clip,
                  audioBuffer: newClipData.audioBuffer,
                  waveform: newClipData.waveform,
                };
              })
            ),
          }))
        );

        setProjectName(projectData.projectName);
        setTracks(loadedTracks);
        setPlayheadPosition(0);
        setIsPlaying(false);
        alert('Project loaded successfully!');
      } catch (error) {
        console.error('Error loading project:', error);
        alert('Failed to load project. Please ensure the file is a valid AI-PGS project.');
      }
    };
    input.click();
  };

  const exportProject = () => {
    exportProjectToWav(tracks, projectName);
  };

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
