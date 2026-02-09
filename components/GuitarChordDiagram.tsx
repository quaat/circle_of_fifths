import React from 'react';
import { DiatonicChordDiagram } from '../types';

const getOrdinal = (value: number): string => {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return `${value}th`;
  }
  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
};

export const GuitarChordDiagram: React.FC<{ chord: DiatonicChordDiagram }> = ({ chord }) => {
  const { shape } = chord;
  const width = 130;
  const height = 165;
  const paddingTop = 20;
  const paddingBottom = 18;
  const paddingLeft = 18;
  const paddingRight = 18;
  const fretCount = 4;
  // Frets are 1-based (fret 1 is the first space after the nut); 0 is only for open strings.
  // When the nut is shown, the visible window must start at fret 1 so fret 1 maps to the first space.
  const windowStart = shape.startFret > 1 ? shape.startFret : 1;
  const windowEnd = windowStart + fretCount - 1;
  const showNut = shape.startFret <= 1;

  const gridWidth = width - paddingLeft - paddingRight;
  const gridHeight = height - paddingTop - paddingBottom;
  const stringSpacing = gridWidth / 5;
  const fretSpacing = gridHeight / fretCount;

  const stringX = (stringIndex: number) => paddingLeft + stringIndex * stringSpacing;
  const fretY = (fretIndex: number) => paddingTop + fretIndex * fretSpacing;

  const barre = shape.barre && shape.barre.fret >= windowStart && shape.barre.fret <= windowEnd ? shape.barre : null;

  return (
    <div className="bg-slate-900/40 border border-white/5 rounded-xl p-3 sm:p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-100">{chord.name}</div>
        <div className="text-[10px] font-mono uppercase tracking-wide text-slate-500">{chord.degree}</div>
      </div>
      <svg width={width} height={height} className="block">
        {Array.from({ length: 6 }).map((_, stringIndex) => (
          <line
            key={`string-${stringIndex}`}
            x1={stringX(stringIndex)}
            x2={stringX(stringIndex)}
            y1={fretY(0)}
            y2={fretY(fretCount)}
            stroke="#475569"
            strokeWidth={1}
          />
        ))}

        {Array.from({ length: fretCount + 1 }).map((_, fretIndex) => (
          <line
            key={`fret-${fretIndex}`}
            x1={stringX(0)}
            x2={stringX(5)}
            y1={fretY(fretIndex)}
            y2={fretY(fretIndex)}
            stroke={fretIndex === 0 && showNut ? '#e2e8f0' : '#334155'}
            strokeWidth={fretIndex === 0 && showNut ? 2.5 : 1}
          />
        ))}

        {shape.startFret > 1 && (
          <text x={4} y={fretY(1) - 4} fill="#94a3b8" fontSize={10} fontFamily="JetBrains Mono, monospace">
            {getOrdinal(shape.startFret)} fret
          </text>
        )}

        {barre && (
          <rect
            x={stringX(barre.fromString) - 6}
            y={fretY(barre.fret - windowStart + 0.5) - 6}
            width={stringX(barre.toString) - stringX(barre.fromString) + 12}
            height={12}
            rx={6}
            fill="#1e293b"
            stroke="#94a3b8"
            strokeWidth={1.2}
          />
        )}

        {shape.frets.map((fret, stringIndex) => {
          const x = stringX(stringIndex);
          if (fret === 'x') {
            return (
              <text
                key={`muted-${stringIndex}`}
                x={x}
                y={fretY(0) - 6}
                fill="#94a3b8"
                fontSize={11}
                fontFamily="JetBrains Mono, monospace"
                textAnchor="middle"
              >
                ×
              </text>
            );
          }
          if (fret === 0) {
            return (
              <circle
                key={`open-${stringIndex}`}
                cx={x}
                cy={fretY(0) - 6}
                r={4}
                fill="none"
                stroke="#94a3b8"
                strokeWidth={1.2}
              />
            );
          }

          const offset = fret - windowStart;
          if (offset < 0 || offset >= fretCount + 1) {
            return null;
          }
          const y = fretY(offset + 0.5);
          const finger = shape.fingers[stringIndex];
          return (
            <g key={`note-${stringIndex}`}>
              <circle cx={x} cy={y} r={7} fill="#1e293b" stroke="#94a3b8" strokeWidth={1.2} />
              {finger ? (
                <text
                  x={x}
                  y={y + 0.5}
                  fill="#e2e8f0"
                  fontSize={9}
                  fontFamily="JetBrains Mono, monospace"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {finger}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
