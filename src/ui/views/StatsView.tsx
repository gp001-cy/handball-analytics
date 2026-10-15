import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { radius, spacing, theme } from '../theme';
import type { MatchStoreState } from '../../state/matchStore';
import type { GameDerivation, PlayerLine } from '../../domain/selectors';
import { computeTeamTotals, playerName, recentTurnovers, totalMinutes } from '../../domain/selectors';
import { TURNOVER_LABELS, ZONE_LABELS, type Id, type TeamSide, type WavePhase } from '../../domain/types';

interface Props {
  state: MatchStoreState;
  game: GameDerivation;
  lines: Map<Id, PlayerLine>;
}

export default function StatsView({ state, game, lines }: Props) {
  const match = state.match!;

  const totals = useMemo(
    () => ({
      home: computeTeamTotals('home', game, match.events),
      away: computeTeamTotals('away', game, match.events),
    }),
    [game, match.events],
  );

  const turnoverList = useMemo(() => recentTurnovers(match.events, 6), [match.events]);

  const waves = useMemo(() => {
    const keys: WavePhase[] = ['WAVE_1', 'WAVE_2', 'WAVE_3', 'SET'];
    return keys.map((wave) => {
      const ps = game.possessions.filter((p) => p.wave === wave && p.events.length > 0);
      const goals = ps.reduce((acc, p) => acc + p.goals, 0);
      return { wave, possessions: ps.length, goals, per50: ps.length > 0 ? (goals / ps.length) * 50 : 0 };
    });
  }, [game.possessions]);

  const sortedPlayers = (side: TeamSide) =>
    [...lines.values()]
      .filter((l) => l.player.teamSide === side && (l.playingMs > 0 || l.shots > 0))
      .sort((a, b) => b.hpi - a.hpi);

  const row = (label: string, home: string | number, away: string | number, highlight?: boolean) => (
    <View key={label} style={[styles.tr, highlight && styles.trHighlight]}>
      <Text style={styles.tdSide}>{home}</Text>
      <Text style={styles.tdLabel}>{label}</Text>
      <Text style={styles.tdSide}>{away}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Team Comparison</Text>
      <View style={styles.table}>
        <View style={styles.tr}>
          <Text style={styles.tdSideHead}>{match.setup.home.shortName || match.setup.home.name}</Text>
          <View style={{ width: 150 }} />
          <Text style={styles.tdSideHead}>{match.setup.away.shortName || match.setup.away.name}</Text>
        </View>
        {row('Goals', totals.home.goals, totals.away.goals, true)}
        {row('Shots', totals.home.shots, totals.away.shots)}
        {row(
          'Efficiency',
          totals.home.shots > 0 ? `${Math.round((totals.home.goals / totals.home.shots) * 100)}%` : '—',
          totals.away.shots > 0 ? `${Math.round((totals.away.goals / totals.away.shots) * 100)}%` : '—',
        )}
        {row('xG For', totals.home.xgFor.toFixed(1), totals.away.xgFor.toFixed(1))}
        {row('xG Against', totals.home.xgAgainst.toFixed(1), totals.away.xgAgainst.toFixed(1))}
        {row('GK Saves', totals.home.saves, totals.away.saves)}
        {row('Turnovers', totals.home.turnovers, totals.away.turnovers)}
        {row('Technical Fouls', totals.home.technicalFouls, totals.away.technicalFouls)}
        {row('Suspensions', totals.home.suspensions, totals.away.suspensions)}
        {row('7m Drawn', totals.home.drawn7m, totals.away.drawn7m)}
        {row('Fast-Break Goals', totals.home.fastBreakGoals, totals.away.fastBreakGoals)}
        {row('Empty-Net Goals', totals.home.emptyNetGoals, totals.away.emptyNetGoals)}
        {row('Possessions', totals.home.possessions, totals.away.possessions)}
        {row('Goals / 50 poss.', totals.home.goalsPer50.toFixed(1), totals.away.goalsPer50.toFixed(1), true)}
        {row('Conceded / 50', totals.home.concededPer50.toFixed(1), totals.away.concededPer50.toFixed(1))}
        {row('Net / 50', totals.home.netPer50.toFixed(1), totals.away.netPer50.toFixed(1), true)}
      </View>

      <Text style={styles.h1}>Possession Waves</Text>
      <View style={styles.table}>
        <View style={styles.tr}>
          <Text style={styles.tdWave}>Phase</Text>
          <Text style={styles.tdWave}>Poss</Text>
          <Text style={styles.tdWave}>Goals</Text>
          <Text style={styles.tdWave}>Per 50</Text>
        </View>
        {waves.map((w) => (
          <View key={w.wave} style={styles.tr}>
            <Text style={styles.tdWave}>{WAVE_LABELS[w.wave]}</Text>
            <Text style={styles.tdWave}>{w.possessions}</Text>
            <Text style={styles.tdWave}>{w.goals}</Text>
            <Text style={styles.tdWave}>{w.per50.toFixed(1)}</Text>
          </View>
        ))}
      </View>

      {(['home', 'away'] as TeamSide[]).map((side) => (
        <View key={side}>
          <Text style={[styles.h1, { color: side === 'home' ? theme.home : theme.away }]}>
            {match.setup[side].name} — Player HPI
          </Text>
          <View style={styles.table}>
            <View style={styles.tr}>
              <Text style={styles.tdName}>Player</Text>
              <Text style={styles.tdNum}>G/S</Text>
              <Text style={styles.tdNum}>AST</Text>
              <Text style={styles.tdNum}>TO</Text>
              <Text style={styles.tdNum}>2min</Text>
              <Text style={styles.tdNum}>HPI</Text>
              <Text style={styles.tdNum}>Lev</Text>
              <Text style={styles.tdNum}>Min</Text>
            </View>
            {sortedPlayers(side).map((l) => (
              <View key={l.player.id} style={styles.tr}>
                <Text style={styles.tdName} numberOfLines={1}>
                  #{l.player.number} {l.player.name}
                </Text>
                <Text style={styles.tdNum}>
                  {l.goals}/{l.shots}
                </Text>
                <Text style={styles.tdNum}>{l.assists}</Text>
                <Text style={styles.tdNum}>{l.turnovers}</Text>
                <Text style={styles.tdNum}>{l.suspensions}</Text>
                <Text style={[styles.tdNum, { color: l.hpi >= 0 ? theme.good : theme.bad, fontWeight: '800' }]}>
                  {l.hpi.toFixed(0)}
                </Text>
                <Text style={styles.tdNum}>{l.leveragedScore.toFixed(0)}</Text>
                <Text style={styles.tdNum}>{totalMinutes(l.playingMs)}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.gkNote}>
            GK: {gkSummary(lines, side, game)}
          </Text>
        </View>
      ))}

      <Text style={styles.h1}>Recent Turnovers</Text>
      <View style={styles.table}>
        {turnoverList.length === 0 && <Text style={styles.empty}>No turnovers tagged yet</Text>}
        {turnoverList.map((ev) => (
          <View key={ev.id} style={styles.tr}>
            <Text style={styles.tdName} numberOfLines={1}>
              {formatClockShort(ev.clockMs)} · {playerName(game, ev.playerId)}
            </Text>
            <Text style={styles.tdTurnover}>
              {ev.turnoverCode ? TURNOVER_LABELS[ev.turnoverCode] : '—'}
              {ev.defenderId ? ` (won by ${playerName(game, ev.defenderId)})` : ''}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.h1}>Shot Zones</Text>
      <View style={styles.table}>
        {(Object.keys(totals.home.byZone) as (keyof typeof totals.home.byZone)[]).map((z) => {
          const h = totals.home.byZone[z] ?? { goals: 0, shots: 0 };
          const a = totals.away.byZone[z] ?? { goals: 0, shots: 0 };
          return row(ZONE_LABELS[z as keyof typeof ZONE_LABELS] ?? z, `${h.goals}/${h.shots}`, `${a.goals}/${a.shots}`);
        })}
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const WAVE_LABELS: Record<WavePhase, string> = {
  WAVE_1: 'Wave 1 (≤12s)',
  WAVE_2: 'Wave 2 (≤24s)',
  WAVE_3: 'Wave 3 (throw-off)',
  SET: 'Set (slow)',
};

function gkSummary(lines: Map<Id, PlayerLine>, side: TeamSide, game: GameDerivation): string {
  const gkIds = [game.activeLineup[side].GK, ...[]].filter(Boolean) as Id[];
  const entries = [...lines.values()].filter((l) => l.player.teamSide === side && l.player.position === 'GK');
  if (entries.length === 0) return 'no saves recorded';
  return entries
    .map(
      (l) =>
        `${l.player.name}: ${l.saves}/${l.faced} saves, ${l.goalsConceded} conceded, GP ${l.goalsPrevented >= 0 ? '+' : ''}${l.goalsPrevented.toFixed(2)}${gkIds.includes(l.player.id) ? ' (on court)' : ''}`,
    )
    .join(' · ');
}

function formatClockShort(ms: number): string {
  const totalSec = Math.floor(Math.max(0, ms) / 1000);
  return `${Math.floor(totalSec / 60)}'${String(totalSec % 60).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  content: {
    padding: spacing.md,
  },
  h1: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '800',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  table: {
    backgroundColor: theme.panel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border,
    padding: spacing.sm,
  },
  tr: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  trHighlight: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderRadius: radius.sm,
  },
  tdSide: {
    color: theme.text,
    fontSize: 12,
    width: 60,
    fontWeight: '700',
    textAlign: 'center',
  },
  tdSideHead: {
    color: theme.textDim,
    fontSize: 11,
    width: 60,
    fontWeight: '800',
    textAlign: 'center',
  },
  tdLabel: {
    color: theme.textDim,
    fontSize: 11,
    flex: 1,
    textAlign: 'center',
  },
  tdWave: {
    color: theme.text,
    fontSize: 12,
    flex: 1,
    textAlign: 'center',
  },
  tdName: {
    color: theme.text,
    fontSize: 11,
    flex: 1.6,
  },
  tdNum: {
    color: theme.textDim,
    fontSize: 11,
    width: 38,
    textAlign: 'right',
  },
  tdTurnover: {
    color: theme.textDim,
    fontSize: 11,
    flex: 1.4,
    textAlign: 'right',
  },
  gkNote: {
    color: theme.textDim,
    fontSize: 11,
    marginTop: 4,
  },
  empty: {
    color: theme.textFaint,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 6,
  },
});
