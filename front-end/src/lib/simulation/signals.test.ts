import { describe, it, expect } from 'vitest';
import { signalStates } from './signals';

const timing = { green: 6, yellow: 2, offset: 0 };

describe('signalStates', () => {
  it('starts with h green and v red', () => {
    const s = signalStates(timing, 0);
    expect(s.h).toBe('green');
    expect(s.v).toBe('red');
  });

  it('progresses h green → yellow → v green → yellow within one cycle', () => {
    expect(signalStates(timing, 0).h).toBe('green'); // t=0: h green
    expect(signalStates(timing, 6.5).h).toBe('yellow'); // t=6: h yellow begins
    expect(signalStates(timing, 6.5).v).toBe('red');
    expect(signalStates(timing, 8.5).h).toBe('red'); // t=8: v green begins
    expect(signalStates(timing, 8.5).v).toBe('green');
    expect(signalStates(timing, 14.5).v).toBe('yellow'); // t=14: v yellow begins
    expect(signalStates(timing, 14.5).h).toBe('red');
  });

  it('wraps to the start after one full cycle', () => {
    const cycle = 2 * (6 + 2);
    expect(signalStates(timing, cycle)).toEqual(signalStates(timing, 0));
    expect(signalStates(timing, cycle + 6.5)).toEqual(signalStates(timing, 6.5));
  });

  it('reports the configured cycle duration', () => {
    expect(signalStates(timing, 0).cycle).toBe(16);
  });

  it('offset shifts the phase', () => {
    const shifted = signalStates({ ...timing, offset: 6 }, 0);
    expect(shifted.h).toBe('yellow');
  });
});
