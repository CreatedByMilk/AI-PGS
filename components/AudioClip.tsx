import React, { useState, useEffect, useRef } from 'react';
import { Clip } from '../types';
import { PIXELS_PER_SECOND } from '../constants';

interface AudioClipProps {
  clip: Clip;
  onUpdatePosition: (clipId: string, newStart: number) => void;
  onUpdateDuration: (clipId: string, newDuration: number) => void;
  onDelete: (clipId: string) => void;
  onCopy: (clip: Clip) => void;
  onCut: (clip: Clip) => void;
  trackColor: string;
}

const AudioClip: React.FC<AudioClipProps> = ({ clip, onUpdatePosition, onUpdateDuration, onDelete, onCopy, onCut, trackColor }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizingStart, setIsResizingStart] = useState(false);
  const [isResizingEnd, setIsResizingEnd] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [originalStart, setOriginalStart] = useState(0);
  const [originalDuration, setOriginalDuration] = useState(0);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const width = clip.duration * PIXELS_PER_SECOND;
  const left = clip.start * PIXELS_PER_SECOND;

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener('click', closeMenu);
    }
    return () => {
      window.removeEventListener('click', closeMenu);
    };
  }, [contextMenu]);
  
  useEffect(() => {
    if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = trackColor;
            ctx.lineWidth = 1.5;
            
            const middleY = rect.height / 2;
            const waveform = clip.waveform;
            
            ctx.beginPath();
            
            for (let i = 0; i < waveform.length; i++) {
                const x = (i / waveform.length) * rect.width;
                const lineHeight = waveform[i] * rect.height;
                const yStart = middleY - lineHeight / 2;
                ctx.moveTo(x, yStart);
                ctx.lineTo(x, yStart + lineHeight);
            }
            ctx.stroke();
        }
    }
  }, [clip.waveform, width, trackColor]);


  const handleMouseMove = (e: MouseEvent) => {
    const deltaX = e.clientX - dragStartX;
    const deltaSeconds = deltaX / PIXELS_PER_SECOND;

    if (isDragging) {
      const newStart = Math.max(0, originalStart + deltaSeconds);
      onUpdatePosition(clip.id, newStart);
    } else if (isResizingStart) {
      const newStart = Math.max(0, originalStart + deltaSeconds);
      const newDuration = Math.max(0.1, originalDuration - (newStart - originalStart));
      if (newDuration > 0.1) {
        onUpdatePosition(clip.id, newStart);
        onUpdateDuration(clip.id, newDuration);
      }
    } else if (isResizingEnd) {
      const newDuration = Math.max(0.1, originalDuration + deltaSeconds);
      onUpdateDuration(clip.id, newDuration);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizingStart(false);
    setIsResizingEnd(false);
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only act on left-click
    e.stopPropagation();
    setIsDragging(true);
    setDragStartX(e.clientX);
    setOriginalStart(clip.start);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleResizeStartMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsResizingStart(true);
    setDragStartX(e.clientX);
    setOriginalStart(clip.start);
    setOriginalDuration(clip.duration);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };
  
  const handleResizeEndMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsResizingEnd(true);
    setDragStartX(e.clientX);
    setOriginalDuration(clip.duration);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };
  
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  return (
    <>
      <div
        className="absolute top-1/2 -translate-y-1/2 h-[80%] flex items-center justify-center select-none cursor-grab active:cursor-grabbing"
        style={{ 
            left: `${left}px`, 
            width: `${width}px`,
            backgroundColor: `${trackColor}33`,
            border: `1px solid ${trackColor}`
        }}
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
      >
        <div className="absolute left-0 top-0 w-2 h-full cursor-ew-resize z-10" onMouseDown={handleResizeStartMouseDown} />
        <div className="absolute right-0 top-0 w-2 h-full cursor-ew-resize z-10" onMouseDown={handleResizeEndMouseDown} />
        
        <canvas 
            ref={canvasRef} 
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
        />

        <span className="absolute top-1 left-2 text-xs font-mono text-black truncate pr-2 z-10 pointer-events-none">{clip.name}</span>
      </div>

      {contextMenu && (
        <div 
            className="fixed bg-black border border-[#FF4F00] text-white z-50"
            style={{ top: contextMenu.y, left: contextMenu.x }}
        >
            <button onClick={() => onCut(clip)} className="block w-full text-left px-3 py-1.5 font-mono text-sm hover:bg-[#FF4F00]">[ CUT ]</button>
            <button onClick={() => onCopy(clip)} className="block w-full text-left px-3 py-1.5 font-mono text-sm hover:bg-[#FF4F00]">[ COPY ]</button>
            <button onClick={() => onDelete(clip.id)} className="block w-full text-left px-3 py-1.5 font-mono text-sm hover:bg-[#FF4F00]">[ DELETE ]</button>
        </div>
      )}
    </>
  );
};

export default AudioClip;