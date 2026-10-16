import { describe, expect, it } from 'vitest';
import { classifyCourtOrigin } from '../../components/design-system/HandballCourt';
import { classifyGoalTarget } from '../../components/design-system/HandballGoal';
import {
  SEED_EVENTS,
  SEED_MATCHES,
  SEED_PLAYERS,
} from '../../data/seedData';
import { formatSampleRate } from '../../i18n/translations';
import {
  computeGoalkeeperStats,
  computePlayerMatchStats,
  deriveCourtStateAtClock,
  generateLiveInsights,
} from '../analyticsEngine';

describe('Handball Analytics — 3-Tap Shot Flow & Engine Verification', () => {
  it('Step 1: classifies 20x40m court coordinates into standard IHF zones and suggests on-court position', () => {
    // Left Back 9m shot
    const lb9m = classifyCourtOrigin(4.8, 10.5);
    expect(lb9m.zone).toBe('LB_9M');
    expect(lb9m.suggestedPosition).toBe('LB');

    // Left Wing shot
    const lw = classifyCourtOrigin(2.1, 3.2);
    expect(lw.zone).toBe('LW');
    expect(lw.suggestedPosition).toBe('LW');

    // 7m penalty spot
    const pen7m = classifyCourtOrigin(10.0, 7.0);
    expect(pen7m.zone).toBe('7M');

    // 6m Pivot centre
    const pv6m = classifyCourtOrigin(10.0, 6.0);
    expect(pv6m.zone).toBe('6M_CENTRE');
    expect(pv6m.suggestedPosition).toBe('PV');

    // Empty net from own half
    const emptyNet = classifyCourtOrigin(10.0, 15.8);
    expect(emptyNet.zone).toBe('EMPTY_NET_OWN_HALF');
    expect(emptyNet.suggestedPosition).toBe('GK');
  });

  it('Step 2: classifies 3x2m goal target into 3x3 cells, posts, crossbar, and wide/high misses', () => {
    const highRight = classifyGoalTarget(0.85, 0.16);
    expect(highRight.cell).toBe('TR');

    const lowLeft = classifyGoalTarget(0.15, 0.85);
    expect(lowLeft.cell).toBe('BL');

    const leftPost = classifyGoalTarget(0.0, 0.5);
    expect(leftPost.cell).toBe('POST_L');
    expect(leftPost.suggestedOutcome).toBe('post');

    const wideLeft = classifyGoalTarget(-0.15, 0.5);
    expect(wideLeft.cell).toBe('WIDE_L');
    expect(wideLeft.suggestedOutcome).toBe('missed_wide');
  });

  it('Enforces Sample-Size Formatting & Slovenian decimal/spacing conventions', () => {
    const zeroAttempts = formatSampleRate(0, 0, 'en');
    expect(zeroAttempts.hasData).toBe(false);
    expect(zeroAttempts.combinedText).toBe('—');

    const lowSample = formatSampleRate(2, 3, 'en');
    expect(lowSample.isLowSample).toBe(true);
    expect(lowSample.combinedText).toBe('2/3 · 67%');

    const slSample = formatSampleRate(5, 7, 'sl', 1);
    expect(slSample.isLowSample).toBe(false);
    expect(slSample.combinedText).toBe('5/7 · 71,4 %');
  });

  it('Derives active 2-minute suspension countdowns, GK stats, and Live Insights accurately', () => {
    const match = SEED_MATCHES[0];
    const events = SEED_EVENTS[match.id];
    const clockAt48m20s = 2900;

    const courtStates = deriveCourtStateAtClock(
      match,
      events,
      clockAt48m20s,
      SEED_PLAYERS
    );
    const velState = courtStates['team-velenje'];
    expect(velState.activeSuspensions.length).toBe(1);
    expect(velState.activeSuspensions[0].jerseyNumber).toBe(55);
    expect(velState.activeSuspensions[0].remainingSec).toBe(55);

    const pStats = computePlayerMatchStats(
      match,
      events,
      SEED_PLAYERS,
      clockAt48m20s
    );
    expect(pStats['vel-p7'].goals).toBeGreaterThanOrEqual(5);

    const gkStats = computeGoalkeeperStats(match, events, SEED_PLAYERS);
    expect(gkStats['cel-p1'].shotsOnTargetFaced).toBeGreaterThan(10);

    const insights = generateLiveInsights(
      match,
      events,
      SEED_PLAYERS,
      clockAt48m20s
    );
    expect(insights.length).toBeGreaterThanOrEqual(3);
    expect(insights.some((i) => i.headline.includes('Sokolič'))).toBe(true);
  });

  it('Guarantees team assists can NEVER exceed total goals', () => {
    const match = SEED_MATCHES[0];
    const testEvents = [
      {
        id: 'ev-1',
        matchId: match.id,
        teamId: 'team-celje',
        playerId: 'cel-p9',
        half: 1 as const,
        matchClockSec: 100,
        createdAtMs: 1000,
        authorAnalyst: 'Test',
        category: 'shot' as const,
        subType: 'goal' as const,
        attackPhase: 'positional' as const,
        situation: 'equal' as const,
      },
      {
        id: 'ev-2',
        matchId: match.id,
        teamId: 'team-celje',
        playerId: 'cel-p19',
        half: 1 as const,
        matchClockSec: 105,
        createdAtMs: 1005,
        authorAnalyst: 'Test',
        category: 'attack_other' as const,
        subType: 'assist' as const,
        attackPhase: 'positional' as const,
        situation: 'equal' as const,
      },
      {
        id: 'ev-3',
        matchId: match.id,
        teamId: 'team-celje',
        playerId: 'cel-p11',
        half: 1 as const,
        matchClockSec: 110,
        createdAtMs: 1010,
        authorAnalyst: 'Test',
        category: 'attack_other' as const,
        subType: 'assist' as const,
        attackPhase: 'positional' as const,
        situation: 'equal' as const,
      },
    ];

    const pStats = computePlayerMatchStats(match, testEvents, SEED_PLAYERS, 200);
    const totalAssists = Object.values(pStats)
      .filter((ps) => ps.player.teamId === 'team-celje')
      .reduce((sum, ps) => sum + ps.assists, 0);

    // Celje has 1 goal, so total assists must be <= 1!
    expect(totalAssists).toBeLessThanOrEqual(1);
  });
});
