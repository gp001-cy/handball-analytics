import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { matchStore } from '../../state/matchStore';
import { matchRepository } from '../../data/repository';
import { useMatchPersistence, useMatchStoreState, useMatchTicker, useToastAutoDismiss } from '../../ui/hooks';
import { computePlayerLines, deriveGame, onCourtPlayerIds, otherSide } from '../../domain/selectors';
import { pulse } from '../../ui/haptics';
import ClockBar from '../../ui/components/ClockBar';
import LineupDock from '../../ui/components/LineupDock';
import EventButtons from '../../ui/components/EventButtons';
import CourtCanvas, { type ShotIntent } from '../../ui/components/CourtCanvas';
import ModifiersBar, { type ArmedModifiers } from '../../ui/components/ModifiersBar';
import OutcomePicker, { type PendingShot } from '../../ui/components/OutcomePicker';
import ToastModifyBar from '../../ui/components/ToastModifyBar';
import TimeoutView from '../../ui/components/TimeoutView';
import StatsView from '../../ui/views/StatsView';
import ScoutingView from '../../ui/views/ScoutingView';
import ExportView from '../../ui/views/ExportView';
import { theme, radius, spacing } from '../../ui/theme';
import type { Id, ShotOutcome, TeamSide } from '../../domain/types';

type Tab = 'LIVE' | 'STATS' | 'SCOUT' | 'EXPORT';

const EMPTY_ARMED: ArmedModifiers = { technique: undefined, contested: false, fastBreak: false, sevenMeter: false };

export default function MatchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id;
  const state = useMatchStoreState();
  const { width } = useWindowDimensions();
  const wide = width >= 900;

  const [tab, setTab] = useState<Tab>('LIVE');
  const [pendingShot, setPendingShot] = useState<PendingShot | null>(null);
  const [blockedIntent, setBlockedIntent] = useState<PendingShot | null>(null);
  const [armed, setArmed] = useState<ArmedModifiers>(EMPTY_ARMED);
  const [notFound, setNotFound] = useState(false);

  const match = state.match;
  const isCurrent = match?.id === id;

  useEffect(() => {
    if (!id) return;
    if (matchStore.getState().match?.id === id) return;
    void matchRepository.get(id).then((m) => {
      if (m) matchStore.getState().loadMatch(m);
      else setNotFound(true);
    });
  }, [id]);

  useMatchTicker(!!isCurrent && !!match && !match.clock.finished);
  useMatchPersistence(!!isCurrent);
  useToastAutoDismiss();

  const clockMs = match?.clock.elapsedMs ?? 0;
  const game = useMemo(
    () => (match && match.id === id ? deriveGame(match.setup, match.events, clockMs) : null),
    [match, clockMs, id],
  );
  const lines = useMemo(
    () => (match && game ? computePlayerLines(game, match.events, clockMs) : new Map()),
    [match, game, clockMs],
  );

  if (notFound) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Match not found</Text>
          <Pressable style={styles.backHome} onPress={() => router.replace('/')}>
            <Text style={styles.backHomeText}>Back to matches</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!match || !game || match.id !== id) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={theme.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const shooterId = state.selectedPlayerId;
  const shooter = shooterId ? game.playerById.get(shooterId) : null;
  const shooterSide: TeamSide = shooter?.teamSide ?? state.selectedTeamSide;

  const commitShot = (outcome: ShotOutcome, intent: PendingShot, defenderId?: Id) => {
    const s = matchStore.getState();
    const sel = s.selectedPlayerId;
    const player = sel ? game.playerById.get(sel) : null;
    if (!player) {
      pulse('error');
      setPendingShot(null);
      setBlockedIntent(null);
      return;
    }
    const seven = armed.sevenMeter;
    s.logShot({
      shooterId: player.id,
      teamSide: player.teamSide,
      courtX: seven ? 0 : intent.courtX,
      courtY: seven ? 7 : intent.courtY,
      goalX: intent.goalX,
      goalY: intent.goalY,
      outcome,
      technique: armed.technique,
      contested: armed.contested || undefined,
      fastBreak: armed.fastBreak || undefined,
      sevenMeter: seven || undefined,
      defenderId,
    });
    setArmed(EMPTY_ARMED);
    setPendingShot(null);
    setBlockedIntent(null);
  };

  const onShotIntent = (intent: ShotIntent) => {
    if (intent.kind === 'goal') {
      commitShot('GOAL', intent);
      return;
    }
    setPendingShot({ courtX: intent.courtX, courtY: intent.courtY });
  };

  const modifierLabels: string[] = [];
  if (armed.technique) modifierLabels.push(armed.technique);
  if (armed.contested) modifierLabels.push('CONTESTED');
  if (armed.fastBreak) modifierLabels.push('FAST BREAK');
  if (armed.sevenMeter) modifierLabels.push('7M');

  const defenders = blockedIntent ? onCourtPlayerIds(game, otherSide(shooterSide)) : [];

  const bottomOverlays = (
    <>
      {blockedIntent && (
        <View style={styles.blockPanel}>
          <Text style={styles.blockTitle}>Credit the blocker (defense):</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.blockChips}>
            {defenders.map((pid) => (
              <Pressable key={pid} style={styles.blockChip} onPress={() => commitShot('BLOCKED', blockedIntent, pid)}>
                <Text style={styles.blockChipText}>{playerTag(game, pid)}</Text>
              </Pressable>
            ))}
            <Pressable style={[styles.blockChip, styles.blockSkip]} onPress={() => commitShot('BLOCKED', blockedIntent)}>
              <Text style={styles.blockChipText}>SKIP</Text>
            </Pressable>
          </ScrollView>
        </View>
      )}
      {pendingShot && (
        <OutcomePicker
          intent={pendingShot}
          onPick={(o) => {
            if (o === 'BLOCKED') {
              setBlockedIntent(pendingShot);
              setPendingShot(null);
              return;
            }
            commitShot(o, pendingShot);
          }}
          onCancel={() => setPendingShot(null)}
        />
      )}
      {!pendingShot && !blockedIntent && <ToastModifyBar state={state} game={game} />}
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.tabBar}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        {(['LIVE', 'STATS', 'SCOUT', 'EXPORT'] as Tab[]).map((t) => (
          <Pressable key={t} style={[styles.tabBtn, tab === t && styles.tabBtnOn]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>{t}</Text>
          </Pressable>
        ))}
        <Text style={styles.teamsLabel} numberOfLines={1}>
          {match.setup.home.shortName} {game.score.home} — {game.score.away} {match.setup.away.shortName}
        </Text>
      </View>

      {tab === 'LIVE' && (
        <View style={styles.liveWrap}>
          <ClockBar state={state} game={game} />
          {wide ? (
            <View style={styles.mainRow}>
              <LineupDock state={state} game={game} lines={lines} />
              <View style={styles.centerCol}>
                <CourtCanvas
                  onShotIntent={onShotIntent}
                  shooterLabel={shooter ? `${playerTag(game, shooter.id)} · ${shooter.position}` : null}
                  modifierLabels={modifierLabels}
                  disabled={!shooter}
                />
                <ModifiersBar armed={armed} onChange={setArmed} />
              </View>
              <EventButtons state={state} />
            </View>
          ) : (
            <View style={styles.compactWrap}>
              <CourtCanvas
                onShotIntent={onShotIntent}
                shooterLabel={shooter ? `${playerTag(game, shooter.id)} · ${shooter.position}` : null}
                modifierLabels={modifierLabels}
                disabled={!shooter}
              />
              <ModifiersBar armed={armed} onChange={setArmed} />
              <ScrollView horizontal style={styles.compactDocks} contentContainerStyle={styles.compactDocksContent}>
                <LineupDock state={state} game={game} lines={lines} />
                <EventButtons state={state} />
              </ScrollView>
            </View>
          )}
          {bottomOverlays}
        </View>
      )}

      {tab === 'STATS' && <StatsView state={state} game={game} lines={lines} />}
      {tab === 'SCOUT' && <ScoutingView state={state} game={game} />}
      {tab === 'EXPORT' && <ExportView state={state} game={game} />}

      <TimeoutView state={state} game={game} lines={lines} />
    </SafeAreaView>
  );
}

function playerTag(game: ReturnType<typeof deriveGame>, id: Id): string {
  const p = game.playerById.get(id);
  return p ? `#${p.number} ${p.name}` : '—';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  emptyTitle: { color: theme.text, fontSize: 16, fontWeight: '700' },
  backHome: {
    backgroundColor: theme.accentSoft,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backHomeText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: theme.panelDeep,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backBtn: {
    backgroundColor: theme.panelAlt,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  backText: { color: theme.text, fontSize: 16, fontWeight: '800' },
  tabBtn: {
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  tabBtnOn: { backgroundColor: theme.accentSoft },
  tabText: { color: theme.textDim, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  tabTextOn: { color: '#fff' },
  teamsLabel: {
    marginLeft: 'auto',
    color: theme.textDim,
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1,
  },
  liveWrap: { flex: 1 },
  mainRow: { flex: 1, flexDirection: 'row' },
  centerCol: { flex: 1, backgroundColor: theme.bg },
  compactWrap: { flex: 1 },
  compactDocks: {
    height: 270,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  compactDocksContent: {
    flexDirection: 'row',
  },
  blockPanel: {
    backgroundColor: theme.panelDeep,
    borderTopWidth: 1,
    borderTopColor: theme.warn,
    paddingVertical: spacing.sm,
  },
  blockTitle: {
    color: theme.text,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: spacing.md,
    marginBottom: 4,
  },
  blockChips: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.md,
  },
  blockChip: {
    backgroundColor: theme.panelAlt,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  blockSkip: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
  },
  blockChipText: { color: theme.text, fontSize: 11, fontWeight: '700' },
});
