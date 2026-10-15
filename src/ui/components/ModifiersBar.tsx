import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { radius, theme } from '../theme';
import { SHOT_TECHNIQUES, type ShotTechnique } from '../../domain/types';

export interface ArmedModifiers {
  technique: ShotTechnique | undefined;
  contested: boolean;
  fastBreak: boolean;
  sevenMeter: boolean;
}

interface Props {
  armed: ArmedModifiers;
  onChange: (next: ArmedModifiers) => void;
}

export default function ModifiersBar({ armed, onChange }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      <Text style={styles.label}>TECH</Text>
      {SHOT_TECHNIQUES.map((t) => (
        <Pressable
          key={t}
          style={[styles.chip, armed.technique === t && styles.chipOn]}
          onPress={() => onChange({ ...armed, technique: armed.technique === t ? undefined : t })}
        >
          <Text style={[styles.chipText, armed.technique === t && styles.chipTextOn]}>{t}</Text>
        </Pressable>
      ))}
      <Text style={styles.divider}>|</Text>
      <Pressable
        style={[styles.chip, armed.contested && styles.chipOn]}
        onPress={() => onChange({ ...armed, contested: !armed.contested })}
      >
        <Text style={[styles.chipText, armed.contested && styles.chipTextOn]}>CONTESTED</Text>
      </Pressable>
      <Pressable
        style={[styles.chip, armed.fastBreak && styles.chipOnGold]}
        onPress={() => onChange({ ...armed, fastBreak: !armed.fastBreak })}
      >
        <Text style={[styles.chipText, armed.fastBreak && styles.chipTextOn]}>FAST BREAK</Text>
      </Pressable>
      <Pressable
        style={[styles.chip, armed.sevenMeter && styles.chipOnGold]}
        onPress={() => onChange({ ...armed, sevenMeter: !armed.sevenMeter })}
      >
        <Text style={[styles.chipText, armed.sevenMeter && styles.chipTextOn]}>7M</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  label: {
    color: theme.textFaint,
    fontSize: 10,
    fontWeight: '800',
    marginRight: 2,
  },
  divider: {
    color: theme.textFaint,
    marginHorizontal: 4,
  },
  chip: {
    backgroundColor: theme.panelAlt,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  chipOn: {
    backgroundColor: theme.accentSoft,
  },
  chipOnGold: {
    backgroundColor: 'rgba(250, 204, 21, 0.4)',
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
