export type Id = string;

export type TeamSide = 'home' | 'away';

export type Position = 'GK' | 'LW' | 'LB' | 'CB' | 'RB' | 'RW' | 'PV';

export type Slot = Position;

export const SLOTS: Slot[] = ['GK', 'LW', 'LB', 'CB', 'RB', 'RW', 'PV'];

export const COURT_SLOTS: Slot[] = ['LW', 'LB', 'CB', 'RB', 'RW', 'PV'];

export type WavePhase = 'SET' | 'WAVE_1' | 'WAVE_2' | 'WAVE_3';

export type ShotOutcome = 'GOAL' | 'SAVE' | 'WIDE' | 'POST' | 'BLOCKED';

export const SHOT_OUTCOMES: ShotOutcome[] = ['GOAL', 'SAVE', 'WIDE', 'POST', 'BLOCKED'];

export type ShotTechnique = 'JUMP' | 'STANDING' | 'DIVE' | 'LOB' | 'SPIN' | 'UNDERARM';

export const SHOT_TECHNIQUES: ShotTechnique[] = ['JUMP', 'STANDING', 'DIVE', 'LOB', 'SPIN', 'UNDERARM'];

export type CourtZone =
  | 'LW'
  | 'RW'
  | 'L6M'
  | 'C6M'
  | 'R6M'
  | 'LBT'
  | 'CBT'
  | 'RBT'
  | 'L9M'
  | 'C9M'
  | 'R9M'
  | 'LONG'
  | 'PV'
  | 'FB'
  | 'M7';

export const ZONE_LABELS: Record<CourtZone, string> = {
  LW: 'Left Wing',
  RW: 'Right Wing',
  L6M: 'Left 6m',
  C6M: 'Center 6m',
  R6M: 'Right 6m',
  LBT: 'Left Breakthrough',
  CBT: 'Center Breakthrough',
  RBT: 'Right Breakthrough',
  L9M: 'Left 9m',
  C9M: 'Center 9m',
  R9M: 'Right 9m',
  LONG: 'Long Range',
  PV: 'Pivot',
  FB: 'Fast Break',
  M7: '7m Penalty',
};

export type TurnoverCode =
  | 'TO_PASS_BAD'
  | 'TO_CATCH_DROP'
  | 'TO_DRIBBLE'
  | 'TF_STEPS'
  | 'TF_3SEC'
  | 'TF_AREA'
  | 'TF_PASSIVE'
  | 'DEF_STEAL_ANTICIPATION'
  | 'DEF_PIVOT_RECOVERY'
  | 'TF_OFF_FOUL';

export const TURNOVER_LABELS: Record<TurnoverCode, string> = {
  TO_PASS_BAD: 'Bad Pass',
  TO_CATCH_DROP: 'Catch Drop',
  TO_DRIBBLE: 'Dribble Error',
  TF_STEPS: 'Steps',
  TF_3SEC: '3 Seconds',
  TF_AREA: '6m Area Step',
  TF_PASSIVE: 'Passive Play',
  DEF_STEAL_ANTICIPATION: 'Anticipation Steal',
  DEF_PIVOT_RECOVERY: 'Pivot Recovery',
  TF_OFF_FOUL: 'Offensive Foul',
};

export type EventType =
  | 'SHOT'
  | 'TURNOVER'
  | 'DEF_CHARGE_DRAWN'
  | 'DEF_STOP_FOUL'
  | 'SEVEN_M_AWARDED'
  | 'SUBSTITUTION'
  | 'SUSPENSION_2MIN'
  | 'RED_CARD'
  | 'TIMEOUT'
  | 'PERIOD_START'
  | 'PERIOD_END'
  | 'MATCH_END'
  | 'ATO_EXECUTION'
  | 'EMPTY_NET_ON'
  | 'EMPTY_NET_OFF'
  | 'REBOUND_RECOVERED'
  | 'NOTE';

export interface Player {
  id: Id;
  teamSide: TeamSide;
  name: string;
  number: number;
  position: Position;
}

export interface TeamInfo {
  side: TeamSide;
  name: string;
  shortName: string;
  color: string;
  players: Player[];
}

export interface MatchSetup {
  home: TeamInfo;
  away: TeamInfo;
  startingLineups: Record<TeamSide, Record<Slot, Id | null>>;
  benchOrder?: Record<TeamSide, Id[]>;
}

export interface MatchEvent {
  id: Id;
  seq: number;
  clockMs: number;
  wallMs: number;
  period: 1 | 2;
  type: EventType;
  teamSide: TeamSide;
  playerId?: Id;
  secondaryPlayerId?: Id;
  assistPlayerId?: Id;
  defenderId?: Id;
  gkPlayerId?: Id;
  outcome?: ShotOutcome;
  technique?: ShotTechnique;
  contested?: boolean;
  courtX?: number;
  courtY?: number;
  goalX?: number;
  goalY?: number;
  distanceM?: number;
  angleRad?: number;
  zone?: CourtZone;
  xg?: number;
  xgot?: number;
  hpiDelta?: number;
  wave?: WavePhase;
  numericalState?: string;
  emptyNet?: boolean;
  fastBreak?: boolean;
  sevenMeter?: boolean;
  reboundRecovered?: boolean;
  callCode?: string;
  tags?: string[];
  turnoverCode?: TurnoverCode;
  suspensionEndMs?: number;
  scoreHome?: number;
  scoreAway?: number;
  slot?: Slot;
  playerInId?: Id;
  note?: string;
  possessionId: number;
}

export interface LineupStint {
  id: number;
  teamSide: TeamSide;
  startMs: number;
  endMs: number;
  slots: Record<Slot, Id | null>;
  extraPlayerId: Id | null;
}

export interface ActiveSuspension {
  playerId: Id;
  teamSide: TeamSide;
  startMs: number;
  endMs: number;
}

export interface MatchClock {
  period: 1 | 2;
  elapsedMs: number;
  running: boolean;
  halfTime: boolean;
  finished: boolean;
}

export interface TeamTimeouts {
  remaining: number;
  usedPeriod1: number;
  usedPeriod2: number;
}

export interface SavedMatch {
  id: Id;
  createdAt: number;
  updatedAt: number;
  setup: MatchSetup;
  events: MatchEvent[];
  clock: MatchClock;
  timeouts: Record<TeamSide, TeamTimeouts>;
  activeTimeout: { teamSide: TeamSide; remainingMs: number } | null;
  atoArmed: boolean;
  notes: string;
  videoOffsetMs: number;
}

export const PERIOD_MS = 30 * 60 * 1000;
export const MATCH_MS = 2 * PERIOD_MS;
export const SUSPENSION_MS = 2 * 60 * 1000;
export const TIMEOUT_MS = 60 * 1000;

export function makeId(prefix = 'id'): Id {
  const rand = Math.random().toString(36).slice(2, 10);
  const t = Date.now().toString(36);
  return `${prefix}_${t}_${rand}`;
}

export function formatClock(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalSec = Math.floor(clamped / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatSuspension(msLeft: number): string {
  const totalSec = Math.max(0, Math.ceil(msLeft / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
