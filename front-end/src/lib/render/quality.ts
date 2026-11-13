// Quality-tier policy (performance-settings spec): what each tier renders and
// simulates. Pure data — consumed by Scene (DPR/shadows), City (detail
// density), and the timeline driver (vehicle budget).
import type { QualityTier } from '../model/types';

export interface QualityConfig {
  /** Renderer device-pixel-ratio value or [min, max] cap — sub-native on Low. */
  dpr: number | [number, number];
  /** Directional-light and contact shadows render only when true. */
  shadows: boolean;
  /** Fraction of decorative window lights rendered (detail density), 0..1. */
  detail: number;
  /** Max simulated vehicles; spawns beyond this are capped and flagged. */
  vehicleBudget: number;
}

export const QUALITY: Record<QualityTier, QualityConfig> = {
  low: { dpr: 0.75, shadows: false, detail: 0, vehicleBudget: 20 },
  medium: { dpr: [1, 1.25], shadows: true, detail: 0.5, vehicleBudget: 64 },
  high: { dpr: [1, 1.5], shadows: true, detail: 1, vehicleBudget: 256 },
};

/** Upper bound of the tier's dpr (comparison/tests). */
export function maxDpr(q: QualityConfig): number {
  return typeof q.dpr === 'number' ? q.dpr : q.dpr[1];
}
