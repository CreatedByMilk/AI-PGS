import React, { useState } from 'react';
import { Track, MixerSettings } from '../types';
import Slider from './ui/Slider';
import Knob from './ui/Knob';
import ToggleSwitch from './ui/ToggleSwitch';
import InfoTooltip from './ui/InfoTooltip';
import AdvancedEqModal from './modals/AdvancedEqModal';
import { DEFAULT_MIXER_SETTINGS, MODULE_KEYS } from '../constants';

interface MixerPanelProps {
  selectedTrack: Track;
  onUpdateSettings: (trackId: number, newSettings: Partial<MixerSettings>) => void;
  onSelectTrack: (trackId: number) => void;
  tracks: Track[];
}

const MixerPanel: React.FC<MixerPanelProps> = ({ selectedTrack, onUpdateSettings, onSelectTrack, tracks }) => {
  const [isEqModalOpen, setIsEqModalOpen] = useState(false);
  const settings = selectedTrack.mixerSettings;
  const trackId = selectedTrack.id;

  const update = (key: keyof MixerSettings, value: any) => {
    onUpdateSettings(trackId, { [key]: value });
  };

  const handleReset = (module: keyof typeof MODULE_KEYS) => {
    const keysToReset = MODULE_KEYS[module];
    const defaultValues = keysToReset.reduce((acc, key) => {
        (acc as any)[key] = DEFAULT_MIXER_SETTINGS[key as keyof MixerSettings];
        return acc;
    }, {} as Partial<MixerSettings>);
    onUpdateSettings(trackId, defaultValues);
  };

  const MixerModule: React.FC<{ title: string; info: string; children: React.ReactNode; onReset: () => void; }> = ({ title, info, children, onReset }) => (
    <div className="bg-gray-300 border border-gray-400 p-3 flex flex-col">
      <h3 className="font-mono text-sm text-black mb-2 flex-shrink-0">{title}</h3>
      <div className="flex-grow flex flex-col space-y-3 pt-2">
        {children}
      </div>
      <div className="flex justify-end items-center mt-auto pt-2 space-x-2">
          <InfoTooltip text={info} />
          <button onClick={onReset} className="text-gray-500 hover:text-black p-1 rounded-full hover:bg-gray-200 transition-colors" title="Reset module">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 14 4 9l5-5"/>
                  <path d="M4 9h10.5a6.5 6.5 0 0 1 0 13H11"/>
              </svg>
          </button>
      </div>
    </div>
  );

  return (
    <div className="bg-[#F5F5F5] border border-black p-4 text-black">
      {isEqModalOpen && <AdvancedEqModal onClose={() => setIsEqModalOpen(false)} />}
      {/* Tabs */}
      <div className="flex border-b border-black mb-2">
        {tracks.map(track => (
          <button
            key={track.id}
            onClick={() => onSelectTrack(track.id)}
            className={`font-mono text-sm px-4 py-1.5 border border-b-0 border-black ${selectedTrack.id === track.id ? 'bg-white text-[#FF4F00]' : 'bg-gray-200 text-black'}`}
          >
            [ {track.name.toUpperCase()} ]
          </button>
        ))}
      </div>
      
      {/* Signal Path Display */}
      <div className="font-mono text-xs text-center py-2 text-gray-600">
        SIGNAL_PATH: IN &gt; GAIN &gt; REPAIR &gt; EQ &gt; PEAK &gt; GLUE &gt; COLOR &gt; OUT
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {/* Gain Staging */}
        <MixerModule title="== MODULE_01: GAIN_STAGE      ==" info="Controls the initial volume level of the track before any effects are applied." onReset={() => handleReset('gain')}>
            <Slider label="INPUT GAIN   " value={settings.inputGain} onChange={v => update('inputGain', v)} />
        </MixerModule>
        
        {/* Audio Repair */}
        <MixerModule title="== MODULE_02: AUDIO_REPAIR    ==" info="De-Esser: Reduces harsh 's' sounds (sibilance) in vocal tracks." onReset={() => handleReset('repair')}>
            <ToggleSwitch label="DE-ESSER     " checked={settings.deEsserOn} onChange={v => update('deEsserOn', v)} />
            <Slider label="THRESHOLD    " value={settings.deEsserThreshold} onChange={v => update('deEsserThreshold', v)} />
            <Slider label="RATIO        " value={settings.deEsserRatio} onChange={v => update('deEsserRatio', v)} />
        </MixerModule>

        {/* Equalizer */}
        <MixerModule title="== MODULE_03: EQUALIZER       ==" info="Adjusts the balance between different frequency components of the audio." onReset={() => handleReset('eq')}>
            <ToggleSwitch label="EQ           " checked={settings.eqOn} onChange={v => update('eqOn', v)} />
            <div className="flex-grow flex justify-around items-center">
                <Knob label="LOW" value={settings.eqLow} onChange={v => update('eqLow', v)} />
                <Knob label="MID" value={settings.eqMid} onChange={v => update('eqMid', v)} />
                <Knob label="HIGH" value={settings.eqHigh} onChange={v => update('eqHigh', v)} />
            </div>
            <button onClick={() => setIsEqModalOpen(true)} className="font-mono text-xs text-black border border-black w-full py-1 hover:bg-gray-400 transition-colors">[ ADV. EQ ]</button>
        </MixerModule>

        {/* Peak Compressor */}
        <MixerModule title="== MODULE_04: PEAK_COMPRESSOR ==" info="Reduces the volume of the loudest parts of the signal to create a more even dynamic range." onReset={() => handleReset('peak')}>
            <ToggleSwitch label="PEAK         " checked={settings.peakCompressorOn} onChange={v => update('peakCompressorOn', v)} />
            <Slider label="THRESHOLD    " value={settings.peakThreshold} onChange={v => update('peakThreshold', v)} />
            <Slider label="RATIO        " value={settings.peakRatio} onChange={v => update('peakRatio', v)} />
            <Slider label="ATTACK       " value={settings.peakAttack} onChange={v => update('peakAttack', v)} />
            <Slider label="RELEASE      " value={settings.peakRelease} onChange={v => update('peakRelease', v)} />
        </MixerModule>

        {/* Glue Compressor */}
        <MixerModule title="== MODULE_05: GLUE_COMPRESSOR ==" info="'Glues' the track together by applying a slower, more musical compression." onReset={() => handleReset('glue')}>
            <ToggleSwitch label="GLUE         " checked={settings.glueCompressorOn} onChange={v => update('glueCompressorOn', v)} />
            <Slider label="THRESHOLD    " value={settings.glueThreshold} onChange={v => update('glueThreshold', v)} />
            <Slider label="RATIO        " value={settings.glueRatio} onChange={v => update('glueRatio', v)} />
            <Slider label="ATTACK       " value={settings.glueAttack} onChange={v => update('glueAttack', v)} />
            <Slider label="RELEASE      " value={settings.glueRelease} onChange={v => update('glueRelease', v)} />
        </MixerModule>

        {/* Color */}
        <MixerModule title="== MODULE_06: COLOR           ==" info="Adds warmth and character to the sound through harmonic distortion." onReset={() => handleReset('color')}>
            <ToggleSwitch label="SATURATION   " checked={settings.saturationOn} onChange={v => update('saturationOn', v)} />
            <Slider label="SATURATION   " value={settings.saturationValue} onChange={v => update('saturationValue', v)} />
        </MixerModule>

        {/* Mastering */}
        <MixerModule title="== MODULE_07: MASTERING       ==" info="Final output controls for the track." onReset={() => handleReset('mastering')}>
            <Slider label="OUTPUT VOLUME" value={settings.outputVolume} onChange={v => update('outputVolume', v)} />
            <div className="flex items-center mt-auto space-x-2">
                <input type="checkbox" id="normalize" checked={settings.normalizeOnExport} onChange={e => update('normalizeOnExport', e.target.checked)} />
                <label htmlFor="normalize" className="font-mono text-xs">NORMALIZE ON EXPORT</label>
            </div>
        </MixerModule>
      </div>
    </div>
  );
};

export default MixerPanel;