import React from 'react';
import { Track, Clip } from '../types';
import AudioClip from './AudioClip';
import { TRACK_HEIGHT } from '../constants';

interface TrackLaneProps {
  track: Track;
  onUpdateClipPosition: (clipId: string, newStart: number) => void;
  onUpdateClipDuration: (clipId: string, newDuration: number) => void;
  onDeleteClip: (clipId: string) => void;
  onCopyClip: (clip: Clip) => void;
  onCutClip: (clip: Clip) => void;
}

const TrackLane: React.FC<TrackLaneProps> = ({
  track,
  onUpdateClipPosition,
  onUpdateClipDuration,
  onDeleteClip,
  onCopyClip,
  onCutClip,
}) => {
  return (
    <div
      className="relative border-b border-black bg-white"
      style={{ height: `${TRACK_HEIGHT}px` }}
    >
      <div className="relative w-full h-full">
        {track.clips.map(clip => (
          <AudioClip
            key={clip.id}
            clip={clip}
            onUpdatePosition={onUpdateClipPosition}
            onUpdateDuration={onUpdateClipDuration}
            onDelete={onDeleteClip}
            onCopy={onCopyClip}
            onCut={onCutClip}
            trackColor={track.color}
          />
        ))}
      </div>
    </div>
  );
};

export default TrackLane;