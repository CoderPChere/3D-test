import type { LayerId } from "../model/types";
import type { VehicleType } from "../model/types";

export const LAYER_LABELS: Record<LayerId, string> = {
  geometry: "City geometry",
  vehicles: "Vehicles",
  signals: "Traffic signals",
  heatmap: "Density heatmap",
  congestion: "Congestion hotspots",
  distribution: "Vehicle distribution",
};

/** Per-type colors shared by the viewport (distribution layer) and its legend. */
export const VEHICLE_TYPE_COLORS: Record<VehicleType, string> = {
  car: "#38bdf8",
  bus: "#f59e0b",
  truck: "#a855f7",
  van: "#22d3ee",
};
