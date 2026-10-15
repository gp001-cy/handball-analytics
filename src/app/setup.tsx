import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { radius, spacing, theme } from '../ui/theme';
import { pulse } from '../ui/haptics';
import { createSavedMatch, matchStore } from '../state/matchStore';
import { matchRepository } from '../data/repository';
import {
  SLOTS,
  makeId,
  type Id,
  type MatchSetup,
  type Player,
  type Position,
  type Slot,
  type TeamSide,
} from '../domain/types';

interface DraftPlayer {
  id: Id;
  name: string;
  number: number;
  position: Position;
}

const POSITIONS: Position[] = ['GK', 'LW', 'LB', 'CB', 'RB', 'RW', 'PV'];
const DEFAULT_POSITIONS: Position[] = ['GK', 'GK', 'LW', 'RW', 'LB', 'RB', 'CB', 'CB', 'PV', 'PV'];

function defaultRoster(side: TeamSide): DraftPlayer[] {
  return DEFAULT_POSITIONS.map((position, i) => ({
    id: makeId(`p_${side}`),
    name: `Player ${i + 1}`,
    number: i + 1,
    position,
  }));
}

function defaultLineup(roster: DraftPlayer[]): Record<Slot, Id | null> {
  const used = new Set<Id>();
  const pick = (slot: Slot): Id | null => {
    const exact = roster.find((p) => p.position === slot && !used.has(p.id));
    const fallback = roster.find((p) => p.position !== 'GK' && !used.has(p.id));
    const chosen = exact ?? (slot === 'GK' ? roster.find((p) => !used.has(p.id)) : fallback) ?? null;
    if (chosen) used.add(chosen.id);
    return chosen?.id ?? null;
  };
  const lineup = {} as Record<Slot, Id | null>;
  for (const slot of SLOTS) lineup[slot] = pick(slot);
  return lineup;
}

export default function SetupScreen() {
  const router = useRouter();
  const [homeName, setHomeName] = useState('Home');
  const [awayName, setAwayName] = useState('Away');
  const [rosters, setRosters] = useState<Record<TeamSide, DraftPlayer[]>>(() => ({
    home: defaultRoster('home'),
    away: defaultRoster('away'),
  }));
  const [lineups, setLineups] = useState<Record<TeamSide, Record<Slot, Id | null>>>(() => ({
    home: defaultLineup(rosters.home),
    away: defaultLineup(rosters.away),
  }));
  const [saving, setSaving] = useState(false);

  const updatePlayer = (side: TeamSide, id: Id, patch: Partial<DraftPlayer>) => {
    setRosters((prev) => ({
      ...prev,
      [side]: prev[side].map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  };

  const addPlayer = (side: TeamSide) => {
    setRosters((prev) => {
      const roster = prev[side];
      const number = roster.reduce((acc, p) => Math.max(acc, p.number), 0) + 1;
      return {
        ...prev,
        [side]: [...roster, { id: makeId(`p_${side}`), name: `Player ${roster.length + 1}`, number, position: 'CB' }],
      };
    });
  };

  const removePlayer = (side: TeamSide, id: Id) => {
    setRosters((prev) => ({ ...prev, [side]: prev[side].filter((p) => p.id !== id) }));
  };

  const setSlot = (side: TeamSide, slot: Slot, playerId: Id) => {
    pulse('tap');
    setLineups((prev) => {
      const next = { ...prev[side] };
      for (const s of SLOTS) {
        if (next[s] === playerId && s !== slot) next[s] = null;
      }
      next[slot] = playerId;
      return { ...prev, [side]: next };
    });
  };

  const canStart = useMemo(
    () =>
      SLOTS.every((slot) => lineups.home[slot] && lineups.away[slot]) &&
      rosters.home.length >= 7 &&
      rosters.away.length >= 7,
    [lineups, rosters],
  );

  const startMatch = async () => {
    if (!canStart || saving) {
      pulse('error');
      Alert.alert('Lineup incomplete', 'Each team needs at least 7 players, with every slot assigned.');
      return;
    }
    setSaving(true);
    const toPlayers = (side: TeamSide): Player[] =>
      rosters[side].map((p) => ({ id: p.id, teamSide: side, name: p.name.trim() || `Player ${p.number}`, number: p.number, position: p.position }));

    const setup: MatchSetup = {
      home: {
        side: 'home',
        name: homeName.trim() || 'Home',
        shortName: (homeName.trim() || 'Home').slice(0, 10),
        color: theme.home,
        players: toPlayers('home'),
      },
      away: {
        side: 'away',
        name: awayName.trim() || 'Away',
        shortName: (awayName.trim() || 'Away').slice(0, 10),
        color: theme.away,
        players: toPlayers('away'),
      },
      startingLineups: lineups,
    };

    const match = createSavedMatch(setup);
    matchStore.getState().loadMatch(match);
    await matchRepository.save(match);
    pulse('goal');
    router.replace(`/match/${match.id}`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>‹ BACK</Text>
        </Pressable>
        <Text style={styles.title}>Match Setup</Text>
        <Pressable
          style={[styles.startBtn, !canStart && styles.startBtnDisabled]}
          onPress={() => void startMatch()}
        >
          <Text style={styles.startText}>{saving ? 'SAVING…' : 'START MATCH'}</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        {(['home', 'away'] as TeamSide[]).map((side) => {
          const color = side === 'home' ? theme.home : theme.away;
          const name = side === 'home' ? homeName : awayName;
          const setName = side === 'home' ? setHomeName : setAwayName;
          const roster = rosters[side];
          return (
            <View key={side} style={styles.section}>
              <View style={styles.teamHeader}>
                <View style={[styles.dot, { backgroundColor: color }]} />
                <TextInput
                  style={styles.teamNameInput}
                  value={name}
                  onChangeText={setName}
                  placeholder={`${side} team name`}
                  placeholderTextColor={theme.textFaint}
                />
                <Text style={styles.rosterCount}>{roster.length} players</Text>
              </View>

              {roster.map((p) => (
                <View key={p.id} style={styles.playerRow}>
                  <TextInput
                    style={styles.numberInput}
                    value={String(p.number)}
                    keyboardType="number-pad"
                    onChangeText={(t) => {
                      const n = Number.parseInt(t, 10);
                      updatePlayer(side, p.id, { number: Number.isNaN(n) ? 0 : n });
                    }}
                  />
                  <TextInput
                    style={styles.nameInput}
                    value={p.name}
                    onChangeText={(t) => updatePlayer(side, p.id, { name: t })}
                    placeholder="Name"
                    placeholderTextColor={theme.textFaint}
                  />
                  <Pressable
                    style={[styles.posBadge, { borderColor: color }]}
                    onPress={() => {
                      const idx = POSITIONS.indexOf(p.position);
                      updatePlayer(side, p.id, { position: POSITIONS[(idx + 1) % POSITIONS.length] });
                    }}
                  >
                    <Text style={styles.posText}>{p.position}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.removeBtn}
                    onPress={() => removePlayer(side, p.id)}
                  >
                    <Text style={styles.removeText}>✕</Text>
                  </Pressable>
                </View>
              ))}
              <Pressable style={styles.addBtn} onPress={() => addPlayer(side)}>
                <Text style={styles.addText}>+ Add player</Text>
              </Pressable>

              <Text style={styles.lineupTitle}>Starting Seven</Text>
              {SLOTS.map((slot) => {
                const candidates = roster.filter((p) => p.position === slot);
                const usable = candidates.length > 0 ? candidates : roster.filter((p) => (slot === 'GK' ? true : p.position !== 'GK'));
                return (
                  <View key={slot} style={styles.slotRow}>
                    <Text style={styles.slotLabel}>{slot}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.slotChips}>
                      {usable.map((p) => (
                        <Pressable
                          key={p.id}
                          style={[styles.slotChip, lineups[side][slot] === p.id && { backgroundColor: color }]}
                          onPress={() => setSlot(side, slot, p.id)}
                        >
                          <Text style={styles.slotChipText}>
                            #{p.number} {p.name}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                );
              })}
            </View>
          );
        })}
        <Text style={styles.footer}>
          Tap a position badge to cycle GK/LW/LB/CB/RB/RW/PV. Starting seven auto-fills — adjust as needed.
        </Text>
        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  backBtn: {
    backgroundColor: theme.panelAlt,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backText: { color: theme.text, fontWeight: '700', fontSize: 12 },
  title: { color: theme.text, fontSize: 18, fontWeight: '800', flex: 1 },
  startBtn: {
    backgroundColor: theme.good,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  startBtnDisabled: { opacity: 0.45 },
  startText: { color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  scroll: { flex: 1, paddingHorizontal: spacing.lg },
  section: {
    backgroundColor: theme.panel,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: theme.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  dot: { width: 14, height: 14, borderRadius: 7 },
  teamNameInput: {
    flex: 1,
    color: theme.text,
    fontSize: 16,
    fontWeight: '800',
    borderBottomWidth: 1,
    borderBottomColor: theme.borderSoft,
    paddingVertical: 4,
  },
  rosterCount: { color: theme.textFaint, fontSize: 11 },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  numberInput: {
    width: 48,
    backgroundColor: theme.panelDeep,
    borderRadius: radius.sm,
    color: theme.text,
    textAlign: 'center',
    paddingVertical: 7,
    fontSize: 12,
  },
  nameInput: {
    flex: 1,
    backgroundColor: theme.panelDeep,
    borderRadius: radius.sm,
    color: theme.text,
    paddingHorizontal: 8,
    paddingVertical: 7,
    fontSize: 12,
  },
  posBadge: {
    borderWidth: 1,
    borderRadius: radius.sm,
    width: 44,
    alignItems: 'center',
    paddingVertical: 7,
  },
  posText: { color: theme.text, fontSize: 11, fontWeight: '800' },
  removeBtn: {
    width: 30,
    alignItems: 'center',
    paddingVertical: 7,
  },
  removeText: { color: theme.bad, fontSize: 14, fontWeight: '800' },
  addBtn: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    borderStyle: 'dashed',
    paddingVertical: 8,
    alignItems: 'center',
  },
  addText: { color: theme.textDim, fontSize: 12, fontWeight: '700' },
  lineupTitle: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '800',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: spacing.sm,
  },
  slotLabel: {
    color: theme.textFaint,
    fontSize: 11,
    fontWeight: '800',
    width: 30,
  },
  slotChips: { flexDirection: 'row', gap: 4 },
  slotChip: {
    backgroundColor: theme.panelAlt,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  slotChipText: { color: theme.text, fontSize: 10, fontWeight: '700' },
  footer: {
    color: theme.textFaint,
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
