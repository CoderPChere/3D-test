import { describe, it, expect } from 'vitest';
import { parseProject, ProjectParseError } from './parseProject';
import { importProjectFile } from '../persist/projectIO';
import { generateProject } from './generate';
import type { CityProject, Incident } from './types';
const valid = (): CityProject => generateProject(42);

/** File stand-in: importProjectFile only calls .text(). */
const file = (content: unknown): File =>
  ({ text: async () => (typeof content === 'string' ? content : JSON.stringify(content)) }) as File;

const clone = (p: CityProject): CityProject => JSON.parse(JSON.stringify(p)) as CityProject;

describe('parseProject', () => {
  it('accepts a generated project unchanged (valid import equivalence)', () => {
    const p = valid();
    expect(parseProject(clone(p))).toEqual(p);
  });

  it('accepts a full export payload with scenarios', () => {
    const p = valid();
    const roadId = Object.values(p.objects).find((o) => o.type === 'road')!.id;
    p.scenarios = [
      { id: 's1', name: 'Rush', events: [{ id: 'e1', type: 'vehicle_surge', at: 2, count: 6, roadId }] },
    ];
    expect(parseProject(clone(p))).toEqual(p);
  });

  it('rejects a missing required field, naming the field', () => {
    const broken = valid() as unknown as Record<string, unknown>;
    delete broken.seed;
    try {
      parseProject(broken);
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ProjectParseError);
      expect((e as ProjectParseError).field).toBe('seed');
      expect((e as Error).message).toMatch(/Missing required field "seed"/);
    }
  });

  it('rejects an unknown object type, naming the type and object id', () => {
    const p = valid();
    (p.objects as Record<string, unknown>)['weird'] = { type: 'skyscraper', id: 'weird', name: 'w', position: [0, 0] };
    expect(() => parseProject(clone(p))).toThrowError(/Unknown object type "skyscraper" \(object "weird"\)/);
  });

  it('rejects an invalid enum value with the offending field', () => {
    const p = valid();
    const road = p.order.map((id) => p.objects[id]).find((o) => o.type === 'road')!;
    (road as { roadType: string }).roadType = 'motorway';
    expect(() => parseProject(clone(p))).toThrowError(/objects\..*roadType.*motorway/);
  });

  it('rejects an out-of-range value with the allowed range', () => {
    const p = valid();
    const inc: Incident = {
      type: 'incident', id: 'inc1', name: 'i', position: [0, 0],
      roadId: 'r1', incidentType: 'accident', severity: 2, active: true,
    };
    (p.objects as Record<string, unknown>)['inc1'] = inc;
    p.order.push('inc1');
    expect(() => parseProject(clone(p))).toThrowError(/severity.*between 0 and 1/);
  });

  it('rejects an unsupported project version', () => {
    const p = valid();
    p.version = 99;
    expect(() => parseProject(clone(p))).toThrowError(/version 99.*expected 1/i);
  });

  it('rejects non-object input', () => {
    expect(() => parseProject('nope')).toThrowError(/object/i);
  });

  it('rejects a dangling reference with its field path', () => {
    const p = valid();
    const vehicle = Object.values(p.objects).find((o) => o.type === 'vehicle')!;
    vehicle.spawnRoadId = 'nope';
    try {
      parseProject(clone(p));
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ProjectParseError);
      expect((e as ProjectParseError).field).toBe(`objects.${vehicle.id}.spawnRoadId`);
      expect((e as Error).message).toMatch(/missing road "nope"/);
    }
  });
});

describe('importProjectFile', () => {
  it('rejects malformed JSON with a parse failure message', async () => {
    await expect(importProjectFile(file('not json {'))).rejects.toThrow(/not valid JSON/);
  });

  it('rejects a payload without a project', async () => {
    await expect(importProjectFile(file({ version: 1, projectName: 'x' }))).rejects.toThrow(/valid project/);
  });

  it('rejects a schema-invalid project with the specific field error', async () => {
    const broken = valid() as unknown as Record<string, unknown>;
    delete broken.order;
    await expect(importProjectFile(file({ version: 1, projectName: 'x', project: broken }))).rejects.toThrow(
      /Missing required field "order"/,
    );
  });

  it('imports a valid exported file equivalently', async () => {
    const p = valid();
    const { project, projectName } = await importProjectFile(file({ version: 1, projectName: 'City', project: p }));
    expect(project).toEqual(p);
    expect(projectName).toBe('City');
  });
});
