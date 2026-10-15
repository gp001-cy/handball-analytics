import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { radius, spacing, theme } from '../theme';
import { pulse } from '../haptics';
import { otherSide } from '../../domain/selectors';
import type { MatchStoreState } from '../../state/matchStore';
import type { TeamSide, TurnoverCode } from '../../domain/types';

interface Props {
  state: MatchStoreState;
}

const TURNOVER_BUTTONS: { code: TurnoverCode; label: string }[] = [
  { code: 'TO_PASS_BAD', label: 'BAD PASS' },
  { code: 'TO_CATCH_DROP', label: 'CATCH ERR' },
  { code: 'TO_DRIBBLE', label: 'DRIBBLE ERR' },
  { code: 'TF_STEPS', label: 'STEPS' },
  { code: 'TF_3SEC', label: '3 SEC' },
  { code: 'TF_AREA', label: 'AREA' },
  { code: 'TF_PASSIVE', label: 'PASSIVE' },
  { code: 'TF_OFF_FOUL', label: 'OFF FOUL' },
];

export default function EventButtons({ state }: Props) {
  const [redArmed, setRedArmed] = useState(false);
  const selected = state.selectedPlayerId;
  const side: TeamSide = state.selectedTeamSide;

  const requirePlayer = (): string | null => {
    if (!selected) {
      pulse('error');
      return null;
    }
    return selected;
  };

  const turnover = (code: TurnoverCode) => {
    const pid = requirePlayer();
    if (!pid) return;
    pulse('tap');
    state.logTurnover(code, side, pid);
  };

  return (
    <View style={styles.wrap}>
      {!selected && <Text style={styles.hint}>Select a player to tag events</Text>}
      <ScrollView>
        <Text style={styles.group}>BALL LOSS</Text>
        <View style={styles.grid}>
          {TURNOVER_BUTTONS.map((b) => (
            <Btn key={b.code} label={b.label} dim={!selected} onPress={() => turnover(b.code)} />
          ))}
        </View>

        <Text style={styles.group}>DEFENSE</Text>
        <View style={styles.grid}>
          <Btn
            label="STOP FOUL"
            dim={!selected}
            onPress={() => {
              const pid = requirePlayer();
              if (!pid) return;
              pulse('tap');
              state.logStopFoul(side, pid);
            }}
          />
          <Btn
            label="STEAL"
            dim={!selected}
            onPress={() => {
              const pid = requirePlayer();
              if (!pid) return;
              pulse('flag');
              state.logTurnover('DEF_STEAL_ANTICIPATION', otherSide(side), undefined, pid);
            }}
          />
          <Btn
            label="CHARGE WON"
            dim={!selected}
            onPress={() => {
              const pid = requirePlayer();
              if (!pid) return;
              pulse('tap');
              state.logChargeDrawn(side, pid);
            }}
          />
          <Btn
            label="7M DRAWN"
            dim={!selected}
            onPress={() => {
              const pid = requirePlayer();
              if (!pid) return;
              pulse('flag');
              state.logSevenMAwarded(side, pid);
            }}
          />
        </View>

        <Text style={styles.group}>DISCIPLINE</Text>
        <View style={styles.grid}>
          <Btn
            label="2-MIN"
            dim={!selected}
            warn
            onPress={() => {
              const pid = requirePlayer();
              if (!pid) return;
              pulse('flag');
              state.logSuspension(side, pid);
            }}
          />
          <Btn
            label={redArmed ? 'CONFIRM RED' : 'RED CARD'}
            dim={!selected}
            danger
            onPress={() => {
              const pid = requirePlayer();
              if (!pid) return;
              if (!redArmed) {
                pulse('flag');
                setRedArmed(true);
                return;
              }
              pulse('error');
              state.logDirectRed(side, pid);
              setRedArmed(false);
            }}
          />
        </View>

        <Text style={styles.group}>SYSTEM</Text>
        <View style={styles.grid}>
          <Btn
            label={state.match?.atoArmed ? 'ATO ARMED ✓' : 'ARM ATO'}
            gold={state.match?.atoArmed}
            onPress={() => {
              pulse('tap');
              state.armATO();
            }}
          />
          <Btn
            label="UNDO"
            onPress={() => {
              pulse('tap');
              state.undo();
            }}
          />
          <Btn
            label="REDO"
            onPress={() => {
              pulse('tap');
              state.redo();
            }}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function Btn({
  label,
  onPress,
  dim,
  warn,
  danger,
  gold,
}: {
  label: string;
  onPress: () => void;
  dim?: boolean;
  warn?: boolean;
  danger?: boolean;
  gold?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.btn,
        dim && styles.btnDim,
        warn && styles.btnWarn,
        danger && styles.btnDanger,
        gold && styles.btnGold,
      ]}
    >
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 196,
    backgroundColor: theme.panel,
    borderLeftWidth: 1,
    borderLeftColor: theme.border,
    padding: spacing.sm,
  },
  hint: {
    color: theme.warn,
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 4,
  },
  group: {
    color: theme.textFaint,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
    marginTop: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  btn: {
    backgroundColor: theme.panelAlt,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 8,
    minWidth: 86,
    flexGrow: 1,
    flexBasis: 86,
    alignItems: 'center',
  },
  btnDim: {
    opacity: 0.45,
  },
  btnWarn: {
    backgroundColor: 'rgba(251, 191, 36, 0.25)',
  },
  btnDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
  },
  btnGold: {
    backgroundColor: 'rgba(250, 204, 21, 0.35)',
  },
  btnText: {
    color: theme.text,
    fontSize: 11,
    fontWeight: '700',
  },
});
