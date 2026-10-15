import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { matchRepository, type MatchSummary } from '../data/repository';
import { radius, spacing, theme } from '../ui/theme';
import { formatClock } from '../domain/types';
import { pulse } from '../ui/haptics';

export default function HomeScreen() {
  const router = useRouter();
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    void matchRepository.list().then((list) => {
      setMatches(list);
      setLoaded(true);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
      return undefined;
    }, [refresh]),
  );

  const confirmDelete = (id: string, label: string) => {
    Alert.alert('Delete match', `Remove ${label}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void matchRepository.remove(id).then(refresh);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.brand}>HB ANALYTICS</Text>
          <Text style={styles.tagline}>Live tagging · xG / xGOT · HPI 2.0 · Sportscode export</Text>
        </View>
        <Pressable
          style={styles.newBtn}
          onPress={() => {
            pulse('tap');
            router.push('/setup');
          }}
        >
          <Text style={styles.newBtnText}>+ NEW MATCH</Text>
        </Pressable>
      </View>

      <FlatList
        data={matches}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          loaded ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No matches yet</Text>
              <Text style={styles.emptyText}>
                Tap “New Match” to set up teams and start tagging. All data stays on this device.
              </Text>
            </View>
          ) : undefined
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => {
              pulse('tap');
              router.push(`/match/${item.id}`);
            }}
            onLongPress={() => confirmDelete(item.id, `${item.homeName} vs ${item.awayName}`)}
          >
            <View style={styles.cardTop}>
              <View style={styles.teamCol}>
                <View style={[styles.dot, { backgroundColor: item.homeColor }]} />
                <Text style={styles.teamName} numberOfLines={1}>
                  {item.homeName}
                </Text>
              </View>
              <Text style={styles.score}>
                {item.homeScore} — {item.awayScore}
              </Text>
              <View style={[styles.teamCol, styles.teamColRight]}>
                <Text style={[styles.teamName, styles.teamNameRight]} numberOfLines={1}>
                  {item.awayName}
                </Text>
                <View style={[styles.dot, { backgroundColor: item.awayColor }]} />
              </View>
            </View>
            <View style={styles.cardBottom}>
              <Text style={[styles.status, item.finished && styles.statusDone]}>
                {item.finished ? 'FULL TIME' : `P${item.period} · ${formatClock(item.clockMs)}`}
              </Text>
              <Text style={styles.meta}>
                {item.eventCount} events · updated {new Date(item.updatedAt).toLocaleString()}
              </Text>
            </View>
          </Pressable>
        )}
      />
      <Text style={styles.footer}>Long-press a match to delete it</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  brand: {
    color: theme.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 2,
  },
  tagline: {
    color: theme.textDim,
    fontSize: 11,
    marginTop: 2,
  },
  newBtn: {
    backgroundColor: theme.accentSoft,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  newBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    color: theme.textDim,
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 420,
  },
  card: {
    backgroundColor: theme.panel,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: theme.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teamColRight: {
    justifyContent: 'flex-end',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  teamName: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  teamNameRight: {
    textAlign: 'right',
  },
  score: {
    color: theme.text,
    fontSize: 24,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    paddingHorizontal: spacing.md,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  status: {
    color: theme.good,
    fontSize: 11,
    fontWeight: '800',
  },
  statusDone: {
    color: theme.textDim,
  },
  meta: {
    color: theme.textFaint,
    fontSize: 10,
  },
  footer: {
    color: theme.textFaint,
    fontSize: 10,
    textAlign: 'center',
    paddingBottom: spacing.sm,
  },
});
