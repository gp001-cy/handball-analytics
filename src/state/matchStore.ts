import { createStore } from 'zustand/vanilla';
import type {
  Id,
  MatchEvent,
  MatchSetup,
  SavedMatch,
  ShotOutcome,
  ShotTechnique,
  Slot,
  TeamSide,
  TurnoverCode,
} from '../domain/types';
import { MATCH_MS, PERIOD_MS, SUSPENSION_MS, TIMEOUT_MS, makeId } from '../domain/types';
import { expectedGoals, expectedGoalsOnTarget } from '../domain/xg';
import { classifyZone } from '../domain/zones';
import { courtToGoalVector } from '../domain/court';
import {
  deriveGame,
  numericalStateString,
  onCourtPlayerIds,
  type GameDerivation,
} from '../domain/selectors';

export interface ShotInput {
  shooterId: Id;
  teamSide: TeamSide;
  courtX: number;
  courtY: number;
  goalX?: number;
  goalY?: number;
  outcome: ShotOutcome;
  technique?: ShotTechnique;
  contested?: boolean;
  fastBreak?: boolean;
  sevenMeter?: boolean;
  reboundRecovered?: boolean;
  assistPlayerId?: Id;
  defenderId?: Id;
  callCode?: string;
}

export interface MatchStoreState {
  match: SavedMatch | null;
  redoStack: MatchEvent[];
  selectedTeamSide: TeamSide;
  selectedPlayerId: Id | null;
  pendingSlot: Slot | null;
  toastEventId: Id | null;
  showTimeoutOverlay: boolean;
  loaded: boolean;

  loadMatch: (m: SavedMatch) => void;
  closeMatch: () => void;
  startClock: () => void;
  pauseClock: () => void;
  tick: (dtMs: number) => void;
  startSecondHalf: () => void;
  endMatch: () => void;
  logShot: (input: ShotInput) => MatchEvent | null;
  logTurnover: (code: TurnoverCode, teamSide: TeamSide, playerId?: Id, defenderId?: Id) => MatchEvent | null;
  logStopFoul: (teamSide: TeamSide, playerId: Id) => void;
  logChargeDrawn: (teamSide: TeamSide, playerId: Id) => void;
  logSevenMAwarded: (teamSide: TeamSide, playerId: Id) => void;
  substitution: (teamSide: TeamSide, slot: Slot, playerInId: Id) => void;
  toggleEmptyNet: (teamSide: TeamSide, extraPlayerId?: Id) => void;
  logSuspension: (teamSide: TeamSide, playerId: Id) => void;
  logDirectRed: (teamSide: TeamSide, playerId: Id) => void;
  callTimeout: (teamSide: TeamSide) => boolean;
  endTimeout: () => void;
  openTimeoutOverlay: () => void;
  closeTimeoutOverlay: () => void;
  armATO: () => void;
  modifyEvent: (eventId: Id, patch: Partial<MatchEvent>) => void;
  selectPlayer: (playerId: Id | null) => void;
  selectTeam: (side: TeamSide) => void;
  setPendingSlot: (slot: Slot | null) => void;
  clearToast: () => void;
  undo: () => void;
  redo: () => void;
  setNotes: (notes: string) => void;
  setVideoOffsetMs: (ms: number) => void;
}

function emptyTimeouts() {
  return {
    home: { remaining: 3, usedPeriod1: 0, usedPeriod2: 0 },
    away: { remaining: 3, usedPeriod1: 0, usedPeriod2: 0 },
  };
}

export function createSavedMatch(setup: MatchSetup): SavedMatch {
  return {
    id: makeId('match'),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    setup,
    events: [],
    clock: { period: 1, elapsedMs: 0, running: false, halfTime: false, finished: false },
    timeouts: emptyTimeouts(),
    activeTimeout: null,
    atoArmed: false,
    notes: '',
    videoOffsetMs: 0,
  };
}

export function createMatchStore() {
  return createStore<MatchStoreState>()((set, get) => {
    const derive = (match: SavedMatch): GameDerivation =>
      deriveGame(match.setup, match.events, match.clock.elapsedMs);

    const commit = (match: SavedMatch, events: MatchEvent[], opts?: { toast?: Id | null; clearAto?: boolean }): SavedMatch => ({
      ...match,
      events,
      updatedAt: Date.now(),
      atoArmed: opts?.clearAto ? false : match.atoArmed,
    });

    const appendEvent = (
      partial: Omit<MatchEvent, 'id' | 'seq' | 'clockMs' | 'wallMs' | 'period' | 'possessionId'>,
      opts?: { toast?: boolean; clearAto?: boolean },
    ): MatchEvent | null => {
      const state = get();
      const match = state.match;
      if (!match) return null;
      const game = derive(match);
      const maxSeq = match.events.reduce((acc, e) => Math.max(acc, e.seq), 0);
      const side = partial.teamSide;
      const event: MatchEvent = {
        ...partial,
        id: makeId('ev'),
        seq: maxSeq + 1,
        clockMs: match.clock.elapsedMs,
        wallMs: Date.now(),
        period: match.clock.period,
        possessionId: game.currentPossessionId,
        numericalState: partial.numericalState ?? numericalStateString(game, side),
        scoreHome: game.score.home,
        scoreAway: game.score.away,
      };
      if (game.emptyNet[side === 'home' ? 'away' : 'home'] && partial.type === 'SHOT') {
        event.emptyNet = true;
      }
      if (match.atoArmed && (event.type === 'SHOT' || event.type === 'TURNOVER')) {
        event.tags = [...(event.tags ?? []), 'ATO'];
      }
      const taggedAto = event.tags?.includes('ATO') ?? false;
      const events = [...match.events, event];
      const nextMatch = commit(match, events, {
        toast: opts?.toast ? event.id : null,
        clearAto: taggedAto,
      });
      set({ match: nextMatch, redoStack: [], toastEventId: opts?.toast ? event.id : null });
      return event;
    };

    const buildShotEvent = (input: ShotInput, match: SavedMatch, game: GameDerivation): Omit<MatchEvent, 'id' | 'seq' | 'clockMs' | 'wallMs' | 'period' | 'possessionId'> | null => {
      const defenderSide = input.teamSide === 'home' ? 'away' : 'home';
      const gkId = game.emptyNet[defenderSide] ? undefined : game.activeLineup[defenderSide].GK ?? undefined;
      const vector = courtToGoalVector({ x: input.courtX, y: input.courtY });
      const shootingIntoEmptyNet = game.emptyNet[defenderSide];
      const zone = classifyZone(input.courtX, input.courtY, {
        fastBreak: input.fastBreak,
        sevenMeter: input.sevenMeter,
      });
      const xg = expectedGoals({
        courtX: input.courtX,
        courtY: input.courtY,
        technique: input.technique,
        contested: input.contested,
        fastBreak: input.fastBreak,
        emptyNet: shootingIntoEmptyNet,
        sevenMeter: input.sevenMeter,
      });
      const goal = input.goalX != null && input.goalY != null ? { x: input.goalX, y: input.goalY } : null;
      const xgot = expectedGoalsOnTarget({ xg, goal, outcome: input.outcome });

      return {
        type: 'SHOT',
        teamSide: input.teamSide,
        playerId: input.shooterId,
        assistPlayerId: input.assistPlayerId,
        defenderId: input.defenderId,
        gkPlayerId: gkId,
        outcome: input.outcome,
        technique: input.technique,
        contested: input.contested,
        courtX: input.courtX,
        courtY: input.courtY,
        goalX: input.goalX,
        goalY: input.goalY,
        distanceM: vector.distanceM,
        angleRad: vector.angleRad,
        zone,
        xg,
        xgot: input.outcome === 'WIDE' ? 0 : xgot,
        fastBreak: input.fastBreak,
        sevenMeter: input.sevenMeter,
        reboundRecovered: input.reboundRecovered,
        emptyNet: shootingIntoEmptyNet,
        callCode: input.callCode,
      };
    };

    return {
      match: null,
      redoStack: [],
      selectedTeamSide: 'home',
      selectedPlayerId: null,
      pendingSlot: null,
      toastEventId: null,
      showTimeoutOverlay: false,
      loaded: false,

      loadMatch: (m) => set({ match: m, redoStack: [], selectedPlayerId: null, pendingSlot: null, toastEventId: null, loaded: true }),

      closeMatch: () => set({ match: null, loaded: false, selectedPlayerId: null, toastEventId: null }),

      startClock: () => {
        const match = get().match;
        if (!match || match.clock.finished || match.activeTimeout) return;
        const needsPeriodStart = !match.clock.running && match.clock.elapsedMs === 0 && match.clock.period === 1;
        set({ match: { ...match, clock: { ...match.clock, running: true }, updatedAt: Date.now() } });
        if (needsPeriodStart) {
          appendEvent({ type: 'PERIOD_START', teamSide: 'home' });
        }
      },

      pauseClock: () => {
        const match = get().match;
        if (!match) return;
        set({ match: { ...match, clock: { ...match.clock, running: false }, updatedAt: Date.now() } });
      },

      tick: (dtMs) => {
        const match = get().match;
        if (!match) return;
        let next = match;
        let changed = false;

        if (next.activeTimeout) {
          const remaining = next.activeTimeout.remainingMs - dtMs;
          next = {
            ...next,
            activeTimeout: remaining <= 0 ? null : { ...next.activeTimeout, remainingMs: remaining },
          };
          changed = true;
        }

        if (next.clock.running && !next.clock.finished) {
          const clock = { ...next.clock };
          clock.elapsedMs = Math.min(MATCH_MS, clock.elapsedMs + dtMs);
          if (clock.period === 1 && clock.elapsedMs >= PERIOD_MS) {
            clock.elapsedMs = PERIOD_MS;
            clock.running = false;
            clock.halfTime = true;
          } else if (clock.period === 2 && clock.elapsedMs >= MATCH_MS) {
            clock.elapsedMs = MATCH_MS;
            clock.running = false;
            clock.finished = true;
          }
          next = { ...next, clock };
          changed = true;
        }

        if (changed) {
          set({ match: { ...next, updatedAt: Date.now() } });
        }
      },

      startSecondHalf: () => {
        const match = get().match;
        if (!match || match.clock.period !== 1 || match.clock.finished) return;
        const clock = { ...match.clock, period: 2 as const, elapsedMs: Math.max(match.clock.elapsedMs, PERIOD_MS), halfTime: false, running: true };
        set({ match: { ...match, clock, updatedAt: Date.now() } });
        appendEvent({ type: 'PERIOD_START', teamSide: 'away' });
      },

      endMatch: () => {
        const match = get().match;
        if (!match) return;
        const clock = { ...match.clock, running: false, finished: true, elapsedMs: match.clock.period === 2 ? MATCH_MS : match.clock.elapsedMs };
        set({ match: { ...match, clock, updatedAt: Date.now() } });
        appendEvent({ type: 'MATCH_END', teamSide: 'home' });
      },

      logShot: (input) => {
        const match = get().match;
        if (!match) return null;
        const game = derive(match);
        const partial = buildShotEvent(input, match, game);
        if (!partial) return null;
        return appendEvent(partial, { toast: true, clearAto: true });
      },

      logTurnover: (code, teamSide, playerId, defenderId) => {
        const match = get().match;
        if (!match) return null;
        return appendEvent(
          {
            type: 'TURNOVER',
            teamSide,
            playerId,
            defenderId,
            turnoverCode: code,
          },
          { toast: true, clearAto: true },
        );
      },

      logStopFoul: (teamSide, playerId) => {
        appendEvent({ type: 'DEF_STOP_FOUL', teamSide, playerId }, { toast: true });
      },

      logChargeDrawn: (teamSide, playerId) => {
        appendEvent({ type: 'DEF_CHARGE_DRAWN', teamSide, playerId }, { toast: true });
      },

      logSevenMAwarded: (teamSide, playerId) => {
        appendEvent({ type: 'SEVEN_M_AWARDED', teamSide, playerId }, { toast: true, clearAto: true });
      },

      substitution: (teamSide, slot, playerInId) => {
        const match = get().match;
        if (!match) return;
        const game = derive(match);
        const outId = game.activeLineup[teamSide][slot] ?? undefined;
        if (outId === playerInId) return;
        const inPlayer = match.setup[teamSide].players.find((p) => p.id === playerInId);
        if (!inPlayer) return;
        appendEvent({
          type: 'SUBSTITUTION',
          teamSide,
          playerId: outId,
          playerInId,
          slot,
        });
        set({ pendingSlot: null });
        selectAfter();
      },

      toggleEmptyNet: (teamSide, extraPlayerId) => {
        const match = get().match;
        if (!match) return;
        const game = derive(match);
        if (!game.emptyNet[teamSide]) {
          if (!extraPlayerId) return;
          appendEvent({ type: 'EMPTY_NET_ON', teamSide, playerInId: extraPlayerId });
        } else {
          appendEvent({ type: 'EMPTY_NET_OFF', teamSide });
        }
      },

      logSuspension: (teamSide, playerId) => {
        const match = get().match;
        if (!match) return;
        const gameBefore = derive(match);
        const priorCount = gameBefore.suspensionCounts.get(playerId) ?? 0;
        const endMs = match.clock.elapsedMs + SUSPENSION_MS;
        appendEvent({
          type: 'SUSPENSION_2MIN',
          teamSide,
          playerId,
          suspensionEndMs: endMs,
        });
        if (priorCount + 1 >= 3) {
          appendEvent({ type: 'RED_CARD', teamSide, playerId });
        }
      },

      logDirectRed: (teamSide, playerId) => {
        appendEvent({ type: 'RED_CARD', teamSide, playerId });
      },

      callTimeout: (teamSide) => {
        const match = get().match;
        if (!match) return false;
        const t = match.timeouts[teamSide];
        const periodKey = match.clock.period === 1 ? 'usedPeriod1' : 'usedPeriod2';
        if (match.clock.finished || match.activeTimeout) return false;
        if (t.remaining <= 0 || t[periodKey] >= 2) return false;
        const timeouts = {
          ...match.timeouts,
          [teamSide]: {
            ...t,
            remaining: t.remaining - 1,
            [periodKey]: t[periodKey] + 1,
          },
        };
        set({
          match: {
            ...match,
            timeouts,
            activeTimeout: { teamSide, remainingMs: TIMEOUT_MS },
            clock: { ...match.clock, running: false },
            updatedAt: Date.now(),
          },
          showTimeoutOverlay: true,
        });
        appendEvent({ type: 'TIMEOUT', teamSide });
        return true;
      },

      endTimeout: () => {
        const match = get().match;
        if (!match) return;
        set({ match: { ...match, activeTimeout: null, updatedAt: Date.now() }, showTimeoutOverlay: false });
      },

      openTimeoutOverlay: () => set({ showTimeoutOverlay: true }),
      closeTimeoutOverlay: () => set({ showTimeoutOverlay: false }),

      armATO: () => {
        const match = get().match;
        if (!match) return;
        set({ match: { ...match, atoArmed: !match.atoArmed } });
      },

      modifyEvent: (eventId, patch) => {
        const match = get().match;
        if (!match) return;
        const events = match.events.map((ev) => {
          if (ev.id !== eventId) return ev;
          const merged: MatchEvent = { ...ev, ...patch };
          if (merged.type === 'SHOT' && merged.courtX != null && merged.courtY != null) {
            const game = derive({ ...match, events: match.events });
            const defenderSide = merged.teamSide === 'home' ? 'away' : 'home';
            const shootingIntoEmptyNet = merged.emptyNet ?? game.emptyNet[defenderSide];
            const zone = classifyZone(merged.courtX, merged.courtY, {
              fastBreak: merged.fastBreak,
              sevenMeter: merged.sevenMeter,
            });
            const xg = expectedGoals({
              courtX: merged.courtX,
              courtY: merged.courtY,
              technique: merged.technique,
              contested: merged.contested,
              fastBreak: merged.fastBreak,
              emptyNet: shootingIntoEmptyNet,
              sevenMeter: merged.sevenMeter,
            });
            const goal = merged.goalX != null && merged.goalY != null ? { x: merged.goalX, y: merged.goalY } : null;
            merged.xg = xg;
            merged.zone = zone;
            merged.emptyNet = shootingIntoEmptyNet;
            merged.xgot = expectedGoalsOnTarget({ xg, goal, outcome: merged.outcome ?? 'GOAL' });
            if (merged.teamSide === 'home' || merged.teamSide === 'away') {
              const gkId = game.emptyNet[defenderSide] ? undefined : game.activeLineup[defenderSide].GK ?? undefined;
              merged.gkPlayerId = gkId;
            }
          }
          return merged;
        });
        set({ match: { ...match, events, updatedAt: Date.now() } });
      },

      selectPlayer: (playerId) => set({ selectedPlayerId: playerId, pendingSlot: null }),
      selectTeam: (side) => set({ selectedTeamSide: side, selectedPlayerId: null, pendingSlot: null }),
      setPendingSlot: (slot) => set({ pendingSlot: slot }),
      clearToast: () => set({ toastEventId: null }),

      undo: () => {
        const { match, redoStack, toastEventId } = get();
        if (!match || match.events.length === 0) return;
        const events = match.events.slice(0, -1);
        const removed = match.events[match.events.length - 1] as MatchEvent;
        set({
          match: { ...match, events, updatedAt: Date.now() },
          redoStack: [...redoStack, removed],
          toastEventId: toastEventId === removed.id ? null : toastEventId,
        });
      },

      redo: () => {
        const { match, redoStack } = get();
        if (!match || redoStack.length === 0) return;
        const stack = [...redoStack];
        const ev = stack.pop() as MatchEvent;
        set({
          match: { ...match, events: [...match.events, ev], updatedAt: Date.now() },
          redoStack: stack,
        });
      },

      setNotes: (notes) => {
        const match = get().match;
        if (!match) return;
        set({ match: { ...match, notes, updatedAt: Date.now() } });
      },

      setVideoOffsetMs: (ms) => {
        const match = get().match;
        if (!match) return;
        set({ match: { ...match, videoOffsetMs: ms, updatedAt: Date.now() } });
      },
    };

    function selectAfter() {
      const state = get();
      const match = state.match;
      if (!match) return;
      const game = derive(match);
      const ids = new Set(onCourtPlayerIds(game, state.selectedTeamSide));
      if (state.selectedPlayerId && !ids.has(state.selectedPlayerId)) {
        set({ selectedPlayerId: null });
      }
    }
  });
}

export const matchStore = createMatchStore();

export type MatchStore = ReturnType<typeof createMatchStore>;

export function getGame(state: MatchStoreState): GameDerivation | null {
  if (!state.match) return null;
  return deriveGame(state.match.setup, state.match.events, state.match.clock.elapsedMs);
}
