import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { radius, spacing, theme } from '../theme';
import { pulse } from '../haptics';
import type { MatchStoreState } from '../../state/matchStore';
import type { GameDerivation } from '../../domain/selectors';
import { playerName } from '../../domain/selectors';
import {
  SHOT_OUTCOMES,
  SHOT_TECHNIQUES,
  TURNOVER_LABELS,
  ZONE_LABELS,
  type TurnoverCode,
} from '../../domain/types';

interface Props {
  state: MatchStoreState;
  game: GameDerivation;
}

const TURNOVER_PATCHES: TurnoverCode[] = [
  'TO_PASS_BAD',
  'TO_CATCH_DROP',
  'TO_DRIBBLE',
  'TF_STEPS',
  'TF_3SEC',
  'TF_AREA',
  'TF_PASSIVE',
  'TF_OFF_FOUL',
  'DEF_STEAL_ANTICIPATION',
  'DEF_PIVOT_RECOVERY',
  'TF_OFF_FOUL',
];

export default function ToastModifyBar({ state, game }: Props) {
  const match = state.match;
  const toastId = state.toastEventId;
  if (!match || !toastId) return null;
  const ev = match.events.find((e) => e.id === toastId);
  if (!ev) return null;

  const patch = (p: Parameters<MatchStoreState['modifyEvent']>[1]) => {
    pulse('tap');
    state.modifyEvent(ev.id, p);
  };

  const summary =
    ev.type === 'SHOT'
      ? `${playerName(game, ev.playerId)} · ${ev.zone ? ZONE_LABELS[ev.zone] : ''} ${ev.xg != null ? `· xG ${Math.round(ev.xg * 100)}%` : ''} · ${ev.outcome}`
      : ev.type === 'TURNOVER'
        ? `${playerName(game, ev.playerId)} · ${ev.turnoverCode ? TURNOVER_LABELS[ev.turnoverCode] : 'Turnover'}`
        : `${ev.type} · ${playerName(game, ev.playerId)}`;

  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <Text style={styles.summary} numberOfLines={1}>
          {summary}
        </Text>
        <View style={styles.headButtons}>
          <Pressable
            style={styles.smallBtn}
            onPress={() => {
              pulse('tap');
              state.undo();
            }}
          >
            <Text style={styles.smallBtnText}>UNDO</Text>
          </Pressable>
          <Pressable
            style={styles.smallBtn}
            onPress={() => {
              pulse('tap');
              state.clearToast();
            }}
          >
            <Text style={styles.smallBtnText}>DONE</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {ev.type === 'SHOT' && (
          <>
            {SHOT_OUTCOMES.map((o) => (
              <Chip key={o} label={o} on={ev.outcome === o} onPress={() => patch({ outcome: o })} />
            ))}
            <Text style={styles.sep}>|</Text>
            {SHOT_TECHNIQUES.map((t) => (
              <Chip key={t} label={t} on={ev.technique === t} onPress={() => patch({ technique: t })} />
            ))}
            <Text style={styles.sep}>|</Text>
            <Chip label="CONTESTED" on={ev.contested === true} onPress={() => patch({ contested: !ev.contested })} />
            <Chip label="FAST BREAK" on={ev.fastBreak === true} onPress={() => patch({ fastBreak: !ev.fastBreak })} />
            <Chip label="7M" on={ev.sevenMeter === true} onPress={() => patch({ sevenMeter: !ev.sevenMeter })} />
            <Chip label="REBOUND" on={ev.reboundRecovered === true} onPress={() => patch({ reboundRecovered: !ev.reboundRecovered })} />
          </>
        )}
        {ev.type === 'TURNOVER' && (
          <>
            {[...new Set(TURNOVER_PATCHES)].map((c) => (
              <Chip key={c} label={TURNOVER_LABELS[c]} on={ev.turnoverCode === c} onPress={() => patch({ turnoverCode: c })} />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, on && styles.chipOn]} onPress={onPress}>
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.panelDeep,
    borderTopWidth: 1,
    borderTopColor: theme.accent,
    paddingVertical: 6,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  summary: {
    color: theme.text,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  headButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  smallBtn: {
    backgroundColor: theme.panelAlt,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  smallBtnText: {
    color: theme.text,
    fontSize: 10,
    fontWeight: '800',
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingTop: 6,
  },
  sep: {
    color: theme.textFaint,
    marginHorizontal: 4,
  },
  chip: {
    backgroundColor: theme.panelAlt,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipOn: {
    backgroundColor: theme.accentSoft,
  },
  chipText: {
    color: theme.textDim,
    fontSize: 10,
    fontWeight: '700',
  },
  chipTextOn: {
    color: '#fff',
  },
});
