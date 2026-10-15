import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { radius, spacing, theme } from '../theme';
import type { MatchStoreState } from '../../state/matchStore';
import type { GameDerivation } from '../../domain/selectors';
import { generatePriorsForTeam, penaltyTreeText, type GoalGrid } from '../../data/priors';
import type { Id } from '../../domain/types';

interface Props {
  state: MatchStoreState;
  game: GameDerivation;
}

export default function ScoutingView({ state, game }: Props) {
  const match = state.match!;
  const [focusId, setFocusId] = useState<Id | null>(null);
  const [openGrid, setOpenGrid] = useState(true);

  const awayPriors = useMemo(() => generatePriorsForTeam(match.setup.away.players), [match.setup.away.players]);

  const priors = focusId ? awayPriors.get(focusId) : null;
  const player = focusId ? match.setup.away.players.find((p) => p.id === focusId) : null;

  const zoneEntries = useMemo(() => {
    if (!priors) return [];
    return Object.entries(priors.zoneWeights)
      .map(([zone, w]) => ({ zone, w: w as number }))
      .sort((a, b) => b.w - a.w);
  }, [priors]);

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Opposition Scouting — {match.setup.away.name}</Text>
      <Text style={styles.sub}>
        Model priors generated per player (deterministic). Use alongside your tag data.
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.playerRow}>
        {match.setup.away.players.map((p) => (
          <Pressable
            key={p.id}
            style={[styles.playerChip, focusId === p.id && styles.playerChipOn]}
            onPress={() => setFocusId(p.id)}
          >
            <Text style={styles.playerChipText} numberOfLines={1}>
              #{p.number} {p.name} · {p.position}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {!priors && <Text style={styles.empty}>Select a player to view the scouting report</Text>}

      {priors && player && (
        <>
          <Text style={styles.h2}>Shot Zone Tendencies</Text>
          <View style={styles.table}>
            {zoneEntries.map(({ zone, w }) => (
              <View key={zone} style={styles.zoneRow}>
                <Text style={styles.zoneLabel}>{zone}</Text>
                <View style={styles.zoneBarTrack}>
                  <View style={[styles.zoneBarFill, { width: `${Math.round(w * 100)}%` }]} />
                </View>
                <Text style={styles.zonePct}>{Math.round(w * 100)}%</Text>
              </View>
            ))}
          </View>

          <Text style={styles.h2}>Technique Mix</Text>
          <View style={styles.table}>
            {Object.entries(priors.techniqueMix).map(([t, share]) => (
              <View key={t} style={styles.zoneRow}>
                <Text style={styles.zoneLabel}>{t}</Text>
                <View style={styles.zoneBarTrack}>
                  <View style={[styles.zoneBarFillAlt, { width: `${Math.round((share as number) * 100)}%` }]} />
                </View>
                <Text style={styles.zonePct}>{Math.round((share as number) * 100)}%</Text>
              </View>
            ))}
            <Text style={styles.note}>Contested share: {Math.round(priors.contestedShare * 100)}%</Text>
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.h2}>Goal-Mouth Heatmap</Text>
            <Pressable style={styles.toggle} onPress={() => setOpenGrid((v) => !v)}>
              <Text style={styles.toggleText}>{openGrid ? 'OPEN PLAY' : 'CONTESTED'}</Text>
            </Pressable>
          </View>
          <Heatmap grid={openGrid ? priors.goalGridOpen : priors.goalGridContested} />
          <Text style={styles.note}>Grid: 3 rows (high/mid/low) × 5 columns (left → right) · shading = placement share</Text>

          <Text style={styles.h2}>7m Penalty Tree</Text>
          <View style={styles.table}>
            <Text style={styles.note}>
              {priors.penalty.attempts} attempts · {Math.round(priors.penalty.conversion * 100)}% conversion
            </Text>
            <View style={styles.seqRow}>
              {priors.penalty.sequence.map((s, i) => (
                <View
                  key={i}
                  style={[
                    styles.seqDot,
                    s === 'G' ? styles.seqGoal : s === 'S' ? styles.seqSave : styles.seqMiss,
                  ]}
                >
                  <Text style={styles.seqText}>{s}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.note}>{penaltyTreeText(priors)}</Text>
            <Text style={styles.penaltyNote}>{priors.penalty.note}</Text>
          </View>

          <Text style={styles.h2}>Scout Notes</Text>
          <View style={styles.table}>
            {priors.notes.map((n, i) => (
              <Text key={i} style={styles.bullet}>
                • {n}
              </Text>
            ))}
          </View>
        </>
      )}

      <Text style={styles.h2}>Live Notes / Adjustments</Text>
      <TextInput
        style={styles.notesInput}
        multiline
        placeholder="Half-time adjustments, tactical notes..."
        placeholderTextColor={theme.textFaint}
        value={match.notes}
        onChangeText={(t) => state.setNotes(t)}
      />
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function Heatmap({ grid }: { grid: GoalGrid }) {
  const max = Math.max(...grid.cells, 0.0001);
  return (
    <View style={styles.heatGrid}>
      {Array.from({ length: grid.rows }).map((_, r) => (
        <View key={r} style={styles.heatRow}>
          {Array.from({ length: grid.cols }).map((__, c) => {
            const v = grid.cells[r * grid.cols + c] ?? 0;
            const intensity = v / max;
            return (
              <View
                key={c}
                style={[
                  styles.heatCell,
                  { backgroundColor: `rgba(59, 130, 246, ${0.12 + intensity * 0.85})` },
                ]}
              >
                <Text style={styles.heatText}>{Math.round(v * 100)}</Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: theme.bg },
  content: { padding: spacing.md },
  h1: { color: theme.text, fontSize: 15, fontWeight: '800' },
  h2: { color: theme.text, fontSize: 13, fontWeight: '800', marginTop: spacing.md, marginBottom: spacing.sm },
  sub: { color: theme.textDim, fontSize: 11, marginTop: 2 },
  playerRow: { flexDirection: 'row', gap: 6, paddingVertical: spacing.sm },
  playerChip: {
    backgroundColor: theme.panel,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  playerChipOn: { borderColor: theme.away, backgroundColor: theme.panelAlt },
  playerChipText: { color: theme.text, fontSize: 11, fontWeight: '700' },
  empty: { color: theme.textFaint, fontSize: 12, textAlign: 'center', paddingVertical: 20 },
  table: {
    backgroundColor: theme.panel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border,
    padding: spacing.sm,
    gap: 4,
  },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  zoneLabel: { color: theme.textDim, fontSize: 11, width: 76 },
  zoneBarTrack: {
    flex: 1,
    height: 10,
    backgroundColor: theme.panelDeep,
    borderRadius: 5,
    overflow: 'hidden',
  },
  zoneBarFill: { height: 10, backgroundColor: theme.accent },
  zoneBarFillAlt: { height: 10, backgroundColor: theme.warn },
  zonePct: { color: theme.text, fontSize: 11, width: 36, textAlign: 'right' },
  note: { color: theme.textDim, fontSize: 11, marginTop: 4 },
  penaltyNote: { color: theme.amber, fontSize: 11, marginTop: 4, fontStyle: 'italic' },
  bullet: { color: theme.textDim, fontSize: 11, marginVertical: 2 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggle: {
    backgroundColor: theme.panelAlt,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: spacing.md,
  },
  toggleText: { color: theme.text, fontSize: 10, fontWeight: '800' },
  heatGrid: { gap: 3 },
  heatRow: { flexDirection: 'row', gap: 3 },
  heatCell: {
    flex: 1,
    height: 44,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heatText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  seqRow: { flexDirection: 'row', gap: 6, marginVertical: 6, flexWrap: 'wrap' },
  seqDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seqGoal: { backgroundColor: theme.good },
  seqSave: { backgroundColor: theme.warn },
  seqMiss: { backgroundColor: theme.bad },
  seqText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  notesInput: {
    backgroundColor: theme.panel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border,
    color: theme.text,
    padding: spacing.sm,
    minHeight: 90,
    textAlignVertical: 'top',
    fontSize: 12,
  },
});
