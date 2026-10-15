import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radius, spacing, theme } from '../theme';
import { pulse } from '../haptics';
import { expectedGoals } from '../../domain/xg';
import { classifyZone } from '../../domain/zones';
import { ZONE_LABELS, type ShotOutcome } from '../../domain/types';

export interface PendingShot {
  courtX: number;
  courtY: number;
  goalX?: number;
  goalY?: number;
}

interface Props {
  intent: PendingShot;
  onPick: (outcome: ShotOutcome) => void;
  onCancel: () => void;
}

const OUTCOMES: ShotOutcome[] = ['GOAL', 'SAVE', 'WIDE', 'POST', 'BLOCKED'];

export default function OutcomePicker({ intent, onPick, onCancel }: Props) {
  const xg = expectedGoals({ courtX: intent.courtX, courtY: intent.courtY });
  const zone = classifyZone(intent.courtX, intent.courtY);
  const distance = Math.hypot(intent.courtX, intent.courtY);

  return (
    <View style={styles.wrap}>
      <View style={styles.info}>
        <Text style={styles.infoText}>
          {ZONE_LABELS[zone]} · {distance.toFixed(1)}m · xG {Math.round(xg * 100)}%
        </Text>
        <Text style={styles.infoSub}>Release outside goal frame — pick outcome</Text>
      </View>
      <View style={styles.row}>
        {OUTCOMES.map((o) => (
          <Pressable
            key={o}
            style={[styles.btn, o === 'GOAL' && styles.btnGoal]}
            onPress={() => {
              pulse(o === 'GOAL' ? 'goal' : 'tap');
              onPick(o);
            }}
          >
            <Text style={styles.btnText}>{o}</Text>
          </Pressable>
        ))}
        <Pressable
          style={styles.cancel}
          onPress={() => {
            pulse('tap');
            onCancel();
          }}
        >
          <Text style={styles.cancelText}>CANCEL</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.panelDeep,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 6,
  },
  info: {
    alignItems: 'center',
  },
  infoText: {
    color: theme.text,
    fontWeight: '800',
    fontSize: 13,
  },
  infoSub: {
    color: theme.textDim,
    fontSize: 11,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  btn: {
    backgroundColor: theme.panelAlt,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  btnGoal: {
    backgroundColor: theme.good,
  },
  btnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  cancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cancelText: {
    color: theme.textDim,
    fontWeight: '700',
    fontSize: 12,
  },
});
