import React, { useState, useCallback, useEffect } from 'react';
import { Dial } from './components/Dial';
import { Overlay } from './components/Overlay';
import { InfoPanel } from './components/InfoPanel';
import { getContextKeys, getIndexFromRotation, snapRotationToIndex } from './utils/musicTheory';
import { SpellingMode } from './types';
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react';

export default function App() {
  const [rotation, setRotation] = useState(0);
  const [spellingMode, setSpellingMode] = useState<SpellingMode>(SpellingMode.Auto);
  
  // Calculate current state derived from rotation
  const currentIndex = getIndexFromRotation(rotation);
  const contextKeys = getContextKeys(currentIndex, spellingMode);

  // Snap to nearest segment when drag ends
  const handleDragEnd = useCallback(() => {
    const snapped = snapRotationToIndex(rotation);
    setRotation(snapped);
  }, [rotation]);

  // Step controls
  const rotateStep = (direction: 'left' | 'right') => {
    const step = 30;
    const currentSnap = snapRotationToIndex(rotation);
    // Left button (CCW dial movement) -> moves logical index UP (Clockwise on circle representation) -> wait
    // If dial moves CCW (-30deg), the item at 1 o'clock moves to 12 o'clock.
    // Logic: Rotation -30deg = Index +1.
    // User wants "Rotate one step clockwise from C selects G".
    // C is top. G is right.
    // If I rotate Dial CCW, G moves to Top.
    // So "Select G" (Right neighbor) means rotate Dial Left (CCW).
    const newRotation = direction === 'right' ? currentSnap - step : currentSnap + step;
    setRotation(newRotation);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30 overflow-hidden flex flex-col">
      {/* Header / Controls */}
      <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-30 pointer-events-none">
        <h1 className="text-lg font-bold tracking-tight text-slate-400 pointer-events-auto">Circle of Fifths</h1>
        
        {/* Spelling Toggle */}
        <div className="pointer-events-auto bg-slate-900/80 backdrop-blur border border-white/10 rounded-lg p-1 flex gap-1">
          {[SpellingMode.Auto, SpellingMode.Sharps, SpellingMode.Flats].map(mode => (
            <button
              key={mode}
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
              aria-label="Rotate Counter-Clockwise"
            >
              <ChevronLeft size={24} />
            </button>
          </div>
          <div className="absolute top-1/2 -translate-y-1/2 right-4 md:right-12 z-20">
            <button 
              onClick={() => rotateStep('right')}
              className="p-3 rounded-full bg-slate-800/50 hover:bg-slate-700/80 text-slate-300 border border-white/10 backdrop-blur transition-all active:scale-95"
              aria-label="Rotate Clockwise"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* The Dial */}
          <Dial 
            rotation={rotation} 
            setRotation={setRotation} 
            onDragEnd={handleDragEnd}
            spellingMode={spellingMode}
          />
        </div>

        {/* Info Panel */}
        <div className="w-full px-4 pb-4 md:pb-8 flex-1 flex flex-col justify-end z-10">
           <InfoPanel currentKey={contextKeys.center} spellingMode={spellingMode} />
        </div>
      </main>
    </div>
  );
}
