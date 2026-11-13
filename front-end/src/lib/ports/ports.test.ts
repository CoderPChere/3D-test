import { describe, it, expect } from 'vitest';
import { ports } from './index';

describe('ports registry', () => {
  // integration-ports spec: interfaces exist, but no implementation attaches.
  it('ships with every port unimplemented', () => {
    expect(ports).toEqual({ backend: null, ai: null, data: null });
  });
});
