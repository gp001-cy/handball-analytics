import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { theme } from '../theme';
import { pulse } from '../haptics';
import { expectedGoals } from '../../domain/xg';
import { courtDistanceM } from '../../domain/court';

const VB = { x: 0, y: -3.4, w: 20, h: 23.4 };
const GOAL_L = 8.5;
const GOAL_R = 11.5;

export interface ShotIntent {
  kind: 'goal' | 'picker';
  courtX: number;
  courtY: number;
  goalX?: number;
  goalY?: number;
}

interface DragPoint {
  x: number;
  y: number;
}

interface Props {
  onShotIntent: (intent: ShotIntent) => void;
  shooterLabel?: string | null;
  modifierLabels?: string[];
  disabled?: boolean;
}

export default function CourtCanvas({ onShotIntent, shooterLabel, modifierLabels, disabled }: Props) {
  const [layout, setLayout] = useState({ w: 0, h: 0 });
  const [origin, setOrigin] = useState<DragPoint | null>(null);
  const [current, setCurrent] = useState<DragPoint | null>(null);

  const scale = useMemo(() => {
    if (!layout.w || !layout.h) return 1;
    return Math.min(layout.w / VB.w, layout.h / VB.h);
  }, [layout]);

  const canvasW = VB.w * scale;
  const canvasH = VB.h * scale;

  const gesture = useMemo(() => {
    const pxToMeters = (pxX: number, pxY: number): DragPoint => ({
      x: pxX / scale + VB.x - VB.w / 2,
      y: pxY / scale + VB.y + VB.h / 2,
    });

    return Gesture.Pan()
      .minDistance(4)
      .onBegin((e) => {
        if (disabled) return;
        const p = pxToMeters(e.x, e.y);
        const valid = p.y >= 0.35 && p.y <= 20.5 && Math.abs(p.x) <= 10.5;
        setOrigin(valid ? p : null);
        setCurrent(valid ? p : null);
        if (valid) pulse('drag');
      })
      .onUpdate((e) => {
        if (disabled || !origin) return;
        const p = pxToMeters(e.x, e.y);
        const clamped: DragPoint = {
          x: Math.max(-10.4, Math.min(10.4, p.x)),
          y: Math.max(-2.5, Math.min(20.5, p.y)),
        };
        setCurrent(clamped);
      })
      .onEnd(() => {
        if (disabled || !origin || !current) {
          setOrigin(null);
          setCurrent(null);
          return;
        }
        const goalX = current.x - 10;
        const goalY = -current.y;
        const inMouth = Math.abs(goalX) <= 1.5 && goalY >= -0.05 && goalY <= 2;
        if (inMouth) {
          pulse('goal');
          onShotIntent({ kind: 'goal', courtX: origin.x, courtY: origin.y, goalX, goalY });
        } else {
          pulse('tap');
          onShotIntent({ kind: 'picker', courtX: origin.x, courtY: origin.y });
        }
        setOrigin(null);
        setCurrent(null);
      })
      .onFinalize(() => {
        setOrigin(null);
        setCurrent(null);
      });
  }, [disabled, scale, origin, current, onShotIntent]);


  const toSvg = (p: DragPoint) => ({ x: p.x + 10, y: p.y });

  const dragPreview = origin && current ? { from: toSvg(origin), to: toSvg(current) } : null;
  const liveXg = origin ? expectedGoals({ courtX: origin.x, courtY: origin.y }) : null;
  const liveDistance = origin ? courtDistanceM(origin) : null;

  return (
    <View style={styles.wrap} onLayout={(e) => setLayout({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <GestureDetector gesture={gesture}>
        <View style={{ width: canvasW, height: canvasH, borderRadius: 12, overflow: 'hidden' }}>
          <Svg width={canvasW} height={canvasH} viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}>
            <Defs>
              <LinearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#12548C" />
                <Stop offset="1" stopColor="#0C3F6E" />
              </LinearGradient>
            </Defs>

            <Rect x={0} y={0} width={20} height={20} fill="url(#floor)" />

            <Path
              d="M 2.5 0 A 6 6 0 0 0 10 5.81 A 6 6 0 0 0 17.5 0 L 2.5 0 Z"
              fill={theme.sixM}
              opacity={0.75}
            />

            <Line x1={0} y1={0} x2={20} y2={0} stroke={theme.courtLine} strokeWidth={0.09} />
            <Line x1={0} y1={20} x2={20} y2={20} stroke={theme.courtLine} strokeWidth={0.09} />
            <Line x1={0} y1={0} x2={0} y2={20} stroke={theme.courtLine} strokeWidth={0.09} />
            <Line x1={20} y1={0} x2={20} y2={20} stroke={theme.courtLine} strokeWidth={0.09} />

            <Path
              d="M 2.5 0 A 6 6 0 0 0 10 5.81 A 6 6 0 0 0 17.5 0"
              fill="none"
              stroke={theme.courtLine}
              strokeWidth={0.1}
            />
            <Path
              d="M 0 2.96 A 9 9 0 0 0 10 8.87 A 9 9 0 0 0 20 2.96"
              fill="none"
              stroke={theme.courtLineSoft}
              strokeWidth={0.1}
              strokeDasharray={[0.5, 0.35]}
            />
            <Line x1={9.5} y1={7} x2={10.5} y2={7} stroke={theme.courtLine} strokeWidth={0.09} />
            <Line x1={9.85} y1={4} x2={10.15} y2={4} stroke={theme.courtLineSoft} strokeWidth={0.07} />

            <Rect x={GOAL_L - 0.5} y={-2.6} width={4} height={2.6} fill="rgba(250, 204, 21, 0.05)" />
            <Rect x={GOAL_L} y={-2} width={3} height={2} fill="rgba(15, 23, 42, 0.85)" />
            <G stroke={theme.goalNet} strokeWidth={0.045} opacity={0.65}>
              <Line x1={GOAL_L + 0.75} y1={-2} x2={GOAL_L + 0.75} y2={0} />
              <Line x1={GOAL_L + 1.5} y1={-2} x2={GOAL_L + 1.5} y2={0} />
              <Line x1={GOAL_L + 2.25} y1={-2} x2={GOAL_L + 2.25} y2={0} />
              <Line x1={GOAL_L} y1={-1.33} x2={GOAL_R} y2={-1.33} />
              <Line x1={GOAL_L} y1={-0.67} x2={GOAL_R} y2={-0.67} />
            </G>
            <Line x1={GOAL_L} y1={-2} x2={GOAL_L} y2={0} stroke="#F8FAFC" strokeWidth={0.14} />
            <Line x1={GOAL_R} y1={-2} x2={GOAL_R} y2={0} stroke="#F8FAFC" strokeWidth={0.14} />
            <Line x1={GOAL_L} y1={-2} x2={GOAL_R} y2={-2} stroke="#F8FAFC" strokeWidth={0.14} />

            {dragPreview && (
              <G>
                <Path
                  d={`M ${dragPreview.from.x} ${dragPreview.from.y} Q ${(dragPreview.from.x + dragPreview.to.x) / 2} ${(dragPreview.from.y + dragPreview.to.y) / 2 - 1.2} ${dragPreview.to.x} ${dragPreview.to.y}`}
                  fill="none"
                  stroke={theme.drag}
                  strokeWidth={0.16}
                  strokeLinecap="round"
                  opacity={0.95}
                />
                <Circle cx={dragPreview.from.x} cy={dragPreview.from.y} r={0.42} fill={theme.drag} opacity={0.9} />
                <Circle cx={dragPreview.from.x} cy={dragPreview.from.y} r={0.42} fill="none" stroke="#111827" strokeWidth={0.08} />
                <Circle cx={dragPreview.to.x} cy={dragPreview.to.y} r={0.3} fill="none" stroke={theme.drag} strokeWidth={0.14} />
                {liveXg != null && (
                  <SvgText
                    x={dragPreview.from.x}
                    y={dragPreview.from.y - 0.9}
                    fontSize={0.95}
                    fontWeight="bold"
                    fill="#FDE047"
                    textAnchor="middle"
                  >
                    {`xG ${Math.round(liveXg * 100)}% · ${liveDistance?.toFixed(1)}m`}
                  </SvgText>
                )}
              </G>
            )}
          </Svg>
        </View>
      </GestureDetector>

      <View style={styles.hud} pointerEvents="none">
        <Text style={styles.hudText}>
          {shooterLabel ? `Shooter: ${shooterLabel}` : 'Select a player on the dock, then drag court → goal'}
        </Text>
        {modifierLabels && modifierLabels.length > 0 && (
          <Text style={styles.hudMods}>{modifierLabels.join(' · ')}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  hud: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    right: 12,
    alignItems: 'center',
  },
  hudText: {
    color: theme.textDim,
    fontSize: 12,
    backgroundColor: 'rgba(11, 18, 32, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  hudMods: {
    color: theme.amber,
    fontSize: 11,
    marginTop: 4,
    backgroundColor: 'rgba(11, 18, 32, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
