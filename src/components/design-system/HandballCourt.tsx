import React, { useRef } from 'react';
import { formatSampleRate, TRANSLATIONS } from '../../i18n/translations';
import {
  CourtZone,
  DiagramAnnotation,
  LocaleCode,
  MatchEvent,
  PositionCode,
  ShotOriginCoords,
} from '../../types/domain';

/**
 * Classifies an (xMeters, yMeters) point on the 20m wide x 20m attacking half-court
 * into an official IHF analytical zone and maps it to the likely shooter's position.
 */
export function classifyCourtOrigin(
  xMeters: number,
  yMeters: number,
  overrideZone?: CourtZone
): {
  zone: CourtZone;
  suggestedPosition: PositionCode;
} {
  if (overrideZone) {
    const mapPos: Record<CourtZone, PositionCode> = {
      LW: 'LW',
      RW: 'RW',
      LB_9M: 'LB',
      CB_9M: 'CB',
      RB_9M: 'RB',
      '6M_LEFT': 'LW',
      '6M_CENTRE': 'PV',
      '6M_RIGHT': 'RW',
      '7M': 'CB',
      BREAKTHROUGH: 'CB',
      FAST_BREAK: 'LW',
      EMPTY_NET_OWN_HALF: 'GK',
    };
    return { zone: overrideZone, suggestedPosition: mapPos[overrideZone] };
  }

  // Distance from nearest goalpost (8.5, 0) or (11.5, 0) or straight segment [8.5..11.5]
  const dx =
    xMeters < 8.5 ? 8.5 - xMeters : xMeters > 11.5 ? xMeters - 11.5 : 0;
  const distFromGoalArc = Math.hypot(dx, yMeters);

  // Check 7m spot proximity (x in 9.1..10.9, y in 6.6..7.45)
  if (Math.abs(xMeters - 10) <= 0.85 && Math.abs(yMeters - 7.0) <= 0.42) {
    return { zone: '7M', suggestedPosition: 'CB' };
  }

  // Beyond 14.5m -> Fast Break / Own Half Empty Net
  if (yMeters >= 15.2) {
    return { zone: 'EMPTY_NET_OWN_HALF', suggestedPosition: 'GK' };
  }

  // Wing corridors (left x < 4.4m and y < 7.5m, right x > 15.6m and y < 7.5m)
  if (xMeters < 4.5 && yMeters < 7.8) {
    return { zone: 'LW', suggestedPosition: 'LW' };
  }
  if (xMeters > 15.5 && yMeters < 7.8) {
    return { zone: 'RW', suggestedPosition: 'RW' };
  }

  // Inside 6m–8.7m zone (6m line / pivot / breakthrough)
  if (distFromGoalArc < 8.85) {
    if (xMeters < 7.2) {
      return { zone: '6M_LEFT', suggestedPosition: 'LB' };
    }
    if (xMeters > 12.8) {
      return { zone: '6M_RIGHT', suggestedPosition: 'RB' };
    }
    return { zone: '6M_CENTRE', suggestedPosition: 'PV' };
  }

  // Backcourt 9m+ zones (Left Back, Centre Back, Right Back)
  if (xMeters < 7.0) {
    return { zone: 'LB_9M', suggestedPosition: 'LB' };
  }
  if (xMeters > 13.0) {
    return { zone: 'RB_9M', suggestedPosition: 'RB' };
  }
  return { zone: 'CB_9M', suggestedPosition: 'CB' };
}

export interface HandballCourtProps {
  mode: 'entry' | 'analytics' | 'tactical';
  locale: LocaleCode;
  selectedOrigin?: ShotOriginCoords | null;
  onSelectOrigin?: (
    coords: ShotOriginCoords,
    suggestedPosition: PositionCode
  ) => void;
  events?: MatchEvent[];
  activeZoneFilter?: 'all' | CourtZone;
  onZoneFilterSelect?: (zone: CourtZone) => void;
  annotations?: DiagramAnnotation[];
  onAddAnnotation?: (annotation: DiagramAnnotation) => void;
  teamColor?: string;
  compact?: boolean;
}

/**
 * Crisp SVG 20×16.5 m Attacking Half-Court (scale: 1m = 20 SVG units => 400 × 330 viewBox).
 * Goal is at top (y = 0), attacking upwards toward the goal, matching standard bench perspective.
 */
export const HandballCourt: React.FC<HandballCourtProps> = ({
  mode,
  locale,
  selectedOrigin,
  onSelectOrigin,
  events = [],
  activeZoneFilter = 'all',
  onZoneFilterSelect,
  annotations = [],
  onAddAnnotation,
  teamColor = '#0ea5e9',
  compact = false,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const t = TRANSLATIONS[locale];

  // Coordinate mapping: 1 meter = 20 SVG units
  // Court width = 20m -> 400 units (x: 0..400)
  // Court depth shown = 16.5m -> 330 units (y: 0..330, with 14px top margin for goal cage)
  const SCALE = 20;
  const TOP_PAD = 18;
  const VIEW_W = 400;
  const VIEW_H = 330 + TOP_PAD;

  const handleSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * VIEW_W;
    const relY = ((e.clientY - rect.top) / rect.height) * VIEW_H - TOP_PAD;

    const xMeters = Number(Math.max(0.3, Math.min(19.7, relX / SCALE)).toFixed(2));
    const yMeters = Number(Math.max(0.5, Math.min(16.2, relY / SCALE)).toFixed(2));

    const classified = classifyCourtOrigin(xMeters, yMeters);

    if (mode === 'entry' && onSelectOrigin) {
      onSelectOrigin(
        {
          zone: classified.zone,
          xMeters,
          yMeters,
        },
        classified.suggestedPosition
      );
    } else if (mode === 'analytics' && onZoneFilterSelect) {
      onZoneFilterSelect(classified.zone);
    } else if (mode === 'tactical' && onAddAnnotation) {
      onAddAnnotation({
        id: `ann-${Date.now()}`,
        type: 'player_marker',
        label: classified.suggestedPosition,
        points: [{ x: xMeters, y: yMeters }],
        color: teamColor,
      });
    }
  };

  // Compute zone stats for analytics mode
  const shotEvents = events.filter((ev) => ev.category === 'shot' && ev.shotOrigin);
  const zoneStats = React.useMemo(() => {
    const map: Record<CourtZone, { goals: number; shots: number }> = {
      LW: { goals: 0, shots: 0 },
      RW: { goals: 0, shots: 0 },
      LB_9M: { goals: 0, shots: 0 },
      CB_9M: { goals: 0, shots: 0 },
      RB_9M: { goals: 0, shots: 0 },
      '6M_LEFT': { goals: 0, shots: 0 },
      '6M_CENTRE': { goals: 0, shots: 0 },
      '6M_RIGHT': { goals: 0, shots: 0 },
      '7M': { goals: 0, shots: 0 },
      BREAKTHROUGH: { goals: 0, shots: 0 },
      FAST_BREAK: { goals: 0, shots: 0 },
      EMPTY_NET_OWN_HALF: { goals: 0, shots: 0 },
    };
    for (const ev of shotEvents) {
      const z = ev.shotOrigin!.zone;
      if (map[z]) {
        map[z].shots += 1;
        if (ev.subType === 'goal') map[z].goals += 1;
      }
    }
    return map;
  }, [shotEvents]);

  // Representative badge centers (in meters) for the court zones
  const ZONE_BADGE_POSITIONS: Array<{ zone: CourtZone; label: string; x: number; y: number }> = [
    { zone: 'LW', label: 'LW', x: 2.1, y: 3.3 },
    { zone: 'RW', label: 'RW', x: 17.9, y: 3.3 },
    { zone: '6M_LEFT', label: '6m L', x: 5.4, y: 6.2 },
    { zone: '6M_CENTRE', label: '6m C', x: 10.0, y: 5.5 },
    { zone: '6M_RIGHT', label: '6m R', x: 14.6, y: 6.2 },
    { zone: '7M', label: '7m', x: 10.0, y: 7.4 },
    { zone: 'LB_9M', label: 'LB 9m', x: 4.2, y: 11.2 },
    { zone: 'CB_9M', label: 'CB 9m', x: 10.0, y: 11.6 },
    { zone: 'RB_9M', label: 'RB 9m', x: 15.8, y: 11.2 },
  ];

  // IHF 6m Goal Area Path:
  // Starts at (2.5m, 0) -> quarter arc r=6m centered at (8.5m, 0) to (8.5m, 6m)
  // -> straight line to (11.5m, 6m) -> quarter arc r=6m centered at (11.5m, 0) to (17.5m, 0)
  // In SVG coords (with TOP_PAD):
  // 2.5m = 50, 8.5m = 170, 11.5m = 230, 17.5m = 350, 6m = 120
  const path6m = `M 50 ${TOP_PAD} A 120 120 0 0 0 170 ${TOP_PAD + 120} L 230 ${
    TOP_PAD + 120
  } A 120 120 0 0 0 350 ${TOP_PAD} Z`;

  // IHF 9m Dashed Free-Throw Arc:
  // Radius = 9m (180 units) from (170, TOP_PAD) and (230, TOP_PAD).
  // At x = 0 (left sideline), dx = 170, so dy = sqrt(180^2 - 170^2) = sqrt(32400 - 28900) = sqrt(3500) = 59.16 units
  const y9mSideline = TOP_PAD + 59.16;
  const path9m = `M 0 ${y9mSideline} A 180 180 0 0 0 170 ${
    TOP_PAD + 180
  } L 230 ${TOP_PAD + 180} A 180 180 0 0 0 400 ${y9mSideline}`;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        width: '100%',
      }}
    >
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
          onPointerDown={handleSvgPointerDown}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            touchAction: 'manipulation',
            cursor: 'crosshair',
          }}
          role="img"
          aria-label="20x40m IHF Handball Court"
        >
          {/* Main Court Surface */}
          <rect
            x="0"
            y={TOP_PAD}
            width={VIEW_W}
            height={VIEW_H - TOP_PAD}
            fill="var(--bg-court)"
          />

          {/* 6m Goal Area Surface */}
          <path d={path6m} fill="var(--bg-court-6m)" />

          {/* Subtle Radial Zone Sectors (Guide lines for LB / CB / RB & Wings) */}
          <line
            x1="170"
            y1={TOP_PAD + 120}
            x2="95"
            y2={VIEW_H}
            stroke="var(--border-subtle)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <line
            x1="230"
            y1={TOP_PAD + 120}
            x2="305"
            y2={VIEW_H}
            stroke="var(--border-subtle)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <line
            x1="92"
            y1={TOP_PAD + 82}
            x2="0"
            y2={TOP_PAD + 150}
            stroke="var(--border-subtle)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <line
            x1="308"
            y1={TOP_PAD + 82}
            x2="400"
            y2={TOP_PAD + 150}
            stroke="var(--border-subtle)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />

          {/* 9m Free-Throw Line (Dashed IHF standard) */}
          <path
            d={path9m}
            fill="none"
            stroke="var(--court-line)"
            strokeWidth="1.75"
            strokeDasharray="7 6"
          />

          {/* 6m Goal-Area Line (Solid IHF standard) */}
          <path
            d={path6m}
            fill="none"
            stroke="var(--court-line-strong)"
            strokeWidth="2"
          />

          {/* 4m Goalkeeper Restraining Line (15cm wide at y = 4.0m = 80 units) */}
          <line
            x1="196"
            y1={TOP_PAD + 80}
            x2="204"
            y2={TOP_PAD + 80}
            stroke="var(--court-line-strong)"
            strokeWidth="2"
          />

          {/* 7m Penalty Mark (1.0m wide at y = 7.0m = 140 units) */}
          <line
            x1="190"
            y1={TOP_PAD + 140}
            x2="210"
            y2={TOP_PAD + 140}
            stroke="var(--court-line-strong)"
            strokeWidth="2.5"
          />

          {/* Outer Goal Line & Sidelines */}
          <line
            x1="0"
            y1={TOP_PAD}
            x2="400"
            y2={TOP_PAD}
            stroke="var(--court-line-strong)"
            strokeWidth="2"
          />

          {/* Center Line Hint at Bottom (y = 16.5m) */}
          <line
            x1="0"
            y1={VIEW_H - 1}
            x2="400"
            y2={VIEW_H - 1}
            stroke="var(--court-line)"
            strokeWidth="1.5"
          />
          <circle
            cx="200"
            cy={VIEW_H}
            r="24"
            fill="none"
            stroke="var(--court-line)"
            strokeWidth="1.2"
          />

          {/* 3m x 2m Goal Frame at Top (x: 170..230, depth: 14px) */}
          <rect
            x="170"
            y={TOP_PAD - 13}
            width="60"
            height="13"
            fill="rgba(14, 165, 233, 0.08)"
            stroke="var(--text-primary)"
            strokeWidth="2"
          />
          {/* Striped IHF Goal Line Posts */}
          <line
            x1="170"
            y1={TOP_PAD}
            x2="230"
            y2={TOP_PAD}
            stroke="#ef4444"
            strokeWidth="3"
            strokeDasharray="6 6"
          />

          {/* Zone Labels / Analytical Badges */}
          {ZONE_BADGE_POSITIONS.map((zp) => {
            const cx = zp.x * SCALE;
            const cy = TOP_PAD + zp.y * SCALE;
            const isSelectedZone =
              (mode === 'entry' && selectedOrigin?.zone === zp.zone) ||
              (mode === 'analytics' && activeZoneFilter === zp.zone);

            if (mode === 'analytics') {
              const st = zoneStats[zp.zone];
              const formatted = formatSampleRate(st.goals, st.shots, locale, 0);
              return (
                <g key={zp.zone} transform={`translate(${cx}, ${cy})`}>
                  <rect
                    x="-34"
                    y="-14"
                    width="68"
                    height="28"
                    rx="5"
                    fill={
                      isSelectedZone
                        ? 'var(--accent-primary-subtle)'
                        : 'rgba(11, 13, 16, 0.82)'
                    }
                    stroke={
                      isSelectedZone ? 'var(--accent-primary)' : 'var(--border-strong)'
                    }
                    strokeWidth={isSelectedZone ? '1.5' : '1'}
                  />
                  <text
                    x="0"
                    y="-2"
                    textAnchor="middle"
                    fill="var(--text-muted)"
                    fontSize="8.5"
                    fontWeight="600"
                  >
                    {zp.label}
                  </text>
                  <text
                    x="0"
                    y="9"
                    textAnchor="middle"
                    fill={
                      !formatted.hasData
                        ? 'var(--text-muted)'
                        : formatted.isLowSample
                        ? 'var(--text-secondary)'
                        : 'var(--text-primary)'
                    }
                    fontSize="9.5"
                    fontWeight="700"
                    fontFamily="var(--font-mono)"
                  >
                    {formatted.combinedText}
                  </text>
                </g>
              );
            }

            return (
              <g key={zp.zone} transform={`translate(${cx}, ${cy})`} pointerEvents="none">
                <text
                  x="0"
                  y="3"
                  textAnchor="middle"
                  fill={isSelectedZone ? 'var(--accent-primary)' : 'var(--text-muted)'}
                  fontSize="10"
                  fontWeight={isSelectedZone ? '700' : '600'}
                  opacity={isSelectedZone ? 1 : 0.65}
                >
                  {zp.label}
                </text>
              </g>
            );
          })}

          {/* Analytics Shot Origin Dots (Crisp vector markers: Filled circle = Goal, Ring = Saved, Cross = Miss/Block) */}
          {mode === 'analytics' &&
            shotEvents.map((ev) => {
              if (!ev.shotOrigin) return null;
              if (activeZoneFilter !== 'all' && ev.shotOrigin.zone !== activeZoneFilter) {
                return null;
              }
              const cx = ev.shotOrigin.xMeters * SCALE;
              const cy = TOP_PAD + Math.min(16.0, ev.shotOrigin.yMeters) * SCALE;
              const isGoal = ev.subType === 'goal';
              const isSave = ev.subType === 'saved';

              return (
                <g key={ev.id} transform={`translate(${cx}, ${cy})`}>
                  {isGoal ? (
                    <circle
                      r="5.5"
                      fill="var(--sem-goal)"
                      stroke="#0b0d10"
                      strokeWidth="1.2"
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

          {/* Tactical Annotations (Pre-Match Game Plan Mode) */}
          {annotations.map((ann) => {
            if (ann.points.length === 0) return null;
            if (ann.type === 'player_marker') {
              const pt = ann.points[0];
              const cx = pt.x * SCALE;
              const cy = TOP_PAD + pt.y * SCALE;
              return (
                <g key={ann.id} transform={`translate(${cx}, ${cy})`}>
                  <circle r="11" fill={ann.color} stroke="#fff" strokeWidth="1.5" />
                  <text
                    x="0"
                    y="3.5"
                    textAnchor="middle"
                    fill="#fff"
                    fontSize="9"
                    fontWeight="700"
                  >
                    {ann.label || 'P'}
                  </text>
                </g>
              );
            }
            if (ann.points.length >= 2) {
              const p1 = ann.points[0];
              const p2 = ann.points[1];
              const x1 = p1.x * SCALE;
              const y1 = TOP_PAD + p1.y * SCALE;
              const x2 = p2.x * SCALE;
              const y2 = TOP_PAD + p2.y * SCALE;
              return (
                <g key={ann.id}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={ann.color}
                    strokeWidth="2.5"
                    strokeDasharray={ann.type === 'pass' ? '5 4' : undefined}
                  />
                  <circle cx={x2} cy={y2} r="4" fill={ann.color} />
                  {ann.label && (
                    <text
                      x={(x1 + x2) / 2}
                      y={(y1 + y2) / 2 - 6}
                      textAnchor="middle"
                      fill="var(--text-primary)"
                      fontSize="9.5"
                      fontWeight="700"
                    >
                      {ann.label}
                    </text>
                  )}
                </g>
              );
            }
            return null;
          })}

          {/* Active Selected Shot Origin Pin (Live Entry Mode) */}
          {mode === 'entry' && selectedOrigin && (
            <g
              transform={`translate(${selectedOrigin.xMeters * SCALE}, ${
                TOP_PAD + Math.min(16.0, selectedOrigin.yMeters) * SCALE
              })`}
            >
              {/* Target line to center of goal */}
              <line
                x1="0"
                y1="0"
                x2={200 - selectedOrigin.xMeters * SCALE}
                y2={-Math.min(16.0, selectedOrigin.yMeters) * SCALE}
                stroke={teamColor}
                strokeWidth="1.5"
                strokeDasharray="4 4"
                opacity="0.75"
              />
              <circle r="13" fill={`${teamColor}33`} stroke={teamColor} strokeWidth="1.5" />
              <circle r="5.5" fill={teamColor} stroke="#ffffff" strokeWidth="1.5" />
            </g>
          )}
        </svg>
      </div>

      {/* Special Handball Shot Origin Quick-Taps (7m, Breakthrough, Fast Break, Empty Net Own Half) */}
      {mode === 'entry' && onSelectOrigin && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '6px',
          }}
        >
          {(
            [
              {
                zone: '7M' as CourtZone,
                label: '7m Pen',
                xMeters: 10.0,
                yMeters: 7.0,
                pos: 'CB' as PositionCode,
              },
              {
                zone: 'BREAKTHROUGH' as CourtZone,
                label: compact ? 'Breakthr.' : t.zones.BREAKTHROUGH,
                xMeters: 10.0,
                yMeters: 6.3,
                pos: 'CB' as PositionCode,
              },
              {
                zone: 'FAST_BREAK' as CourtZone,
                label: compact ? 'Fast Break' : t.zones.FAST_BREAK,
                xMeters: 10.0,
                yMeters: 6.1,
                pos: 'LW' as PositionCode,
              },
              {
                zone: 'EMPTY_NET_OWN_HALF' as CourtZone,
                label: compact ? 'Empty Net' : 'Empty Net (Full)',
                xMeters: 10.0,
                yMeters: 15.8,
                pos: 'GK' as PositionCode,
              },
            ] as const
          ).map((preset) => {
            const active = selectedOrigin?.zone === preset.zone;
            return (
              <button
                key={preset.zone}
                type="button"
                onClick={() =>
                  onSelectOrigin(
                    {
                      zone: preset.zone,
                      xMeters: preset.xMeters,
                      yMeters: preset.yMeters,
                    },
                    preset.pos
                  )
                }
                style={{
                  minHeight: '38px',
                  padding: '4px 6px',
                  borderRadius: 'var(--radius-sm)',
                  background: active ? `${teamColor}28` : 'var(--bg-surface)',
                  border: active
                    ? `1.5px solid ${teamColor}`
                    : '1px solid var(--border-subtle)',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: '11px',
                  fontWeight: active ? 700 : 600,
                  textAlign: 'center',
                }}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
