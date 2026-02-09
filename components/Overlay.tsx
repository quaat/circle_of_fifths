import React from 'react';
import { CurrentKeyData } from '../types';

interface OverlayProps {
  left: CurrentKeyData;
  center: CurrentKeyData;
  right: CurrentKeyData;
}

const KeyDisplay: React.FC<{ title: string; data: CurrentKeyData; highlight?: boolean }> = ({ title, data, highlight }) => (
  <div className={`flex flex-col items-center justify-center w-20 md:w-24 py-3 rounded-xl transition-all ${highlight ? 'bg-white/10 shadow-lg scale-110 z-10' : 'opacity-70'}`}>
    <span className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">{title}</span>
    <span className="text-2xl md:text-3xl font-bold text-white leading-none mb-1">{data.major}</span>
    <span className="text-sm font-medium text-cyan-400">{data.minor}</span>
  </div>
);

export const Overlay: React.FC<OverlayProps> = ({ left, center, right }) => {
  return (
    <div className="absolute top-0 left-1/2 -translate-x-1/2 mt-4 md:mt-8 z-20">
      <div className="flex items-start gap-2 p-2 bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl">
        <KeyDisplay title="4th" data={left} />
        <KeyDisplay title="Key" data={center} highlight />
        <KeyDisplay title="5th" data={right} />
      </div>
      
      {/* Visual Indicator Line pointing to center of dial */}
      <div className="w-[2px] h-6 bg-gradient-to-b from-cyan-400 to-transparent mx-auto mt-[-2px] opacity-80" />
    </div>
  );
};
