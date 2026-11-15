import React, { useRef, useState } from 'react';
import { SpellingMode, Tonality } from '../types';
import { getIndexFromRotation, getKeyDataAtIndex } from '../utils/musicTheory';
import { angleDelta } from '../utils/dialInteraction';

interface DialProps {
  rotation: number;
  setRotation: (rotation: number) => void;
  onDragEnd: (rotation: number) => void;
  onSelectKey: (index: number, tonality: Tonality) => void;
  spellingMode: SpellingMode;
  tonality: Tonality;
  onDraggingChange?: (dragging: boolean) => void;
}
interface Drag {
  pointerId: number;
  angle: number;
  rotation: number;
  travel: number;
  selection: { index: number; tonality: Tonality } | null;
}

export const Dial: React.FC<DialProps> = ({ rotation, setRotation, onDragEnd, onSelectKey, spellingMode, tonality, onDraggingChange }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const currentIndex = getIndexFromRotation(rotation);
  const getAngle = (x: number, y: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return Math.atan2(y - (rect.top + rect.height / 2), x - (rect.left + rect.width / 2)) * 180 / Math.PI;
  };
  const start = (event: React.PointerEvent<SVGSVGElement>) => {
    if (dragRef.current || event.button !== 0) return;
    const target = (event.target as Element).closest('[data-key-index]');
    dragRef.current = {
      pointerId: event.pointerId, angle: getAngle(event.clientX, event.clientY), rotation, travel: 0,
      selection: target ? { index: Number(target.getAttribute('data-key-index')), tonality: target.getAttribute('data-tonality') as Tonality } : null,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
    onDraggingChange?.(true);
  };
  const move = (event: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const angle = getAngle(event.clientX, event.clientY);
    const delta = angleDelta(drag.angle, angle);
    drag.angle = angle;
    drag.rotation += delta;
    drag.travel += Math.abs(delta);
    if (drag.travel > 3) setRotation(drag.rotation);
  };
  const finish = (event: React.PointerEvent<SVGSVGElement>, cancelled = false) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setIsDragging(false);
    onDraggingChange?.(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!cancelled && drag.travel <= 3 && drag.selection) onSelectKey(drag.selection.index, drag.selection.tonality);
    else onDragEnd(drag.rotation);
  };
  const keyboard = (event: React.KeyboardEvent, index: number, mode: Tonality) => {
    const next = event.key === 'ArrowRight' ? (index + 1) % 12 : event.key === 'ArrowLeft' ? (index + 11) % 12 : event.key === 'Home' ? 0 : event.key === 'End' ? 11 : event.key === 'Enter' || event.key === ' ' ? index : null;
    if (next === null) return;
    event.preventDefault();
    onSelectKey(next, mode);
    svgRef.current?.querySelector<SVGElement>(`[data-key-index="${next}"][data-tonality="${mode}"]`)?.focus();
  };
  const arc = (index: number, inner: number, outer: number) => {
    const start = (index * 30 - 105) * Math.PI / 180;
    const end = (index * 30 - 75) * Math.PI / 180;
    const xy = (angle: number, radius: number) => `${Math.cos(angle) * radius} ${Math.sin(angle) * radius}`;
    return `M ${xy(start, outer)} A ${outer} ${outer} 0 0 1 ${xy(end, outer)} L ${xy(end, inner)} A ${inner} ${inner} 0 0 0 ${xy(start, inner)} Z`;
  };
  return (
    <div className="relative w-[min(320px,100vw)] aspect-square md:w-[400px] touch-none select-none flex items-center justify-center">
      <svg ref={svgRef} role="group" aria-label="Circle of fifths. Select a key or use arrow keys." viewBox="-150 -150 300 300"
        className="w-full h-full cursor-grab active:cursor-grabbing will-change-transform"
        style={{ transform: `rotate(${rotation}deg)`, transition: isDragging ? 'none' : 'transform 300ms ease-out' }}
        onPointerDown={start} onPointerMove={move} onPointerUp={event => finish(event)}
        onPointerCancel={event => finish(event, true)} onLostPointerCapture={event => finish(event, true)}>
        {Array.from({ length: 12 }, (_, index) => {
          const key = getKeyDataAtIndex(index, spellingMode);
          const angle = (index * 30 - 90) * Math.PI / 180;
          return (['major', 'minor'] as const).map(mode => {
            const major = mode === 'major';
            const selected = index === currentIndex && mode === tonality;
            const radius = major ? 115 : 70;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const name = major ? `${key.major} major` : `${key.minor.slice(0, -1)} minor`;
            return <g key={`${index}-${mode}`}>
              <path d={arc(index, major ? 90 : 50, major ? 140 : 90)} role="button" aria-label={name}
                aria-pressed={selected} tabIndex={selected ? 0 : -1} data-key-index={index} data-tonality={mode}
                onKeyDown={event => keyboard(event, index, mode)}
                onClick={event => { if (event.detail === 0) onSelectKey(index, mode); }}
                className={`${selected ? 'fill-cyan-900 stroke-cyan-300 stroke-2' : major ? 'fill-slate-800 stroke-slate-900' : 'fill-slate-900 stroke-slate-800'} hover:fill-slate-700 focus-visible:stroke-white focus-visible:stroke-[3px]`} />
              <text pointerEvents="none" x={x} y={y} textAnchor="middle" dominantBaseline="middle" aria-hidden="true"
                className={`${major ? 'fill-white text-[13px] font-bold' : 'fill-slate-300 text-[10px]'} pointer-events-none select-none`}
                transform={`rotate(${-rotation}, ${x}, ${y})`}>{major ? key.major : key.minor}</text>
              {selected && <circle cx={Math.cos(angle) * (major ? 133 : 84)} cy={Math.sin(angle) * (major ? 133 : 84)} r="2" pointerEvents="none" className="fill-white pointer-events-none" aria-hidden="true" />}
            </g>;
          });
        })}
      </svg>
    </div>
  );
};
