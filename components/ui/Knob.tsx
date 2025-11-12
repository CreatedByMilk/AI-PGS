import React, { useCallback, useRef } from 'react';

interface KnobProps {
  label: string;
  value: number; // 0-1
  onChange: (value: number) => void;
}

const Knob: React.FC<KnobProps> = ({ label, value, onChange }) => {
  const knobRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({
      isDragging: false,
      startY: 0,
      startValue: 0
  });

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.current.isDragging) return;
    const dy = dragState.current.startY - e.clientY;
    const sensitivity = 200; // pixels per full turn
    const newValue = dragState.current.startValue + dy / sensitivity;
    onChange(Math.max(0, Math.min(1, newValue)));
  }, [onChange]);

  const handleMouseUp = useCallback(() => {
    dragState.current.isDragging = false;
    document.body.style.cursor = 'default';
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragState.current = {
        isDragging: true,
        startY: e.clientY,
        startValue: value
    };
    document.body.style.cursor = 'ns-resize';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [value, handleMouseMove, handleMouseUp]);

  const formattedValue = (value * 100).toFixed(0);

  return (
    <div className="flex flex-col items-center select-none">
      <div 
        ref={knobRef}
        onMouseDown={handleMouseDown}
        className="w-10 h-10 bg-black rounded-full border-2 border-gray-600 flex items-center justify-center relative cursor-ns-resize"
      >
        <div 
          className="w-1 h-4 bg-white rounded-full absolute top-1"
          style={{ transform: `rotate(${(value - 0.5) * 270}deg)`, transformOrigin: 'bottom center' }}
        />
      </div>
      <label className="font-mono text-xs text-black mt-1">{label}</label>
      <span className="font-mono text-xs text-gray-500 whitespace-pre">{formattedValue.padStart(3, ' ')}</span>
    </div>
  );
};

export default Knob;