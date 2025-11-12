import React from 'react';

interface AdvancedEqModalProps {
  onClose: () => void;
}

const AdvancedEqModal: React.FC<AdvancedEqModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#F5F5F5] border border-black w-full max-w-3xl p-4" style={{ height: '60vh' }}>
        <h2 className="font-mono text-black">ADVANCED PARAMETRIC EQ</h2>
        <div className="w-full h-5/6 bg-black my-2 border border-gray-600 flex items-center justify-center">
            <p className="font-mono text-white">SPECTRUM ANALYZER & PARAMETRIC EQ INTERFACE (IN DEVELOPMENT)</p>
        </div>
        <div className="flex justify-end">
          <button onClick={onClose} className="font-mono text-sm text-black border border-black px-3 py-1.5">
            [ CLOSE ]
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdvancedEqModal;