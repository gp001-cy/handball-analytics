import type { CourtZone, Id, LineupStint, MatchEvent, SavedMatch, ShotTechnique, Slot, TeamSide, WavePhase } from '../domain/types';
import type { GameDerivation, PossessionRecord } from '../domain/selectors';

export interface MatchRow {
  id: Id;
  created_at: number;
  updated_at: number;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  clock_ms: number;
  period: 1 | 2;
  finalized: boolean;
}

export interface PlayerRow {
  id: Id;
  match_id: Id;
  team_side: TeamSide;
  name: string;
  number: number;
  position: Slot;
}

export interface PossessionRow {
  id: number;
  match_id: Id;
  team_side: TeamSide;
  start_clock_ms: number;
  end_clock_ms: number;
  wave_phase: WavePhase;
  numerical_state: string;
  call_code: string | null;
}

export interface MatchEventRow {
  id: Id;
  match_id: Id;
  possession_id: number;
  player_id: Id | null;
  assist_player_id: Id | null;
  gk_player_id: Id | null;
  defender_id: Id | null;
  clock_ms: number;
  sequence_idx: number;
  event_type: string;
  sub_type: string | null;
  court_x: number | null;
  court_y: number | null;
  goal_x: number | null;
  goal_y: number | null;
  distance_m: number | null;
  angle_rad: number | null;
  shot_technique: ShotTechnique | null;
  is_contested: boolean | null;
  xg_val: number | null;
  xgot_val: number | null;
  hpi_delta: number | null;
}

export interface LineupStintRow {
  id: number;
  match_id: Id;
  team_side: TeamSide;
  start_clock_ms: number;
  end_clock_ms: number;
  gk_id: Id | null;
  lw_id: Id | null;
  lb_id: Id | null;
  cb_id: Id | null;
  rb_id: Id | null;
  rw_id: Id | null;
  pv_id: Id | null;
  extra_attacker_id: Id | null;
  goals_for: number;
  goals_against: number;
  xg_for: number;
  xg_against: number;
}

export interface ScoutingPriorRow {
  id: Id;
  player_id: Id;
  opponent_team_id: TeamSide;
  zone_matrix_json: string;
  penalty_tree_json: string;
  preferred_technique: ShotTechnique | null;
  tendency_notes: string | null;
}

export function matchToRow(match: SavedMatch, game: GameDerivation): MatchRow {
  return {
    id: match.id,
    created_at: match.createdAt,
    updated_at: match.updatedAt,
    home_team: match.setup.home.name,
    away_team: match.setup.away.name,
    home_score: game.score.home,
    away_score: game.score.away,
    clock_ms: match.clock.elapsedMs,
    period: match.clock.period,
    finalized: match.clock.finished,
  };
}

export function setupToPlayerRows(match: SavedMatch): PlayerRow[] {
  const rows: PlayerRow[] = [];
  for (const side of ['home', 'away'] as TeamSide[]) {
    for (const p of match.setup[side].players) {
      rows.push({
        id: p.id,
        match_id: match.id,
        team_side: side,
        name: p.name,
        number: p.number,
        position: p.position,
      });
    }
  }
  return rows;
}

export function possessionsToRows(matchId: Id, possessions: PossessionRecord[], game: GameDerivation): PossessionRow[] {
  return possessions.map((p) => ({
    id: p.id,
    match_id: matchId,
    team_side: p.teamSide,
    start_clock_ms: Math.round(p.startMs),
    end_clock_ms: Math.round(p.endMs),
    wave_phase: p.wave,
    numerical_state: game.emptyNet[p.teamSide] ? '7v6_EMPTY_NET' : '6v6',
    call_code: null,
  }));
}

export function eventsToRows(matchId: Id, events: MatchEvent[]): MatchEventRow[] {
  return events.map((ev) => ({
    id: ev.id,
    match_id: matchId,
    possession_id: ev.possessionId,
    player_id: ev.playerId ?? null,
    assist_player_id: ev.assistPlayerId ?? null,
    gk_player_id: ev.gkPlayerId ?? null,
    defender_id: ev.defenderId ?? null,
    clock_ms: Math.round(ev.clockMs),
    sequence_idx: ev.seq,
    event_type: ev.type,
    sub_type: ev.turnoverCode ?? ev.outcome ?? null,
    court_x: ev.courtX ?? null,
    court_y: ev.courtY ?? null,
    goal_x: ev.goalX ?? null,
    goal_y: ev.goalY ?? null,
    distance_m: ev.distanceM ?? null,
    angle_rad: ev.angleRad ?? null,
    shot_technique: ev.technique ?? null,
    is_contested: ev.contested ?? null,
    xg_val: ev.xg ?? null,
    xgot_val: ev.xgot ?? null,
    hpi_delta: ev.hpiDelta ?? null,
  }));
}

export function stintsToRows(matchId: Id, stints: LineupStint[]): LineupStintRow[] {
  return stints.map((st) => ({
    id: st.id,
    match_id: matchId,
    team_side: st.teamSide,
    start_clock_ms: Math.round(st.startMs),
    end_clock_ms: Math.round(st.endMs),
    gk_id: st.slots.GK,
    lw_id: st.slots.LW,
    lb_id: st.slots.LB,
    cb_id: st.slots.CB,
    rb_id: st.slots.RB,
    rw_id: st.slots.RW,
    pv_id: st.slots.PV,
    extra_attacker_id: st.extraPlayerId,
    goals_for: 0,
    goals_against: 0,
    xg_for: 0,
    xg_against: 0,
  }));
}

export interface RelationalSnapshot {
  match: MatchRow;
  players: PlayerRow[];
  possessions: PossessionRow[];
  matchEvents: MatchEventRow[];
  lineupStints: LineupStintRow[];
}

export function toRelationalSnapshot(match: SavedMatch, game: GameDerivation): RelationalSnapshot {
  return {
    match: matchToRow(match, game),
    players: setupToPlayerRows(match),
    possessions: possessionsToRows(match.id, game.possessions, game),
    matchEvents: eventsToRows(match.id, match.events),
    lineupStints: stintsToRows(match.id, [...game.stints.home, ...game.stints.away]),
  };
}

export const ZONE_MATRIX_KEYS: CourtZone[] = ['LW', 'RW', 'L6M', 'C6M', 'R6M', 'LBT', 'CBT', 'RBT', 'L9M', 'C9M', 'R9M', 'LONG', 'PV', 'FB', 'M7'];
