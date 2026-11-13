// SimulationEngine — pure TS core: fixed timestep, seeded RNG, play/pause/reset,
// snapshot API. Imports nothing from React/Three/DOM (headless-testable).
import type {
  CityProject,
  MetricsSnapshot,
  Road,
  ScenarioEvent,
  Signal,
  SignalTiming,
  Vec2,
  Vehicle as ProjectVehicle,
  VehicleType,
} from '../model/types';
import { mulberry32 } from '../model/rng';
import { buildGraph, planRoute, type RoadGraph, type Segment } from './graph';
import type { AxisState } from './signals';
import { signalStates } from './signals';

/** Fixed timestep: 1/20 s of simulated time per step. */
export const FIXED_STEP = 1 / 20;

export type VehicleStatus = 'moving' | 'queued' | 'stranded';

export interface SnapshotVehicle {
  id: string;
  roadId: string;
  type: VehicleType;
  /** Unit direction of travel on the road: 1 = a→b, -1 = b→a. */
  heading: 1 | -1;
  /** Position along the road (a→b coordinate), world units. */
  s: number;
  /** Current speed, world units/s. */
  speed: number;
  status: VehicleStatus;
  x: number;
  z: number;
  /** Y-axis rotation for rendering. */
  rotY: number;
}

export interface EngineSnapshot {
  time: number;
  running: boolean;
  vehicles: SnapshotVehicle[];
  /** Flat [x, z, rotY, ...] per vehicle — direct instanced-mesh feed. */
  positions: Float32Array;
  signals: Record<string, { h: AxisState; v: AxisState }>;
  metrics: MetricsSnapshot;
  /** True when the quality-tier vehicle budget withheld spawns this run. */
  spawnCapped: boolean;
}

// --- Car-following constants (IDM) ----------------------------------------
const VEH_LEN = 4; // world units, bumper-to-bumper body length
const S0 = 3; // minimum standstill gap
const T_HEAD = 1.0; // desired time headway (s)
const A_MAX = 2.5; // max acceleration (u/s²)
const B_COMF = 3; // comfortable deceleration (u/s²)
const STOP_OFFSET = 2; // stop line sits this far before the signal node
/** Min center-to-center clearance for placing a vehicle on a segment. */
const CLEARANCE = VEH_LEN + S0 + 2;
/** Lateral lane offset from the road centerline (right-hand traffic). */
const LANE = 1.75;

interface SimVehicle {
  id: string;
  type: VehicleType;
  segId: string;
  /** Front position along the segment's travel direction, 0..length. */
  p: number;
  /** Along-road a→b coordinate (world), for cross-piece clearance. */
  s: number;
  v: number;
  destNode: string;
  /** Subsequent segment ids after the current one. */
  route: string[];
  status: VehicleStatus;
  x: number;
  z: number;
  rotY: number;
}

function idmAccel(v: number, v0: number, gap: number | null, leaderV: number): number {
  const free = A_MAX * (1 - Math.pow(v / Math.max(v0, 0.1), 4));
  if (gap === null) return free;
  const sStar =
    S0 + Math.max(0, v * T_HEAD + (v * (v - leaderV)) / (2 * Math.sqrt(A_MAX * B_COMF)));
  const g = Math.max(gap, 0.01);
  return free - A_MAX * Math.pow(sStar / g, 2);
}

export class SimulationEngine {
  private project: CityProject;
  private readonly seed: number;
  private time = 0;
  private running = false;
  private tickListeners: Array<(t: number) => void> = [];
  private rand: () => number;
  private graph: RoadGraph;
  /** nodeKey → signal id, for stop lines. */
  private signalAtNode: Record<string, string> = {};
  /** Project vehicles eligible to spawn (road must exist; openness checked at spawn time). */
  private spawnDefs: ProjectVehicle[];
  private fleet: SimVehicle[] | null = null;
  private throughput: Record<string, number> = {};
  /** Cumulative vehicle-seconds of delay vs free flow (reset with the run). */
  private delayAcc = 0;
  private roadIds: string[] = [];
  /** Capacity-based scale: average vehicles a road supports (capacity/100). */
  private densityScale = 1;
  // --- Scenario events (engine-owned effects; project untouched) -----------
  private scenarioEvents: ScenarioEvent[] = [];
  /** Events sorted by trigger time; ties keep scenario-array order (stable sort). */
  private eventQueue: ScenarioEvent[] = [];
  private eventCursor = 0;
  /** Event road-closure overrides; absent → follow the project's open flag. */
  private eventClosed = new Map<string, boolean>();
  /** Event accidents keyed by roadId (applied at the road midpoint). */
  private eventIncidents = new Map<string, { s: number; scale: number }>();
  /** Event signal-timing overrides. */
  private timingOverrides = new Map<string, SignalTiming>();
  private surgeSeq = 0;
  /** Max simultaneous vehicles (quality-tier budget); Infinity = unlimited. */
  private vehicleBudget = Infinity;
  /** True when the budget withheld spawns since the last reset. */
  private spawnCappedFlag = false;

  constructor(project: CityProject, seed = project.seed) {
    this.project = project;
    this.seed = seed;
    this.rand = mulberry32(seed);
    this.graph = buildGraph(project);
    this.spawnDefs = project.order
      .map((id) => project.objects[id])
      .filter((o): o is ProjectVehicle => o?.type === 'vehicle');
    const capacities: number[] = [];
    for (const id of project.order) {
      const o = project.objects[id];
      if (o?.type === 'road') {
        this.roadIds.push(o.id);
        capacities.push(o.capacity);
      }
      if (o?.type === 'signal') {
        const key = `n:${Math.round(o.position[0] * 100) / 100},${Math.round(o.position[1] * 100) / 100}`;
        this.signalAtNode[key] = id;
      }
    }
    if (capacities.length > 0) {
      this.densityScale = capacities.reduce((a, b) => a + b, 0) / capacities.length / 100;
    }
  }

  play(): void {
    this.running = true;
  }

  pause(): void {
    this.running = false;
  }

  /** Load a scenario's events: queued by trigger time, stable order for ties. */
  setScenario(events: ScenarioEvent[]): void {
    this.scenarioEvents = events;
    this.requeueEvents();
  }

  /** Quality-tier entity budget — enforced at spawn/surge time (existing fleets are trimmed by reset). */
  setVehicleBudget(max: number): void {
    this.vehicleBudget = Number.isFinite(max) && max > 0 ? max : Infinity;
  }

  private requeueEvents(): void {
    // Stable sort → same-trigger events fire in scenario-array order.
    this.eventQueue = [...this.scenarioEvents].sort((a, b) => a.at - b.at);
    this.eventCursor = 0;
    this.eventClosed.clear();
    this.eventIncidents.clear();
    this.timingOverrides.clear();
    this.surgeSeq = 0; // ids must be stable across replays
  }

  /** True when a road is closed by the project flag or by a fired scenario event. */
  isRoadClosed(id: string): boolean {
    const ev = this.eventClosed.get(id);
    if (ev !== undefined) return ev;
    const o = this.project.objects[id];
    return o?.type === 'road' && !o.open;
  }

  private timingFor(id: string): SignalTiming {
    return this.timingOverrides.get(id) ?? (this.project.objects[id] as Signal).timing;
  }

  /** Advance one fixed step. No-op while paused. */
  step(dt = FIXED_STEP): void {
    if (!this.running) return;
    if (this.fleet === null) this.spawnFleet();
    this.time += dt;
    while (this.eventCursor < this.eventQueue.length && this.eventQueue[this.eventCursor].at <= this.time) {
      this.applyEvent(this.eventQueue[this.eventCursor++]);
    }
    this.simulate(dt);
    for (const cb of this.tickListeners) cb(this.time);
  }

  /** Reset simulated state for a bit-identical replay (running flag untouched). */
  reset(): void {
    this.time = 0;
    this.fleet = null;
    this.rand = mulberry32(this.seed);
    this.throughput = {};
    this.delayAcc = 0;
    this.spawnCappedFlag = false;
    this.requeueEvents(); // revert all event effects; queue fires again on replay
  }

  /** Subscribe to per-step ticks; returns an unsubscribe function. */
  onTick(cb: (t: number) => void): () => void {
    this.tickListeners.push(cb);
    return () => {
      const i = this.tickListeners.indexOf(cb);
      if (i >= 0) this.tickListeners.splice(i, 1);
    };
  }

  getSnapshot(): EngineSnapshot {
    const signals: Record<string, { h: AxisState; v: AxisState }> = {};
    for (const id of this.project.order) {
      const o = this.project.objects[id];
      if (o?.type === 'signal') {
        const st = signalStates(this.timingFor(o.id), this.time);
        signals[id] = { h: st.h, v: st.v };
      }
    }
    const fleet = this.fleet ?? [];
    const vehicles: SnapshotVehicle[] = fleet.map((v) => {
      const seg = this.graph.segments[v.segId];
      return {
        id: v.id,
        type: v.type,
        roadId: seg.roadId,
        heading: seg.sign,
        s: v.s,
        speed: v.v,
        status: v.status,
        x: v.x,
        z: v.z,
        rotY: v.rotY,
      };
    });
    const positions = new Float32Array(fleet.length * 3);
    fleet.forEach((v, i) => {
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.z;
      positions[i * 3 + 2] = v.rotY;
    });

    // Metrics computed from live fleet state — never hardcoded.
    const n = fleet.length;
    let speedSum = 0;
    let queued = 0;
    const queues: Record<string, number> = {};
    const byType: Record<VehicleType, number> = { car: 0, bus: 0, truck: 0, van: 0 };
    for (const v of fleet) {
      speedSum += v.v;
      byType[v.type]++;
      if (v.status === 'queued') {
        queued++;
        const roadId = this.graph.segments[v.segId].roadId;
        queues[roadId] = (queues[roadId] ?? 0) + 1;
      }
    }
    const throughput: Record<string, number> = {};
    for (const [roadId, count] of Object.entries(this.throughput)) {
      if (count > 0) throughput[roadId] = count;
    }
    const metrics: MetricsSnapshot = {
      vehicleCount: n,
      avgSpeed: n > 0 ? (speedSum / n) * 3.6 : 0,
      density:
        n > 0 && this.roadIds.length > 0 && this.densityScale > 0
          ? Math.min(1, n / this.roadIds.length / this.densityScale)
          : 0,
      congestion: n > 0 ? queued / n : 0,
      totalDelay: this.delayAcc,
      byType,
      queues,
      throughput,
    };

    return {
      time: this.time,
      running: this.running,
      vehicles,
      positions,
      signals,
      metrics,
      spawnCapped: this.spawnCappedFlag,
    };
  }

  // --- Fleet spawning -------------------------------------------------------

  private closedRoadIds(): string[] {
    const closed: string[] = [];
    for (const id of this.project.order) {
      const o = this.project.objects[id];
      if (o?.type === 'road' && this.isRoadClosed(o.id)) closed.push(o.id);
    }
    return closed;
  }

  /** Locate the segment of def's spawn road that contains its position, traveling `heading`. */
  private segmentFor(def: ProjectVehicle): { segId: string; p: number } | null {
    const road = this.project.objects[def.spawnRoadId];
    if (road?.type !== 'road' || this.isRoadClosed(road.id)) return null;
    const dx = road.b[0] - road.a[0];
    const dz = road.b[1] - road.a[1];
    const len = Math.hypot(dx, dz);
    if (len < 1e-6) return null;
    const s = ((def.position[0] - road.a[0]) * dx + (def.position[1] - road.a[1]) * dz) / len;
    for (const seg of Object.values(this.graph.segments)) {
      if (seg.roadId !== road.id || seg.sign !== def.heading) continue;
      const lo = seg.sign === 1 ? seg.sFrom : seg.sFrom - seg.length;
      const hi = seg.sign === 1 ? seg.sFrom + seg.length : seg.sFrom;
      if (s >= lo - 1e-6 && s <= hi + 1e-6) {
        const p = seg.sign === 1 ? s - seg.sFrom : seg.sFrom - s;
        return { segId: seg.id, p: Math.min(Math.max(p, 0), seg.length) };
      }
    }
    return null;
  }

  /** Place a vehicle on a segment: at its project position (initial) or p=0 (respawn). */
  private place(
    def: ProjectVehicle,
    atNode: boolean,
  ): { segId: string; p: number; destNode: string; route: string[]; stranded: boolean } | null {
    const found = this.segmentFor(def);
    if (!found) return null;
    const seg = this.graph.segments[found.segId];
    const p = atNode ? 0 : found.p;
    // Clearance along the road (across pieces): same road + direction within CLEARANCE.
    const candS = seg.sign === 1 ? seg.sFrom + p : seg.sFrom - p;
    for (const other of this.fleet ?? []) {
      const oseg = this.graph.segments[other.segId];
      if (oseg.roadId !== seg.roadId || oseg.sign !== seg.sign) continue;
      if (Math.abs(other.s - candS) < CLEARANCE) return null;
    }
    // Destination: seeded pick among nodes reachable with ≥1 segment, avoiding closed roads.
    const avoid = this.closedRoadIds();
    const revId = `${seg.roadId}|${seg.to}>${seg.from}`;
    const degree = (this.graph.departures[seg.to] ?? []).length;
    const candidates: Array<{ node: string; route: string[] }> = [];
    for (const nodeId of Object.keys(this.graph.nodes)) {
      if (nodeId === seg.to) continue;
      const route = planRoute(this.graph, seg.to, nodeId, { avoid });
      if (!route || route.length < 1) continue;
      // No U-turns at junctions (they drive into oncoming traffic); allowed at dead ends.
      if (route[0] === revId && degree > 1) continue;
      candidates.push({ node: nodeId, route });
    }
    if (candidates.length === 0) {
      return { segId: found.segId, p, destNode: seg.to, route: [], stranded: true };
    }
    const pick = candidates[Math.floor(this.rand() * candidates.length)];
    return { segId: found.segId, p, destNode: pick.node, route: pick.route, stranded: false };
  }

  private spawnFleet(): void {
    this.fleet = [];
    for (const def of this.spawnDefs) {
      if (this.fleet.length >= this.vehicleBudget) {
        this.spawnCappedFlag = true;
        break;
      }
      const placed = this.place(def, false);
      if (!placed) continue;
      const veh: SimVehicle = {
        id: def.id,
        type: def.vehicleType,
        segId: placed.segId,
        p: placed.p,
        s: 0,
        v: 0,
        destNode: placed.destNode,
        route: placed.route,
        status: placed.stranded ? 'stranded' : 'moving',
        x: 0,
        z: 0,
        rotY: 0,
      };
      this.updateWorld(veh);
      this.fleet.push(veh);
    }
  }

  /** Vehicle finished its route: count throughput, then respawn elsewhere (fleet constant). */
  private completeVehicle(veh: SimVehicle): boolean {
    const seg = this.graph.segments[veh.segId];
    this.throughput[seg.roadId] = (this.throughput[seg.roadId] ?? 0) + 1;
    const defs = this.spawnDefs;
    const start = Math.floor(this.rand() * defs.length);
    for (let i = 0; i < defs.length; i++) {
      const placed = this.place(defs[(start + i) % defs.length], true);
      if (!placed) continue;
      veh.segId = placed.segId;
      veh.p = placed.p;
      veh.v = 0;
      veh.destNode = placed.destNode;
      veh.route = placed.route;
      veh.status = placed.stranded ? 'stranded' : 'moving';
      this.updateWorld(veh);
      return true;
    }
    return false; // no clear spot anywhere — drop from fleet
  }

  /** True when a vehicle already occupies the entry zone of `next`. */
  private entryBlocked(next: Segment): boolean {
    for (const o of this.fleet!) {
      if (o.segId === next.id && Math.abs(o.s - next.sFrom) < CLEARANCE) return true;
    }
    return false;
  }

  private updateWorld(veh: SimVehicle): void {
    const seg = this.graph.segments[veh.segId];
    const road = this.project.objects[seg.roadId] as Road;
    const dx = road.b[0] - road.a[0];
    const dz = road.b[1] - road.a[1];
    const len = Math.hypot(dx, dz);
    const sWorld = seg.sign === 1 ? seg.sFrom + veh.p : seg.sFrom - veh.p;
    veh.s = sWorld;
    const t = sWorld / len;
    // Right-hand lane: offset perpendicular to the road, side flips with heading.
    const ox = (dz / len) * LANE * seg.sign;
    const oz = (-dx / len) * LANE * seg.sign;
    veh.x = road.a[0] + dx * t + ox;
    veh.z = road.a[1] + dz * t + oz;
    veh.rotY = Math.atan2(dx * seg.sign, dz * seg.sign);
  }

  // --- Simulation step -------------------------------------------------------

  private simulate(dt: number): void {
    const fleet = this.fleet!;
    const removed = new Set<SimVehicle>();

    // Active incidents reduce desired speed upstream of their position.
    let incidents: Map<string, { s: number; scale: number }> | null = null;
    for (const id of this.project.order) {
      const o = this.project.objects[id];
      if (o?.type !== 'incident' || !o.active) continue;
      const road = this.project.objects[o.roadId];
      if (road?.type !== 'road') continue;
      const dx = road.b[0] - road.a[0];
      const dz = road.b[1] - road.a[1];
      const len = Math.hypot(dx, dz);
      if (len < 1e-6) continue;
      const incS = ((o.position[0] - road.a[0]) * dx + (o.position[1] - road.a[1]) * dz) / len;
      const scale = Math.max(0, 1 - o.severity);
      const prev = incidents?.get(road.id);
      (incidents ??= new Map()).set(road.id, { s: incS, scale: Math.min(prev?.scale ?? 1, scale) });
    }

    // Scenario accidents join the scan at the road midpoint (most restrictive wins).
    for (const [roadId, inc] of this.eventIncidents) {
      const prev = incidents?.get(roadId);
      (incidents ??= new Map()).set(roadId, { s: prev?.s ?? inc.s, scale: Math.min(prev?.scale ?? 1, inc.scale) });
    }

    for (const veh of fleet) {
      if (veh.status === 'stranded') continue;
      const seg = this.graph.segments[veh.segId];
      const road = this.project.objects[seg.roadId] as Road;
      let v0 = road.speedLimit / 3.6;
      const freeV = v0; // delay measured against free flow, not the reduced target
      const inc = incidents?.get(road.id);
      if (inc && (seg.sign === 1 ? veh.s < inc.s : veh.s > inc.s)) v0 *= inc.scale;

      // Reroute when the next segment's road has closed; strand if unreachable.
      if (veh.route.length > 0) {
        const next = this.graph.segments[veh.route[0]];
        const nr = this.project.objects[next.roadId];
        if (nr?.type === 'road' && this.isRoadClosed(nr.id)) {
          const fresh = planRoute(this.graph, seg.to, veh.destNode, { avoid: this.closedRoadIds() });
          if (fresh) {
            veh.route = fresh;
          } else {
            veh.status = 'stranded';
            veh.v = 0;
            continue;
          }
        }
      }

      // Leader on the same segment (front-to-front gap minus body length).
      let gap: number | null = null;
      let leaderV = 0;
      for (const other of fleet) {
        if (other === veh || other.segId !== veh.segId || other.p <= veh.p) continue;
        const g = other.p - veh.p - VEH_LEN;
        if (gap === null || g < gap) {
          gap = g;
          leaderV = other.v;
        }
      }
      let a = idmAccel(veh.v, v0, gap, leaderV);

      // Stop constraints: signal red/yellow at the end node, or a blocked
      // entry into the next segment (hold before the node until it clears).
      let stopP = Infinity;
      const sigId = this.signalAtNode[seg.to];
      if (sigId !== undefined) {
        const horiz = Math.abs(road.b[0] - road.a[0]) >= Math.abs(road.b[1] - road.a[1]);
        const axis: 'h' | 'v' = horiz ? 'h' : 'v';
        const st = signalStates(this.timingFor(sigId), this.time);
        if (st[axis] !== 'green') stopP = Math.min(stopP, seg.length - STOP_OFFSET);
      }
      if (veh.route.length > 0) {
        const next = this.graph.segments[veh.route[0]];
        if (next && this.entryBlocked(next)) stopP = Math.min(stopP, seg.length);
      }
      if (stopP !== Infinity && veh.p <= stopP) {
        a = Math.min(a, idmAccel(veh.v, v0, stopP - veh.p, 0));
      }

      veh.v = Math.max(0, veh.v + a * dt);
      if (freeV > 0) this.delayAcc += (Math.max(0, freeV - veh.v) / freeV) * dt;
      veh.p += veh.v * dt;

      // Traverse segment boundaries; despawn + respawn at route end.
      let guard = 0;
      while (guard++ < 32) {
        const cur = this.graph.segments[veh.segId];
        if (veh.p < cur.length) break;
        const nextId = veh.route[0];
        const next = nextId !== undefined ? this.graph.segments[nextId] : undefined;
        if (next && this.entryBlocked(next)) {
          veh.p = cur.length; // hold at the node until the entry zone clears
          break;
        }
        if (!next) {
          if (!this.completeVehicle(veh)) removed.add(veh);
          break;
        }
        veh.route.shift();
        veh.p -= cur.length;
        veh.segId = next.id;
        this.throughput[cur.roadId] = (this.throughput[cur.roadId] ?? 0) + 1;
      }
      if (removed.has(veh)) continue;

      veh.status = veh.v < 1 ? 'queued' : 'moving';
      this.updateWorld(veh);
    }

    if (removed.size > 0) {
      this.fleet = fleet.filter((v) => !removed.has(v));
    }
  }

  // --- Scenario event application ------------------------------------------

  private applyEvent(e: ScenarioEvent): void {
    switch (e.type) {
      case 'road_closure': {
        if (this.project.objects[e.roadId]?.type === 'road') this.eventClosed.set(e.roadId, e.closed);
        break;
      }
      case 'accident': {
        const road = this.project.objects[e.roadId];
        if (road?.type !== 'road') break;
        const len = Math.hypot(road.b[0] - road.a[0], road.b[1] - road.a[1]);
        this.eventIncidents.set(e.roadId, { s: len / 2, scale: Math.max(0, 1 - e.severity) });
        break;
      }
      case 'vehicle_surge':
        this.surge(e.roadId, e.count);
        break;
      case 'signal_timing_change':
        if (this.project.objects[e.signalId]?.type === 'signal') this.timingOverrides.set(e.signalId, e.timing);
        break;
    }
  }

  /** Inject vehicles along a road, spread with clearance, alternating entry ends. */
  private surge(roadId: string, count: number): void {
    const road = this.project.objects[roadId];
    if (road?.type !== 'road' || this.isRoadClosed(roadId) || this.fleet === null) return;
    const dx = road.b[0] - road.a[0];
    const dz = road.b[1] - road.a[1];
    const len = Math.hypot(dx, dz);
    if (len < 1e-6) return;
    for (let i = 0; i < count; i++) {
      if (this.fleet.length >= this.vehicleBudget) {
        this.spawnCappedFlag = true;
        break;
      }
      const s = 5 + i * 10; // > CLEARANCE apart along the road
      if (s >= len) break;
      const pos: Vec2 = [road.a[0] + (dx / len) * s, road.a[1] + (dz / len) * s];
      for (const heading of [1, -1] as const) {
        const def: ProjectVehicle = {
          id: `surge_${this.surgeSeq++}`,
          type: 'vehicle',
          name: 'surge',
          position: pos,
          vehicleType: 'car',
          spawnRoadId: roadId,
          heading,
        };
        const placed = this.place(def, false);
        if (!placed) continue;
        const veh: SimVehicle = {
          id: def.id,
          type: def.vehicleType,
          segId: placed.segId,
          p: placed.p,
          s: 0,
          v: 0,
          destNode: placed.destNode,
          route: placed.route,
          status: placed.stranded ? 'stranded' : 'moving',
          x: 0,
          z: 0,
          rotY: 0,
        };
        this.updateWorld(veh);
        this.fleet.push(veh);
        break;
      }
    }
  }
}
