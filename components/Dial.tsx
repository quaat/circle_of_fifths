import React, { useRef, useEffect, useState, useMemo } from 'react';
import { SpellingMode, KeyDefinition } from '../types';
import { getKeyLabel } from '../utils/musicTheory';

// Raw data import for rendering labels on the ring
const CIRCLE_LABELS: KeyDefinition[] = [
  { major: ['C'], minor: ['Am'] },
  { major: ['G'], minor: ['Em'] },
  { major: ['D'], minor: ['Bm'] },
  { major: ['A'], minor: ['F#m'] },
  { major: ['E'], minor: ['C#m'] },
  { major: ['B'], minor: ['G#m'] },
  { major: ['F#', 'Gb'], minor: ['D#m', 'Ebm'] },
  { major: ['Db', 'C#'], minor: ['Bbm'] }, // Order swapped for rendering pref in auto
  { major: ['Ab'], minor: ['Fm'] },
  { major: ['Eb'], minor: ['Cm'] },
  { major: ['Bb'], minor: ['Gm'] },
  { major: ['F'], minor: ['Dm'] },
];

interface DialProps {
  rotation: number;
  setRotation: (r: number) => void;
  onDragEnd: () => void;
  spellingMode: SpellingMode;
}

export const Dial: React.FC<DialProps> = ({ rotation, setRotation, onDragEnd, spellingMode }) => {
  const dialRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartAngle = useRef<number>(0);
  const dragStartRotation = useRef<number>(0);

  // Helper to get angle from center
  const getAngle = (clientX: number, clientY: number) => {
    if (!dialRef.current) return 0;
    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    return Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dialRef.current?.setPointerCapture(e.pointerId);
    dragStartAngle.current = getAngle(e.clientX, e.clientY);
    dragStartRotation.current = rotation;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const currentAngle = getAngle(e.clientX, e.clientY);
    const delta = currentAngle - dragStartAngle.current;
    setRotation(dragStartRotation.current + delta);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    dialRef.current?.releasePointerCapture(e.pointerId);
    onDragEnd();
  };

  // Generate SVG Paths
  const renderSegments = useMemo(() => {
    const segments = [];
    const radiusOuter = 140;
    const radiusMid = 90; // Boundary between Major and Minor
    const radiusInner = 50; // Inner hole
    
    for (let i = 0; i < 12; i++) {
      const startAngle = (i * 30 - 15 - 90) * (Math.PI / 180); // -90 to start at 12 o'clock visual logic for 0 index?
      // Actually index 0 is at rotation 0.
      // SVG 0 deg is 3 o'clock. 
      // We want index 0 (C) at 12 o'clock. So rotate entire group -90deg.
      // Or just compute coordinates with -90 offset.
      
      const endAngle = (i * 30 + 15 - 90) * (Math.PI / 180);

      // Helper for arc path
      const createArc = (rInner: number, rOuter: number) => {
        const x1 = Math.cos(startAngle) * rOuter;
        const y1 = Math.sin(startAngle) * rOuter;
        const x2 = Math.cos(endAngle) * rOuter;
        const y2 = Math.sin(endAngle) * rOuter;
        
        const x3 = Math.cos(endAngle) * rInner;
        const y3 = Math.sin(endAngle) * rInner;
        const x4 = Math.cos(startAngle) * rInner;
        const y4 = Math.sin(startAngle) * rInner;

        return `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 0 0 ${x4} ${y4} Z`;
      };

      // Major Segment (Outer)
      segments.push(
        <path
          key={`major-${i}`}
          d={createArc(radiusMid, radiusOuter)}
          className="fill-slate-800 stroke-slate-900 stroke-[1px] transition-colors duration-300 hover:fill-slate-700"
        />
      );

      // Minor Segment (Inner)
      segments.push(
        <path
          key={`minor-${i}`}
          d={createArc(radiusInner, radiusMid)}
          className="fill-slate-900 stroke-slate-800 stroke-[1px] transition-colors duration-300 hover:fill-slate-800"
        />
      );

      // Text Labels
      // Angle for text center
      const textAngleRad = (i * 30 - 90) * (Math.PI / 180);
      const textRadiusMajor = (radiusOuter + radiusMid) / 2;
      const textRadiusMinor = (radiusMid + radiusInner) / 2;

      // Rotate text to be upright or radial? Upright is easier to read.
      // We will rotate the whole group by `rotation` state. 
      // The text inside should probably be oriented radially or upright?
      // User asked for "Readable". Usually upright relative to the viewer is best, but difficult on a spinning wheel.
      // Standard circle of fifths wheels often have text aligned radially.
      
      const labelData = CIRCLE_LABELS[i];
      const majorLabel = getKeyLabel(labelData.major, i, spellingMode);
      const minorLabel = getKeyLabel(labelData.minor, i, spellingMode);

      segments.push(
        <g key={`text-${i}`}>
          {/* Major Label */}
          <text
            x={Math.cos(textAngleRad) * textRadiusMajor}
            y={Math.sin(textAngleRad) * textRadiusMajor}
            className="fill-white text-[14px] font-bold pointer-events-none select-none"
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(${i * 30}, ${Math.cos(textAngleRad) * textRadiusMajor}, ${Math.sin(textAngleRad) * textRadiusMajor})`}
          >
            {majorLabel}
          </text>
          
          {/* Minor Label */}
          <text
            x={Math.cos(textAngleRad) * textRadiusMinor}
            y={Math.sin(textAngleRad) * textRadiusMinor}
            className="fill-slate-400 text-[10px] font-medium pointer-events-none select-none"
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(${i * 30}, ${Math.cos(textAngleRad) * textRadiusMinor}, ${Math.sin(textAngleRad) * textRadiusMinor})`}
          >
            {minorLabel}
          </text>
        </g>
      );
    }
    return segments;
  }, [spellingMode]);

  return (
    <div className="relative w-[320px] h-[320px] md:w-[400px] md:h-[400px] touch-none select-none flex items-center justify-center">
      {/* Container for shadows */}
      <div className="absolute inset-0 rounded-full shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-slate-950 rounded-full" />
      
      <svg
        ref={dialRef}
        viewBox="-150 -150 300 300"
        className="w-full h-full cursor-grab active:cursor-grabbing will-change-transform"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: isDragging ? 'none' : 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <g>{renderSegments}</g>
      </svg>
    </div>
  );
};
