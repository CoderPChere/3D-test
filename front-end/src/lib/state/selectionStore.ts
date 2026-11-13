import { create } from 'zustand';
import type { ObjectId } from '../model/types';

interface SelectionState {
  selectedId: ObjectId | null;
  hoverId: ObjectId | null;
  select: (id: ObjectId | null) => void;
  hover: (id: ObjectId | null) => void;
}

export const useSelectionStore = create<SelectionState>()((set) => ({
  selectedId: null,
  hoverId: null,
  select: (selectedId) => set({ selectedId }),
  hover: (hoverId) => set({ hoverId }),
}));
