export type LocaleCode = 'en' | 'sl';
export type ThemeMode = 'dark' | 'light';
export type ColorTheme =
  | 'blue'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'violet'
  | 'lime';
export type ViewportSimulation = 'auto' | 'phone' | 'tablet';
export type LiveEntryMode = 'player_first' | 'all_in_one';

export type CompetitionType = 'league' | 'cup' | 'tournament' | 'friendly';

export interface Season {
  id: string;
  name: string; // e.g., "2026/27"
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface Competition {
  id: string;
  seasonId: string;
  name: string;
  shortName: string;
  type: CompetitionType;
  defaultHalfDurationSec: number; // 1800 = 30m, 1500 = 25m, 1200 = 20m
  defaultHalves: number;
  ihfTimeoutRules: {
    maxTotalPerTeam: number; // 3
    maxPerHalfPerTeam: number; // 2
    maxInLast5Min: number; // 1
  };
}

export type PositionCode = 'GK' | 'LW' | 'LB' | 'CB' | 'RB' | 'RW' | 'PV';
export type Handedness = 'R' | 'L' | 'ambi';
export type DefensiveRole =
  | 'wing_1'
  | 'half_2'
  | 'centre_3'
  | 'front_5_1'
  | 'specialist'
  | 'gk';
export type DefensiveSystem = '6-0' | '5-1' | '3-2-1' | '4-2' | '3-3';
export type ShapeMarker = 'circle' | 'square' | 'diamond' | 'triangle';

export interface Team {
  id: string;
  name: string;
  shortCode: string; // 3-letter broadcast code: CEL, VEL, Gorenje, etc.
  logoUri?: string; // Optional custom team logo image
  isOwnTeam: boolean;
  primaryColorHex: string;
  secondaryColorHex: string;
  shapeMarker: ShapeMarker; // Accessibility: never rely on colour alone
  homeVenue: string;
  city: string;
  defaultDefensiveSystem: DefensiveSystem;
  scoutingNotes: string;
  defensiveNotes: string;
  fastBreakTendencyNote: string;
}

export type AvailabilityStatus = 'available' | 'injured' | 'suspended' | 'doubtful';

export interface Player {
  id: string;
  teamId: string;
  firstName: string;
  lastName: string;
  monogram: string; // 2-3 char fallback, never generic avatar
  photoUri?: string;
  defaultJerseyNumber: number;
  primaryPosition: PositionCode;
  secondaryPositions: PositionCode[];
  handedness: Handedness;
  defensiveRole: DefensiveRole;
  birthDate: string;
  licenceNumber: string;
  nationality: string;
  availabilityStatus: AvailabilityStatus;
  availabilityNote?: string;
  scoutingNotes: string;
  isSevenMeterTaker?: boolean;
}

export interface MatchFormat {
  label: '2×30 min' | '2×25 min' | '2×20 min';
  halves: number;
  halfDurationSec: number;
  maxTimeoutsPerTeam: number;
}

export interface MatchLineupEntry {
  playerId: string;
  teamId: string;
  jerseyNumber: number; // Auto-carried from Player.defaultJerseyNumber, overridable
  isStarter: boolean;
  startingSlot?: PositionCode;
  isCaptain?: boolean;
  isActiveInSquad: boolean;
}

export interface LineChangePreset {
  id: string;
  teamId: string;
  name: string;
  description: string;
  swaps: Array<{
    outPlayerId: string;
    inPlayerId: string;
    slot: PositionCode;
  }>;
}

export interface DiagramAnnotation {
  id: string;
  type: 'arrow' | 'run' | 'pass' | 'screen' | 'zone_highlight' | 'player_marker';
  label?: string;
  points: Array<{ x: number; y: number }>; // normalized court 0..20 x 0..20m
  color: string;
}

export interface GamePlanSection {
  id: 'attack' | 'defence' | 'goalkeeper' | 'set_pieces';
  title: string;
  bulletPoints: string[];
  annotations: DiagramAnnotation[];
}

export interface PreMatchPlan {
  matchId: string;
  lineupConfirmed: boolean;
  confirmedAt?: string;
  expectedOpponentSystem: DefensiveSystem;
  keyMatchupNotes: string;
  sections: GamePlanSection[];
}

export type MatchStatus =
  | 'scheduled'
  | 'pre_match_ready'
  | 'live_h1'
  | 'halftime'
  | 'live_h2'
  | 'finished';

export interface Match {
  id: string;
  seasonId: string;
  competitionId: string;
  roundLabel: string;
  homeTeamId: string;
  awayTeamId: string;
  ourTeamId: string;
  opponentTeamId: string;
  venue: string;
  scheduledAt: string; // ISO string
  status: MatchStatus;
  format: MatchFormat;
  officials?: {
    referee1: string;
    referee2: string;
    delegate?: string;
  };
  lineups: MatchLineupEntry[];
  lineChangePresets: LineChangePreset[];
  preMatchPlan: PreMatchPlan;
  videoSync?: {
    videoTitle: string;
    videoUrl: string;
    h1KickoffOffsetSec: number;
    h2KickoffOffsetSec: number;
  };
}

// ==========================================
// Event Vocabulary
// ==========================================

export type EventCategory =
  | 'shot'
  | 'attack_other'
  | 'technical_fault'
  | 'defence'
  | 'goalkeeper'
  | 'discipline'
  | 'team_state';

export type ShotOutcome =
  | 'goal'
  | 'saved'
  | 'missed_wide'
  | 'missed_high'
  | 'post'
  | 'crossbar'
  | 'blocked';

export type CourtZone =
  | 'LW'
  | 'RW'
  | 'LB_9M'
  | 'CB_9M'
  | 'RB_9M'
  | '6M_LEFT'
  | '6M_CENTRE'
  | '6M_RIGHT'
  | '7M'
  | 'BREAKTHROUGH'
  | 'FAST_BREAK'
  | 'EMPTY_NET_OWN_HALF';

export type GoalTargetCell =
  | 'TL'
  | 'TC'
  | 'TR'
  | 'ML'
  | 'MC'
  | 'MR'
  | 'BL'
  | 'BC'
  | 'BR'
  | 'POST_L'
  | 'POST_R'
  | 'CROSSBAR'
  | 'WIDE_L'
  | 'WIDE_R'
  | 'HIGH';

export type AttackPhase =
  | 'positional'
  | 'fast_break'
  | 'second_wave'
  | 'empty_goal_7v6';

export type NumericalSituation =
  | 'equal'
  | 'power_play'
  | 'short_handed'
  | 'empty_goal';

export type AttackOtherType = 'assist' | 'earned_7m' | 'earned_2min';

export type TechnicalFaultType =
  | 'bad_pass'
  | 'catching_error'
  | 'steps'
  | 'double_dribble'
  | 'offensive_foul'
  | 'line_violation'
  | 'passive_play';

export type DefenceEventType =
  | 'steal'
  | 'interception'
  | 'block'
  | 'forced_fault'
  | '7m_conceded'
  | 'foul';

export type GoalkeeperEventType =
  | 'save'
  | 'goal_conceded'
  | '7m_save'
  | 'long_assist'
  | 'long_goal';

export type DisciplineType = 'yellow' | '2min' | 'red' | 'blue';

export type TeamStateEventType =
  | 'timeout'
  | 'substitution'
  | '7v6_start'
  | '7v6_end'
  | 'period_start'
  | 'period_end';

export type EventSubType =
  | ShotOutcome
  | AttackOtherType
  | TechnicalFaultType
  | DefenceEventType
  | GoalkeeperEventType
  | DisciplineType
  | TeamStateEventType;

export interface ShotOriginCoords {
  zone: CourtZone;
  xMeters: number; // 0 .. 20m across court width (left to right from attacking view)
  yMeters: number; // 0 .. 20m depth from goal line (or up to 38m for empty net own half)
}

export interface GoalTargetCoords {
  cell: GoalTargetCell;
  normX: number; // 0..1 inside goal width (3.0m), <0 left wide/post, >1 right wide/post
  normY: number; // 0..1 inside goal height (2.0m, 0=top crossbar, 1=floor), <0 high/crossbar
}

export interface MatchEvent {
  id: string;
  matchId: string;
  half: 1 | 2;
  matchClockSec: number; // Total match seconds (0..1800 H1, 1800..3600 H2)
  createdAtMs: number;
  authorAnalyst: string; // e.g., "Bench Tablet A (Home)" | "Scout Phone B (Opp)"
  teamId: string;
  playerId?: string;

  category: EventCategory;
  subType: EventSubType;

  shotOrigin?: ShotOriginCoords;
  goalTarget?: GoalTargetCoords;
  isBounceShot?: boolean;

  attackPhase: AttackPhase;
  situation: NumericalSituation;

  opposingGkId?: string;
  assistingPlayerId?: string;
  blockedByPlayerId?: string;
  linkedEventId?: string; // e.g. Technical fault leading to fast break goal

  substitution?: {
    playerOutId: string;
    playerInId: string;
    slot: PositionCode;
  };

  suspensionDurationSec?: number; // 120 for 2-minute suspension
  notes?: string;
}

export interface AuditRevision {
  id: string;
  matchId: string;
  timestampMs: number;
  actor: string;
  actionType: 'log_event' | 'edit_event' | 'delete_event' | 'line_change';
  description: string;
  previousEvents: MatchEvent[];
  nextEvents: MatchEvent[];
}

export interface ActiveSuspension {
  eventId: string;
  teamId: string;
  playerId: string;
  jerseyNumber: number;
  playerName: string;
  startedAtClockSec: number;
  endsAtClockSec: number;
  remainingSec: number;
}

export interface DerivedTeamCourtState {
  teamId: string;
  onCourtByPosition: Record<PositionCode, string | null>; // Position -> playerId
  activeGkId: string | null;
  is7v6Active: boolean;
  activeSuspensions: ActiveSuspension[];
  timeoutsUsedTotal: number;
  timeoutsUsedThisHalf: number;
  timeoutsUsedLast5Min: number;
  numericalSituation: NumericalSituation;
}

export interface LiveInsight {
  id: string;
  severity: 'critical' | 'warning' | 'positive' | 'neutral';
  category: 'shooter_pattern' | 'gk_alert' | 'turnover_run' | 'phase_efficiency' | 'discipline';
  headline: string;
  detail: string;
  metricBadge: string;
  relatedPlayerId?: string;
  relatedTeamId?: string;
}

export interface AnalyticalFilter {
  half: 'all' | 1 | 2;
  minMinute: number; // 0..60
  maxMinute: number; // 0..60
  phase: 'all' | AttackPhase;
  zone: 'all' | CourtZone;
  situation: 'all' | NumericalSituation;
  opposingGkId: 'all' | string;
  playerId: 'all' | string;
}
