import React, { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { radius, spacing, theme } from '../theme';
import { pulse } from '../haptics';
import type { MatchStoreState } from '../../state/matchStore';
import type { GameDerivation, PlayerLine } from '../../domain/selectors';
import { momentumSeries, otherSide, playerName } from '../../domain/selectors';
import { SLOTS, type Id } from '../../domain/types';

interface Props {
  state: MatchStoreState;
  game: GameDerivation;
  lines: Map<Id, PlayerLine>;
}

export default function TimeoutView({ state, game, lines }: Props) {
  const match = state.match;

  useEffect(() => {
    if (!match) return;
    if (state.showTimeoutOverlay && !match.activeTimeout) {
      state.closeTimeoutOverlay();
    }
  }, [state, match]);

  const momentum = useMemo(() => {
    const events = match?.events ?? [];
    const elapsedMs = match?.clock.elapsedMs ?? 0;
    return momentumSeries(events, Math.max(0, elapsedMs - 10 * 60 * 1000), elapsedMs, 60 * 1000);
  }, [match]);
  const plusMinus = useMemo(
    () => (match ? computePlusMinus(game, match.events) : new Map<Id, number>()),
    [game, match],
  );

  if (!match || !state.showTimeoutOverlay) return null;
  const active = match.activeTimeout;
  const secondsLeft = active ? Math.ceil(active.remainingMs / 1000) : 0;
  const side = active?.teamSide ?? 'home';
  const color = side === 'home' ? theme.home : theme.away;

  const defendersSide = otherSide(side);
  const gk = game.emptyNet[defendersSide] ? null : game.activeLineup[defendersSide].GK;
  const gkLine = gk ? lines.get(gk) : null;

  const lastDiff = momentum.length > 0 ? momentum[momentum.length - 1].diff : 0;

  return (
    <View style={styles.overlay}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color }]}>
            {match.setup[side].name} TIME-OUT
          </Text>
          <Text style={styles.subtitle}>
            {match.clock.period === 1 ? '1st half' : '2nd half'} · press START after the break
          </Text>
        </View>
        <View style={styles.clockBox}>
          <Text style={styles.clockValue}>{secondsLeft}</Text>
          <Text style={styles.clockUnit}>sec</Text>
        </View>
        <Pressable
          style={styles.closeBtn}
          onPress={() => {
            pulse('tap');
            state.closeTimeoutOverlay();
          }}
        >
          <Text style={styles.closeText}>CLOSE</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        <Bento title="MOMENTUM — LAST 10 MIN">
          <Text style={[styles.momentumDiff, { color: lastDiff >= 0 ? theme.good : theme.bad }]}>
            {lastDiff >= 0 ? `+${lastDiff}` : lastDiff}
          </Text>
          <View style={styles.sparkRow}>
            {momentum.map((b) => (
              <View
                key={b.clockMs}
                style={[
                  styles.spark,
                  {
                    height: Math.max(4, 44 - Math.abs(b.diff) * 4),
                    backgroundColor: b.diff >= 0 ? theme.good : theme.bad,
                  },
                ]}
              />
            ))}
          </View>
          <Text style={styles.smallDim}>
            Home {game.score.home} — {game.score.away} Away
          </Text>
        </Bento>

        <Bento title={`GK REPORT — ${playerName(game, gk ?? undefined)}`}>
          {gkLine ? (
            <>
              <Text style={styles.bigStat}>
                {gkLine.saves}/{gkLine.faced}
              </Text>
              <Text style={styles.smallDim}>saves · {gkLine.goalsConceded} conceded</Text>
              <Text style={styles.smallDim}>
                Goals prevented: {gkLine.goalsPrevented >= 0 ? '+' : ''}
                {gkLine.goalsPrevented.toFixed(2)}
              </Text>
            </>
          ) : (
            <Text style={styles.smallDim}>Empty net — no GK on court</Text>
          )}
        </Bento>

        <Bento title="LINEUP +/− THIS MATCH">
          <ScrollView>
            {([...SLOTS, 'ATT'] as const).map((slot) => {
              const id = slot === 'ATT' ? game.extraAttacker[side] : game.activeLineup[side][slot];
              if (!id) return null;
              const pm = plusMinus.get(id) ?? 0;
              const line = lines.get(id);
              return (
                <View key={slot} style={styles.pmRow}>
                  <Text style={styles.pmName} numberOfLines={1}>
                    {slot} · {playerName(game, id)}
                  </Text>
                  <Text style={styles.pmSub}>
                    {line ? `${line.goals}G ${line.shots}S` : ''}
                  </Text>
                  <Text style={[styles.pmValue, { color: pm >= 0 ? theme.good : theme.bad }]}>
                    {pm >= 0 ? `+${pm}` : pm}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </Bento>

        <Bento title="ATO BOARD">
          <Pressable
            style={[styles.atoBtn, match.atoArmed && styles.atoBtnArmed]}
            onPress={() => {
              pulse('tap');
              state.armATO();
            }}
          >
            <Text style={styles.atoText}>
              {match.atoArmed ? 'ATO ARMED — next shot/turnover tagged' : 'ARM ATO (no clock stop)'}
            </Text>
          </Pressable>
          <Text style={styles.smallDim}>Tap a shooter to focus:</Text>
          <View style={styles.focusRow}>
            {game.emptyNet[side] ? [] : [game.activeLineup[side].LW, game.activeLineup[side].LB, game.activeLineup[side].CB, game.activeLineup[side].RB, game.activeLineup[side].RW, game.activeLineup[side].PV]
              .filter(Boolean)
              .map((id) => {
                const i = id as Id;
                return (
                  <Pressable
                    key={i}
                    style={[styles.focusChip, state.selectedPlayerId === i && { borderColor: color, borderWidth: 2 }]}
                    onPress={() => {
                      pulse('tap');
                      state.selectPlayer(i);
                    }}
                  >
                    <Text style={styles.focusText} numberOfLines={1}>
                      {playerName(game, i)}
                    </Text>
                  </Pressable>
                );
              })}
          </View>
        </Bento>
      </View>
    </View>
  );
}

function Bento({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.bento}>
      <Text style={styles.bentoTitle}>{title}</Text>
      {children}
    </View>
  );
}

function computePlusMinus(game: GameDerivation, events: { type: string; outcome?: string; teamSide: 'home' | 'away'; clockMs: number }[]): Map<Id, number> {
  const pm = new Map<Id, number>();
  const goals = events.filter((e) => e.type === 'SHOT' && e.outcome === 'GOAL');

  const lineupAt = (side: 'home' | 'away', clockMs: number): Id[] => {
    const stints = game.stints[side];
    let stint = stints[0];
    for (const s of stints) {
      if (clockMs >= s.startMs && clockMs <= s.endMs) {
        stint = s;
        break;
      }
    }
    if (!stint) return [];
    const ids: Id[] = [];
    for (const slot of SLOTS) {
      if (slot === 'GK' && stint.extraPlayerId) continue;
      const id = stint.slots[slot];
      if (id) ids.push(id);
    }
    if (stint.extraPlayerId) ids.push(stint.extraPlayerId);
    return ids;
  };

  for (const g of goals) {
    for (const id of lineupAt(g.teamSide, g.clockMs)) {
      pm.set(id, (pm.get(id) ?? 0) + 1);
    }
    for (const id of lineupAt(otherSide(g.teamSide), g.clockMs)) {
      pm.set(id, (pm.get(id) ?? 0) - 1);
    }
  }
  return pm;
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(8, 13, 24, 0.97)',
    padding: spacing.lg,
    zIndex: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: theme.textDim,
    fontSize: 12,
  },
  clockBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    backgroundColor: theme.panel,
    borderRadius: radius.lg,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  clockValue: {
    color: theme.text,
    fontSize: 36,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  clockUnit: {
    color: theme.textDim,
    fontSize: 13,
  },
  closeBtn: {
    marginLeft: 'auto',
    backgroundColor: theme.panelAlt,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  closeText: {
    color: theme.text,
    fontWeight: '800',
    fontSize: 12,
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  bento: {
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: theme.panel,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: theme.border,
    padding: spacing.md,
  },
  bentoTitle: {
    color: theme.textFaint,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  momentumDiff: {
    fontSize: 30,
    fontWeight: '800',
  },
  sparkRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 48,
    marginVertical: 6,
  },
  spark: {
    width: 8,
    borderRadius: 3,
  },
  smallDim: {
    color: theme.textDim,
    fontSize: 12,
    marginTop: 2,
  },
  bigStat: {
    color: theme.text,
    fontSize: 30,
    fontWeight: '800',
  },
  pmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 3,
  },
  pmName: {
    color: theme.text,
    fontSize: 12,
    flex: 1,
  },
  pmSub: {
    color: theme.textFaint,
    fontSize: 10,
  },
  pmValue: {
    fontSize: 13,
    fontWeight: '800',
    width: 34,
    textAlign: 'right',
  },
  atoBtn: {
    backgroundColor: theme.panelAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  atoBtnArmed: {
    backgroundColor: 'rgba(250, 204, 21, 0.35)',
  },
  atoText: {
    color: theme.text,
    fontWeight: '800',
    fontSize: 12,
    textAlign: 'center',
  },
  focusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  focusChip: {
    backgroundColor: theme.panelDeep,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  focusText: {
    color: theme.text,
    fontSize: 11,
    fontWeight: '600',
  },
});
