import React, { useState } from 'react';
import { CurrentKeyData, SpellingMode } from '../types';
import { getChords } from '../utils/musicTheory';

interface InfoPanelProps {
  currentKey: CurrentKeyData;
  spellingMode: SpellingMode;
}

export const InfoPanel: React.FC<InfoPanelProps> = ({ currentKey, spellingMode }) => {
  const [activeTab, setActiveTab] = useState<'chords' | 'subs' | 'guitar'>('chords');
  const chords = getChords(currentKey.index, spellingMode);

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900/50 backdrop-blur-xl border-t border-white/10 md:border md:rounded-2xl md:mt-8 flex flex-col h-64 md:h-auto overflow-hidden shadow-2xl ring-1 ring-white/5">
      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {[
          { id: 'chords', label: 'Chords' },
          { id: 'subs', label: 'Substitutions' },
          { id: 'guitar', label: 'Guitar' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-4 text-sm font-semibold tracking-wide transition-all focus:outline-none relative overflow-hidden ${
              activeTab === tab.id
                ? 'text-cyan-400 bg-white/5'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 md:p-6 overflow-y-auto no-scrollbar flex-1 bg-gradient-to-b from-transparent to-slate-900/30">
        {activeTab === 'chords' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]"></span>
              Progressions in {currentKey.major}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {chords.map((chord, i) => (
                <div key={i} className="bg-slate-800/40 hover:bg-slate-800/60 transition-colors p-4 rounded-xl border border-white/5 group">
                  <div className="text-[10px] uppercase tracking-wider text-cyan-500/70 mb-1 group-hover:text-cyan-400 transition-colors">{chord.name}</div>
                  <div className="text-lg font-bold text-slate-200 tracking-tight">{chord.progression}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'subs' && (
          <div className="text-center py-8 flex flex-col items-center justify-center h-full">
            <p className="text-slate-400 mb-4 text-sm uppercase tracking-widest">Tritone Substitution</p>
            <div className="text-3xl md:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500 font-bold mb-6 font-mono">
              {currentKey.major}7 <span className="text-slate-600 mx-2">→</span> {getTritoneSub(currentKey.index)}7
            </div>
            <p className="text-xs text-slate-600 italic border px-3 py-1 rounded-full border-white/5">Advanced substitutions coming soon</p>
          </div>
        )}

        {activeTab === 'guitar' && (
          <div className="flex flex-col items-center justify-center py-4 h-full opacity-60 hover:opacity-100 transition-opacity">
            <div className="w-20 h-32 border-2 border-slate-700 rounded-lg mb-4 flex items-center justify-center bg-slate-800/20 relative overflow-hidden">
               {/* Fret lines visual */}
               <div className="absolute inset-0 flex flex-col justify-between py-2">
                 {[1,2,3,4].map(k => <div key={k} className="w-full h-px bg-slate-700"></div>)}
               </div>
               <div className="absolute inset-0 flex justify-between px-2">
                 {[1,2,3].map(k => <div key={k} className="h-full w-px bg-slate-700"></div>)}
               </div>
               <span className="text-slate-600 text-xs font-mono relative z-10 bg-slate-900/80 px-1 rounded">FRET 1</span>
            </div>
            <p className="text-sm text-slate-400">Chord diagrams for <span className="text-cyan-400 font-bold">{currentKey.major}</span> coming soon.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Simple helper for tritone stub
const getTritoneSub = (index: number) => {
  // Tritone is 6 steps away (half circle)
  // Logic is purely for display placeholder
  const tritoneIndex = (index + 6) % 12;
  const roots = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  // Map circle index back to chromatic root is complex because circle jumps by 5ths.
  // Circle: C(0), G(1), D(2), A(3), E(4), B(5), F#(6), Db(7), Ab(8), Eb(9), Bb(10), F(11)
  // Chromatic values relative to C=0:
  // C=0, G=7, D=2, A=9, E=4, B=11, F#=6, Db=1, Ab=8, Eb=3, Bb=10, F=5
  // It's just a placeholder string return for now based on Circle index + 6
  // Circle Index + 6 is the key exactly opposite.
  // Opposite of C (0) is F# (6).
  const oppositeLabels = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
  return oppositeLabels[tritoneIndex];
};