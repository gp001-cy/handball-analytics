import React, { useRef } from 'react';
import { formatSampleRate } from '../../i18n/translations';
import {
  GoalTargetCell,
  GoalTargetCoords,
  LocaleCode,
  MatchEvent,
  ShotOutcome,
} from '../../types/domain';

export function classifyGoalTarget(
  normX: number,
  normY: number
): {
  cell: GoalTargetCell;
  suggestedOutcome?: ShotOutcome;
} {
  // Post width band around x = 0 and x = 1, crossbar band around y = 0
  const POST_BAND = 0.065;

  // Outside high (above crossbar)
  if (normY < -POST_BAND) {
    return { cell: 'HIGH', suggestedOutcome: 'missed_high' };
  }
  // Outside wide left / right
  if (normX < -POST_BAND) {
    return { cell: 'WIDE_L', suggestedOutcome: 'missed_wide' };
  }
  if (normX > 1 + POST_BAND) {
    return { cell: 'WIDE_R', suggestedOutcome: 'missed_wide' };
  }

  // On Crossbar
  if (normY >= -POST_BAND && normY <= POST_BAND && normX >= -POST_BAND && normX <= 1 + POST_BAND) {
    return { cell: 'CROSSBAR', suggestedOutcome: 'crossbar' };
  }

  // On Left Post
  if (normX >= -POST_BAND && normX <= POST_BAND && normY >= 0) {
    return { cell: 'POST_L', suggestedOutcome: 'post' };
  }

  // On Right Post
  if (normX >= 1 - POST_BAND && normX <= 1 + POST_BAND && normY >= 0) {
    return { cell: 'POST_R', suggestedOutcome: 'post' };
  }

  // Inside 3x3 Goal Frame (normX in 0..1, normY in 0..1)
  const col = normX < 0.333 ? 'L' : normX < 0.667 ? 'C' : 'R';
  const row = normY < 0.333 ? 'T' : normY < 0.667 ? 'M' : 'B';
  const cell = `${row}${col}` as GoalTargetCell;
  return { cell };
}

export interface HandballGoalProps {
  mode: 'entry' | 'analytics';
  perspective?: 'shooter' | 'goalkeeper';
  locale: LocaleCode;
  selectedTarget?: GoalTargetCoords | null;
  onSelectTarget?: (
    coords: GoalTargetCoords,
    suggestedOutcome?: ShotOutcome
  ) => void;
  events?: MatchEvent[];
  teamColor?: string;
}

/**
 * Crisp 3×2 m IHF Handball Goal Vector Component.
 * Outer canvas includes wide-left, wide-right, and high-over-crossbar tap zones,
 * two-tone striped IHF goalposts/crossbar, and the 3×3 inner target grid.
 */
export const HandballGoal: React.FC<HandballGoalProps> = ({
  mode,
  perspective = 'shooter',
  locale,
  selectedTarget,
  onSelectTarget,
  events = [],
  teamColor = '#0ea5e9',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  // SVG Coordinate System:
  // Total ViewBox: 380 x 245
  // Inner 3x2m Goal Mouth: x from 40 to 340 (width = 300 => 100 units per meter)
  //                        y from 35 to 235 (height = 200 => 100 units per meter)
  // Post thickness = 8cm => 8 units
  const VIEW_W = 380;
  const VIEW_H = 245;
  const GOAL_X = 40;
  const GOAL_Y = 35;
  const GOAL_W = 300;
  const GOAL_H = 200;
  const POST_T = 9;

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (mode !== 'entry' || !onSelectTarget || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * VIEW_W;
    const svgY = ((e.clientY - rect.top) / rect.height) * VIEW_H;

    const normX = Number(((svgX - GOAL_X) / GOAL_W).toFixed(3));
    const normY = Number(((svgY - GOAL_Y) / GOAL_H).toFixed(3));

    const classified = classifyGoalTarget(normX, normY);
    onSelectTarget(
      {
        cell: classified.cell,
        normX,
        normY: Math.min(0.98, normY),
      },
      classified.suggestedOutcome
    );
  };

  const CELLS_3X3: Array<{
    cell: GoalTargetCell;
    col: number;
    row: number;
    label: string;
  }> = [
    { cell: 'TL', col: 0, row: 0, label: 'TL' },
    { cell: 'TC', col: 1, row: 0, label: 'TC' },
    { cell: 'TR', col: 2, row: 0, label: 'TR' },
    { cell: 'ML', col: 0, row: 1, label: 'ML' },
    { cell: 'MC', col: 1, row: 1, label: 'MC' },
    { cell: 'MR', col: 2, row: 1, label: 'MR' },
    { cell: 'BL', col: 0, row: 2, label: 'BL' },
    { cell: 'BC', col: 1, row: 2, label: 'BC' },
    { cell: 'BR', col: 2, row: 2, label: 'BR' },
  ];

  const shotEvents = events.filter((ev) => ev.category === 'shot' && ev.goalTarget);

  const cellStats = React.useMemo(() => {
    const map: Record<
      string,
      { goals: number; saves: number; onTarget: number; total: number }
    > = {};
    for (const c of CELLS_3X3) {
      map[c.cell] = { goals: 0, saves: 0, onTarget: 0, total: 0 };
    }
    for (const ev of shotEvents) {
      const cell = ev.goalTarget!.cell;
      if (map[cell]) {
        map[cell].total += 1;
        if (ev.subType === 'goal') {
          map[cell].goals += 1;
          map[cell].onTarget += 1;
        } else if (ev.subType === 'saved') {
          map[cell].saves += 1;
          map[cell].onTarget += 1;
        }
      }
    }
    return map;
  }, [shotEvents]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        border: '1px solid var(--border-strong)',
        background: 'var(--bg-court)',
      }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        onPointerDown={handlePointerDown}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          touchAction: 'manipulation',
          cursor: mode === 'entry' ? 'crosshair' : 'default',
        }}
        role="img"
        aria-label="3x2m IHF Handball Goal Target"
      >
        {/* Outer Miss Area (Wide Left / High / Wide Right) */}
        <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill="var(--bg-canvas)" />

        {/* Subtle Miss Zone Guides */}
        <text
          x="190"
          y="15"
          textAnchor="middle"
          fill="var(--text-muted)"
          fontSize="9"
          fontWeight="600"
        >
          HIGH / OVER
        </text>
        <text
          x="16"
          y="135"
          textAnchor="middle"
          fill="var(--text-muted)"
          fontSize="8.5"
          fontWeight="600"
          transform="rotate(-90 16 135)"
        >
          WIDE L
        </text>
        <text
          x="364"
          y="135"
          textAnchor="middle"
          fill="var(--text-muted)"
          fontSize="8.5"
          fontWeight="600"
          transform="rotate(90 364 135)"
        >
          WIDE R
        </text>

        {/* Goal Mouth Background */}
        <rect
          x={GOAL_X}
          y={GOAL_Y}
          width={GOAL_W}
          height={GOAL_H}
          fill="var(--bg-court)"
        />

        {/* 3x3 Cells Inside Goal */}
        {CELLS_3X3.map((item) => {
          const cellW = GOAL_W / 3;
          const cellH = GOAL_H / 3;
          const x = GOAL_X + item.col * cellW;
          const y = GOAL_Y + item.row * cellH;
          const isSelected = selectedTarget?.cell === item.cell;

          const st = cellStats[item.cell];
          const numerator = perspective === 'goalkeeper' ? st.saves : st.goals;
          const denominator =
            perspective === 'goalkeeper' ? st.onTarget : st.total;
          const formatted = formatSampleRate(numerator, denominator, locale, 0);

          // Subtle analytical fill intensity when sample is meaningful
          let fillBg = 'transparent';
          if (mode === 'entry' && isSelected) {
            fillBg = `${teamColor}26`;
          } else if (mode === 'analytics' && formatted.hasData) {
            const ratio = numerator / Math.max(1, denominator);
            fillBg =
              perspective === 'goalkeeper'
                ? `rgba(59, 130, 246, ${(0.08 + ratio * 0.25).toFixed(2)})`
                : `rgba(16, 185, 129, ${(0.08 + ratio * 0.25).toFixed(2)})`;
          }

          return (
            <g key={item.cell}>
              <rect
                x={x}
                y={y}
                width={cellW}
                height={cellH}
                fill={fillBg}
                stroke="var(--border-strong)"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              {/* Cell coordinate watermark */}
              <text
                x={x + 8}
                y={y + 14}
                fill="var(--text-muted)"
                fontSize="9"
                fontWeight="600"
                opacity="0.65"
              >
                {item.label}
              </text>

              {/* In Analytics Mode, show "4/5 · 80%" centered inside each cell */}
              {mode === 'analytics' && (
                <text
                  x={x + cellW / 2}
                  y={y + cellH / 2 + 5}
                  textAnchor="middle"
                  fill={
                    !formatted.hasData
                      ? 'var(--text-muted)'
                      : formatted.isLowSample
                      ? 'var(--text-secondary)'
                      : 'var(--text-primary)'
                  }
                  fontSize="11.5"
                  fontWeight={formatted.isLowSample ? '500' : '700'}
                  fontFamily="var(--font-mono)"
                  opacity={formatted.isLowSample ? 0.72 : 1}
                >
                  {formatted.combinedText}
                </text>
              )}
            </g>
          );
        })}

        {/* Goal Floor Line (Goal Line) */}
        <line
          x1={GOAL_X - POST_T}
          y1={GOAL_Y + GOAL_H}
          x2={GOAL_X + GOAL_W + POST_T}
          y2={GOAL_Y + GOAL_H}
          stroke="var(--court-line-strong)"
          strokeWidth="2.5"
        />

        {/* IHF Striped Goal Frame (Left Post, Right Post, Crossbar) */}
        {/* Base White Frame */}
        <path
          d={`M ${GOAL_X - POST_T / 2} ${GOAL_Y + GOAL_H} V ${
            GOAL_Y - POST_T / 2
          } H ${GOAL_X + GOAL_W + POST_T / 2} V ${GOAL_Y + GOAL_H}`}
          fill="none"
          stroke="#f8fafc"
          strokeWidth={POST_T}
          strokeLinejoin="miter"
        />
        {/* Red IHF 20cm Bands */}
        <path
          d={`M ${GOAL_X - POST_T / 2} ${GOAL_Y + GOAL_H} V ${
            GOAL_Y - POST_T / 2
          } H ${GOAL_X + GOAL_W + POST_T / 2} V ${GOAL_Y + GOAL_H}`}
          fill="none"
          stroke="#ef4444"
          strokeWidth={POST_T}
          strokeDasharray="18 18"
          strokeLinejoin="miter"
        />

        {/* Analytics Shot Placement Dots */}
        {mode === 'analytics' &&
          shotEvents.map((ev) => {
            if (!ev.goalTarget) return null;
            const cx = Math.max(12, Math.min(VIEW_W - 12, GOAL_X + ev.goalTarget.normX * GOAL_W));
            const cy = Math.max(12, Math.min(VIEW_H - 8, GOAL_Y + ev.goalTarget.normY * GOAL_H));
            const isGoal = ev.subType === 'goal';
            const isSave = ev.subType === 'saved';

            return (
              <g key={ev.id} transform={`translate(${cx}, ${cy})`}>
                {isGoal ? (
                  <circle
                    r="5.5"
                    fill="var(--sem-goal)"
                    stroke="#0b0d10"
                    strokeWidth="1.3"
                  />
                ) : isSave ? (
                  <circle
                    r="5"
                    fill="#0b0d10"
                    stroke="var(--sem-save)"
                    strokeWidth="2.2"
                  />
                ) : (
                  <g stroke="var(--sem-miss)" strokeWidth="2">
                    <line x1="-4" y1="-4" x2="4" y2="4" />
                    <line x1="4" y1="-4" x2="-4" y2="4" />
                  </g>
                )}
              </g>
            );
          })}

        {/* Active Selected Goal Target Pin (Live Entry Mode) */}
        {mode === 'entry' && selectedTarget && (
          <g
            transform={`translate(${
              Math.max(14, Math.min(VIEW_W - 14, GOAL_X + selectedTarget.normX * GOAL_W))
            }, ${
              Math.max(14, Math.min(VIEW_H - 10, GOAL_Y + selectedTarget.normY * GOAL_H))
            })`}
          >
            <circle r="13" fill={`${teamColor}33`} stroke={teamColor} strokeWidth="1.5" />
            <circle r="5.5" fill={teamColor} stroke="#ffffff" strokeWidth="1.5" />
          </g>
        )}
      </svg>
    </div>
  );
};
