import {
  ActiveSuspension,
  AnalyticalFilter,
  AttackPhase,
  CourtZone,
  DerivedTeamCourtState,
  GoalTargetCell,
  LiveInsight,
  Match,
  MatchEvent,
  NumericalSituation,
  Player,
  PositionCode,
  TechnicalFaultType,
} from '../types/domain';

const POSITIONS_ORDER: PositionCode[] = ['GK', 'LW', 'LB', 'CB', 'RB', 'RW', 'PV'];

export function deriveCourtStateAtClock(
  match: Match,
  events: MatchEvent[],
  clockSec: number,
  players: Player[]
): Record<string, DerivedTeamCourtState> {
  const playerMap = new Map(players.map((p) => [p.id, p]));
  const jerseyMap = new Map<string, number>();
  for (const p of players) {
    jerseyMap.set(p.id, p.defaultJerseyNumber);
  }
  for (const l of match.lineups) {
    jerseyMap.set(l.playerId, l.jerseyNumber);
  }

  const teamIds = [match.homeTeamId, match.awayTeamId];
  const result: Record<string, DerivedTeamCourtState> = {};

  for (const teamId of teamIds) {
    const onCourtByPosition: Record<PositionCode, string | null> = {
      GK: null,
      LW: null,
      LB: null,
      CB: null,
      RB: null,
      RW: null,
      PV: null,
    };

    const starters = match.lineups.filter((l) => l.teamId === teamId && l.isStarter);
    for (const st of starters) {
      if (st.startingSlot) {
        onCourtByPosition[st.startingSlot] = st.playerId;
      }
    }

    // Fill any missing slot from squad
    for (const pos of POSITIONS_ORDER) {
      if (!onCourtByPosition[pos]) {
        const candidate = players.find(
          (p) =>
            p.teamId === teamId &&
            p.primaryPosition === pos &&
            !Object.values(onCourtByPosition).includes(p.id)
        );
        if (candidate) {
          onCourtByPosition[pos] = candidate.id;
        }
      }
    }

    let is7v6Active = false;
    let timeoutsUsedTotal = 0;
    let timeoutsUsedThisHalf = 0;
    let timeoutsUsedLast5Min = 0;
    const currentHalf = clockSec >= match.format.halfDurationSec ? 2 : 1;
    const totalMatchDuration = match.format.halfDurationSec * 2;
    const activeSuspensions: ActiveSuspension[] = [];

    const sortedEvents = [...events]
      .filter((e) => e.teamId === teamId && e.matchClockSec <= clockSec)
      .sort((a, b) => a.matchClockSec - b.matchClockSec);

    for (const ev of sortedEvents) {
      if (ev.category === 'team_state') {
        if (ev.subType === 'substitution' && ev.substitution) {
          onCourtByPosition[ev.substitution.slot] = ev.substitution.playerInId;
        } else if (ev.subType === '7v6_start') {
          is7v6Active = true;
        } else if (ev.subType === '7v6_end') {
          is7v6Active = false;
        } else if (ev.subType === 'timeout') {
          timeoutsUsedTotal += 1;
          if (ev.half === currentHalf) {
            timeoutsUsedThisHalf += 1;
          }
          if (ev.matchClockSec >= totalMatchDuration - 300) {
            timeoutsUsedLast5Min += 1;
          }
        }
      } else if (ev.category === 'discipline' && ev.subType === '2min' && ev.playerId) {
        const dur = ev.suspensionDurationSec ?? 120;
        const endsAt = ev.matchClockSec + dur;
        if (clockSec >= ev.matchClockSec && clockSec < endsAt) {
          const p = playerMap.get(ev.playerId);
          activeSuspensions.push({
            eventId: ev.id,
            teamId,
            playerId: ev.playerId,
            jerseyNumber: jerseyMap.get(ev.playerId) ?? p?.defaultJerseyNumber ?? 0,
            playerName: p ? `${p.firstName[0]}. ${p.lastName}` : 'Player',
            startedAtClockSec: ev.matchClockSec,
            endsAtClockSec: endsAt,
            remainingSec: Math.max(0, endsAt - clockSec),
          });
        }
      }
    }

    result[teamId] = {
      teamId,
      onCourtByPosition,
      activeGkId: is7v6Active ? null : onCourtByPosition.GK,
      is7v6Active,
      activeSuspensions,
      timeoutsUsedTotal,
      timeoutsUsedThisHalf,
      timeoutsUsedLast5Min,
      numericalSituation: 'equal',
    };
  }

  // Derive relative numerical situation (equal, power_play, short_handed, empty_goal)
  const [tA, tB] = teamIds;
  if (result[tA] && result[tB]) {
    const suspA = result[tA].activeSuspensions.length;
    const suspB = result[tB].activeSuspensions.length;

    if (result[tA].is7v6Active) {
      result[tA].numericalSituation = 'empty_goal';
    } else if (suspA < suspB) {
      result[tA].numericalSituation = 'power_play';
    } else if (suspA > suspB) {
      result[tA].numericalSituation = 'short_handed';
    }

    if (result[tB].is7v6Active) {
      result[tB].numericalSituation = 'empty_goal';
    } else if (suspB < suspA) {
      result[tB].numericalSituation = 'power_play';
    } else if (suspB > suspA) {
      result[tB].numericalSituation = 'short_handed';
    }
  }

  return result;
}

export function filterMatchEvents(
  events: MatchEvent[],
  filter: AnalyticalFilter
): MatchEvent[] {
  return events.filter((ev) => {
    if (filter.half !== 'all' && ev.half !== filter.half) return false;
    const minute = ev.matchClockSec / 60;
    if (minute < filter.minMinute || minute > filter.maxMinute) return false;
    if (filter.phase !== 'all' && ev.attackPhase !== filter.phase) return false;
    if (filter.situation !== 'all' && ev.situation !== filter.situation) return false;
    if (filter.zone !== 'all') {
      if (!ev.shotOrigin || ev.shotOrigin.zone !== filter.zone) return false;
    }
    if (filter.opposingGkId !== 'all' && ev.opposingGkId !== filter.opposingGkId) {
      return false;
    }
    if (filter.playerId !== 'all' && ev.playerId !== filter.playerId) {
      return false;
    }
    return true;
  });
}

export interface PlayerComputedStats {
  player: Player;
  jerseyNumber: number;
  isStarter: boolean;
  goals: number;
  shots: number;
  sevenMeterGoals: number;
  sevenMeterShots: number;
  bounceGoals: number;
  bounceShots: number;
  assists: number;
  technicalFaults: number;
  steals: number;
  blocks: number;
  twoMinSuspensions: number;
  yellowCards: number;
  redCards: number;
  secondsPlayed: number;
  plusMinus: number;
  byZone: Record<CourtZone, { goals: number; shots: number }>;
  byPhase: Record<AttackPhase, { goals: number; shots: number }>;
  byGoalCell: Record<GoalTargetCell, { goals: number; shots: number }>;
}

export function computePlayerMatchStats(
  match: Match,
  events: MatchEvent[],
  players: Player[],
  currentClockSec = 3600
): Record<string, PlayerComputedStats> {
  const statsMap: Record<string, PlayerComputedStats> = {};
  const effectiveClock = Math.min(3600, Math.max(60, currentClockSec));

  const emptyZones = (): Record<CourtZone, { goals: number; shots: number }> => ({
    LW: { goals: 0, shots: 0 },
    RW: { goals: 0, shots: 0 },
    LB_9M: { goals: 0, shots: 0 },
    CB_9M: { goals: 0, shots: 0 },
    RB_9M: { goals: 0, shots: 0 },
    '6M_LEFT': { goals: 0, shots: 0 },
    '6M_CENTRE': { goals: 0, shots: 0 },
    '6M_RIGHT': { goals: 0, shots: 0 },
    '7M': { goals: 0, shots: 0 },
    BREAKTHROUGH: { goals: 0, shots: 0 },
    FAST_BREAK: { goals: 0, shots: 0 },
    EMPTY_NET_OWN_HALF: { goals: 0, shots: 0 },
  });

  const emptyPhases = (): Record<AttackPhase, { goals: number; shots: number }> => ({
    positional: { goals: 0, shots: 0 },
    fast_break: { goals: 0, shots: 0 },
    second_wave: { goals: 0, shots: 0 },
    empty_goal_7v6: { goals: 0, shots: 0 },
  });

  const emptyCells = (): Record<GoalTargetCell, { goals: number; shots: number }> => ({
    TL: { goals: 0, shots: 0 },
    TC: { goals: 0, shots: 0 },
    TR: { goals: 0, shots: 0 },
    ML: { goals: 0, shots: 0 },
    MC: { goals: 0, shots: 0 },
    MR: { goals: 0, shots: 0 },
    BL: { goals: 0, shots: 0 },
    BC: { goals: 0, shots: 0 },
    BR: { goals: 0, shots: 0 },
    POST_L: { goals: 0, shots: 0 },
    POST_R: { goals: 0, shots: 0 },
    CROSSBAR: { goals: 0, shots: 0 },
    WIDE_L: { goals: 0, shots: 0 },
    WIDE_R: { goals: 0, shots: 0 },
    HIGH: { goals: 0, shots: 0 },
  });

  for (const p of players) {
    const lineupEntry = match.lineups.find((l) => l.playerId === p.id);
    const isStarter = lineupEntry?.isStarter ?? false;
    statsMap[p.id] = {
      player: p,
      jerseyNumber: lineupEntry?.jerseyNumber ?? p.defaultJerseyNumber,
      isStarter,
      goals: 0,
      shots: 0,
      sevenMeterGoals: 0,
      sevenMeterShots: 0,
      bounceGoals: 0,
      bounceShots: 0,
      assists: 0,
      technicalFaults: 0,
      steals: 0,
      blocks: 0,
      twoMinSuspensions: 0,
      yellowCards: 0,
      redCards: 0,
      secondsPlayed: isStarter ? Math.round(effectiveClock * 0.78) : Math.round(effectiveClock * 0.24),
      plusMinus: 0,
      byZone: emptyZones(),
      byPhase: emptyPhases(),
      byGoalCell: emptyCells(),
    };
  }

  // Track exact +/- from goal events and active lineups
  const sortedEvents = [...events].sort((a, b) => a.matchClockSec - b.matchClockSec);
  const onCourtSetByTeam: Record<string, Set<string>> = {
    [match.homeTeamId]: new Set(
      match.lineups
        .filter((l) => l.teamId === match.homeTeamId && l.isStarter)
        .map((l) => l.playerId)
    ),
    [match.awayTeamId]: new Set(
      match.lineups
        .filter((l) => l.teamId === match.awayTeamId && l.isStarter)
        .map((l) => l.playerId)
    ),
  };

  for (const ev of sortedEvents) {
    if (ev.category === 'team_state' && ev.subType === 'substitution' && ev.substitution) {
      const set = onCourtSetByTeam[ev.teamId];
      if (set) {
        set.delete(ev.substitution.playerOutId);
        set.add(ev.substitution.playerInId);
      }
    }

    if (ev.category === 'shot' && ev.subType === 'goal') {
      const scoringTeam = ev.teamId;
      const concedingTeam =
        scoringTeam === match.homeTeamId ? match.awayTeamId : match.homeTeamId;

      for (const pid of onCourtSetByTeam[scoringTeam] || []) {
        if (statsMap[pid]) statsMap[pid].plusMinus += 1;
      }
      for (const pid of onCourtSetByTeam[concedingTeam] || []) {
        if (statsMap[pid]) statsMap[pid].plusMinus -= 1;
      }
    }

    if (!ev.playerId || !statsMap[ev.playerId]) continue;
    const st = statsMap[ev.playerId];

    if (ev.category === 'shot') {
      st.shots += 1;
      const isGoal = ev.subType === 'goal';
      if (isGoal) st.goals += 1;

      if (ev.isBounceShot) {
        st.bounceShots += 1;
        if (isGoal) st.bounceGoals += 1;
      }

      if (ev.shotOrigin?.zone === '7M') {
        st.sevenMeterShots += 1;
        if (isGoal) st.sevenMeterGoals += 1;
      }

      if (ev.shotOrigin && st.byZone[ev.shotOrigin.zone]) {
        st.byZone[ev.shotOrigin.zone].shots += 1;
        if (isGoal) st.byZone[ev.shotOrigin.zone].goals += 1;
      }

      if (st.byPhase[ev.attackPhase]) {
        st.byPhase[ev.attackPhase].shots += 1;
        if (isGoal) st.byPhase[ev.attackPhase].goals += 1;
      }

      if (ev.goalTarget && st.byGoalCell[ev.goalTarget.cell]) {
        st.byGoalCell[ev.goalTarget.cell].shots += 1;
        if (isGoal) st.byGoalCell[ev.goalTarget.cell].goals += 1;
      }
    } else if (ev.category === 'attack_other' && ev.subType === 'assist') {
      st.assists += 1;
    } else if (ev.category === 'technical_fault') {
      st.technicalFaults += 1;
    } else if (
      ev.category === 'defence' &&
      (ev.subType === 'steal' || ev.subType === 'interception')
    ) {
      st.steals += 1;
    } else if (ev.category === 'defence' && ev.subType === 'block') {
      st.blocks += 1;
    } else if (ev.category === 'discipline') {
      if (ev.subType === '2min') st.twoMinSuspensions += 1;
      if (ev.subType === 'yellow') st.yellowCards += 1;
      if (ev.subType === 'red' || ev.subType === 'blue') st.redCards += 1;
    }
  }

  // Strict handball rule: A team's total assists can NEVER exceed their total goals!
  const teamGoalsCount: Record<string, number> = {};
  const teamAssistsCount: Record<string, number> = {};

  for (const pid of Object.keys(statsMap)) {
    const pStat = statsMap[pid];
    const tId = pStat.player.teamId;
    teamGoalsCount[tId] = (teamGoalsCount[tId] || 0) + pStat.goals;
    teamAssistsCount[tId] = (teamAssistsCount[tId] || 0) + pStat.assists;
  }

  for (const tId of Object.keys(teamGoalsCount)) {
    const totalG = teamGoalsCount[tId] || 0;
    const totalA = teamAssistsCount[tId] || 0;
    if (totalA > totalG) {
      let excess = totalA - totalG;
      for (const pid of Object.keys(statsMap)) {
        const pStat = statsMap[pid];
        if (pStat.player.teamId === tId && pStat.assists > 0 && excess > 0) {
          const reduction = Math.min(excess, pStat.assists);
          pStat.assists -= reduction;
          excess -= reduction;
        }
      }
    }
  }

  return statsMap;
}

export interface GoalkeeperComputedStats {
  player: Player;
  jerseyNumber: number;
  saves: number;
  goalsConceded: number;
  shotsOnTargetFaced: number;
  sevenMeterSaves: number;
  sevenMeterFaced: number;
  fastBreakSaves: number;
  fastBreakFaced: number;
  wingSaves: number;
  wingFaced: number;
  nineMeterSaves: number;
  nineMeterFaced: number;
  sixMeterSaves: number;
  sixMeterFaced: number;
  byGoalCell: Record<GoalTargetCell, { saves: number; goals: number; faced: number }>;
  shooterMatchups: Array<{
    shooter: Player;
    jerseyNumber: number;
    saves: number;
    goals: number;
    faced: number;
    favouriteCell: GoalTargetCell | null;
  }>;
}

export function computeGoalkeeperStats(
  match: Match,
  events: MatchEvent[],
  players: Player[]
): Record<string, GoalkeeperComputedStats> {
  const gks = players.filter((p) => p.primaryPosition === 'GK');
  const playerMap = new Map(players.map((p) => [p.id, p]));
  const result: Record<string, GoalkeeperComputedStats> = {};

  for (const gk of gks) {
    const lineupEntry = match.lineups.find((l) => l.playerId === gk.id);
    const byGoalCell: Record<
      GoalTargetCell,
      { saves: number; goals: number; faced: number }
    > = {
      TL: { saves: 0, goals: 0, faced: 0 },
      TC: { saves: 0, goals: 0, faced: 0 },
      TR: { saves: 0, goals: 0, faced: 0 },
      ML: { saves: 0, goals: 0, faced: 0 },
      MC: { saves: 0, goals: 0, faced: 0 },
      MR: { saves: 0, goals: 0, faced: 0 },
      BL: { saves: 0, goals: 0, faced: 0 },
      BC: { saves: 0, goals: 0, faced: 0 },
      BR: { saves: 0, goals: 0, faced: 0 },
      POST_L: { saves: 0, goals: 0, faced: 0 },
      POST_R: { saves: 0, goals: 0, faced: 0 },
      CROSSBAR: { saves: 0, goals: 0, faced: 0 },
      WIDE_L: { saves: 0, goals: 0, faced: 0 },
      WIDE_R: { saves: 0, goals: 0, faced: 0 },
      HIGH: { saves: 0, goals: 0, faced: 0 },
    };

    const shooterMap = new Map<
      string,
      {
        saves: number;
        goals: number;
        faced: number;
        cells: Record<string, number>;
      }
    >();

    let saves = 0;
    let goalsConceded = 0;
    let sevenMeterSaves = 0;
    let sevenMeterFaced = 0;
    let fastBreakSaves = 0;
    let fastBreakFaced = 0;
    let wingSaves = 0;
    let wingFaced = 0;
    let nineMeterSaves = 0;
    let nineMeterFaced = 0;
    let sixMeterSaves = 0;
    let sixMeterFaced = 0;

    for (const ev of events) {
      if (ev.category !== 'shot' || ev.opposingGkId !== gk.id) continue;
      if (ev.subType !== 'goal' && ev.subType !== 'saved') continue;

      const isSave = ev.subType === 'saved';
      if (isSave) saves += 1;
      else goalsConceded += 1;

      const z = ev.shotOrigin?.zone;
      if (z === '7M') {
        sevenMeterFaced += 1;
        if (isSave) sevenMeterSaves += 1;
      } else if (ev.attackPhase === 'fast_break' || z === 'FAST_BREAK') {
        fastBreakFaced += 1;
        if (isSave) fastBreakSaves += 1;
      } else if (z === 'LW' || z === 'RW') {
        wingFaced += 1;
        if (isSave) wingSaves += 1;
      } else if (z === 'LB_9M' || z === 'CB_9M' || z === 'RB_9M') {
        nineMeterFaced += 1;
        if (isSave) nineMeterSaves += 1;
      } else {
        sixMeterFaced += 1;
        if (isSave) sixMeterSaves += 1;
      }

      if (ev.goalTarget && byGoalCell[ev.goalTarget.cell]) {
        byGoalCell[ev.goalTarget.cell].faced += 1;
        if (isSave) byGoalCell[ev.goalTarget.cell].saves += 1;
        else byGoalCell[ev.goalTarget.cell].goals += 1;
      }

      if (ev.playerId) {
        const cur = shooterMap.get(ev.playerId) ?? {
          saves: 0,
          goals: 0,
          faced: 0,
          cells: {},
        };
        cur.faced += 1;
        if (isSave) cur.saves += 1;
        else cur.goals += 1;
        if (ev.goalTarget) {
          cur.cells[ev.goalTarget.cell] = (cur.cells[ev.goalTarget.cell] ?? 0) + 1;
        }
        shooterMap.set(ev.playerId, cur);
      }
    }

    const shooterMatchups: GoalkeeperComputedStats['shooterMatchups'] = [];
    for (const [shooterId, data] of shooterMap.entries()) {
      const shooter = playerMap.get(shooterId);
      if (!shooter) continue;
      const sLineup = match.lineups.find((l) => l.playerId === shooterId);
      let favCell: GoalTargetCell | null = null;
      let maxCnt = 0;
      for (const [cKey, cnt] of Object.entries(data.cells)) {
        if (cnt > maxCnt) {
          maxCnt = cnt;
          favCell = cKey as GoalTargetCell;
        }
      }
      shooterMatchups.push({
        shooter,
        jerseyNumber: sLineup?.jerseyNumber ?? shooter.defaultJerseyNumber,
        saves: data.saves,
        goals: data.goals,
        faced: data.faced,
        favouriteCell: favCell,
      });
    }

    shooterMatchups.sort((a, b) => b.faced - a.faced);

    result[gk.id] = {
      player: gk,
      jerseyNumber: lineupEntry?.jerseyNumber ?? gk.defaultJerseyNumber,
      saves,
      goalsConceded,
      shotsOnTargetFaced: saves + goalsConceded,
      sevenMeterSaves,
      sevenMeterFaced,
      fastBreakSaves,
      fastBreakFaced,
      wingSaves,
      wingFaced,
      nineMeterSaves,
      nineMeterFaced,
      sixMeterSaves,
      sixMeterFaced,
      byGoalCell,
      shooterMatchups,
    };
  }

  return result;
}

export interface TeamMatchAnalyticsSummary {
  teamId: string;
  goals: number;
  shots: number;
  assists: number;
  h1Goals: number;
  h1Shots: number;
  h2Goals: number;
  h2Shots: number;
  possessions: number;
  technicalFaults: number;
  steals: number;
  blocks: number;
  twoMinCount: number;
  faultBreakdown: Record<TechnicalFaultType, number>;
  phaseBreakdown: Record<AttackPhase, { goals: number; shots: number }>;
  situationBreakdown: Record<NumericalSituation, { goals: number; shots: number }>;
}

export function computeTeamMatchSummary(
  teamId: string,
  events: MatchEvent[]
): TeamMatchAnalyticsSummary {
  const teamEvents = events.filter((e) => e.teamId === teamId);
  let goals = 0;
  let shots = 0;
  let assists = 0;
  let h1Goals = 0;
  let h1Shots = 0;
  let h2Goals = 0;
  let h2Shots = 0;
  let technicalFaults = 0;
  let steals = 0;
  let blocks = 0;
  let twoMinCount = 0;

  const faultBreakdown: Record<TechnicalFaultType, number> = {
    bad_pass: 0,
    catching_error: 0,
    steps: 0,
    double_dribble: 0,
    offensive_foul: 0,
    line_violation: 0,
    passive_play: 0,
  };

  const phaseBreakdown: Record<AttackPhase, { goals: number; shots: number }> = {
    positional: { goals: 0, shots: 0 },
    fast_break: { goals: 0, shots: 0 },
    second_wave: { goals: 0, shots: 0 },
    empty_goal_7v6: { goals: 0, shots: 0 },
  };

  const situationBreakdown: Record<NumericalSituation, { goals: number; shots: number }> = {
    equal: { goals: 0, shots: 0 },
    power_play: { goals: 0, shots: 0 },
    short_handed: { goals: 0, shots: 0 },
    empty_goal: { goals: 0, shots: 0 },
  };

  for (const ev of teamEvents) {
    if (ev.category === 'shot') {
      shots += 1;
      const isGoal = ev.subType === 'goal';
      if (isGoal) goals += 1;
      if (ev.half === 1) {
        h1Shots += 1;
        if (isGoal) h1Goals += 1;
      } else {
        h2Shots += 1;
        if (isGoal) h2Goals += 1;
      }

      if (phaseBreakdown[ev.attackPhase]) {
        phaseBreakdown[ev.attackPhase].shots += 1;
        if (isGoal) phaseBreakdown[ev.attackPhase].goals += 1;
      }
      if (situationBreakdown[ev.situation]) {
        situationBreakdown[ev.situation].shots += 1;
        if (isGoal) situationBreakdown[ev.situation].goals += 1;
      }
    } else if (ev.category === 'attack_other' && ev.subType === 'assist') {
      assists += 1;
    } else if (ev.category === 'technical_fault') {
      technicalFaults += 1;
      const fType = ev.subType as TechnicalFaultType;
      if (faultBreakdown[fType] !== undefined) {
        faultBreakdown[fType] += 1;
      }
    } else if (
      ev.category === 'defence' &&
      (ev.subType === 'steal' || ev.subType === 'interception')
    ) {
      steals += 1;
    } else if (ev.category === 'defence' && ev.subType === 'block') {
      blocks += 1;
    } else if (ev.category === 'discipline' && ev.subType === '2min') {
      twoMinCount += 1;
    }
  }

  // Handball rule: assists can NEVER exceed total goals scored!
  const validAssists = Math.min(assists, goals);

  return {
    teamId,
    goals,
    shots,
    assists: validAssists,
    h1Goals,
    h1Shots,
    h2Goals,
    h2Shots,
    possessions: shots + technicalFaults,
    technicalFaults,
    steals,
    blocks,
    twoMinCount,
    faultBreakdown,
    phaseBreakdown,
    situationBreakdown,
  };
}

/**
 * Computes minute-by-minute goal differential for the Momentum Chart.
 * Positive = Our Team leading, Negative = Opponent leading.
 */
export function computeMomentumSeries(
  ourTeamId: string,
  opponentTeamId: string,
  events: MatchEvent[],
  maxMinute = 60
): Array<{ minute: number; ourScore: number; oppScore: number; diff: number }> {
  const points: Array<{ minute: number; ourScore: number; oppScore: number; diff: number }> = [];
  const goals = events.filter((e) => e.category === 'shot' && e.subType === 'goal');

  for (let m = 0; m <= maxMinute; m += 2) {
    const secLimit = m * 60;
    let ourScore = 0;
    let oppScore = 0;
    for (const g of goals) {
      if (g.matchClockSec <= secLimit) {
        if (g.teamId === ourTeamId) ourScore += 1;
        else if (g.teamId === opponentTeamId) oppScore += 1;
      }
    }
    points.push({
      minute: m,
      ourScore,
      oppScore,
      diff: ourScore - oppScore,
    });
  }
  return points;
}

/**
 * Generates plain-language, ranked tactical insights (§4 Live insights panel).
 */
export function generateLiveInsights(
  match: Match,
  events: MatchEvent[],
  players: Player[],
  currentClockSec: number
): LiveInsight[] {
  const insights: LiveInsight[] = [];
  const playerMap = new Map(players.map((p) => [p.id, p]));

  // 1. Check Opponent Shooter Hot Zones & Placement Patterns (e.g., Opp #7 4/5 from 9m, High-Right)
  const oppShots = events.filter(
    (e) => e.teamId === match.opponentTeamId && e.category === 'shot' && e.playerId
  );
  const byOppPlayer = new Map<string, MatchEvent[]>();
  for (const s of oppShots) {
    const arr = byOppPlayer.get(s.playerId!) ?? [];
    arr.push(s);
    byOppPlayer.set(s.playerId!, arr);
  }

  for (const [pid, pShots] of byOppPlayer.entries()) {
    const p = playerMap.get(pid);
    if (!p) continue;
    const nineMShots = pShots.filter(
      (s) =>
        s.shotOrigin?.zone === 'LB_9M' ||
        s.shotOrigin?.zone === 'CB_9M' ||
        s.shotOrigin?.zone === 'RB_9M'
    );
    const nineMGoals = nineMShots.filter((s) => s.subType === 'goal');
    if (nineMShots.length >= 4 && nineMGoals.length >= 3) {
      const trGoals = nineMGoals.filter((s) => s.goalTarget?.cell === 'TR').length;
      const pct = Math.round((nineMGoals.length / nineMShots.length) * 100);
      insights.push({
        id: `ins-opp-9m-${pid}`,
        severity: 'critical',
        category: 'shooter_pattern',
        headline: `Opp #${p.defaultJerseyNumber} ${p.lastName} (${p.primaryPosition}) ${nineMGoals.length}/${nineMShots.length} · ${pct}% from 9m`,
        detail:
          trGoals >= 2
            ? `${trGoals} of ${nineMGoals.length} goals placed High-Right (TR). Step #3 blocker earlier.`
            : `High conversion from backcourt against our central block.`,
        metricBadge: `${nineMGoals.length}/${nineMShots.length} · ${pct}%`,
        relatedPlayerId: pid,
        relatedTeamId: match.opponentTeamId,
      });
    }
  }

  // 2. Check Our Goalkeeper vs Wing Shots
  const gkStats = computeGoalkeeperStats(match, events, players);
  const ourPrimaryGk = players.find(
    (p) => p.teamId === match.ourTeamId && p.primaryPosition === 'GK'
  );
  if (ourPrimaryGk && gkStats[ourPrimaryGk.id]) {
    const gs = gkStats[ourPrimaryGk.id];
    if (gs.wingFaced >= 4 && gs.wingSaves / gs.wingFaced <= 0.34) {
      const pct = Math.round((gs.wingSaves / gs.wingFaced) * 100);
      insights.push({
        id: `ins-gk-wing-${ourPrimaryGk.id}`,
        severity: 'warning',
        category: 'gk_alert',
        headline: `Our GK #${gs.jerseyNumber} ${ourPrimaryGk.lastName} ${gs.wingSaves}/${gs.wingFaced} · ${pct}% vs wing shots`,
        detail: `Opponent wings converting ${gs.wingFaced - gs.wingSaves}/${gs.wingFaced} into High-Right / Mid-Right corners.`,
        metricBadge: `${gs.wingSaves}/${gs.wingFaced} · ${pct}%`,
        relatedPlayerId: ourPrimaryGk.id,
        relatedTeamId: match.ourTeamId,
      });
    }
  }

  // 3. Check Technical Fault Run in the last 8 minutes (480 seconds)
  const windowStart = Math.max(0, currentClockSec - 480);
  const recentTfs = events.filter(
    (e) =>
      e.category === 'technical_fault' &&
      e.matchClockSec >= windowStart &&
      e.matchClockSec <= currentClockSec
  );
  if (recentTfs.length >= 4) {
    const ourTfs = recentTfs.filter((e) => e.teamId === match.ourTeamId).length;
    insights.push({
      id: 'ins-tf-window',
      severity: ourTfs >= 3 ? 'warning' : 'neutral',
      category: 'turnover_run',
      headline: `${recentTfs.length} technical faults in the last 8 minutes`,
      detail: `${ourTfs} by our attack (${recentTfs.length - ourTfs} by opponent). Slow down 2nd-wave passes.`,
      metricBadge: `${recentTfs.length} TF / 8m`,
      relatedTeamId: match.ourTeamId,
    });
  }

  // 4. Fast-Break Efficiency Highlight
  const ourSummary = computeTeamMatchSummary(match.ourTeamId, events);
  const fb = ourSummary.phaseBreakdown.fast_break;
  if (fb.shots >= 3) {
    const pct = Math.round((fb.goals / fb.shots) * 100);
    insights.push({
      id: 'ins-fb-eff',
      severity: 'positive',
      category: 'phase_efficiency',
      headline: `Our Fast Break: ${fb.goals}/${fb.shots} · ${pct}% conversion`,
      detail: `Generating high-efficiency transition goals off defensive stops.`,
      metricBadge: `${fb.goals}/${fb.shots} · ${pct}%`,
      relatedTeamId: match.ourTeamId,
    });
  }

  return insights;
}
