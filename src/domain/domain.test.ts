import { describe, expect, it } from 'vitest';
import { courtDistanceM, visibleGoalAngleRad, goalPlacementQuality, inGoalMouth, hitPost } from './court';
import { classifyZone } from './zones';
import { expectedGoals, expectedGoalsOnTarget } from './xg';
import { gkHpiDelta, leverageIndex, positionNormalizedHpi, shotHpiDelta, suspensionHpiDelta, turnoverHpiDelta } from './hpi';

describe('court geometry', () => {
  it('computes euclidean distance from goal center', () => {
    expect(courtDistanceM({ x: 0, y: 9 })).toBeCloseTo(9, 5);
    expect(courtDistanceM({ x: 3, y: 4 })).toBeCloseTo(5, 5);
  });

  it('computes visible goal mouth angle, wider closer to goal', () => {
    const atSix = visibleGoalAngleRad({ x: 0, y: 6 });
    const atNine = visibleGoalAngleRad({ x: 0, y: 9 });
    const atTwenty = visibleGoalAngleRad({ x: 0, y: 20 });
    expect(atSix).toBeGreaterThan(atNine);
    expect(atNine).toBeGreaterThan(atTwenty);
    expect(atSix).toBeCloseTo(2 * Math.atan2(1.5, 6), 5);
  });

  it('detects goal mouth and post hits', () => {
    expect(inGoalMouth({ x: 0, y: 1 })).toBe(true);
    expect(inGoalMouth({ x: 1.6, y: 1 })).toBe(false);
    expect(hitPost({ x: 1.55, y: 1 })).toBe(true);
    expect(hitPost({ x: 1.45, y: 2.1 })).toBe(true);
    expect(hitPost({ x: 0, y: 1 })).toBe(false);
  });

  it('scores corner placement above central placement', () => {
    const corner = goalPlacementQuality({ x: 1.4, y: 1.9 });
    const center = goalPlacementQuality({ x: 0, y: 0.9 });
    expect(corner).toBeGreaterThan(center);
    expect(center).toBeLessThan(0);
  });
});

describe('zone classification (EHF categorical zones)', () => {
  it('classifies central 6m shot', () => {
    expect(classifyZone(0, 6)).toBe('C6M');
  });

  it('classifies wings by lateral position', () => {
    expect(classifyZone(-8, 1.5)).toBe('LW');
    expect(classifyZone(8, 1.5)).toBe('RW');
  });

  it('classifies pivot at the 6m line center', () => {
    expect(classifyZone(1, 2)).toBe('PV');
  });

  it('classifies breakthrough and 9m bands', () => {
    expect(classifyZone(0, 8)).toBe('CBT');
    expect(classifyZone(0, 9.8)).toBe('C9M');
    expect(classifyZone(-4.5, 9.2)).toBe('L9M');
  });

  it('classifies long range beyond 9m band', () => {
    expect(classifyZone(0, 14)).toBe('LONG');
  });

  it('honours fast break and 7m overrides', () => {
    expect(classifyZone(0, 12, { fastBreak: true })).toBe('FB');
    expect(classifyZone(0, 7, { sevenMeter: true })).toBe('M7');
  });
});

describe('xG engine', () => {
  it('is monotonic in distance', () => {
    const near = expectedGoals({ courtX: 0, courtY: 6 });
    const mid = expectedGoals({ courtX: 0, courtY: 9 });
    const far = expectedGoals({ courtX: 0, courtY: 13 });
    expect(near).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(far);
  });

  it('penalises contested shots', () => {
    const open = expectedGoals({ courtX: 0, courtY: 9, technique: 'JUMP' });
    const contested = expectedGoals({ courtX: 0, courtY: 9, technique: 'JUMP', contested: true });
    expect(contested).toBeLessThan(open);
  });

  it('boosts fast breaks and empty net shots', () => {
    const normal = expectedGoals({ courtX: 0, courtY: 8, technique: 'STANDING' });
    const fastBreak = expectedGoals({ courtX: 0, courtY: 8, technique: 'STANDING', fastBreak: true });
    const emptyNetClose = expectedGoals({ courtX: 0, courtY: 8, fastBreak: true, emptyNet: true });
    const emptyNetFar = expectedGoals({ courtX: 0, courtY: 15, fastBreak: true, emptyNet: true });
    expect(fastBreak).toBeGreaterThan(normal);
    expect(emptyNetClose).toBeGreaterThan(0.65);
    expect(emptyNetFar).toBeGreaterThan(0.3);
  });

  it('uses the historical 7m baseline', () => {
    expect(expectedGoals({ courtX: 0, courtY: 7, sevenMeter: true })).toBeCloseTo(0.76, 5);
  });

  it('keeps 6m center chance above 9m center chance', () => {
    const six = expectedGoals({ courtX: 0, courtY: 6, technique: 'JUMP' });
    const nine = expectedGoals({ courtX: 0, courtY: 9, technique: 'JUMP', contested: true });
    expect(six).toBeGreaterThan(0.45);
    expect(nine).toBeLessThan(0.3);
    expect(six).toBeGreaterThan(nine);
  });
});

describe('xGOT engine', () => {
  it('returns zero for shots off target', () => {
    expect(expectedGoalsOnTarget({ xg: 0.3, goal: null, outcome: 'WIDE' })).toBe(0);
  });

  it('rates corner placement above central placement for same xG', () => {
    const corner = expectedGoalsOnTarget({ xg: 0.1, goal: { x: 1.35, y: 1.85 }, outcome: 'GOAL' });
    const central = expectedGoalsOnTarget({ xg: 0.1, goal: { x: 0, y: 0.8 }, outcome: 'SAVE' });
    expect(corner).toBeGreaterThan(central);
  });

  it('keeps on-target saves above floor', () => {
    const saved = expectedGoalsOnTarget({ xg: 0.05, goal: { x: 0, y: 1 }, outcome: 'SAVE' });
    expect(saved).toBeGreaterThanOrEqual(0.06);
  });
});

describe('HPI 2.0 scoring', () => {
  it('awards +7 for an empty-net goal and -6 for an empty-net miss', () => {
    expect(shotHpiDelta({ outcome: 'GOAL', emptyNet: true })).toBe(7);
    expect(shotHpiDelta({ outcome: 'WIDE', emptyNet: true })).toBe(-6);
  });

  it('awards +9 to a goalkeeper saving an empty-goal/backcourt situation', () => {
    expect(gkHpiDelta('EMPTY_GOAL', false)).toBe(9);
    expect(gkHpiDelta('EMPTY_GOAL', true)).toBeLessThan(0);
  });

  it('escalates suspension deductions', () => {
    expect(suspensionHpiDelta(1)).toBe(-2);
    expect(suspensionHpiDelta(2)).toBe(-4);
    expect(suspensionHpiDelta(3)).toBe(-6);
    expect(suspensionHpiDelta(0, true)).toBe(-6);
  });

  it('differentiates live-ball from dead-ball turnovers', () => {
    expect(turnoverHpiDelta('TO_PASS_BAD')).toBe(-2);
    expect(turnoverHpiDelta('TF_STEPS')).toBe(-1);
  });

  it('weights goals by difficulty zone', () => {
    expect(shotHpiDelta({ outcome: 'GOAL', zone: 'C9M' })).toBeGreaterThan(shotHpiDelta({ outcome: 'GOAL', zone: 'C6M' }));
    expect(shotHpiDelta({ outcome: 'GOAL', zone: 'C6M', fastBreak: true })).toBeGreaterThan(shotHpiDelta({ outcome: 'GOAL', zone: 'C9M' }));
  });

  it('ramps leverage in crunch time only', () => {
    const early = leverageIndex(10 * 60 * 1000, 1);
    const tiedCrunch = leverageIndex(59 * 60 * 1000, 0);
    const oneGoalCrunch = leverageIndex(59 * 60 * 1000, 1);
    const blowout = leverageIndex(59 * 60 * 1000, 12);
    expect(early).toBe(1);
    expect(tiedCrunch).toBeCloseTo(3, 5);
    expect(oneGoalCrunch).toBeGreaterThan(2.5);
    expect(oneGoalCrunch).toBeLessThan(3);
    expect(blowout).toBe(1);
  });

  it('normalises HPI by position median', () => {
    expect(positionNormalizedHpi(12, 'CB')).toBeCloseTo(100, 5);
    expect(positionNormalizedHpi(12, 'GK')).toBeGreaterThan(100);
  });
});
