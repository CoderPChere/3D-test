// Shared pointer-handler shape for pickable instanced groups (id via instance `name`).
import type { ThreeEvent } from "@react-three/fiber";

export interface ObjHandlers {
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
  onPointerOver: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut: () => void;
  onPointerMove: (e: ThreeEvent<PointerEvent>) => void;
}
