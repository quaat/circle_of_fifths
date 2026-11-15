// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
afterEach(cleanup);
describe('shared selection and accessible details', () => {
  it('keeps minor context across progressions, substitutions and guitar', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'minor' }));
    expect(screen.getByRole('button', { name: 'minor' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('Progressions in Am')).toBeTruthy();
    expect(screen.getByText('Bm7b5 – E7 – Am')).toBeTruthy();
    await user.click(screen.getByRole('tab', { name: 'Substitutions' }));
    expect(screen.getByText('Minor key substitutions in')).toBeTruthy();
    expect(screen.getByText('Bm7b5 → E7 → Am')).toBeTruthy();
    await user.click(screen.getByRole('tab', { name: 'Chord Chart' }));
    expect(screen.getByText('Minor key shapes in')).toBeTruthy();
    expect(screen.getByRole('img', { name: /^Am, degree i\./ })).toBeTruthy();
  });
  it('closes the initially open tonic on the first click', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('tab', { name: 'Substitutions' }));
    const tonic = screen.getByRole('button', { name: /^I C Tonic Hide$/ });
    expect(tonic.getAttribute('aria-expanded')).toBe('true');
    await user.click(tonic);
    expect(tonic.getAttribute('aria-expanded')).toBe('false');
  });
  it('supports arrow, Home and End tab navigation', async () => {
    const user = userEvent.setup();
    render(<App />);
    const tab = screen.getByRole('tab', { name: 'Progressions' });
    tab.focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Chord Chart' }));
    expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(document.activeElement!.id);
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(tab);
    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Chord Chart' }));
  });
});
