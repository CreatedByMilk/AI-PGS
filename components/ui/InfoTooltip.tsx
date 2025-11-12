import React, { useState } from 'react';

interface InfoTooltipProps {
  text: string;
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({ text }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className="font-mono text-xs bg-gray-400 text-white w-4 h-4 rounded-full flex items-center justify-center"
      >
        ?
      </button>
      {visible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black text-white text-xs font-mono border border-white z-50">
          {text}
        </div>
      )}
    </div>
  );
};

export default InfoTooltip;