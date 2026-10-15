import { beforeEach, describe, expect, it } from 'vitest';
import { createMatchStore, createSavedMatch } from './matchStore';
import type { MatchSetup, Player, Slot, TeamSide } from '../domain/types';
import { computePlayerLines, deriveGame, numericalStateString } from '../domain/selectors';

function makeTeam(side: TeamSide, name: string): { players: Player[]; lineup: Record<Slot, string> } {
  const positions: Slot[] = ['GK', 'LW', 'LB', 'CB', 'RB', 'RW', 'PV'];
  const players: Player[] = [];
  const lineup = {} as Record<Slot, string>;
  positions.forEach((pos, idx) => {
    const id = `${side}-${pos}`;
    players.push({ id, teamSide: side, name: `${name} ${pos}`, number: idx + 1, position: pos });
    lineup[pos] = id;
  });
  players.push({ id: `${side}-BENCH-LW`, teamSide: side, name: `${name} Bench LW`, number: 21, position: 'LW' });
  players.push({ id: `${side}-BENCH-CB`, teamSide: side, name: `${name} Bench CB`, number: 22, position: 'CB' });
  return { players, lineup };
}

function makeSetup(): MatchSetup {
  const home = makeTeam('home', 'Home');
  const away = makeTeam('away', 'Away');
  return {
    home: { side: 'home', name: 'Home', shortName: 'HOM', color: '#2563EB', players: home.players },
    away: { side: 'away', name: 'Away', shortName: 'AWY', color: '#F97316', players: away.players },
    startingLineups: { home: { ...home.lineup }, away: { ...away.lineup } },
  };
}

function freshStore() {
  const store = createMatchStore();
  store.getState().loadMatch(createSavedMatch(makeSetup()));
  return store;
}

describe('match store', () => {
  let store: ReturnType<typeof createMatchStore>;

  beforeEach(() => {
    store = freshStore();
  });

  it('starts the clock with a period start event', () => {
    store.getState().startClock();
    const events = store.getState().match!.events;
    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe('PERIOD_START');
    expect(store.getState().match!.clock.running).toBe(true);
  });

  it('ticks the continuous clock and stops at half time', () => {
    store.getState().startClock();
    store.getState().tick(5 * 60 * 1000);
    expect(store.getState().match!.clock.elapsedMs).toBe(5 * 60 * 1000);
    store.getState().tick(30 * 60 * 1000);
    const clock = store.getState().match!.clock;
    expect(clock.elapsedMs).toBe(30 * 60 * 1000);
    expect(clock.running).toBe(false);
    expect(clock.halfTime).toBe(true);
  });

  it('logs a goal shot with vector, xG and possession context', () => {
    store.getState().startClock();
    store.getState().logShot({
      shooterId: 'home-LB',
      teamSide: 'home',
      courtX: 2,
      courtY: 9,
      goalX: 1.1,
      goalY: 1.5,
      outcome: 'GOAL',
      technique: 'JUMP',
    });
    const match = store.getState().match!;
    const shot = match.events.find((e) => e.type === 'SHOT')!;
    expect(shot.outcome).toBe('GOAL');
    expect(shot.zone).toBe('C9M');
    expect(shot.xg).toBeGreaterThan(0);
    expect(shot.xgot).toBeGreaterThan(0);
    expect(shot.distanceM).toBeCloseTo(Math.hypot(2, 9), 4);
    expect(shot.numericalState).toBe('6v6');
    expect(shot.possessionId).toBe(1);
    expect(shot.gkPlayerId).toBe('away-GK');

    const game = deriveGame(match.setup, match.events, match.clock.elapsedMs);
    expect(game.score.home).toBe(1);

    store.getState().logShot({
      shooterId: 'away-CB',
      teamSide: 'away',
      courtX: -1,
      courtY: 10,
      goalX: -0.5,
      goalY: 0.5,
      outcome: 'SAVE',
    });
    const match2 = store.getState().match!;
    const shots = match2.events.filter((e) => e.type === 'SHOT');
    expect(shots[1]!.possessionId).toBe(2);
  });

  it('tracks active possession team through terminal events', () => {
    store.getState().startClock();
    store.getState().logShot({
      shooterId: 'home-PV', teamSide: 'home', courtX: 0, courtY: 6, goalX: 0, goalY: 1, outcome: 'GOAL',
    });
    store.getState().logShot({
      shooterId: 'away-RW', teamSide: 'away', courtX: 8, courtY: 2, outcome: 'WIDE',
    });
    const match = store.getState().match!;
    const game = deriveGame(match.setup, match.events, match.clock.elapsedMs);
    expect(game.possessions.map((p) => p.teamSide)).toEqual(['home', 'away']);
  });

  it('escalates three suspensions into an automatic red card', () => {
    store.getState().startClock();
    store.getState().logSuspension('home', 'home-CB');
    store.getState().logSuspension('home', 'home-CB');
    store.getState().logSuspension('home', 'home-CB');
    const match = store.getState().match!;
    const reds = match.events.filter((e) => e.type === 'RED_CARD');
    expect(reds).toHaveLength(1);
    const game = deriveGame(match.setup, match.events, match.clock.elapsedMs);
    expect(game.redCardedIds.has('home-CB')).toBe(true);
    expect(game.suspensionCounts.get('home-CB')).toBe(3);
  });

  it('switches numerical state to 6v5 during a suspension and back after expiry', () => {
    store.getState().startClock();
    store.getState().logSuspension('home', 'home-CB');
    const match = store.getState().match!;
    const game = deriveGame(match.setup, match.events, match.clock.elapsedMs);
    expect(game.activeSuspensions).toHaveLength(1);
    expect(numericalStateString(game, 'home')).toBe('5v6');
    expect(numericalStateString(game, 'away')).toBe('6v5');

    store.getState().tick(121 * 1000);
    const game2 = deriveGame(match.setup, match.events, store.getState().match!.clock.elapsedMs);
    expect(game2.activeSuspensions).toHaveLength(0);
    expect(numericalStateString(game2, 'home')).toBe('6v6');
  });

  it('tags 7v6 empty net state and flags shots into the empty goal', () => {
    store.getState().startClock();
    store.getState().toggleEmptyNet('home', 'home-BENCH-CB');
    const match = store.getState().match!;
    const game = deriveGame(match.setup, match.events, match.clock.elapsedMs);
    expect(game.emptyNet.home).toBe(true);
    expect(game.extraAttacker.home).toBe('home-BENCH-CB');

    store.getState().logShot({
      shooterId: 'home-LW', teamSide: 'home', courtX: 8, courtY: 3, goalX: 1, goalY: 1, outcome: 'GOAL',
    });
    const homeShot = store.getState().match!.events.find((e) => e.type === 'SHOT')!;
    expect(homeShot.numericalState).toContain('7v6_EMPTY_NET');
    expect(homeShot.emptyNet).toBe(false);

    store.getState().logShot({
      shooterId: 'away-CB', teamSide: 'away', courtX: 0, courtY: 12, outcome: 'GOAL',
    });
    const awayShot = store.getState().match!.events.filter((e) => e.type === 'SHOT')[1]!;
    expect(awayShot.emptyNet).toBe(true);
    expect(awayShot.xg).toBeGreaterThan(0.35);
  });

  it('accounting for substitutions splits playing time across stints', () => {
    store.getState().startClock();
    store.getState().tick(60 * 1000);
    store.getState().substitution('home', 'LW', 'home-BENCH-LW');
    store.getState().tick(60 * 1000);
    const match = store.getState().match!;
    const game = deriveGame(match.setup, match.events, match.clock.elapsedMs);
    const lines = computePlayerLines(game, match.events, match.clock.elapsedMs);
    expect(lines.get('home-LW')!.playingMs).toBe(60 * 1000);
    expect(lines.get('home-BENCH-LW')!.playingMs).toBe(60 * 1000);
  });

  it('enforces timeout limits (max 2 per half, 3 per match)', () => {
    store.getState().startClock();
    expect(store.getState().callTimeout('home')).toBe(true);
    store.getState().endTimeout();
    expect(store.getState().callTimeout('home')).toBe(true);
    store.getState().endTimeout();
    expect(store.getState().callTimeout('home')).toBe(false);
    store.getState().tick(30 * 60 * 1000);
    store.getState().startSecondHalf();
    expect(store.getState().callTimeout('home')).toBe(true);
    store.getState().endTimeout();
    expect(store.getState().callTimeout('home')).toBe(false);
  });

  it('runs the 60-second timeout countdown', () => {
    store.getState().startClock();
    store.getState().callTimeout('away');
    expect(store.getState().match!.activeTimeout).not.toBeNull();
    store.getState().tick(61 * 1000);
    expect(store.getState().match!.activeTimeout).toBeNull();
  });

  it('supports undo and redo of logged events', () => {
    store.getState().startClock();
    store.getState().logShot({ shooterId: 'home-LB', teamSide: 'home', courtX: 3, courtY: 9, goalX: 1, goalY: 1, outcome: 'GOAL' });
    expect(store.getState().match!.events).toHaveLength(2);
    store.getState().undo();
    expect(store.getState().match!.events).toHaveLength(1);
    const game = deriveGame(store.getState().match!.setup, store.getState().match!.events, 0);
    expect(game.score.home).toBe(0);
    store.getState().redo();
    expect(store.getState().match!.events).toHaveLength(2);
    const game2 = deriveGame(store.getState().match!.setup, store.getState().match!.events, 0);
    expect(game2.score.home).toBe(1);
  });

  it('recomputes xG/xGOT when the toast modify bar patches the last event', () => {
    store.getState().startClock();
    store.getState().logShot({ shooterId: 'home-RB', teamSide: 'home', courtX: 4, courtY: 10, outcome: 'SAVE' });
    const shot = store.getState().match!.events.find((e) => e.type === 'SHOT')!;
    expect(shot.xgot).toBe(0);
    store.getState().modifyEvent(shot.id, { outcome: 'GOAL', goalX: 1.3, goalY: 1.8 });
    const patched = store.getState().match!.events.find((e) => e.type === 'SHOT')!;
    expect(patched.outcome).toBe('GOAL');
    expect(patched.xgot).toBeGreaterThan(0);
    store.getState().modifyEvent(shot.id, { contested: true });
    const patched2 = store.getState().match!.events.find((e) => e.type === 'SHOT')!;
    expect(patched2.contested).toBe(true);
  });

  it('gravity-checks the fast throw-off wave heuristic', () => {
    store.getState().startClock();
    store.getState().logShot({ shooterId: 'home-PV', teamSide: 'home', courtX: 0, courtY: 6, goalX: 0, goalY: 1, outcome: 'GOAL' });
    store.getState().tick(2000);
    store.getState().logShot({ shooterId: 'away-CB', teamSide: 'away', courtX: 0, courtY: 9, goalX: 0.3, goalY: 0.4, outcome: 'SAVE' });
    const match = store.getState().match!;
    const game = deriveGame(match.setup, match.events, match.clock.elapsedMs);
    const second = game.possessions[1]!;
    expect(second.wave).toBe('WAVE_3');
  });
});
