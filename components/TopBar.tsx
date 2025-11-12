import React from 'react';

// Icons
const NewIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>;
const SaveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>;
const LoadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path></svg>;
const ExportIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;


interface TopBarProps {
  projectName: string;
  onNew: () => void;
  onSave: () => void;
  onLoad: () => void;
  onExport: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ projectName, onNew, onSave, onLoad, onExport }) => {
  
  const btnBaseClasses = "flex items-center space-x-2 px-4 py-2 rounded-md font-sans text-sm font-bold transition-colors";
  const defaultBtnClasses = `${btnBaseClasses} bg-[#2A2A2A] text-gray-300 hover:bg-[#3A3A3A] hover:text-white`;
  const exportBtnClasses = `${btnBaseClasses} bg-[#FF4F00] text-white hover:bg-[#E04500]`;

  return (
    <header className="bg-[#1A1A1A] h-16 flex items-center justify-between px-6 border-b border-gray-700/50 flex-shrink-0">
      <h1 className="text-2xl font-bold text-white font-sans bg-clip-text text-transparent bg-gradient-to-r from-white to-[#FF4F00]">
        AI-PGS
      </h1>
      <div className="flex items-center space-x-3">
        <button onClick={onNew} className={defaultBtnClasses}>
          <NewIcon />
          <span>New</span>
        </button>
        <button onClick={onSave} className={defaultBtnClasses}>
          <SaveIcon />
          <span>Save</span>
        </button>
        <button onClick={onLoad} className={defaultBtnClasses}>
          <LoadIcon />
          <span>Load</span>
        </button>
        <button onClick={onExport} className={exportBtnClasses}>
          <ExportIcon />
          <span>Export WAV</span>
        </button>
      </div>
    </header>
  );
};

export default TopBar;