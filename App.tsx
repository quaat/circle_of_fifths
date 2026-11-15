import React, { useState, useCallback, useMemo } from 'react';
import { Dial } from './components/Dial';
import { Overlay } from './components/Overlay';
import { InfoPanel } from './components/InfoPanel';
import { BottomSheet } from './components/BottomSheet';
import { getContextKeys, getIndexFromRotation, snapRotationToIndex } from './utils/musicTheory';
import { SpellingMode, Tonality } from './types';
import { rotationForIndex } from './utils/dialInteraction';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function App() {
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [tonality, setTonality] = useState<Tonality>('major');
  const [spellingMode, setSpellingMode] = useState<SpellingMode>(SpellingMode.Auto);
  
  // Calculate current state derived from rotation
  const currentIndex = getIndexFromRotation(rotation);
  const contextKeys = useMemo(() => getContextKeys(currentIndex, spellingMode), [currentIndex, spellingMode]);

  const handleDragEnd = useCallback((latestRotation: number) => {
    setRotation(snapRotationToIndex(latestRotation));
  }, []);
  const selectKey = (index: number, mode: Tonality) => {
    setRotation(previous => rotationForIndex(previous, index));
    setTonality(mode);
  };
  const rotateStep = (direction: 'left' | 'right') => {
    setRotation(previous => snapRotationToIndex(previous) + (direction === 'right' ? -30 : 30));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30 overflow-hidden flex flex-col">
      <p className="sr-only" role="status" aria-live={isDragging ? 'off' : 'polite'}>Selected key: {tonality === 'major' ? `${contextKeys.center.major} major` : `${contextKeys.center.minor.slice(0, -1)} minor`}</p>
      {/* Header / Controls */}
      <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-30 pointer-events-none">
        <h1 className="text-lg font-bold tracking-tight text-slate-400 pointer-events-auto">Circle of Fifths</h1>
        
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
        <div role="group" aria-label="Tonality" className="flex gap-1 rounded-lg bg-slate-900/80 p-1">
          {(['major', 'minor'] as const).map(mode => (
            <button key={mode} aria-pressed={tonality === mode} onClick={() => setTonality(mode)} className={`px-3 py-2 text-sm rounded ${tonality === mode ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-300'}`}>{mode}</button>
          ))}
        </div>
        {/* Spelling Toggle */}
        <div className="pointer-events-auto bg-slate-900/80 backdrop-blur border border-white/10 rounded-lg p-1 flex gap-1">
          {[SpellingMode.Auto, SpellingMode.Sharps, SpellingMode.Flats].map(mode => (
            <button
              key={mode}
              aria-pressed={spellingMode === mode}
              onClick={() => setSpellingMode(mode)}
              className={`px-3 py-1 text-xs rounded transition-all ${
                spellingMode === mode 
                  ? 'bg-cyan-500/20 text-cyan-300 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center relative">
        {/* Main interactive area */}
        <div className="relative flex items-center justify-center py-12 md:py-20 w-full max-w-4xl">
          
          {/* Fixed Reading Overlay */}
          <Overlay {...contextKeys} />

          {/* Controls - Mobile accessibility buttons */}
          <div className="absolute top-1/2 -translate-y-1/2 left-4 md:left-12 z-20">
            <button 
              onClick={() => rotateStep('left')}
              className="p-3 rounded-full bg-slate-800/50 hover:bg-slate-700/80 text-slate-300 border border-white/10 backdrop-blur transition-all active:scale-95"
              aria-label="Previous key on the circle"
            >
              <ChevronLeft size={24} />
            </button>
          </div>
          <div className="absolute top-1/2 -translate-y-1/2 right-4 md:right-12 z-20">
            <button 
              onClick={() => rotateStep('right')}
              className="p-3 rounded-full bg-slate-800/50 hover:bg-slate-700/80 text-slate-300 border border-white/10 backdrop-blur transition-all active:scale-95"
              aria-label="Next key on the circle"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* The Dial */}
          <Dial 
            rotation={rotation} 
            setRotation={setRotation} 
            onDragEnd={handleDragEnd}
            onSelectKey={selectKey}
            tonality={tonality}
            onDraggingChange={setIsDragging}
            spellingMode={spellingMode}
          />
        </div>

        {/* Info Panel */}
        <BottomSheet>
          {({ headerProps, contentProps, contentRef }) => (
            <InfoPanel
              currentKey={contextKeys.center}
              tonality={tonality}
              spellingMode={spellingMode}
              headerProps={headerProps}
              contentProps={contentProps}
              contentRef={contentRef}
            />
          )}
        </BottomSheet>
      </main>
    </div>
  );
}
