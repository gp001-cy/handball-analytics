import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme, radius, spacing } from '../theme';
import { pulse } from '../haptics';
import { formatClock, formatSuspension } from '../../domain/types';
import type { MatchStoreState } from '../../state/matchStore';
import { matchStore } from '../../state/matchStore';
import type { GameDerivation } from '../../domain/selectors';
import { numericalStateString } from '../../domain/selectors';

interface Props {
  state: MatchStoreState;
  game: GameDerivation;
}

function timeoutLeft(state: MatchStoreState, side: 'home' | 'away'): number {
  const match = state.match;
  if (!match) return 0;
  const t = match.timeouts[side];
  if (match.clock.period === 1) return Math.min(t.remaining, 2 - t.usedPeriod1);
  return Math.min(t.remaining, 2 - t.usedPeriod2);
}

export default function ClockBar({ state, game }: Props) {
  const match = state.match;
  if (!match) return null;
  const clock = match.clock;
  const label = clock.finished ? 'FULL TIME' : clock.halfTime ? 'HALF TIME' : clock.period === 1 ? '1ST HALF' : '2ND HALF';

  const onPrimary = () => {
    pulse('tap');
    if (clock.halfTime) matchStore.getState().startSecondHalf();
    else if (clock.running) state.pauseClock();
    else state.startClock();
  };

  const suspensionsFor = (side: 'home' | 'away') =>
    game.activeSuspensions.filter((s) => s.teamSide === side);

  return (
    <View style={styles.bar}>
      <TeamBlock
        state={state}
        game={game}
        side="home"
        timeout={timeoutLeft(state, 'home')}
        suspensions={suspensionsFor('home')}
        clockMs={clock.elapsedMs}
      />

      <View style={styles.center}>
        <Text style={styles.half}>{label}</Text>
        <Text style={styles.clock}>{formatClock(clock.elapsedMs)}</Text>
        <View style={styles.controls}>
          {!clock.finished && (
            <Pressable style={[styles.primary, clock.running && styles.primaryActive]} onPress={onPrimary}>
              <Text style={styles.primaryText}>
                {clock.halfTime ? 'START 2ND HALF' : clock.running ? 'PAUSE' : 'START'}
              </Text>
            </Pressable>
          )}
          {clock.finished && <Text style={styles.ended}>ENDED</Text>}
          <Pressable
            style={styles.secondary}
            onPress={() => {
              pulse('tap');
              state.endMatch();
            }}
          >
            <Text style={styles.secondaryText}>END</Text>
          </Pressable>
        </View>
      </View>

      <TeamBlock
        state={state}
        game={game}
        side="away"
        timeout={timeoutLeft(state, 'away')}
        suspensions={suspensionsFor('away')}
        clockMs={clock.elapsedMs}
      />
    </View>
  );
}

interface TeamBlockProps {
  state: MatchStoreState;
  game: GameDerivation;
  side: 'home' | 'away';
  timeout: number;
  suspensions: { playerId: string; endMs: number }[];
  clockMs: number;
}

function TeamBlock({ state, game, side, timeout, suspensions, clockMs }: TeamBlockProps) {
  const match = state.match!;
  const team = match.setup[side];
  const color = side === 'home' ? theme.home : theme.away;
  const selected = state.selectedTeamSide === side;

  return (
    <View style={[styles.team, selected && { borderColor: color }]}>
      <View style={styles.teamTop}>
        <Text style={[styles.teamName, { color }]} numberOfLines={1}>
          {team.shortName || team.name}
        </Text>
        <Text style={styles.score}>{game.score[side]}</Text>
      </View>
      <Text style={styles.numerical}>{numericalStateString(game, side)}</Text>
      <View style={styles.chipsRow}>
        <Pressable
          style={[styles.chip, timeout <= 0 && styles.chipDisabled]}
          onPress={() => {
            if (timeout <= 0) {
              pulse('error');
              return;
            }
            pulse('flag');
            state.callTimeout(side);
          }}
        >
          <Text style={styles.chipText}>TTO {timeout}</Text>
        </Pressable>
        {game.emptyNet[side] && (
          <View style={[styles.chip, styles.chipEmpty]}>
            <Text style={styles.chipText}>7v6 EN</Text>
          </View>
        )}
      </View>
      {suspensions.map((s) => (
        <View key={s.playerId} style={styles.susp}>
          <Text style={styles.suspText} numberOfLines={1}>
            {playerTag(state, s.playerId)}
          </Text>
          <Text style={styles.suspTime}>{formatSuspension(s.endMs - clockMs)}</Text>
        </View>
      ))}
    </View>
  );
}

function playerTag(state: MatchStoreState, id: string): string {
  const match = state.match;
  if (!match) return '—';
  const p = [...match.setup.home.players, ...match.setup.away.players].find((x) => x.id === id);
  return p ? `#${p.number} ${p.name}` : '—';
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: theme.panel,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  team: {
    flex: 1,
    maxWidth: 240,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    borderRadius: radius.md,
    padding: spacing.sm,
    backgroundColor: theme.panelDeep,
  },
  teamTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamName: {
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  score: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.text,
    marginLeft: spacing.sm,
  },
  numerical: {
    color: theme.textDim,
    fontSize: 11,
    marginTop: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
  },
  chip: {
    backgroundColor: theme.panelAlt,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipEmpty: {
    backgroundColor: theme.accentSoft,
  },
  chipText: {
    color: theme.text,
    fontSize: 11,
    fontWeight: '700',
  },
  susp: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 6,
  },
  suspText: {
    color: theme.amber,
    fontSize: 11,
    flexShrink: 1,
  },
  suspTime: {
    color: theme.amber,
    fontSize: 11,
    fontWeight: '700',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 190,
    gap: 4,
  },
  half: {
    color: theme.textDim,
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: '600',
  },
  clock: {
    color: theme.text,
    fontSize: 34,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  controls: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  primary: {
    backgroundColor: theme.accentSoft,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  primaryActive: {
    backgroundColor: theme.warn,
  },
  primaryText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  secondary: {
    backgroundColor: theme.panelAlt,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  secondaryText: {
    color: theme.textDim,
    fontWeight: '700',
    fontSize: 12,
  },
  ended: {
    color: theme.textDim,
    fontWeight: '800',
    fontSize: 14,
  },
});
