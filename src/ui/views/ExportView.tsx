import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { radius, spacing, theme } from '../theme';
import { pulse } from '../haptics';
import type { MatchStoreState } from '../../state/matchStore';
import type { GameDerivation } from '../../domain/selectors';
import { toMatchJson, toSportscodeXml } from '../../domain/sportscode';

interface Props {
  state: MatchStoreState;
  game: GameDerivation;
}

export default function ExportView({ state, game }: Props) {
  const match = state.match!;
  const [copied, setCopied] = useState<string | null>(null);

  const xml = useMemo(() => toSportscodeXml(match, game), [match, game]);
  const json = useMemo(() => toMatchJson(match, game), [match, game]);

  const copy = async (label: string, text: string) => {
    await Clipboard.setStringAsync(text);
    pulse('tap');
    setCopied(label);
    setTimeout(() => setCopied(null), 2500);
  };

  const offsetSec = Math.round(match.videoOffsetMs / 1000);

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Export & Video Sync</Text>
      <Text style={styles.sub}>
        Sportscode XML timeline and full JSON dataset. Every event carries clock time, so the XML aligns 1:1 with match video.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Video Offset</Text>
        <Text style={styles.note}>
          If your video started before/after the match clock, set the offset (current: {offsetSec}s). XML times are shifted accordingly.
        </Text>
        <OffsetEditor
          initial={offsetSec}
          onSet={(sec) => {
            pulse('tap');
            state.setVideoOffsetMs(sec * 1000);
          }}
        />
      </View>

      <View style={styles.card}>
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle}>Sportscode XML</Text>
          <Pressable style={styles.btn} onPress={() => copy('XML', xml)}>
            <Text style={styles.btnText}>{copied === 'XML' ? 'COPIED ✓' : 'COPY XML'}</Text>
          </Pressable>
        </View>
        <Text style={styles.note}>{countEvents(match.events.length)} · {xml.length.toLocaleString()} chars</Text>
        <ScrollView horizontal style={styles.preview}>
          <Text style={styles.mono}>{xml.slice(0, 2200)}{xml.length > 2200 ? '\n…' : ''}</Text>
        </ScrollView>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle}>Full JSON Dataset</Text>
          <Pressable style={styles.btn} onPress={() => copy('JSON', json)}>
            <Text style={styles.btnText}>{copied === 'JSON' ? 'COPIED ✓' : 'COPY JSON'}</Text>
          </Pressable>
        </View>
        <Text style={styles.note}>
          Includes events, derived game state, player lines, possessions and stints — everything needed for re-analysis in Python/R/Pandas.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Raw Event Log</Text>
        <ScrollView style={styles.eventList}>
          {match.events.slice(-40).reverse().map((ev) => (
            <Text key={ev.id} style={styles.eventLine} numberOfLines={1}>
              {formatMs(ev.clockMs)} P{ev.period} · {ev.type}
              {ev.outcome ? ` ${ev.outcome}` : ''}
              {ev.zone ? ` · ${ev.zone}` : ''}
              {ev.xg != null ? ` · xG ${(ev.xg * 100).toFixed(0)}%` : ''}
            </Text>
          ))}
          {match.events.length === 0 && <Text style={styles.note}>No events tagged yet</Text>}
        </ScrollView>
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function OffsetEditor({ initial, onSet }: { initial: number; onSet: (sec: number) => void }) {
  const [value, setValue] = useState(String(initial));
  return (
    <View style={styles.offsetRow}>
      <TextInput
        style={styles.offsetInput}
        keyboardType="numbers-and-punctuation"
        value={value}
        onChangeText={setValue}
        placeholder="seconds"
        placeholderTextColor={theme.textFaint}
      />
      <Pressable
        style={styles.btn}
        onPress={() => {
          const sec = Number.parseFloat(value);
          if (!Number.isNaN(sec)) onSet(Math.round(sec));
        }}
      >
        <Text style={styles.btnText}>APPLY</Text>
      </Pressable>
    </View>
  );
}

function countEvents(n: number): string {
  return `${n} event${n === 1 ? '' : 's'}`;
}

function formatMs(ms: number): string {
  const totalSec = Math.floor(Math.max(0, ms) / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: theme.bg },
  content: { padding: spacing.md },
  h1: { color: theme.text, fontSize: 15, fontWeight: '800' },
  sub: { color: theme.textDim, fontSize: 11, marginTop: 2, marginBottom: spacing.sm },
  card: {
    backgroundColor: theme.panel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: { color: theme.text, fontSize: 13, fontWeight: '800' },
  note: { color: theme.textDim, fontSize: 11, marginTop: 4 },
  btn: {
    backgroundColor: theme.accentSoft,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  btnText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  preview: {
    backgroundColor: theme.panelDeep,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
    maxHeight: 220,
    padding: spacing.sm,
  },
  mono: {
    color: theme.textDim,
    fontSize: 10,
    fontFamily: 'monospace',
  },
  offsetRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  offsetInput: {
    backgroundColor: theme.panelDeep,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: theme.border,
    color: theme.text,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    width: 110,
    fontSize: 12,
  },
  eventList: {
    maxHeight: 260,
    marginTop: spacing.sm,
  },
  eventLine: {
    color: theme.textDim,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    paddingVertical: 1,
  },
});
