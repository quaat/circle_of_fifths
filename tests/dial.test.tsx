// @vitest-environment jsdom
import React, { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dial } from '../components/Dial';
import { SpellingMode } from '../types';
import { angleDelta, rotationForIndex } from '../utils/dialInteraction';
import App from '../App';
afterEach(cleanup);
describe('circle navigation', () => {
  it('normalizes wrap deltas in both directions', () => {
    expect(angleDelta(179, -179)).toBe(2);
    expect(angleDelta(-179, 179)).toBe(-2);
    expect(rotationForIndex(-750, 2)).toBe(-780);
  });
  it('supports direct selection and major/minor ring keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Next key on the circle' }));
    expect(screen.getByText('Progressions in G')).toBeTruthy();
    const g = screen.getByRole('button', { name: 'G major' });
    g.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByText('Progressions in D')).toBeTruthy();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByText('Progressions in G')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Bb minor' }));
    expect(screen.getByText('Progressions in Bbm')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'minor' }).getAttribute('aria-pressed')).toBe('true');
  });
  it('uses the latest pointer rotation and handles cancellation/other pointers', () => {
    const onDragEnd = vi.fn();
    const onSelectKey = vi.fn();
    const Harness = () => {
      const [rotation, setRotation] = useState(0);
      return <Dial rotation={rotation} setRotation={setRotation} onDragEnd={onDragEnd} onSelectKey={onSelectKey} spellingMode={SpellingMode.Auto} tonality="major" />;
    };
    render(<Harness />);
    // jsdom has no native PointerEvent/capture; model their event data explicitly.
    const svg = screen.getByRole('group', { name: /^Circle of fifths/ });
    Object.assign(svg, { setPointerCapture: vi.fn(), hasPointerCapture: () => true, releasePointerCapture: vi.fn() });
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 200 }) as DOMRect;
    const pointer = (type: string, id: number, x: number, y: number) => {
      const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 });
      Object.defineProperty(event, 'pointerId', { value: id });
      fireEvent(svg, event);
    };
    pointer('pointerdown', 1, 0, 101);
    pointer('pointermove', 2, 100, 0);
    pointer('pointermove', 1, 0, 99);
    pointer('pointermove', 1, 100, 0);
    pointer('pointercancel', 2, 100, 0);
    expect(onDragEnd).not.toHaveBeenCalled();
    pointer('pointercancel', 1, 100, 0);
    expect(onDragEnd.mock.calls[0][0]).toBeCloseTo(90.57, 1);
    expect(onSelectKey).not.toHaveBeenCalled();
    pointer('pointermove', 1, 200, 100);
    expect(onDragEnd).toHaveBeenCalledTimes(1);
  });
});
