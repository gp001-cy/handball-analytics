import type { CourtZone, ShotOutcome, TurnoverCode, Position } from './types';
import { MATCH_MS } from './types';

export const HPI_POINTS = {
  shot: {
    GOAL_DEFAULT: 2,
    GOAL_HIGH_DIFFICULTY: 2.5,
    GOAL_FAST_BREAK: 3,
    GOAL_EMPTY_NET: 7,
    MISS_DEFAULT: -1,
    MISS_EMPTY_NET: -6,
  },
  assist: {
    GOAL_ASSIST_CENTER_6M: 2.5,
    GOAL_ASSIST_DEFAULT: 2,
  },
  drawn7m: 2,
  chargeDrawn: 1.5,
  stopFoul: 1,
  block: 2,
  steal: 2,
  stealAnticipation: 2.5,
  pivotRecovery: 1.5,
  turnoverLiveBall: -2,
  turnoverDeadBall: -1,
  suspensionEscalation: [-2, -4, -6],
  directRedCard: -6,
  emptyNetStatePenalty: 0,
  gk: {
    saveEmptyGoal: 9,
    saveSevenM: 5,
    saveDirectFreeThrow: 4,
    saveFastBreak: 3,
    saveBackcourt: 3,
    saveWing: 2,
    saveOther: 2,
    concededEmptyGoal: -2,
    concededDefault: -1,
    concededWing: -0.5,
  },
} as const;

const HIGH_DIFFICULTY_ZONES: CourtZone[] = ['L9M', 'C9M', 'R9M', 'LBT', 'CBT', 'RBT', 'LONG'];

export function shotHpiDelta(args: {
  outcome: ShotOutcome;
  zone?: CourtZone;
  emptyNet?: boolean;
  sevenMeter?: boolean;
  fastBreak?: boolean;
}): number {
  const { outcome, zone, emptyNet, fastBreak } = args;
  if (outcome !== 'GOAL') {
    return emptyNet ? HPI_POINTS.shot.MISS_EMPTY_NET : HPI_POINTS.shot.MISS_DEFAULT;
  }
  if (emptyNet) return HPI_POINTS.shot.GOAL_EMPTY_NET;
  if (fastBreak) return HPI_POINTS.shot.GOAL_FAST_BREAK;
  if (zone && HIGH_DIFFICULTY_ZONES.includes(zone)) return HPI_POINTS.shot.GOAL_HIGH_DIFFICULTY;
  return HPI_POINTS.shot.GOAL_DEFAULT;
}

export type SaveKind = 'EMPTY_GOAL' | 'SEVEN_M' | 'DIRECT_FREE_THROW' | 'FAST_BREAK' | 'BACKCOURT' | 'WING' | 'OTHER';

export function classifySaveKind(args: {
  outcome: ShotOutcome;
  zone?: CourtZone;
  emptyNet?: boolean;
  sevenMeter?: boolean;
  fastBreak?: boolean;
}): SaveKind {
  if (args.emptyNet) return 'EMPTY_GOAL';
  if (args.sevenMeter) return 'SEVEN_M';
  if (args.fastBreak) return 'FAST_BREAK';
  if (args.zone === 'LW' || args.zone === 'RW') return 'WING';
  if (args.zone === 'L9M' || args.zone === 'C9M' || args.zone === 'R9M' || args.zone === 'LONG') return 'BACKCOURT';
  return 'OTHER';
}

export function gkHpiDelta(kind: SaveKind, conceded: boolean): number {
  const k = HPI_POINTS.gk;
  if (conceded) {
    if (kind === 'EMPTY_GOAL') return k.concededEmptyGoal;
    if (kind === 'WING') return k.concededWing;
    return k.concededDefault;
  }
  switch (kind) {
    case 'EMPTY_GOAL': return k.saveEmptyGoal;
    case 'SEVEN_M': return k.saveSevenM;
    case 'DIRECT_FREE_THROW': return k.saveDirectFreeThrow;
    case 'FAST_BREAK': return k.saveFastBreak;
    case 'BACKCOURT': return k.saveBackcourt;
    case 'WING': return k.saveWing;
    default: return k.saveOther;
  }
}

const LIVE_BALL_TURNOVERS: TurnoverCode[] = ['TO_PASS_BAD', 'TO_CATCH_DROP', 'TO_DRIBBLE'];

export function turnoverHpiDelta(code: TurnoverCode): number {
  if (code === 'TF_OFF_FOUL') return HPI_POINTS.turnoverLiveBall;
  if (LIVE_BALL_TURNOVERS.includes(code)) return HPI_POINTS.turnoverLiveBall;
  return HPI_POINTS.turnoverDeadBall;
}

export function defensiveCreditHpiDelta(code: TurnoverCode): number {
  if (code === 'DEF_STEAL_ANTICIPATION') return HPI_POINTS.stealAnticipation;
  if (code === 'DEF_PIVOT_RECOVERY') return HPI_POINTS.pivotRecovery;
  return HPI_POINTS.steal;
}

export function suspensionHpiDelta(suspensionCount: number, directRed = false): number {
  if (directRed) return HPI_POINTS.directRedCard;
  const idx = Math.max(1, Math.min(3, suspensionCount)) - 1;
  return HPI_POINTS.suspensionEscalation[idx];
}

export const LEVERAGE = {
  windowMs: 5 * 60 * 1000,
  rampMs: 5 * 60 * 1000,
  maxBonus: 2,
  diffFullTension: 6,
} as const;

export function leverageIndex(clockMs: number, scoreDiffFromPerspective: number): number {
  const timeLeft = MATCH_MS - clockMs;
  if (timeLeft > LEVERAGE.windowMs + LEVERAGE.rampMs) return 1;
  const timeFactor = timeLeft >= LEVERAGE.windowMs
    ? 1 - (timeLeft - LEVERAGE.windowMs) / LEVERAGE.rampMs
    : 1;
  const tension = Math.max(0, 1 - Math.min(1, Math.abs(scoreDiffFromPerspective) / LEVERAGE.diffFullTension));
  return 1 + LEVERAGE.maxBonus * tension * timeFactor;
}

export const DEFAULT_POSITION_MEDIANS: Record<Position, number> = {
  GK: 8,
  LW: 10,
  LB: 11,
  CB: 12,
  RB: 11,
  RW: 10,
  PV: 10,
};

export function positionNormalizedHpi(hpi: number, position: Position, medians: Record<Position, number> = DEFAULT_POSITION_MEDIANS): number {
  const median = medians[position] || 1;
  return (hpi / median) * 100;
}
