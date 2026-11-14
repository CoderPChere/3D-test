import { describe, it, expect } from 'vitest';
import { resolveShortcut, type ShortcutEvent } from './shortcuts';

const key = (k: string, overrides: Partial<ShortcutEvent> = {}): ShortcutEvent => ({
  key: k,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  target: null,
  ...overrides,
});

/** Minimal element stand-in: the resolver only inspects tagName/isContentEditable/parentElement. */
const el = (tagName: string, props: { isContentEditable?: boolean; parentElement?: unknown } = {}) =>
  ({ tagName, isContentEditable: false, parentElement: null, ...props }) as unknown as EventTarget;

describe('resolveShortcut', () => {
  it('maps Delete and Backspace to delete', () => {
    expect(resolveShortcut(key('Delete'))).toBe('delete');
    expect(resolveShortcut(key('Backspace'))).toBe('delete');
  });

  it('maps Ctrl+Z to undo and Ctrl+Shift+Z to redo', () => {
    expect(resolveShortcut(key('z', { ctrlKey: true }))).toBe('undo');
    expect(resolveShortcut(key('Z', { ctrlKey: true, shiftKey: true }))).toBe('redo');
  });

  it('maps Ctrl+Y and Meta+Z / Meta+Shift+Z on macOS', () => {
    expect(resolveShortcut(key('y', { ctrlKey: true }))).toBe('redo');
    expect(resolveShortcut(key('z', { metaKey: true }))).toBe('undo');
    expect(resolveShortcut(key('z', { metaKey: true, shiftKey: true }))).toBe('redo');
  });

  it('maps Escape to cancel', () => {
    expect(resolveShortcut(key('Escape'))).toBe('cancel');
  });

  it('ignores unrelated keys and bare modifier presses', () => {
    expect(resolveShortcut(key('a'))).toBeNull();
    expect(resolveShortcut(key('z'))).toBeNull();
    expect(resolveShortcut(key('Shift', { shiftKey: true }))).toBeNull();
  });

  it('never fires inside an input, textarea, or select', () => {
    for (const tag of ['INPUT', 'TEXTAREA', 'SELECT']) {
      expect(resolveShortcut(key('Delete', { target: el(tag) }))).toBeNull();
      expect(resolveShortcut(key('Backspace', { target: el(tag) }))).toBeNull();
      expect(resolveShortcut(key('z', { ctrlKey: true, target: el(tag) }))).toBeNull();
      expect(resolveShortcut(key('Escape', { target: el(tag) }))).toBeNull();
    }
  });

  it('never fires inside a contenteditable element or its descendants', () => {
    const editable = el('DIV', { isContentEditable: true });
    const child = el('SPAN', { parentElement: editable });
    expect(resolveShortcut(key('Delete', { target: el('DIV', { isContentEditable: true }) }))).toBeNull();
    expect(resolveShortcut(key('Delete', { target: child }))).toBeNull();
    expect(resolveShortcut(key('z', { ctrlKey: true, target: child }))).toBeNull();
  });

  it('still fires from ordinary page elements', () => {
    expect(resolveShortcut(key('Delete', { target: el('BUTTON') }))).toBe('delete');
    expect(resolveShortcut(key('Escape', { target: el('CANVAS') }))).toBe('cancel');
  });
});
