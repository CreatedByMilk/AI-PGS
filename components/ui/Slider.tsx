import React, { useRef, useCallback } from 'react';

interface SliderProps {
  label: string;
  value: number; // 0-1
  onChange: (value: number) => void;
  vertical?: boolean;
}

const Slider: React.FC<SliderProps> = ({ label, value, onChange, vertical = false }) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({
    isDragging: false,
    startPos: 0, // Will be clientX or clientY
    startValue: 0,
    sliderDim: 0, // Will be width or height
  });

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.current.isDragging) return;

    const currentPos = vertical ? e.clientY : e.clientX;
    const dPos = currentPos - dragState.current.startPos;
    
    // For vertical sliders, moving mouse down (increasing clientY) should decrease value
    const dValue = (vertical ? -dPos : dPos) / (dragState.current.sliderDim || 1);
    
    const newValue = dragState.current.startValue + dValue;
    onChange(Math.max(0, Math.min(1, newValue)));

  }, [onChange, vertical]);

  const handleMouseUp = useCallback(() => {
    dragState.current.isDragging = false;
    document.body.style.cursor = 'default';
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    
    dragState.current = {
      isDragging: true,
      startPos: vertical ? e.clientY : e.clientX,
      startValue: value,
      sliderDim: vertical ? rect.height : rect.width,
    };

    document.body.style.cursor = vertical ? 'ns-resize' : 'ew-resize';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [value, vertical, handleMouseMove, handleMouseUp]);
  
  const formattedValue = (value * 100).toFixed(1);

  if (vertical) {
      return (
        <div className="flex flex-col items-center h-48">
          <div 
            ref={sliderRef}
            onMouseDown={handleMouseDown}
            className="relative h-full w-2 bg-black cursor-ns-resize group"
          >
            <div className="absolute left-0 bottom-0 w-full bg-[#FF4F00]" style={{ height: `${value * 100}%` }} />
            <div 
                className="absolute w-4 h-1 bg-white border border-black -left-1 transform transition-transform group-active:scale-110 pointer-events-none" 
                style={{ bottom: `calc(${value * 100}% - 2px)` }}
            />
          </div>
          <span className="font-mono text-xs text-black mt-2">{label}</span>
          <span className="font-mono text-xs text-gray-500 whitespace-pre">{formattedValue.padStart(5, ' ')}</span>
        </div>
      )
  }

  return (
    <div>
      <div className="flex justify-between items-center">
        <label className="font-mono text-xs text-black whitespace-pre">{label}</label>
        <span className="font-mono text-xs text-gray-500 whitespace-pre">{formattedValue.padStart(5, ' ')}</span>
      </div>
      <div 
        ref={sliderRef}
        onMouseDown={handleMouseDown}
        className="relative w-full h-2 bg-black cursor-ew-resize group"
      >
        <div className="absolute top-0 left-0 h-full bg-[#FF4F00]" style={{ width: `${value * 100}%` }}/>
        <div 
            className="absolute h-4 w-1 bg-white border border-black -top-1 transform transition-transform group-active:scale-110 pointer-events-none"
            style={{ left: `calc(${value * 100}% - 2px)` }}
        />
      </div>
    </div>
  );
};

export default Slider;