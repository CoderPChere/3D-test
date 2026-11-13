import { describe, it, expect, vi, afterEach } from 'vitest';
import { startDriver, stopDriver } from './driver';

// Frame scheduler stub: we drive frames manually.
function stubRaf() {
  const frames: Array<(ts: number) => void> = [];
  vi.stubGlobal('requestAnimationFrame', (cb: (ts: number) => void) => {
    frames.push(cb);
    return frames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  return frames;
}

afterEach(() => {
  stopDriver();
  vi.unstubAllGlobals();
});

describe('driver error containment', () => {
  it('stops stepping and reports when advance throws, without rethrowing', () => {
    const frames = stubRaf();
    const errors: unknown[] = [];
    let calls = 0;

    startDriver(
      () => {
        calls++;
        throw new Error('boom');
      },
      () => 1,
      undefined,
      (e) => errors.push(e),
    );

    frames[0](0); // establishes lastTs, no step yet
    frames[1](50); // 0.05 s → one fixed step → advance throws

    expect(calls).toBe(1);
    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toBe('boom');
    // Loop stopped: no new frame was scheduled after the failure.
    expect(frames.length).toBe(2);

    // No further stepping even if a stale frame fires.
    const before = calls;
    frames[1]?.(100);
    expect(calls).toBe(before);
  });

  it('reports a throwing onStep the same way', () => {
    const frames = stubRaf();
    const errors: unknown[] = [];
    let stepped = 0;

    startDriver(
      () => {
        stepped++;
      },
      () => 1,
      () => {
        throw new Error('publish failed');
      },
      (e) => errors.push(e),
    );

    frames[0](0);
    frames[1](50);

    expect(stepped).toBe(1);
    expect((errors[0] as Error).message).toBe('publish failed');
    expect(frames.length).toBe(2);
  });

  it('keeps running normally when nothing throws', () => {
    const frames = stubRaf();
    let steps = 0;

    startDriver(
      () => {
        steps++;
      },
      () => 1,
    );

    frames[0](0);
    frames[1](50); // 0.05 s → 1 step
    expect(steps).toBe(1);
    frames[2](100); // another 0.05 s → 1 more step, loop alive
    expect(steps).toBe(2);
    expect(frames.length).toBe(4); // each executed frame scheduled its successor
  });
});
