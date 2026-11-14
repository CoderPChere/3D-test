// Pure keyboard-shortcut resolver: no React/DOM APIs, safe to unit test in node.
export type Shortcut = 'delete' | 'undo' | 'redo' | 'cancel';

export interface ShortcutEvent {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  target: EventTarget | null;
}

interface EditableNode {
  tagName?: string;
  isContentEditable?: boolean;
  parentElement?: EditableNode | null;
}

function isEditable(target: EventTarget | null): boolean {
  let node = target as EditableNode | null;
  while (node) {
    const tag = node.tagName?.toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (node.isContentEditable) return true;
    node = node.parentElement ?? null;
  }
  return false;
}

export function resolveShortcut(ev: ShortcutEvent): Shortcut | null {
  if (isEditable(ev.target)) return null;
  const k = ev.key.toLowerCase();
  const command = ev.ctrlKey || ev.metaKey;

  if (ev.key === 'Escape') return 'cancel';
  if (!command) {
    if (ev.key === 'Delete' || ev.key === 'Backspace') return 'delete';
    return null;
  }
  if (k === 'z') return ev.shiftKey ? 'redo' : 'undo';
  if (k === 'y') return 'redo';
  return null;
}
