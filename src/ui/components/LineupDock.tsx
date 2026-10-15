import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { radius, spacing, theme } from '../theme';
import { pulse } from '../haptics';
import { SLOTS, formatSuspension, type Id, type Slot } from '../../domain/types';
import type { GameDerivation, PlayerLine } from '../../domain/selectors';
import type { MatchStoreState } from '../../state/matchStore';

interface Props {
  state: MatchStoreState;
  game: GameDerivation;
  lines: Map<Id, PlayerLine>;
}

interface SlotCard {
  key: string;
  label: string;
  slot: Slot | null;
  playerId: Id | null;
}

export default function LineupDock({ state, game, lines }: Props) {
  const match = state.match;
  const [pendingBenchId, setPendingBenchId] = useState<Id | null>(null);
  if (!match) return null;

  const side = state.selectedTeamSide;
  const team = match.setup[side];
  const color = side === 'home' ? theme.home : theme.away;
  const clockMs = match.clock.elapsedMs;
  const suspendedIds = new Set(game.activeSuspensions.map((s) => s.playerId));
  const lineup = game.activeLineup[side];

  const slotCards: SlotCard[] = SLOTS.map((slot) => ({
    key: slot,
    label: slot,
    slot,
    playerId: lineup[slot],
  }));
  if (game.extraAttacker[side]) {
    slotCards.push({ key: 'ATT', label: 'ATT', slot: null, playerId: game.extraAttacker[side] });
  }

  const bench = team.players.filter(
    (p) => !Object.values(lineup).includes(p.id) && !game.redCardedIds.has(p.id),
  );

  const onSlotTap = (card: SlotCard) => {
    if (pendingBenchId && card.slot) {
      pulse('tap');
      state.substitution(side, card.slot, pendingBenchId);
      setPendingBenchId(null);
      return;
    }
    if (card.slot && !card.playerId) {
      pulse('tap');
      state.setPendingSlot(state.pendingSlot === card.slot ? null : card.slot);
      return;
    }
    if (card.playerId) {
      pulse('tap');
      state.selectPlayer(card.playerId);
    }
  };

  const onBenchTap = (playerId: Id) => {
    if (state.pendingSlot) {
      pulse('tap');
      state.substitution(side, state.pendingSlot, playerId);
      setPendingBenchId(null);
      return;
    }
    pulse('tap');
    setPendingBenchId((cur) => (cur === playerId ? null : playerId));
  };

  const toggleGk = () => {
    if (game.emptyNet[side]) {
      pulse('tap');
      state.toggleEmptyNet(side);
      return;
    }
    if (!pendingBenchId) {
      pulse('error');
      return;
    }
    pulse('flag');
    state.toggleEmptyNet(side, pendingBenchId);
    setPendingBenchId(null);
  };

  return (
    <View style={styles.dock}>
      <View style={styles.tabs}>
        {(['home', 'away'] as const).map((s) => (
          <Pressable
            key={s}
            style={[
              styles.tab,
              state.selectedTeamSide === s && { backgroundColor: s === 'home' ? theme.home : theme.away },
            ]}
            onPress={() => {
              pulse('tap');
              setPendingBenchId(null);
              state.selectTeam(s);
            }}
          >
            <Text style={styles.tabText} numberOfLines={1}>
              {match.setup[s].shortName || match.setup[s].name}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>ON COURT</Text>
      <ScrollView style={styles.courtList}>
        {slotCards.map((card) => {
          const player = card.playerId ? game.playerById.get(card.playerId) : null;
          const line = card.playerId ? lines.get(card.playerId) : undefined;
          const suspended = card.playerId ? suspendedIds.has(card.playerId) : false;
          const red = card.playerId ? game.redCardedIds.has(card.playerId) : false;
          const susp = card.playerId ? game.activeSuspensions.find((x) => x.playerId === card.playerId) : undefined;
          const isSelected = card.playerId != null && state.selectedPlayerId === card.playerId;
          const isSubTarget = pendingBenchId != null && card.slot != null;
          return (
            <Pressable
              key={card.key}
              onPress={() => onSlotTap(card)}
              style={[
                styles.card,
                isSelected && { borderColor: color, backgroundColor: theme.panelAlt },
                isSubTarget && styles.cardTarget,
                suspended && styles.cardSuspended,
                red && styles.cardRed,
                !player && styles.cardEmpty,
              ]}
            >
              <View style={styles.cardHead}>
                <Text style={styles.slot}>{card.label}</Text>
                <Text style={styles.playerName} numberOfLines={1}>
                  {player ? `#${player.number} ${player.name}` : '— empty —'}
                </Text>
                {red && <Text style={styles.redBadge}>RED</Text>}
              </View>
              <View style={styles.cardStats}>
                {line && player && (
                  <Text style={styles.stat}>
                    {line.goals}/{line.shots} · HPI {line.hpi.toFixed(0)}
                  </Text>
                )}
                {susp && <Text style={styles.suspTime}>{formatSuspension(susp.endMs - clockMs)}</Text>}
              </View>
            </Pressable>
          );
        })}
        <Pressable style={[styles.gkToggle, game.emptyNet[side] && styles.gkToggleOn]} onPress={toggleGk}>
          <Text style={styles.gkToggleText}>
            {game.emptyNet[side] ? 'GK BACK' : pendingBenchId ? 'PULL GK → 7v6' : 'SELECT BENCH, THEN PULL GK'}
          </Text>
        </Pressable>
      </ScrollView>

      <Text style={styles.sectionTitle}>BENCH</Text>
      <ScrollView style={styles.benchList}>
        {bench.map((p) => {
          const line = lines.get(p.id);
          const isPending = pendingBenchId === p.id;
          return (
            <Pressable
              key={p.id}
              onPress={() => onBenchTap(p.id)}
              style={[styles.benchCard, isPending && { borderColor: theme.amber }]}
            >
              <Text style={styles.playerName} numberOfLines={1}>
                #{p.number} {p.name}
              </Text>
              <Text style={styles.stat}>{p.position}{line && line.suspensions > 0 ? ` · ${line.suspensions}×2'` : ''}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {(pendingBenchId || state.pendingSlot) && (
        <Text style={styles.hint}>
          {state.pendingSlot
            ? 'Now tap the bench player to bring in'
            : 'Now tap an on-court slot to swap'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    width: 208,
    backgroundColor: theme.panel,
    borderRightWidth: 1,
    borderRightColor: theme.border,
    padding: spacing.sm,
  },
  tabs: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: spacing.sm,
  },
  tab: {
    flex: 1,
    backgroundColor: theme.panelAlt,
    borderRadius: radius.sm,
    paddingVertical: 6,
    alignItems: 'center',
  },
  tabText: {
    color: theme.text,
    fontWeight: '700',
    fontSize: 11,
  },
  sectionTitle: {
    color: theme.textFaint,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
    marginTop: 4,
  },
  courtList: {
    maxHeight: 300,
  },
  card: {
    backgroundColor: theme.panelDeep,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 4,
  },
  cardTarget: {
    borderStyle: 'dashed',
    borderColor: theme.textDim,
  },
  cardSuspended: {
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
  },
  cardRed: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  cardEmpty: {
    borderStyle: 'dashed',
    opacity: 0.8,
  },
  redBadge: {
    color: theme.bad,
    fontSize: 9,
    fontWeight: '800',
    marginLeft: 'auto',
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  slot: {
    color: theme.textFaint,
    fontSize: 10,
    fontWeight: '800',
    width: 26,
  },
  playerName: {
    color: theme.text,
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  cardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 1,
  },
  stat: {
    color: theme.textDim,
    fontSize: 10,
  },
  suspTime: {
    color: theme.amber,
    fontSize: 10,
    fontWeight: '800',
  },
  gkToggle: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: radius.sm,
    paddingVertical: 6,
    alignItems: 'center',
    marginTop: 2,
  },
  gkToggleOn: {
    backgroundColor: theme.accentSoft,
    borderColor: theme.accent,
  },
  gkToggleText: {
    color: theme.text,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  benchList: {
    flex: 1,
  },
  benchCard: {
    backgroundColor: theme.panelDeep,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 4,
  },
  hint: {
    color: theme.amber,
    fontSize: 10,
    textAlign: 'center',
    paddingVertical: 4,
  },
});
