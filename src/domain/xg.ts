import type { ShotOutcome, ShotTechnique } from './types';
import { courtDistanceM, visibleGoalAngleRad, MAX_VISIBLE_ANGLE_RAD, GOAL_POST_HALF_M, GOAL_HEIGHT_M, goalPlacementQuality, type CourtPoint, type GoalPlanePoint } from './court';

export interface XgInput {
  courtX: number;
  courtY: number;
  technique?: ShotTechnique;
  contested?: boolean;
  fastBreak?: boolean;
  emptyNet?: boolean;
  sevenMeter?: boolean;
}

export const XG_COEFFS = {
  intercept: -0.2,
  distancePerSqrtMeter: -0.9,
  distanceReferenceM: 6,
  angleWeight: 1.3,
  angleReference: 0.6,
  technique: {
    JUMP: 0.1,
    STANDING: -0.05,
    DIVE: 0.0,
    LOB: -0.1,
    SPIN: -0.05,
    UNDERARM: -0.2,
  } as Record<ShotTechnique, number>,
  contestedPenalty: -0.45,
  fastBreakBonus: 0.5,
  emptyNetBonus: 0.9,
  wingBonus: 1.0,
  wingMinAbsX: 7.5,
  sevenMeterBaseline: 0.76,
  min: 0.01,
  max: 0.95,
} as const;

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function expectedGoals(input: XgInput): number {
  if (input.sevenMeter) return XG_COEFFS.sevenMeterBaseline;

  const d = courtDistanceM({ x: input.courtX, y: input.courtY });
  const angle = visibleGoalAngleRad({ x: input.courtX, y: input.courtY });

  let z = XG_COEFFS.intercept;
  z += XG_COEFFS.distancePerSqrtMeter * (Math.sqrt(d) - Math.sqrt(XG_COEFFS.distanceReferenceM));
  z += XG_COEFFS.angleWeight * (angle / MAX_VISIBLE_ANGLE_RAD - XG_COEFFS.angleReference);
  if (input.technique) z += XG_COEFFS.technique[input.technique];
  if (input.contested) z += XG_COEFFS.contestedPenalty;
  if (input.fastBreak) z += XG_COEFFS.fastBreakBonus;
  if (input.emptyNet) z += XG_COEFFS.emptyNetBonus;
  if (Math.abs(input.courtX) >= XG_COEFFS.wingMinAbsX) z += XG_COEFFS.wingBonus;

  return clamp(sigmoid(z), XG_COEFFS.min, XG_COEFFS.max);
}

export interface XgotInput {
  xg: number;
  goal?: GoalPlanePoint | null;
  outcome: ShotOutcome;
}

export const XGOT_COEFFS = {
  cornerWeight: 0.4,
  centralPenalty: 0.35,
  onTargetFloor: 0.06,
  min: 0.01,
  max: 0.98,
} as const;

export function expectedGoalsOnTarget(input: XgotInput): number {
  const { outcome, goal } = input;
  if (outcome === 'GOAL' && !goal) return clamp(input.xg, XGOT_COEFFS.min, XGOT_COEFFS.max);
  if (!goal) return 0;
  if (outcome === 'WIDE') return 0;

  const quality = goalPlacementQuality(goal);
  let xgot = input.xg + XGOT_COEFFS.cornerWeight * quality - XGOT_COEFFS.centralPenalty * Math.max(0, -quality);
  if (outcome === 'GOAL' || outcome === 'SAVE' || outcome === 'POST') {
    xgot = Math.max(xgot, XGOT_COEFFS.onTargetFloor);
  }
  return clamp(xgot, XGOT_COEFFS.min, XGOT_COEFFS.max);
}

export interface ShotVector {
  court: CourtPoint;
  goal: GoalPlanePoint | null;
}

export function goalCellOf(g: GoalPlanePoint): { col: number; row: number } {
  const nx = (g.x + GOAL_POST_HALF_M) / (2 * GOAL_POST_HALF_M);
  const ny = g.y / GOAL_HEIGHT_M;
  const col = Math.max(0, Math.min(4, Math.floor(nx * 5)));
  const row = Math.max(0, Math.min(2, Math.floor(ny * 3)));
  return { col, row };
}

export const GOAL_FRAME_COLS = 5;
export const GOAL_FRAME_ROWS = 3;
