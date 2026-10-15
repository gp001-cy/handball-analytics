import type {
  ActiveSuspension,
  CourtZone,
  Id,
  LineupStint,
  MatchEvent,
  MatchSetup,
  Player,
  Position,
  SavedMatch,
  Slot,
  TeamSide,
  WavePhase,
} from './types';
import { SLOTS, SUSPENSION_MS } from './types';
import { classifySaveKind, defensiveCreditHpiDelta, gkHpiDelta, leverageIndex, positionNormalizedHpi, shotHpiDelta, suspensionHpiDelta, turnoverHpiDelta } from './hpi';

export interface PossessionRecord {
  id: number;
  teamSide: TeamSide;
  startMs: number;
  endMs: number;
  wave: WavePhase;
  events: MatchEvent[];
  goals: number;
  endedBy: string | null;
}

export interface GameDerivation {
  score: Record<TeamSide, number>;
  activeLineup: Record<TeamSide, Record<Slot, Id | null>>;
  extraAttacker: Record<TeamSide, Id | null>;
  emptyNet: Record<TeamSide, boolean>;
  stints: Record<TeamSide, LineupStint[]>;
  activeSuspensions: ActiveSuspension[];
  allSuspensions: ActiveSuspension[];
  redCardedIds: Set<Id>;
  suspensionCounts: Map<Id, number>;
  possessions: PossessionRecord[];
  currentPossessionId: number;
  playerById: Map<Id, Player>;
}

export function otherSide(side: TeamSide): TeamSide {
  return side === 'home' ? 'away' : 'home';
}

export function buildPlayerIndex(setup: MatchSetup): Map<Id, Player> {
  const map = new Map<Id, Player>();
  for (const p of setup.home.players) map.set(p.id, p);
  for (const p of setup.away.players) map.set(p.id, p);
  return map;
}

const WAVE_FAST_BREAK_MS = 12 * 1000;
const WAVE_THROW_OFF_MS = 8 * 1000;

export function deriveGame(
  setup: MatchSetup,
  events: MatchEvent[],
  clockMs: number,
): GameDerivation {
  const sorted = [...events].sort((a, b) => a.seq - b.seq);

  const score: Record<TeamSide, number> = { home: 0, away: 0 };
  const activeLineup: Record<TeamSide, Record<Slot, Id | null>> = {
    home: { ...setup.startingLineups.home },
    away: { ...setup.startingLineups.away },
  };
  const extraAttacker: Record<TeamSide, Id | null> = { home: null, away: null };
  const emptyNet: Record<TeamSide, boolean> = { home: false, away: false };
  const stints: Record<TeamSide, LineupStint[]> = { home: [], away: [] };
  const openStint: Record<TeamSide, LineupStint> = {
    home: { id: 0, teamSide: 'home', startMs: 0, endMs: clockMs, slots: { ...activeLineup.home }, extraPlayerId: null },
    away: { id: 0, teamSide: 'away', startMs: 0, endMs: clockMs, slots: { ...activeLineup.away }, extraPlayerId: null },
  };
  let stintCounter = 1;

  const suspensionCounts = new Map<Id, number>();
  const redCardedIds = new Set<Id>();
  const suspensions: ActiveSuspension[] = [];

  const possessions: PossessionRecord[] = [];
  let possessionId = 1;
  let current: PossessionRecord = {
    id: possessionId,
    teamSide: 'home',
    startMs: 0,
    endMs: 0,
    wave: 'SET',
    events: [],
    goals: 0,
    endedBy: null,
  };
  let possessionOpen = false;
  let lastPossessionEndMs = -1;
  let lastPossessionEndedByConcededGoal = false;

  const closePossession = (ev: MatchEvent, endedBy: string, nextTeam: TeamSide) => {
    current.endMs = ev.clockMs;
    current.endedBy = endedBy;
    possessions.push(current);
    lastPossessionEndMs = ev.clockMs;
    lastPossessionEndedByConcededGoal = endedBy === 'GOAL';
    possessionId += 1;
    current = {
      id: possessionId,
      teamSide: nextTeam,
      startMs: ev.clockMs,
      endMs: ev.clockMs,
      wave: 'SET',
      events: [],
      goals: 0,
      endedBy: null,
    };
    possessionOpen = true;
    assignWave(current);
  };

  const assignWave = (p: PossessionRecord) => {
    if (lastPossessionEndMs < 0) {
      p.wave = 'SET';
      return;
    }
    const gap = p.startMs - lastPossessionEndMs;
    const attacking = p.events.some((e) => e.fastBreak);
    if (attacking) {
      p.wave = 'WAVE_1';
    } else if (lastPossessionEndedByConcededGoal && gap <= WAVE_THROW_OFF_MS) {
      p.wave = 'WAVE_3';
    } else if (gap <= WAVE_FAST_BREAK_MS) {
      p.wave = 'WAVE_1';
    } else if (gap <= 2 * WAVE_FAST_BREAK_MS) {
      p.wave = 'WAVE_2';
    } else {
      p.wave = 'SET';
    }
  };

  for (const ev of sorted) {
    const side = ev.teamSide;

    if (ev.type === 'SHOT' && ev.outcome === 'GOAL') {
      score[side] += 1;
    }

    if (ev.type === 'SUBSTITUTION' && ev.slot && ev.playerInId) {
      const st = openStint[side];
      st.endMs = ev.clockMs;
      stints[side].push(st);
      activeLineup[side][ev.slot] = ev.playerInId;
      openStint[side] = {
        id: stintCounter++,
        teamSide: side,
        startMs: ev.clockMs,
        endMs: clockMs,
        slots: { ...activeLineup[side] },
        extraPlayerId: extraAttacker[side],
      };
    }

    if (ev.type === 'EMPTY_NET_ON') {
      const st = openStint[side];
      st.endMs = ev.clockMs;
      stints[side].push(st);
      extraAttacker[side] = ev.playerInId ?? null;
      emptyNet[side] = true;
      openStint[side] = {
        id: stintCounter++,
        teamSide: side,
        startMs: ev.clockMs,
        endMs: clockMs,
        slots: { ...activeLineup[side] },
        extraPlayerId: extraAttacker[side],
      };
    }

    if (ev.type === 'EMPTY_NET_OFF') {
      const st = openStint[side];
      st.endMs = ev.clockMs;
      stints[side].push(st);
      extraAttacker[side] = null;
      emptyNet[side] = false;
      openStint[side] = {
        id: stintCounter++,
        teamSide: side,
        startMs: ev.clockMs,
        endMs: clockMs,
        slots: { ...activeLineup[side] },
        extraPlayerId: null,
      };
    }

    if (ev.type === 'SUSPENSION_2MIN' && ev.playerId) {
      const count = (suspensionCounts.get(ev.playerId) ?? 0) + 1;
      suspensionCounts.set(ev.playerId, count);
      const endMs = ev.suspensionEndMs ?? ev.clockMs + SUSPENSION_MS;
      suspensions.push({ playerId: ev.playerId, teamSide: side, startMs: ev.clockMs, endMs });
    }

    if (ev.type === 'RED_CARD' && ev.playerId) {
      redCardedIds.add(ev.playerId);
      if (!suspensionCounts.has(ev.playerId)) suspensionCounts.set(ev.playerId, 0);
    }

    const isPossessionEvent =
      ev.type === 'SHOT' ||
      ev.type === 'TURNOVER' ||
      ev.type === 'REBOUND_RECOVERED';

    if (isPossessionEvent) {
      if (!possessionOpen) {
        current.teamSide = side;
        current.startMs = ev.clockMs;
        possessionOpen = true;
        assignWave(current);
      } else if (current.teamSide !== side) {
        closePossession(ev, 'CHANGE', side);
      }
      current.events.push(ev);
      if (ev.type === 'SHOT') {
        if (ev.outcome === 'GOAL') {
          current.goals += 1;
          closePossession(ev, 'GOAL', otherSide(side));
        } else if (ev.outcome === 'SAVE' || ev.outcome === 'WIDE' || ev.outcome === 'POST' || ev.outcome === 'BLOCKED') {
          if (ev.reboundRecovered) {
            current.events.push(ev);
          } else {
            closePossession(ev, ev.outcome, otherSide(side));
          }
        }
      } else if (ev.type === 'TURNOVER') {
        closePossession(ev, 'TURNOVER', otherSide(side));
      }
    }

    if (ev.type === 'PERIOD_END') {
      if (current.events.length > 0) {
        current.endMs = ev.clockMs;
        current.endedBy = 'PERIOD_END';
        possessions.push(current);
      }
      possessionOpen = false;
      lastPossessionEndMs = ev.clockMs;
      possessionId += 1;
      current = { id: possessionId, teamSide: otherSide(side), startMs: ev.clockMs, endMs: ev.clockMs, wave: 'SET', events: [], goals: 0, endedBy: null };
    }
  }

  if (possessionOpen && current.events.length > 0) {
    current.endMs = clockMs;
    possessions.push(current);
  }

  for (const s of ['home', 'away'] as TeamSide[]) {
    openStint[s].endMs = clockMs;
    stints[s].push(openStint[s]);
  }

  const activeSuspensions = suspensions.filter((s) => s.endMs > clockMs);

  return {
    score,
    activeLineup,
    extraAttacker,
    emptyNet,
    stints,
    activeSuspensions,
    allSuspensions: suspensions,
    redCardedIds,
    suspensionCounts,
    possessions,
    currentPossessionId: possessionId,
    playerById: buildPlayerIndex(setup),
  };
}

export function numericalStateString(game: GameDerivation, side: TeamSide): string {
  const suspSelf = game.activeSuspensions.filter((s) => s.teamSide === side).length;
  const suspOther = game.activeSuspensions.filter((s) => s.teamSide === otherSide(side)).length;
  const attackers = 6 - suspSelf + (game.emptyNet[side] ? 1 : 0);
  const defenders = 6 - suspOther;
  const base = `${Math.max(0, attackers)}v${Math.max(0, defenders)}`;
  return game.emptyNet[side] ? `${base}_EMPTY_NET` : base;
}

export function onCourtPlayerIds(game: GameDerivation, side: TeamSide): Id[] {
  const lineup = game.activeLineup[side];
  const suspended = new Set(game.activeSuspensions.map((s) => s.playerId));
  const ids: Id[] = [];
  for (const slot of SLOTS) {
    if (slot === 'GK' && game.emptyNet[side]) continue;
    const id = lineup[slot];
    if (id && !suspended.has(id) && !game.redCardedIds.has(id)) ids.push(id);
  }
  if (game.extraAttacker[side]) ids.push(game.extraAttacker[side] as Id);
  return ids;
}

export interface PlayerLine {
  player: Player;
  goals: number;
  shots: number;
  misses: number;
  assists: number;
  saves: number;
  faced: number;
  goalsConceded: number;
  xgSum: number;
  xgotFacedSum: number;
  goalsPrevented: number;
  turnovers: number;
  steals: number;
  blocks: number;
  stopFouls: number;
  chargesDrawn: number;
  drawn7m: number;
  suspensions: number;
  redCard: boolean;
  hpi: number;
  leveragedScore: number;
  playingMs: number;
  currentStintMs: number;
  byZone: Partial<Record<CourtZone, { goals: number; shots: number }>>;
  offensiveResponsibility: number;
  positionNormalizedHpi: number;
}

function emptyLine(player: Player): PlayerLine {
  return {
    player,
    goals: 0,
    shots: 0,
    misses: 0,
    assists: 0,
    saves: 0,
    faced: 0,
    goalsConceded: 0,
    xgSum: 0,
    xgotFacedSum: 0,
    goalsPrevented: 0,
    turnovers: 0,
    steals: 0,
    blocks: 0,
    stopFouls: 0,
    chargesDrawn: 0,
    drawn7m: 0,
    suspensions: 0,
    redCard: false,
    hpi: 0,
    leveragedScore: 0,
    playingMs: 0,
    currentStintMs: 0,
    byZone: {},
    offensiveResponsibility: 0,
    positionNormalizedHpi: 0,
  };
}

export function computePlayerLines(game: GameDerivation, events: MatchEvent[], clockMs: number): Map<Id, PlayerLine> {
  const lines = new Map<Id, PlayerLine>();
  const get = (id: Id | undefined): PlayerLine | null => {
    if (!id) return null;
    const player = game.playerById.get(id);
    if (!player) return null;
    if (!lines.has(id)) lines.set(id, emptyLine(player));
    return lines.get(id) as PlayerLine;
  };

  for (const player of game.playerById.values()) {
    get(player.id);
  }

  const sorted = [...events].sort((a, b) => a.seq - b.seq);

  for (const ev of sorted) {
    const scorer = get(ev.playerId);
    const scoreDiffPerspective = (side: TeamSide) =>
      game.score[side] - game.score[otherSide(side)];

    if (ev.type === 'SHOT' && ev.outcome && scorer) {
      const side = ev.teamSide;
      const diff = scoreDiffPerspective(side);
      const leverage = leverageIndex(ev.clockMs, diff);
      const defenderGk = get(ev.gkPlayerId);
      const isSeven = ev.sevenMeter ?? false;
      const hpiBefore = scorer.hpi;

      if (ev.outcome === 'GOAL') {
        scorer.goals += 1;
        scorer.hpi += shotHpiDelta({
          outcome: ev.outcome,
          zone: ev.zone,
          emptyNet: ev.emptyNet,
          sevenMeter: isSeven,
          fastBreak: ev.fastBreak,
        });
        if (ev.assistPlayerId) {
          const assister = get(ev.assistPlayerId);
          if (assister) {
            assister.assists += 1;
            assister.hpi += (ev.zone === 'C6M' || ev.zone === 'PV') ? 2.5 : 2;
          }
        }
        if (defenderGk) {
          const kind = classifySaveKind({
            outcome: ev.outcome,
            zone: ev.zone,
            emptyNet: ev.emptyNet,
            sevenMeter: isSeven,
            fastBreak: ev.fastBreak,
          });
          defenderGk.goalsConceded += 1;
          defenderGk.faced += 1;
          if (ev.xgot != null) defenderGk.xgotFacedSum += ev.xgot;
          defenderGk.hpi += gkHpiDelta(kind, true);
        }
      } else {
        scorer.misses += 1;
        scorer.hpi += shotHpiDelta({ outcome: ev.outcome, zone: ev.zone, emptyNet: ev.emptyNet, sevenMeter: isSeven, fastBreak: ev.fastBreak });
        if (ev.outcome === 'SAVE') {
          if (defenderGk) {
            const kind = classifySaveKind({
              outcome: ev.outcome,
              zone: ev.zone,
              emptyNet: ev.emptyNet,
              sevenMeter: isSeven,
              fastBreak: ev.fastBreak,
            });
            defenderGk.saves += 1;
            defenderGk.faced += 1;
            if (ev.xgot != null) defenderGk.xgotFacedSum += ev.xgot;
            defenderGk.hpi += gkHpiDelta(kind, false);
          }
        } else if (defenderGk && (ev.outcome === 'POST' || ev.outcome === 'WIDE')) {
          defenderGk.faced += 1;
          if (ev.xgot != null) defenderGk.xgotFacedSum += ev.xgot;
        }
        if (ev.outcome === 'BLOCKED' && ev.defenderId) {
          const blocker = get(ev.defenderId);
          if (blocker) {
            blocker.blocks += 1;
            blocker.hpi += 2;
            blocker.leveragedScore += 2 * leverageIndex(ev.clockMs, scoreDiffPerspective(blocker.player.teamSide));
          }
        }
      }
      scorer.shots += 1;
      if (ev.xg != null) scorer.xgSum += ev.xg;
      if (ev.zone) {
        const z = scorer.byZone[ev.zone] ?? { goals: 0, shots: 0 };
        z.shots += 1;
        if (ev.outcome === 'GOAL') z.goals += 1;
        scorer.byZone[ev.zone] = z;
      }
      scorer.leveragedScore += (scorer.hpi - hpiBefore) * leverage;
    }

    if (ev.type === 'TURNOVER' && scorer && ev.turnoverCode) {
      scorer.turnovers += 1;
      const delta = turnoverHpiDelta(ev.turnoverCode);
      scorer.hpi += delta;
      scorer.leveragedScore += delta * leverageIndex(ev.clockMs, scoreDiffPerspective(ev.teamSide));
      const defender = get(ev.defenderId);
      if (defender && (ev.turnoverCode === 'DEF_STEAL_ANTICIPATION' || ev.turnoverCode === 'DEF_PIVOT_RECOVERY')) {
        defender.steals += 1;
        const dDelta = defensiveCreditHpiDelta(ev.turnoverCode);
        defender.hpi += dDelta;
        defender.leveragedScore += dDelta * leverageIndex(ev.clockMs, scoreDiffPerspective(defender.player.teamSide));
      }
    }

    if (ev.type === 'DEF_STOP_FOUL' && scorer) {
      scorer.stopFouls += 1;
      scorer.hpi += 1;
      scorer.leveragedScore += 1 * leverageIndex(ev.clockMs, scoreDiffPerspective(ev.teamSide));
    }

    if (ev.type === 'DEF_CHARGE_DRAWN' && scorer) {
      scorer.chargesDrawn += 1;
      scorer.hpi += 1.5;
      scorer.leveragedScore += 1.5 * leverageIndex(ev.clockMs, scoreDiffPerspective(ev.teamSide));
    }

    if (ev.type === 'SEVEN_M_AWARDED' && scorer) {
      scorer.drawn7m += 1;
      scorer.hpi += 2;
      scorer.leveragedScore += 2 * leverageIndex(ev.clockMs, scoreDiffPerspective(ev.teamSide));
    }

    if (ev.type === 'SUSPENSION_2MIN' && scorer) {
      const count = game.suspensionCounts.get(scorer.player.id) ?? scorer.suspensions + 1;
      scorer.suspensions += 1;
      const delta = suspensionHpiDelta(count);
      scorer.hpi += delta;
      scorer.leveragedScore += delta * leverageIndex(ev.clockMs, scoreDiffPerspective(ev.teamSide));
    }

    if (ev.type === 'RED_CARD' && scorer) {
      scorer.redCard = true;
      scorer.hpi += suspensionHpiDelta(0, true);
      scorer.leveragedScore += suspensionHpiDelta(0, true) * leverageIndex(ev.clockMs, scoreDiffPerspective(ev.teamSide));
    }
  }

  for (const side of ['home', 'away'] as TeamSide[]) {
    for (const stint of game.stints[side]) {
      const end = Math.min(stint.endMs, clockMs);
      const duration = Math.max(0, end - stint.startMs);
      const gkPulled = stint.extraPlayerId != null;
      for (const slot of SLOTS) {
        if (slot === 'GK' && gkPulled) continue;
        const id = stint.slots[slot];
        const line = get(id ?? undefined);
        if (line) line.playingMs += duration;
      }
      if (stint.extraPlayerId) {
        const line = get(stint.extraPlayerId);
        if (line) line.playingMs += duration;
      }
    }
  }

  const suspensionsByPlayer = new Map<Id, ActiveSuspension[]>();
  for (const s of game.allSuspensions) {
    const arr = suspensionsByPlayer.get(s.playerId) ?? [];
    arr.push(s);
    suspensionsByPlayer.set(s.playerId, arr);
  }
  for (const line of lines.values()) {
    const intervals = suspensionsByPlayer.get(line.player.id);
    if (!intervals) continue;
    let offMs = 0;
    for (const s of intervals) {
      const overlap = Math.min(s.endMs, clockMs) - s.startMs;
      if (overlap > 0) offMs += overlap;
    }
    line.playingMs = Math.max(0, line.playingMs - offMs);
  }

  for (const side of ['home', 'away'] as TeamSide[]) {
    const teamLines = [...lines.values()].filter((l) => l.player.teamSide === side);
    const teamCreation = teamLines.reduce((acc, l) => acc + l.shots + l.assists + l.drawn7m, 0);
    for (const l of teamLines) {
      l.offensiveResponsibility = teamCreation > 0 ? (l.shots + l.assists + l.drawn7m) / teamCreation : 0;
      l.positionNormalizedHpi = positionNormalizedHpi(l.hpi, l.player.position);
      l.goalsPrevented = l.xgotFacedSum - l.goalsConceded;
    }
  }

  return lines;
}

export interface TeamTotals {
  goals: number;
  shots: number;
  misses: number;
  assists: number;
  saves: number;
  faced: number;
  goalsConceded: number;
  xgFor: number;
  xgAgainst: number;
  turnovers: number;
  technicalFouls: number;
  steals: number;
  blocks: number;
  stopFouls: number;
  suspensions: number;
  drawn7m: number;
  fastBreakGoals: number;
  emptyNetGoals: number;
  byZone: Record<string, { goals: number; shots: number }>;
  possessions: number;
  goalsPer50: number;
  concededPer50: number;
  netPer50: number;
}

export function computeTeamTotals(side: TeamSide, game: GameDerivation, events: MatchEvent[]): TeamTotals {
  const totals: TeamTotals = {
    goals: 0, shots: 0, misses: 0, assists: 0, saves: 0, faced: 0, goalsConceded: 0,
    xgFor: 0, xgAgainst: 0, turnovers: 0, technicalFouls: 0, steals: 0, blocks: 0,
    stopFouls: 0, suspensions: 0, drawn7m: 0, fastBreakGoals: 0, emptyNetGoals: 0,
    byZone: {}, possessions: 0, goalsPer50: 0, concededPer50: 0, netPer50: 0,
  };

  for (const ev of events) {
    if (ev.type === 'SHOT' && ev.outcome) {
      if (ev.teamSide === side) {
        totals.shots += 1;
        totals.xgFor += ev.xg ?? 0;
        if (ev.outcome === 'GOAL') {
          totals.goals += 1;
          if (ev.fastBreak) totals.fastBreakGoals += 1;
          if (ev.emptyNet) totals.emptyNetGoals += 1;
        } else {
          totals.misses += 1;
        }
        if (ev.assistPlayerId) totals.assists += 1;
        if (ev.zone) {
          const z = totals.byZone[ev.zone] ?? { goals: 0, shots: 0 };
          z.shots += 1;
          if (ev.outcome === 'GOAL') z.goals += 1;
          totals.byZone[ev.zone] = z;
        }
      } else {
        totals.xgAgainst += ev.xg ?? 0;
        if (ev.outcome === 'SAVE') totals.saves += 1;
        if (ev.outcome === 'GOAL') totals.goalsConceded += 1;
        if (ev.outcome === 'SAVE' || ev.outcome === 'GOAL' || ev.outcome === 'POST') totals.faced += 1;
      }
    }
    if (ev.teamSide !== side) continue;
    if (ev.type === 'TURNOVER') {
      totals.turnovers += 1;
      if (ev.turnoverCode && ['TF_STEPS', 'TF_3SEC', 'TF_AREA', 'TF_PASSIVE', 'TF_OFF_FOUL'].includes(ev.turnoverCode)) {
        totals.technicalFouls += 1;
      }
    }
    if (ev.type === 'DEF_STOP_FOUL') totals.stopFouls += 1;
    if (ev.type === 'SEVEN_M_AWARDED') totals.drawn7m += 1;
    if (ev.type === 'SUSPENSION_2MIN') totals.suspensions += 1;
  }

  const teamPossessions = game.possessions.filter((p) => p.teamSide === side);
  const oppPossessions = game.possessions.filter((p) => p.teamSide !== side);
  totals.possessions = teamPossessions.length;
  if (teamPossessions.length > 0) totals.goalsPer50 = (totals.goals / teamPossessions.length) * 50;
  if (oppPossessions.length > 0) totals.concededPer50 = (totals.goalsConceded / oppPossessions.length) * 50;
  totals.netPer50 = totals.goalsPer50 - totals.concededPer50;

  return totals;
}

export interface MomentumBucket {
  clockMs: number;
  diff: number;
  homeGoals: number;
  awayGoals: number;
}

export function momentumSeries(events: MatchEvent[], fromMs: number, toMs: number, stepMs = 60 * 1000): MomentumBucket[] {
  const buckets: MomentumBucket[] = [];
  const goals = events.filter((e) => e.type === 'SHOT' && e.outcome === 'GOAL');
  let cumHome = goals.filter((g) => g.teamSide === 'home' && g.clockMs < fromMs).length;
  let cumAway = goals.filter((g) => g.teamSide === 'away' && g.clockMs < fromMs).length;

  for (let t = fromMs; t <= toMs; t += stepMs) {
    const inBucket = goals.filter((g) => g.clockMs >= t - stepMs && g.clockMs < t);
    const hg = inBucket.filter((g) => g.teamSide === 'home').length;
    const ag = inBucket.filter((g) => g.teamSide === 'away').length;
    cumHome += hg;
    cumAway += ag;
    buckets.push({ clockMs: t, diff: cumHome - cumAway, homeGoals: hg, awayGoals: ag });
  }
  return buckets;
}

export function recentTurnovers(events: MatchEvent[], limit = 6): MatchEvent[] {
  return events
    .filter((e) => e.type === 'TURNOVER')
    .slice(-limit)
    .reverse();
}

export function possessionTurnoverStreak(events: MatchEvent[], game: GameDerivation, side: TeamSide): MatchEvent[] {
  const possessions = game.possessions.filter((p) => p.teamSide === side);
  const last = possessions.slice(-5);
  const out: MatchEvent[] = [];
  for (const p of last) {
    const to = p.events.find((e) => e.type === 'TURNOVER');
    if (to) out.push(to);
  }
  return out;
}

export function playerName(game: GameDerivation, id: Id | undefined): string {
  if (!id) return '—';
  const p = game.playerById.get(id);
  return p ? `#${p.number} ${p.name}` : '—';
}

export function positionOf(game: GameDerivation, id: Id | undefined): Position {
  if (!id) return 'CB';
  return game.playerById.get(id)?.position ?? 'CB';
}

export function totalMinutes(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function deriveFull(match: SavedMatch, clockMs?: number): GameDerivation {
  return deriveGame(match.setup, match.events, clockMs ?? match.clock.elapsedMs);
}
