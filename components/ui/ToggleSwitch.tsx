import React from 'react';

interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, checked, onChange }) => {
  return (
    <div className="flex items-center justify-between">
      <label className="font-mono text-xs text-black whitespace-pre">{label}</label>
      <button
        onClick={() => onChange(!checked)}
        className={`w-12 h-6 border-2 relative transition-all duration-300 ease-in-out transition-shadow active:scale-95 ${
            checked
            ? 'bg-[#FF4F00] border-[#FF4F00] shadow-[0_0_2px_theme(colors.white),0_0_8px_#FF4F00,0_0_12px_#FF4F00]'
            : 'bg-black border-gray-600'
        }`}
        aria-checked={checked}
        role="switch"
      >
        <div
          className={`w-5 h-5 bg-white absolute top-0 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.2)] transition-transform duration-300 ease-in-out ${
              checked ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
};

export default ToggleSwitch;