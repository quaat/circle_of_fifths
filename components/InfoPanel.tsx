import React, { useMemo, useState } from 'react';
import { CurrentKeyData, SpellingMode, Tonality } from '../types';
import { getChords } from '../utils/musicTheory';
import { generateSubstitutions } from '../utils/substitutions';
import { getDiatonicChordDiagrams } from '../utils/guitarChords';
import { GuitarChordDiagram } from './GuitarChordDiagram';

interface InfoPanelProps {
  currentKey: CurrentKeyData;
  spellingMode: SpellingMode;
}

export const InfoPanel: React.FC<InfoPanelProps> = ({ currentKey, spellingMode }) => {
  const [activeTab, setActiveTab] = useState<'chords' | 'subs' | 'guitar'>('chords');
  const [tonality, setTonality] = useState<Tonality>('major');
  const [complexityFilter, setComplexityFilter] = useState<'common' | 'advanced' | 'all'>('common');
  const [expandedDegrees, setExpandedDegrees] = useState<Record<string, boolean>>({});
  const chords = getChords(currentKey.index, spellingMode);
  const guitarChords = useMemo(
    () => getDiatonicChordDiagrams(currentKey, spellingMode, tonality),
    [currentKey, spellingMode, tonality]
  );
  const substitutions = useMemo(
    () => generateSubstitutions(tonality === 'major' ? currentKey.major : currentKey.minor, tonality, spellingMode),
    [currentKey, tonality, spellingMode]
  );
  const selectedKeyLabel = tonality === 'major' ? currentKey.major : currentKey.minor;
  const toggleDegree = (degree: string) =>
    setExpandedDegrees((prev) => ({ ...prev, [degree]: !prev[degree] }));

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
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Substitution map</h3>
                <p className="text-sm text-slate-300">
                  {tonality === 'major' ? 'Major key' : 'Minor key'} substitutions in{' '}
                  <span className="text-cyan-300 font-semibold">{selectedKeyLabel}</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-widest text-slate-500">
                <div className="flex items-center gap-2">
                  <span>Scale</span>
                  <div className="flex rounded-full border border-white/10 bg-slate-900/60 overflow-hidden">
                    {(['major', 'minor'] as Tonality[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setTonality(mode)}
                        className={`px-3 py-1 transition-all ${
                          tonality === mode ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span>Complexity</span>
                  <div className="flex rounded-full border border-white/10 bg-slate-900/60 overflow-hidden">
                    {(['common', 'advanced', 'all'] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => setComplexityFilter(level)}
                        className={`px-3 py-1 transition-all ${
                          complexityFilter === level
                            ? 'bg-cyan-500/20 text-cyan-300'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {substitutions.map((entry) => {
                const isOpen = expandedDegrees[entry.degree] ?? (entry.degree === 'I' || entry.degree === 'i');
                return (
                  <div
                    key={entry.degree}
                    className="bg-slate-800/40 border border-white/5 rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() => toggleDegree(entry.degree)}
                      className="w-full text-left p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-slate-800/60 transition-colors"
                    >
                      <div>
                        <p className="text-xs uppercase tracking-wider text-cyan-400/80">{entry.degree}</p>
                        <p className="text-lg font-semibold text-slate-100">{entry.chord}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] uppercase tracking-widest text-slate-400 bg-slate-900/60 px-2 py-1 rounded-full">
                          {entry.functionFamily}
                        </span>
                        <span className="text-xs text-slate-400">{isOpen ? 'Hide' : 'Show'}</span>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 space-y-4">
                        {entry.groups.map((group) => {
                          const filtered = group.items.filter((item) =>
                            complexityFilter === 'all' ? true : item.complexity === complexityFilter
                          );
                          if (filtered.length === 0) return null;
                          return (
                            <div key={group.id} className="space-y-2">
                              <p className="text-xs uppercase tracking-widest text-slate-500">{group.label}</p>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {filtered.map((item) => (
                                  <div
                                    key={`${group.id}-${item.chord}`}
                                    className="bg-slate-900/70 border border-white/5 rounded-lg p-3 text-sm text-slate-200"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-semibold text-slate-100">{item.chord}</span>
                                      <span className="text-[10px] uppercase tracking-widest text-slate-500">
                                        {item.complexity}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">{item.reason}</p>
                                    <p className="text-xs text-slate-500 mt-1">{item.resolvesTo}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'guitar' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Guitar Diatonic Chords</h3>
                <p className="text-sm text-slate-300">
                  {tonality === 'major' ? 'Major key' : 'Minor key'} shapes in{' '}
                  <span className="text-cyan-300 font-semibold">{selectedKeyLabel}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-slate-500">
                <span>Scale</span>
                <div className="flex rounded-full border border-white/10 bg-slate-900/60 overflow-hidden">
                  {(['major', 'minor'] as Tonality[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setTonality(mode)}
                      className={`px-3 py-1 transition-all ${
                        tonality === mode ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {guitarChords.map((chord) => (
                <GuitarChordDiagram key={chord.id} chord={chord} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
