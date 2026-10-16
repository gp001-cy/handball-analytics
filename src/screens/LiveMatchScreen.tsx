import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ZoomableMapModal } from '../components/modals/ZoomableMapModal';
import { HandballCourt } from '../components/design-system/HandballCourt';
import { HandballGoal } from '../components/design-system/HandballGoal';
import {
  IconAssistPass,
  IconBlockWall,
  IconBounceShot,
  IconDirectShot,
  IconGkSave,
  IconGoalNet,
  IconMissTarget,
  IconPostHit,
  IconStealBall,
  IconTimeoutCard,
  IconTurnoverFault,
  IconTwoMinSuspension,
  MiniCourtZoneDiagram,
  PlayerVisualPortrait,
} from '../components/design-system/HandballIcons';
import {
  SampleRateMetric,
  TeamShapeIcon,
} from '../components/design-system/Primitives';
import {
  computeMomentumSeries,
  computePlayerMatchStats,
  computeTeamMatchSummary,
  deriveCourtStateAtClock,
  generateLiveInsights,
} from '../engine/analyticsEngine';
import { formatClock, TRANSLATIONS } from '../i18n/translations';
import { useAppStore } from '../store/useAppStore';
import {
  AttackPhase,
  GoalTargetCoords,
  MatchEvent,
  PositionCode,
  ShotOriginCoords,
  ShotOutcome,
  TechnicalFaultType,
} from '../types/domain';

const POSITIONS_ORDER: PositionCode[] = ['LW', 'LB', 'CB', 'RB', 'RW', 'PV', 'GK'];

type PlayerFirstStep = 'select_player' | 'choose_action' | 'pick_court_origin' | 'pick_goal_target';

export const LiveMatchScreen: React.FC<{ isPhoneLayout: boolean }> = ({
  isPhoneLayout,
}) => {
  const {
    locale,
    teams,
    players,
    activeMatch,
    activeEvents,
    clockSec,
    setClockSec,
    isClockRunning,
    setIsClockRunning,
    lastGoalFlashTeamId,
    liveEntryMode,
    setLiveEntryMode,
    logEvent,
    updateEvent,
    deleteEvent,
    undoLastAction,
    redoLastAction,
    canUndo,
    canRedo,
    performSubstitution,
    applyLineChangePreset,
    toggle7v6EmptyGoal,
    resetMatchToZero,
    setInspectedPlayerId,
  } = useAppStore();

  const t = TRANSLATIONS[locale];

  const ourTeam =
    teams.find((tm) => tm.id === activeMatch.ourTeamId) ?? teams[0];
  const oppTeam =
    teams.find((tm) => tm.id === activeMatch.opponentTeamId) ?? teams[1];

  const [selectedTeamId, setSelectedTeamId] = useState<string>(ourTeam.id);
  const activeTeam = selectedTeamId === ourTeam.id ? ourTeam : oppTeam;
  const defendingTeam = selectedTeamId === ourTeam.id ? oppTeam : ourTeam;

  // Click-based live substitution state
  const [substitutingBenchPlayer, setSubstitutingBenchPlayer] = useState<{
    player: (typeof players)[0];
    jerseyNumber: number;
  } | null>(null);

  // Zoomable fullscreen map modal state
  const [activeZoomMap, setActiveZoomMap] = useState<'court' | 'goal' | null>(null);

  // 2-second auto-continue timers & countdown display
  const originAutoTimerRef = useRef<number | null>(null);
  const targetAutoTimerRef = useRef<number | null>(null);
  const [originCountdown, setOriginCountdown] = useState<number | null>(null);
  const [targetCountdown, setTargetCountdown] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      if (originAutoTimerRef.current) window.clearTimeout(originAutoTimerRef.current);
      if (targetAutoTimerRef.current) window.clearTimeout(targetAutoTimerRef.current);
    };
  }, []);

  const courtStates = useMemo(
    () => deriveCourtStateAtClock(activeMatch, activeEvents, clockSec, players),
    [activeMatch, activeEvents, clockSec, players]
  );

  const activeTeamCourt = courtStates[activeTeam.id];
  const defendingTeamCourt = courtStates[defendingTeam.id];

  const playerStats = useMemo(
    () => computePlayerMatchStats(activeMatch, activeEvents, players, clockSec),
    [activeMatch, activeEvents, players, clockSec]
  );

  const ourSummary = useMemo(
    () => computeTeamMatchSummary(ourTeam.id, activeEvents),
    [ourTeam.id, activeEvents]
  );
  const oppSummary = useMemo(
    () => computeTeamMatchSummary(oppTeam.id, activeEvents),
    [oppTeam.id, activeEvents]
  );

  const [dismissedInsights, setDismissedInsights] = useState<string[]>([]);
  const liveInsights = useMemo(
    () =>
      generateLiveInsights(activeMatch, activeEvents, players, clockSec).filter(
        (ins) => !dismissedInsights.includes(ins.id)
      ),
    [activeMatch, activeEvents, players, clockSec, dismissedInsights]
  );

  const momentumPoints = useMemo(
    () =>
      computeMomentumSeries(
        ourTeam.id,
        oppTeam.id,
        activeEvents,
        Math.max(10, Math.ceil(clockSec / 60))
      ),
    [ourTeam.id, oppTeam.id, activeEvents, clockSec]
  );

  // =====================================================
  // Shared Shot & Action State (Used by Both Mode 1 & Mode 2)
  // =====================================================
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [autoSuggestedSlot, setAutoSuggestedSlot] = useState<PositionCode | null>(
    null
  );
  const [shotOrigin, setShotOrigin] = useState<ShotOriginCoords | null>(null);
  const [goalTarget, setGoalTarget] = useState<GoalTargetCoords | null>(null);
  const [pendingOutcome, setPendingOutcome] = useState<
    'goal' | 'saved' | 'miss' | 'post' | 'blocked'
  >('goal');
  const [isBounceShot, setIsBounceShot] = useState<boolean>(false);
  const [assistingPlayerId, setAssistingPlayerId] = useState<string | null>(null);
  const [attackPhase, setAttackPhase] = useState<AttackPhase>('positional');

  // Mode 1 (Player-First Step-by-Step State)
  const [pfStep, setPfStep] = useState<PlayerFirstStep>('select_player');
  const [isFeedExpandedOnMobile, setIsFeedExpandedOnMobile] = useState<boolean>(false);

  // Mode 2 Non-Shot Expanders & Subs
  const [openActionSheet, setOpenActionSheet] = useState<
    null | 'tf_types' | 'sub_panel'
  >(null);
  const [subOutPlayerId, setSubOutPlayerId] = useState<string | null>(null);
  const [subOutSlot, setSubOutSlot] = useState<PositionCode | null>(null);

  // Inline Event Editor
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editClockStr, setEditClockStr] = useState<string>('00:00');

  useEffect(() => {
    if (pfStep === 'select_player') {
      return;
    }
    const onCourtMap = activeTeamCourt?.onCourtByPosition;
    if (!onCourtMap) return;
    const currentOnCourtIds = Object.values(onCourtMap).filter(Boolean) as string[];
    if (!selectedPlayerId || !currentOnCourtIds.includes(selectedPlayerId)) {
      setSelectedPlayerId(
        onCourtMap.CB || onCourtMap.LB || currentOnCourtIds[0] || null
      );
    }
  }, [selectedTeamId, activeTeamCourt, selectedPlayerId, pfStep]);

  const currentHalf: 1 | 2 =
    clockSec >= activeMatch.format.halfDurationSec ? 2 : 1;

  const onCourtPlayersWithSlot = useMemo(() => {
    const map = activeTeamCourt?.onCourtByPosition;
    if (!map) return [];
    return POSITIONS_ORDER.map((slot) => {
      const pid = map[slot];
      const p = players.find((pl) => pl.id === pid);
      if (!p) return null;
      const lEntry = activeMatch.lineups.find((l) => l.playerId === p.id);
      return {
        slot,
        player: p,
        jerseyNumber: lEntry?.jerseyNumber ?? p.defaultJerseyNumber,
      };
    }).filter(Boolean) as Array<{
      slot: PositionCode;
      player: (typeof players)[0];
      jerseyNumber: number;
    }>;
  }, [activeTeamCourt, players, activeMatch.lineups]);

  const benchPlayers = useMemo(() => {
    const onCourtIds = new Set(onCourtPlayersWithSlot.map((x) => x.player.id));
    return players
      .filter((p) => p.teamId === activeTeam.id && !onCourtIds.has(p.id))
      .map((p) => {
        const lEntry = activeMatch.lineups.find((l) => l.playerId === p.id);
        return {
          player: p,
          jerseyNumber: lEntry?.jerseyNumber ?? p.defaultJerseyNumber,
        };
      });
  }, [players, activeTeam.id, onCourtPlayersWithSlot, activeMatch.lineups]);

  const allActiveSuspensions = [
    ...(courtStates[ourTeam.id]?.activeSuspensions ?? []),
    ...(courtStates[oppTeam.id]?.activeSuspensions ?? []),
  ];

  const opposingGkPlayer = players.find(
    (p) => p.id === defendingTeamCourt?.activeGkId
  );

  // =====================================================
  // Commit Shot Helper (Supports Bounce Shot & Linked Assist)
  // =====================================================
  const commitShotWithDetails = (
    outcomeKey: 'goal' | 'saved' | 'miss' | 'post' | 'blocked',
    originOverride?: ShotOriginCoords,
    targetOverride?: GoalTargetCoords
  ) => {
    const shooterId =
      selectedPlayerId ||
      activeTeamCourt?.onCourtByPosition.CB ||
      players.find((p) => p.teamId === activeTeam.id)?.id;

    const shooter = players.find((p) => p.id === shooterId);
    const lineupEntry = activeMatch.lineups.find((l) => l.playerId === shooterId);
    const jerseyNum = lineupEntry?.jerseyNumber ?? shooter?.defaultJerseyNumber ?? 0;

    const finalTarget = targetOverride ??
      goalTarget ?? {
        cell:
          outcomeKey === 'post'
            ? 'POST_L'
            : outcomeKey === 'miss'
            ? 'WIDE_L'
            : 'BL',
        normX: 0.18,
        normY: 0.82,
      };

    let resolvedOutcome: ShotOutcome = 'goal';
    if (outcomeKey === 'goal') resolvedOutcome = 'goal';
    else if (outcomeKey === 'saved') resolvedOutcome = 'saved';
    else if (outcomeKey === 'blocked') resolvedOutcome = 'blocked';
    else if (outcomeKey === 'post') {
      resolvedOutcome = finalTarget.cell === 'CROSSBAR' ? 'crossbar' : 'post';
    } else if (outcomeKey === 'miss') {
      resolvedOutcome =
        finalTarget.cell === 'HIGH' ? 'missed_high' : 'missed_wide';
    }

    const finalOrigin: ShotOriginCoords = originOverride ??
      shotOrigin ?? {
        zone: 'CB_9M',
        xMeters: 10.0,
        yMeters: 10.2,
      };

    const opposingGkId = defendingTeamCourt?.activeGkId ?? undefined;
    const effectivePhase: AttackPhase = activeTeamCourt?.is7v6Active
      ? 'empty_goal_7v6'
      : attackPhase;

    const assister = assistingPlayerId
      ? players.find((p) => p.id === assistingPlayerId)
      : undefined;

    const bounceTag = isBounceShot ? ' [Bounce]' : '';
    const assistTag = assister
      ? ` (Ast #${assister.defaultJerseyNumber} ${assister.lastName})`
      : '';

    logEvent(
      {
        half: currentHalf,
        matchClockSec: clockSec,
        authorAnalyst: isPhoneLayout ? 'Mobile Analyst' : 'Bench Tablet',
        teamId: activeTeam.id,
        playerId: shooterId,
        category: 'shot',
        subType: resolvedOutcome,
        shotOrigin: finalOrigin,
        goalTarget: finalTarget,
        isBounceShot,
        attackPhase: effectivePhase,
        situation: activeTeamCourt?.numericalSituation ?? 'equal',
        opposingGkId,
        assistingPlayerId:
          resolvedOutcome === 'goal' && assistingPlayerId
            ? assistingPlayerId
            : undefined,
      },
      `${activeTeam.shortCode} #${jerseyNum} ${shooter?.lastName ?? ''} — ${
        t.outcomes[resolvedOutcome]
      }${bounceTag} (${finalOrigin.zone} → ${finalTarget.cell})${assistTag}`
    );

    const teamSummary = activeTeam.id === ourTeam.id ? ourSummary : oppSummary;

    // If Goal + Assister selected, also log the linked Assist event (if assists <= goals)
    if (
      resolvedOutcome === 'goal' &&
      assistingPlayerId &&
      assister &&
      teamSummary.assists < teamSummary.goals + 1
    ) {
      logEvent(
        {
          half: currentHalf,
          matchClockSec: clockSec,
          authorAnalyst: isPhoneLayout ? 'Mobile Analyst' : 'Bench Tablet',
          teamId: activeTeam.id,
          playerId: assistingPlayerId,
          category: 'attack_other',
          subType: 'assist',
          attackPhase: effectivePhase,
          situation: activeTeamCourt?.numericalSituation ?? 'equal',
        },
        `Assist credited to #${assister.defaultJerseyNumber} ${assister.lastName}`
      );
    }

    // Reset state for next action
    setShotOrigin(null);
    setGoalTarget(null);
    setIsBounceShot(false);
    setAssistingPlayerId(null);
    setAutoSuggestedSlot(null);
    setSelectedPlayerId(null);
    setPfStep('select_player');
    if (attackPhase === 'fast_break' || attackPhase === 'second_wave') {
      setAttackPhase('positional');
    }

    // Possession-changing event: automatically switch to Team B's players!
    const otherTeam = activeTeam.id === ourTeam.id ? oppTeam : ourTeam;
    setSelectedTeamId(otherTeam.id);
  };

  const handleQuickNonShotEvent = (
    category: MatchEvent['category'],
    subType: MatchEvent['subType'],
    label: string
  ) => {
    const shooter = players.find((p) => p.id === selectedPlayerId);
    const lineupEntry = activeMatch.lineups.find(
      (l) => l.playerId === selectedPlayerId
    );
    const jerseyNum =
      lineupEntry?.jerseyNumber ?? shooter?.defaultJerseyNumber ?? 0;

    const teamSummary = activeTeam.id === ourTeam.id ? ourSummary : oppSummary;

    // Strict handball rule: Total assists can NEVER exceed total goals!
    if (category === 'attack_other' && subType === 'assist') {
      if (teamSummary.assists >= teamSummary.goals) {
        alert(
          `Cannot add assist: ${activeTeam.name} has ${teamSummary.assists} assists and ${teamSummary.goals} goals. Assists can never exceed goals!`
        );
        return;
      }
    }

    if (category === 'team_state' && subType === 'timeout') {
      const usedTotal = activeTeamCourt?.timeoutsUsedTotal ?? 0;
      const usedHalf = activeTeamCourt?.timeoutsUsedThisHalf ?? 0;
      if (usedTotal >= 3 || usedHalf >= 2) {
        alert(`IHF Timeout limit reached for ${activeTeam.name}.`);
        return;
      }
    }

    logEvent(
      {
        half: currentHalf,
        matchClockSec: clockSec,
        authorAnalyst: isPhoneLayout ? 'Mobile Analyst' : 'Bench Tablet',
        teamId: activeTeam.id,
        playerId:
          category === 'team_state' && subType === 'timeout'
            ? undefined
            : selectedPlayerId ?? undefined,
        category,
        subType,
        attackPhase,
        situation: activeTeamCourt?.numericalSituation ?? 'equal',
        suspensionDurationSec: subType === '2min' ? 120 : undefined,
      },
      category === 'team_state' && subType === 'timeout'
        ? `${activeTeam.shortCode} — Team Timeout (${formatClock(clockSec)})`
        : `${activeTeam.shortCode} #${jerseyNum} ${shooter?.lastName ?? ''} — ${label}`
    );

    setOpenActionSheet(null);
    setSelectedPlayerId(null);
    setPfStep('select_player');

    // Possession-changing event: turnover (technical fault) switches immediately to Team B!
    if (category === 'technical_fault') {
      const otherTeam = activeTeam.id === ourTeam.id ? oppTeam : ourTeam;
      setSelectedTeamId(otherTeam.id);
    }
  };

  const handleCourtOriginSelect = (coords: ShotOriginCoords) => {
    setShotOrigin(coords);
    if (coords.zone === 'FAST_BREAK') {
      setAttackPhase('fast_break');
    }
    if (originAutoTimerRef.current) {
      window.clearTimeout(originAutoTimerRef.current);
    }
    setOriginCountdown(2);
    originAutoTimerRef.current = window.setTimeout(() => {
      setOriginCountdown(null);
      setPfStep('pick_goal_target');
    }, 2000);
  };

  const handleConfirmCourtOrigin = () => {
    if (originAutoTimerRef.current) {
      window.clearTimeout(originAutoTimerRef.current);
    }
    setOriginCountdown(null);
    setPfStep('pick_goal_target');
  };

  const handleGoalTargetSelect = (coords: GoalTargetCoords) => {
    setGoalTarget(coords);
    if (targetAutoTimerRef.current) {
      window.clearTimeout(targetAutoTimerRef.current);
    }
    setTargetCountdown(2);
    targetAutoTimerRef.current = window.setTimeout(() => {
      setTargetCountdown(null);
      commitShotWithDetails(pendingOutcome, shotOrigin ?? undefined, coords);
    }, 2000);
  };

  const handleConfirmGoalTarget = () => {
    if (targetAutoTimerRef.current) {
      window.clearTimeout(targetAutoTimerRef.current);
    }
    setTargetCountdown(null);
    if (goalTarget) {
      commitShotWithDetails(pendingOutcome, shotOrigin ?? undefined, goalTarget);
    }
  };

  // =====================================================
  // Compact Mobile-Safe Sticky Match Header
  // =====================================================
  const renderStickyMatchHeader = () => (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-strong)',
        padding: isPhoneLayout ? '6px 8px' : '10px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        width: '100%',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.4)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: isPhoneLayout ? '4px' : '8px',
          width: '100%',
        }}
      >
        {/* Compact High-Visibility Scoreboard */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isPhoneLayout ? '3px' : '6px', flexShrink: 0 }}>
          <div
            className={lastGoalFlashTeamId === ourTeam.id ? 'score-flash-active' : ''}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: isPhoneLayout ? '3px 6px' : '5px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-elevated)',
              border: `1.5px solid ${ourTeam.primaryColorHex}`,
            }}
          >
            <TeamShapeIcon
              shape={ourTeam.shapeMarker}
              color={ourTeam.primaryColorHex}
              logoUri={ourTeam.logoUri}
              size={isPhoneLayout ? 15 : 22}
            />
            <span style={{ fontSize: isPhoneLayout ? '11px' : '12px', fontWeight: 800 }}>
              {ourTeam.shortCode}
            </span>
            <span
              className="tabular-nums"
              style={{
                fontSize: isPhoneLayout ? '17px' : '22px',
                fontWeight: 900,
                color: 'var(--text-primary)',
                minWidth: isPhoneLayout ? '18px' : '22px',
                textAlign: 'center',
              }}
            >
              {ourSummary.goals}
            </span>
          </div>

          <span
            className="tabular-nums"
            style={{
              fontWeight: 800,
              fontSize: isPhoneLayout ? '13px' : '16px',
              color: 'var(--text-muted)',
            }}
          >
            :
          </span>

          <div
            className={lastGoalFlashTeamId === oppTeam.id ? 'score-flash-active' : ''}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: isPhoneLayout ? '3px 6px' : '5px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-elevated)',
              border: `1.5px solid ${oppTeam.primaryColorHex}`,
            }}
          >
            <span
              className="tabular-nums"
              style={{
                fontSize: isPhoneLayout ? '17px' : '22px',
                fontWeight: 900,
                color: 'var(--text-primary)',
                minWidth: isPhoneLayout ? '18px' : '22px',
                textAlign: 'center',
              }}
            >
              {oppSummary.goals}
            </span>
            <span style={{ fontSize: isPhoneLayout ? '11px' : '12px', fontWeight: 800 }}>
              {oppTeam.shortCode}
            </span>
            <TeamShapeIcon
              shape={oppTeam.shapeMarker}
              color={oppTeam.primaryColorHex}
              logoUri={oppTeam.logoUri}
              size={isPhoneLayout ? 15 : 22}
            />
          </div>
        </div>

        {/* Running Match Clock & Action Buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: isPhoneLayout ? '3px' : '8px',
          }}
        >
          <button
            type="button"
            onClick={() => setClockSec(Math.max(0, clockSec - 10))}
            title="-10 seconds"
            style={{
              minHeight: isPhoneLayout ? '32px' : '38px',
              padding: isPhoneLayout ? '0 5px' : '0 8px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              fontSize: isPhoneLayout ? '10.5px' : '11.5px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            -10s
          </button>

          <button
            type="button"
            onClick={() => setIsClockRunning(!isClockRunning)}
            style={{
              minHeight: isPhoneLayout ? '32px' : '38px',
              padding: isPhoneLayout ? '0 6px' : '0 14px',
              borderRadius: 'var(--radius-sm)',
              background: isClockRunning ? 'var(--sem-fault)' : 'var(--sem-goal)',
              color: isClockRunning ? '#ffffff' : '#080c14',
              fontWeight: 800,
              fontSize: isPhoneLayout ? '11px' : '12px',
              display: 'flex',
              alignItems: 'center',
              gap: isPhoneLayout ? '3px' : '6px',
              boxShadow: isClockRunning ? '0 0 10px rgba(225, 29, 72, 0.4)' : 'none',
              cursor: 'pointer',
            }}
          >
            <span>{isClockRunning ? '⏸' : '▶'}</span>
            <span
              className="tabular-nums"
              style={{ fontSize: isPhoneLayout ? '12.5px' : '14px', fontWeight: 800 }}
            >
              {formatClock(clockSec)}
            </span>
            <span
              style={{
                fontSize: '9.5px',
                fontWeight: 800,
                padding: '1px 3px',
                borderRadius: '3px',
                background: 'var(--bg-canvas)',
                color: 'var(--accent-primary)',
              }}
            >
              H{currentHalf}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setClockSec(clockSec + 10)}
            title="+10 seconds"
            style={{
              minHeight: isPhoneLayout ? '32px' : '38px',
              padding: isPhoneLayout ? '0 5px' : '0 8px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              fontSize: isPhoneLayout ? '10.5px' : '11.5px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            +10s
          </button>

          <button
            type="button"
            disabled={!canUndo}
            onClick={undoLastAction}
            title={t.common.undo}
            style={{
              minHeight: isPhoneLayout ? '32px' : '38px',
              padding: isPhoneLayout ? '0 7px' : '0 10px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              opacity: canUndo ? 1 : 0.35,
              fontSize: '12px',
              fontWeight: 800,
              cursor: canUndo ? 'pointer' : 'default',
            }}
          >
            ↶
          </button>

          <button
            type="button"
            onClick={() => {
              if (window.confirm(locale === 'sl' ? 'Ponastavi tekmo na 0-0 in čas na 00:00?' : 'Reset this match to 0-0 and clock to 00:00?')) {
                resetMatchToZero();
              }
            }}
            title={locale === 'sl' ? 'Ponastavi na 0-0' : 'Reset match to 0-0'}
            style={{
              minHeight: isPhoneLayout ? '32px' : '38px',
              padding: isPhoneLayout ? '0 5px' : '0 8px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              fontSize: '10.5px',
              fontWeight: 800,
              color: 'var(--sem-miss)',
              cursor: 'pointer',
            }}
          >
            0-0
          </button>
        </div>
      </div>

      {/* Active 2-min suspension badges (renders ONLY when suspensions are active) */}
      {allActiveSuspensions.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flexWrap: 'wrap',
            paddingTop: '2px',
          }}
        >
          {allActiveSuspensions.map((susp) => {
            const suspTeam = susp.teamId === ourTeam.id ? ourTeam : oppTeam;
            return (
              <span
                key={susp.eventId}
                className="tabular-nums"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 7px',
                  borderRadius: '999px',
                  background: 'var(--sem-fault-bg)',
                  border: '1px solid var(--sem-fault)',
                  fontSize: '10.5px',
                  fontWeight: 800,
                  color: 'var(--sem-fault)',
                }}
              >
                ⏱ 2′ {suspTeam.shortCode} #{susp.jerseyNumber} {formatClock(susp.remainingSec)}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );

  // =====================================================
  // Team Segmented Control
  // =====================================================
  const renderTeamToggle = () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '6px',
        padding: '4px',
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {[ourTeam, oppTeam].map((tm) => {
        const isSelected = selectedTeamId === tm.id;
        return (
          <button
            key={tm.id}
            type="button"
            onClick={() => {
              setSelectedTeamId(tm.id);
              setShotOrigin(null);
              setGoalTarget(null);
              setAssistingPlayerId(null);
              setPfStep('select_player');
            }}
            style={{
              minHeight: '44px',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              background: isSelected ? `${tm.primaryColorHex}28` : 'transparent',
              border: isSelected
                ? `2px solid ${tm.primaryColorHex}`
                : '1px solid transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
              <TeamShapeIcon
                shape={tm.shapeMarker}
                color={tm.primaryColorHex}
                logoUri={tm.logoUri}
                size={isPhoneLayout ? 16 : 18}
              />
              <span
                style={{
                  fontSize: isPhoneLayout ? '12.5px' : '14px',
                  fontWeight: 800,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {tm.name}
              </span>
            </div>
            <span
              className="tabular-nums"
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'var(--bg-canvas)',
                color: tm.primaryColorHex,
                flexShrink: 0,
              }}
            >
              {tm.shortCode}
            </span>
          </button>
        );
      })}
    </div>
  );

  // =====================================================
  // Reusable Bounce Shot & Assist Teammate Bar
  // =====================================================
  const renderBounceAndAssistControls = () => {
    const teammates = onCourtPlayersWithSlot.filter(
      (x) => x.player.id !== selectedPlayerId
    );

    return (
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-md)',
          padding: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {/* Row 1: Shot Trajectory Type (Direct vs Bounce Shot) + Phase (Positional vs Fast Break) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isPhoneLayout ? '1fr 1fr' : 'repeat(4, 1fr)',
            gap: '6px',
          }}
        >
          <button
            type="button"
            onClick={() => setIsBounceShot(false)}
            style={{
              minHeight: '42px',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              background: !isBounceShot
                ? 'var(--accent-primary-subtle)'
                : 'var(--bg-surface)',
              border: !isBounceShot
                ? '2px solid var(--accent-primary)'
                : '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 800,
            }}
          >
            <IconDirectShot size={18} />
            <span>{locale === 'sl' ? 'Direktni strel' : 'Direct Shot'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsBounceShot((b) => !b)}
            style={{
              minHeight: '42px',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              background: isBounceShot
                ? 'var(--sem-bounce-bg)'
                : 'var(--bg-surface)',
              border: isBounceShot
                ? '2px solid var(--sem-bounce)'
                : '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 800,
              color: isBounceShot ? 'var(--sem-bounce)' : 'var(--text-primary)',
            }}
          >
            <IconBounceShot size={18} />
            <span>{isBounceShot ? (locale === 'sl' ? '✓ Od tal' : '✓ Bounce Shot') : (locale === 'sl' ? 'Strel od tal' : 'Bounce Shot')}</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setAttackPhase((p) =>
                p === 'fast_break' ? 'positional' : 'fast_break'
              )
            }
            style={{
              minHeight: '42px',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              background:
                attackPhase === 'fast_break'
                  ? 'var(--sem-goal-bg)'
                  : 'var(--bg-surface)',
              border:
                attackPhase === 'fast_break'
                  ? '2px solid var(--sem-goal)'
                  : '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 800,
            }}
          >
            <IconStealBall size={16} />
            <span>{attackPhase === 'fast_break' ? (locale === 'sl' ? '✓ Protinapad' : '✓ Fast Break') : (locale === 'sl' ? 'Protinapad' : 'Fast Break')}</span>
          </button>

          <button
            type="button"
            onClick={() =>
              toggle7v6EmptyGoal(
                activeTeam.id,
                Boolean(activeTeamCourt?.is7v6Active)
              )
            }
            style={{
              minHeight: '42px',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              background: activeTeamCourt?.is7v6Active
                ? 'var(--sem-miss-bg)'
                : 'var(--bg-surface)',
              border: activeTeamCourt?.is7v6Active
                ? '2px solid var(--sem-miss)'
                : '1px solid var(--border-subtle)',
              fontSize: '12px',
              fontWeight: 800,
            }}
          >
            {activeTeamCourt?.is7v6Active ? (locale === 'sl' ? '● 7v6 Prazna vrata' : '● 7v6 Empty Net') : (locale === 'sl' ? '7v6 Prazna vrata' : '7v6 Empty Net')}
          </button>
        </div>

        {/* Row 2: Assisted By Picker (1-tap teammate chips) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 800,
              color: 'var(--sem-assist)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <IconAssistPass size={16} />
            {locale === 'sl' ? 'Podaja:' : 'Assist by:'}
          </span>

          <button
            type="button"
            onClick={() => setAssistingPlayerId(null)}
            style={{
              padding: '4px 9px',
              borderRadius: '999px',
              background:
                assistingPlayerId === null
                  ? 'var(--bg-interactive)'
                  : 'var(--bg-surface)',
              border:
                assistingPlayerId === null
                  ? '1.5px solid var(--border-strong)'
                  : '1px solid var(--border-subtle)',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            {locale === 'sl' ? 'Brez' : 'None'}
          </button>

          {teammates.map(({ player: mate, jerseyNumber }) => {
            const active = assistingPlayerId === mate.id;
            return (
              <button
                key={mate.id}
                type="button"
                onClick={() =>
                  setAssistingPlayerId(active ? null : mate.id)
                }
                className="tabular-nums"
                style={{
                  padding: '4px 10px',
                  borderRadius: '999px',
                  background: active
                    ? 'var(--sem-assist-bg)'
                    : 'var(--bg-surface)',
                  border: active
                    ? '1.5px solid var(--sem-assist)'
                    : '1px solid var(--border-subtle)',
                  color: active ? 'var(--sem-assist)' : 'var(--text-primary)',
                  fontSize: '11.5px',
                  fontWeight: 800,
                }}
              >
                #{jerseyNumber} {mate.lastName}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // =====================================================
  // MODE 1: PLAYER-FIRST VISUAL FLOW
  // Step 0: Only Players & Portraits -> Step 1: Action Menu -> Step 2: Court Origin -> Step 3: Goal Frame
  // =====================================================
  const renderPlayerFirstMode = () => {
    const selectedPlayer = players.find((p) => p.id === selectedPlayerId);
    const selectedLineup = activeMatch.lineups.find(
      (l) => l.playerId === selectedPlayerId
    );
    const selectedJersey =
      selectedLineup?.jerseyNumber ?? selectedPlayer?.defaultJerseyNumber ?? 0;

    // STEP 0: SHOW ONLY PLAYERS AND THEIR IMAGES ON SCREEN
    if (pfStep === 'select_player') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* ON-COURT 7 PLAYER PORTRAIT CARDS */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 800,
                    color: 'var(--text-primary)',
                    letterSpacing: '0.04em',
                  }}
                >
                  {locale === 'sl'
                    ? `NA IGRIŠČU (7 IGRALCEV · ${activeTeam.name.toUpperCase()})`
                    : `ON COURT (7 PLAYERS · ${activeTeam.name.toUpperCase()})`}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'var(--bg-elevated)',
                    color: 'var(--accent-primary)',
                    fontWeight: 700,
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {locale === 'sl' ? 'Tapni igralca za vnos akcije' : 'Tap player to log action'}
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  handleQuickNonShotEvent('team_state', 'timeout', t.live.timeout)
                }
                style={{
                  minHeight: '38px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-strong)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <IconTimeoutCard size={17} />
                <span>{locale === 'sl' ? 'Minuta odmora' : 'Team Timeout'}</span>
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isPhoneLayout
                  ? '1fr'
                  : 'repeat(auto-fill, minmax(210px, 1fr))',
                gap: isPhoneLayout ? '8px' : '12px',
              }}
            >
              {onCourtPlayersWithSlot.map(({ slot, player, jerseyNumber }) => {
                const st = playerStats[player.id];
                const susp = activeTeamCourt?.activeSuspensions.find(
                  (s) => s.playerId === player.id
                );
                const pm = st?.plusMinus ?? 0;
                const pmColor =
                  pm > 0
                    ? 'var(--sem-goal)'
                    : pm < 0
                    ? 'var(--sem-fault)'
                    : 'var(--text-secondary)';

                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => {
                      setSelectedPlayerId(player.id);
                      setPfStep('choose_action');
                    }}
                    style={{
                      padding: isPhoneLayout ? '8px 10px' : '16px 14px',
                      minHeight: isPhoneLayout ? '64px' : '120px',
                      borderRadius: isPhoneLayout ? 'var(--radius-md)' : 'var(--radius-lg)',
                      background: 'var(--bg-surface)',
                      border: `1.5px solid ${activeTeam.primaryColorHex}77`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: isPhoneLayout ? '10px' : '12px',
                      textAlign: 'left',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'border 160ms, background 160ms, transform 120ms',
                    }}
                  >
                    <PlayerVisualPortrait
                      player={player}
                      jerseyNumber={jerseyNumber}
                      team={activeTeam}
                      size={isPhoneLayout ? 46 : 64}
                    />

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 800,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: 'var(--bg-canvas)',
                              color: 'var(--accent-primary)',
                              border: '1px solid var(--border-subtle)',
                              flexShrink: 0,
                            }}
                          >
                            {slot}
                          </span>
                          <span
                            style={{
                              fontSize: isPhoneLayout ? '14px' : '16px',
                              fontWeight: 800,
                              lineHeight: 1.2,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            #{jerseyNumber} {player.lastName}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              color: 'var(--text-secondary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {player.firstName}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            {player.handedness}-Hand
                          </span>
                          {isPhoneLayout && (
                            <span
                              style={{
                                fontSize: '10.5px',
                                fontWeight: 800,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: 'rgba(56, 189, 248, 0.12)',
                                color: 'var(--accent-primary)',
                                border: '1px solid rgba(56, 189, 248, 0.25)',
                              }}
                            >
                              + Akcija →
                            </span>
                          )}
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginTop: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          flexWrap: 'wrap',
                        }}
                      >
                        <span
                          className="tabular-nums"
                          style={{
                            color:
                              (st?.goals ?? 0) > 0
                                ? 'var(--sem-goal)'
                                : 'var(--text-secondary)',
                          }}
                        >
                          {st?.goals ?? 0}/{st?.shots ?? 0} G
                        </span>
                        <span>·</span>
                        <span
                          className="tabular-nums"
                          style={{
                            color:
                              (st?.assists ?? 0) > 0
                                ? 'var(--sem-assist)'
                                : 'var(--text-secondary)',
                          }}
                        >
                          {st?.assists ?? 0} A
                        </span>
                        <span>·</span>
                        <span
                          className="tabular-nums"
                          style={{
                            color:
                              (st?.technicalFaults ?? 0) > 0
                                ? 'var(--sem-fault)'
                                : 'var(--text-secondary)',
                          }}
                        >
                          {st?.technicalFaults ?? 0} TF
                        </span>
                        <span>·</span>
                        <span
                          className="tabular-nums"
                          style={{ color: pmColor }}
                        >
                          {pm > 0 ? `+${pm}` : pm} +/-
                        </span>
                      </div>
                    </div>

                    {susp && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'var(--sem-fault)',
                          color: '#ffffff',
                          fontSize: '10px',
                          fontWeight: 800,
                        }}
                      >
                        2' ({susp.remainingSec}s)
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* BENCH PLAYER CARDS (CLICK TO SUBSTITUTE IN) */}
          <div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 800,
                color: 'var(--text-secondary)',
                marginBottom: '10px',
                letterSpacing: '0.04em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <span>{locale === 'sl' ? `REZERVNA KLOP (${benchPlayers.length})` : `BENCH PLAYERS (${benchPlayers.length})`}</span>
              <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 700 }}>
                ⇄ {locale === 'sl' ? 'Klikni igralca za menjavo v igro' : 'Click player to substitute in'}
              </span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isPhoneLayout
                  ? '1fr'
                  : 'repeat(auto-fill, minmax(210px, 1fr))',
                gap: isPhoneLayout ? '8px' : '12px',
              }}
            >
              {benchPlayers.map(({ player, jerseyNumber }) => {
                const st = playerStats[player.id];
                const pm = st?.plusMinus ?? 0;
                const pmColor =
                  pm > 0
                    ? 'var(--sem-goal)'
                    : pm < 0
                    ? 'var(--sem-fault)'
                    : 'var(--text-secondary)';

                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => {
                      setSubstitutingBenchPlayer({ player, jerseyNumber });
                    }}
                    style={{
                      padding: isPhoneLayout ? '8px 10px' : '12px 14px',
                      minHeight: isPhoneLayout ? '58px' : '72px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: isPhoneLayout ? '10px' : '12px',
                      textAlign: 'left',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'border-color 160ms, transform 140ms',
                    }}
                  >
                    <PlayerVisualPortrait
                      player={player}
                      jerseyNumber={jerseyNumber}
                      team={activeTeam}
                      size={isPhoneLayout ? 42 : 54}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                          <span style={{ fontSize: isPhoneLayout ? '14px' : '15px', fontWeight: 800 }}>
                            #{jerseyNumber} {player.lastName}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {player.firstName}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(56, 189, 248, 0.16)',
                            color: 'var(--accent-primary)',
                            border: '1px solid var(--accent-primary)',
                            flexShrink: 0,
                          }}
                        >
                          ⇄ {locale === 'sl' ? 'Menjaj' : 'Sub In'}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginTop: '2px',
                        }}
                      >
                        <span>{player.primaryPosition}</span>
                        <span>·</span>
                        <span style={{ color: pmColor, fontWeight: 700 }}>
                          {pm > 0 ? `+${pm}` : pm} +/-
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // STEP 1: CHOOSE ACTION FOR SELECTED PLAYER
    if (pfStep === 'choose_action' && selectedPlayer) {
      return (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '2px solid var(--border-strong)',
            borderRadius: 'var(--radius-lg)',
            padding: isPhoneLayout ? '14px' : '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          {/* Header Card */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <PlayerVisualPortrait
                player={selectedPlayer}
                jerseyNumber={selectedJersey}
                team={activeTeam}
                size={56}
              />
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800 }}>
                  #{selectedJersey} {selectedPlayer.firstName}{' '}
                  {selectedPlayer.lastName}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {activeTeam.name} · {selectedPlayer.primaryPosition} (
                  {selectedPlayer.handedness}-Hand)
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPfStep('select_player')}
              style={{
                minHeight: '42px',
                padding: '0 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-strong)',
                fontWeight: 700,
                fontSize: '12.5px',
                cursor: 'pointer',
              }}
            >
              ← {locale === 'sl' ? 'Igralci' : 'Players'}
            </button>
          </div>

          {/* SHOT OUTCOME MENU */}
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 800,
                color: 'var(--sem-goal)',
                marginBottom: '8px',
                letterSpacing: '0.03em',
              }}
            >
              {locale === 'sl'
                ? 'STRELI IN ZADETKI (ODPRE MESTO META → OKVIR GOLA)'
                : 'SHOTS & GOALS (OPENS COURT ORIGIN → GOAL FRAME)'}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isPhoneLayout
                  ? 'repeat(2, 1fr)'
                  : 'repeat(5, 1fr)',
                gap: '8px',
              }}
            >
              {(
                [
                  {
                    key: 'goal' as const,
                    label: locale === 'sl' ? 'ZADETEK / GOL' : 'GOAL SCORED',
                    sub: locale === 'sl' ? 'Mesto meta → cilj v golu' : 'Pick origin → goal frame',
                    color: 'var(--sem-goal)',
                    bg: 'var(--sem-goal-bg)',
                    icon: <IconGoalNet size={26} color="var(--sem-goal)" />,
                  },
                  {
                    key: 'saved' as const,
                    label: locale === 'sl' ? 'OBRAMBA VRATARJA' : 'GK SAVED',
                    sub: locale === 'sl' ? 'Zaustavljen strel' : 'Shot stopped on target',
                    color: 'var(--sem-save)',
                    bg: 'var(--sem-save-bg)',
                    icon: <IconGkSave size={26} color="var(--sem-save)" />,
                  },
                  {
                    key: 'miss' as const,
                    label: locale === 'sl' ? 'ZGREŠEN STREL' : 'MISSED SHOT',
                    sub: locale === 'sl' ? 'Mimo ali čez gol' : 'Wide or over crossbar',
                    color: 'var(--sem-miss)',
                    bg: 'var(--sem-miss-bg)',
                    icon: <IconMissTarget size={26} color="var(--sem-miss)" />,
                  },
                  {
                    key: 'post' as const,
                    label: locale === 'sl' ? 'VRATNICA / PREČKA' : 'POST / BAR',
                    sub: locale === 'sl' ? 'Zadet okvir gola' : 'Hit goalpost or crossbar',
                    color: 'var(--sem-miss)',
                    bg: 'var(--sem-miss-bg)',
                    icon: <IconPostHit size={26} color="var(--sem-miss)" />,
                  },
                  {
                    key: 'blocked' as const,
                    label: locale === 'sl' ? 'BLOKIRAN STREL' : 'BLOCKED',
                    sub: locale === 'sl' ? 'Blokiran s strani obrambe' : 'Stopped by defender',
                    color: 'var(--sem-block)',
                    bg: 'var(--sem-block-bg)',
                    icon: <IconBlockWall size={26} color="var(--sem-block)" />,
                  },
                ]
              ).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setPendingOutcome(item.key);
                    setPfStep('pick_court_origin');
                  }}
                  style={{
                    minHeight: '72px',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    background: item.bg,
                    border: `2px solid ${item.color}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    gridColumn:
                      isPhoneLayout && item.key === 'goal' ? 'span 2' : undefined,
                  }}
                >
                  {item.icon}
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 800 }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {item.sub}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* QUICK NON-SHOT EVENTS */}
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 800,
                color: 'var(--text-secondary)',
                marginBottom: '8px',
                letterSpacing: '0.03em',
              }}
            >
              {locale === 'sl'
                ? 'HITRI VNOSI: NAPAKE, OBRAMBA IN DISKVALIFIKACIJE'
                : 'QUICK ACTIONS: TURNOVERS, DEFENCE & DISCIPLINE'}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isPhoneLayout
                  ? 'repeat(2, 1fr)'
                  : 'repeat(4, 1fr)',
                gap: '8px',
              }}
            >
              <button
                type="button"
                onClick={() =>
                  handleQuickNonShotEvent(
                    'technical_fault',
                    'bad_pass',
                    t.faults.bad_pass
                  )
                }
                style={{
                  minHeight: '54px',
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--sem-fault-bg)',
                  border: '1.5px solid var(--sem-fault)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                <IconTurnoverFault size={22} />
                <span>{locale === 'sl' ? 'TN: Slaba podaja' : 'TF: Bad Pass'}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleQuickNonShotEvent(
                    'technical_fault',
                    'steps',
                    t.faults.steps
                  )
                }
                style={{
                  minHeight: '54px',
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--sem-fault-bg)',
                  border: '1.5px solid var(--sem-fault)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                <IconTurnoverFault size={22} />
                <span>{locale === 'sl' ? 'TN: Koraki / Črta' : 'TF: Steps / Line'}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleQuickNonShotEvent(
                    'technical_fault',
                    'offensive_foul',
                    t.faults.offensive_foul
                  )
                }
                style={{
                  minHeight: '54px',
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--sem-fault-bg)',
                  border: '1.5px solid var(--sem-fault)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                <IconTurnoverFault size={22} />
                <span>{locale === 'sl' ? 'TN: Prekršek v napadu' : 'TF: Off. Foul'}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleQuickNonShotEvent('defence', 'steal', t.live.steal)
                }
                style={{
                  minHeight: '54px',
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--sem-goal-bg)',
                  border: '1.5px solid var(--sem-goal)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                <IconStealBall size={22} />
                <span>{locale === 'sl' ? 'Odvzeta žoga' : 'Steal / Interc.'}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleQuickNonShotEvent('defence', 'block', t.live.block)
                }
                style={{
                  minHeight: '54px',
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--sem-block-bg)',
                  border: '1.5px solid var(--sem-block)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                <IconBlockWall size={22} />
                <span>{locale === 'sl' ? 'Blok v obrambi' : 'Defensive Block'}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleQuickNonShotEvent('discipline', '2min', t.live.twoMin)
                }
                style={{
                  minHeight: '54px',
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--sem-fault-bg)',
                  border: '1.5px solid var(--sem-fault)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                <IconTwoMinSuspension size={22} />
                <span>{locale === 'sl' ? '2 minuti izključitve' : "2 Min Suspension"}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleQuickNonShotEvent(
                    'attack_other',
                    'earned_7m',
                    locale === 'sl' ? 'Izborjena 7m' : 'Earned 7m Pen'
                  )
                }
                style={{
                  minHeight: '50px',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-primary-subtle)',
                  border: '1.5px solid var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 800,
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  gridColumn: isPhoneLayout ? 'span 2' : undefined,
                }}
              >
                <MiniCourtZoneDiagram highlight="7m" size={26} />
                <span>{locale === 'sl' ? 'Izborjena 7m' : 'Earned 7m Pen'}</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    // STEP 2: PICK WHERE ON THE COURT IT WAS SCORED / SHOT FROM
    if (pfStep === 'pick_court_origin' && selectedPlayer) {
      return (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '2px solid var(--accent-primary)',
            borderRadius: 'var(--radius-lg)',
            padding: isPhoneLayout ? '12px' : '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: 'var(--accent-primary)',
                }}
              >
                {locale === 'sl'
                  ? `2. KORAK · #${selectedJersey} ${selectedPlayer.lastName} (${pendingOutcome.toUpperCase()})`
                  : `STEP 2 OF 3 · #${selectedJersey} ${selectedPlayer.lastName} (${pendingOutcome.toUpperCase()})`}
              </div>
              <div style={{ fontSize: '16px', fontWeight: 800 }}>
                {locale === 'sl'
                  ? 'Izberite mesto meta na igrišču'
                  : 'Tap where the shot was taken from'}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setActiveZoomMap('court')}
                style={{
                  minHeight: '38px',
                  padding: '0 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--accent-primary)',
                  fontWeight: 700,
                  fontSize: '12px',
                  color: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                }}
              >
                ⛶ {locale === 'sl' ? 'Povečaj igrišče' : 'Enlarge'}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (originAutoTimerRef.current) window.clearTimeout(originAutoTimerRef.current);
                  setOriginCountdown(null);
                  setPfStep('choose_action');
                }}
                style={{
                  minHeight: '38px',
                  padding: '0 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-strong)',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                ← {locale === 'sl' ? 'Nazaj' : 'Back'}
              </button>
            </div>
          </div>

          {/* Confirmation Banner with 2s Auto-Continue */}
          {shotOrigin && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(56, 189, 248, 0.14)',
                border: '2px solid var(--accent-primary)',
                display: 'flex',
                flexDirection: isPhoneLayout ? 'column' : 'row',
                alignItems: isPhoneLayout ? 'stretch' : 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  📍 {locale === 'sl' ? 'Izbrano mesto:' : 'Selected Origin:'} {t.zones[shotOrigin.zone]}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {locale === 'sl'
                    ? `Samodejni prehod čez ${originCountdown ?? 2}s · ali kliknite gumb za takojšnjo potrditev.`
                    : `Auto-continuing in ${originCountdown ?? 2}s · or click button to proceed now.`}
                </div>
              </div>

              <button
                type="button"
                onClick={handleConfirmCourtOrigin}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--accent-primary)',
                  color: '#080c14',
                  fontWeight: 800,
                  fontSize: '12.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  boxShadow: '0 0 10px rgba(56, 189, 248, 0.45)',
                }}
              >
                <span>✓ {locale === 'sl' ? 'Potrdi pozicijo' : 'Confirm Court Origin'}</span>
                <span
                  className="tabular-nums"
                  style={{
                    fontSize: '11px',
                    padding: '2px 5px',
                    borderRadius: '4px',
                    background: 'rgba(0,0,0,0.22)',
                  }}
                >
                  {originCountdown ? `(${originCountdown}s)` : '→'}
                </span>
              </button>
            </div>
          )}

          <HandballCourt
            mode="entry"
            locale={locale}
            selectedOrigin={shotOrigin}
            onSelectOrigin={handleCourtOriginSelect}
            teamColor={activeTeam.primaryColorHex}
            compact={isPhoneLayout}
          />
        </div>
      );
    }

    // STEP 3: SHOW THE GOAL TO PICK THE FRAME WHERE HE SHOT IT (+ BOUNCE SHOT & ASSIST)
    if (pfStep === 'pick_goal_target' && selectedPlayer) {
      return (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '2px solid var(--sem-goal)',
            borderRadius: 'var(--radius-lg)',
            padding: isPhoneLayout ? '12px' : '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: 'var(--sem-goal)',
                }}
              >
                {locale === 'sl'
                  ? `3. KORAK · IZ ${shotOrigin ? t.zones[shotOrigin.zone] : 'IGRIŠČA'}`
                  : `STEP 3 OF 3 · FROM ${shotOrigin ? t.zones[shotOrigin.zone] : 'COURT'}`}
              </div>
              <div style={{ fontSize: '16px', fontWeight: 800 }}>
                {locale === 'sl'
                  ? `Izberite del gola, kamor je streljal #${selectedJersey} ${selectedPlayer.lastName}`
                  : `Tap the Goal Frame where #${selectedJersey} ${selectedPlayer.lastName} shot it`}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setActiveZoomMap('goal')}
                style={{
                  minHeight: '38px',
                  padding: '0 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--sem-goal)',
                  fontWeight: 700,
                  fontSize: '12px',
                  color: 'var(--sem-goal)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                }}
              >
                ⛶ {locale === 'sl' ? 'Povečaj gol' : 'Enlarge'}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (targetAutoTimerRef.current) window.clearTimeout(targetAutoTimerRef.current);
                  setTargetCountdown(null);
                  setPfStep('pick_court_origin');
                }}
                style={{
                  minHeight: '38px',
                  padding: '0 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-strong)',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                ← {locale === 'sl' ? 'Igrišče' : 'Court'}
              </button>
            </div>
          </div>

          {/* Bounce Shot Toggle & Assisted By Picker */}
          {renderBounceAndAssistControls()}

          {/* Confirmation Banner with 2s Auto-Continue */}
          {goalTarget && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(0, 229, 163, 0.14)',
                border: '2px solid var(--sem-goal)',
                display: 'flex',
                flexDirection: isPhoneLayout ? 'column' : 'row',
                alignItems: isPhoneLayout ? 'stretch' : 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  🎯 {locale === 'sl' ? 'Izbran del gola:' : 'Selected Target:'} {t.goalCells[goalTarget.cell]}
                  {isBounceShot ? (locale === 'sl' ? ' · Met od tal' : ' · Bounce Shot') : ''}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {locale === 'sl'
                    ? `Samodejno shranjevanje čez ${targetCountdown ?? 2}s · ali kliknite za takojšnjo potrditev.`
                    : `Auto-saving shot in ${targetCountdown ?? 2}s · or click button to confirm & save now.`}
                </div>
              </div>

              <button
                type="button"
                onClick={handleConfirmGoalTarget}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--sem-goal)',
                  color: '#080c14',
                  fontWeight: 800,
                  fontSize: '12.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  boxShadow: '0 0 10px rgba(0, 229, 163, 0.45)',
                }}
              >
                <span>✓ {locale === 'sl' ? 'Potrdi in shrani strel' : 'Confirm & Save Shot'}</span>
                <span
                  className="tabular-nums"
                  style={{
                    fontSize: '11px',
                    padding: '2px 5px',
                    borderRadius: '4px',
                    background: 'rgba(0,0,0,0.22)',
                  }}
                >
                  {targetCountdown ? `(${targetCountdown}s)` : '✓'}
                </span>
              </button>
            </div>
          )}

          <HandballGoal
            mode="entry"
            locale={locale}
            selectedTarget={goalTarget}
            onSelectTarget={handleGoalTargetSelect}
            teamColor={activeTeam.primaryColorHex}
          />
        </div>
      );
    }

    return null;
  };


  // =====================================================
  // Live Insights & Editable Feed Panel
  // =====================================================
  const renderInsightsAndFeedColumn = () => {
    const recentEvents = [...activeEvents]
      .sort((a, b) => b.matchClockSec - a.matchClockSec)
      .slice(0, 14);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Live Insights */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-primary)' }}>
            ⚡ {t.live.liveInsights.toUpperCase()}
          </span>

          {liveInsights.map((ins) => {
            const borderCol =
              ins.severity === 'critical'
                ? 'var(--sem-fault)'
                : ins.severity === 'warning'
                ? 'var(--sem-miss)'
                : 'var(--sem-goal)';
            return (
              <div
                key={ins.id}
                style={{
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-elevated)',
                  borderLeft: `3.5px solid ${borderCol}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      ins.relatedPlayerId &&
                      setInspectedPlayerId(ins.relatedPlayerId)
                    }
                    style={{
                      fontSize: '12.5px',
                      fontWeight: 800,
                      color: 'var(--text-primary)',
                      textAlign: 'left',
                    }}
                  >
                    {ins.headline}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDismissedInsights((prev) => [...prev, ins.id])
                    }
                    style={{ fontSize: '11px', color: 'var(--text-muted)' }}
                  >
                    ✕
                  </button>
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  {ins.detail}
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Event Feed with Bounce & Assist Badges */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)' }}>
            {t.live.eventFeed.toUpperCase()} ({activeEvents.length})
          </span>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
              maxHeight: '280px',
              overflowY: 'auto',
            }}
          >
            {recentEvents.map((ev) => {
              const evTeam = ev.teamId === ourTeam.id ? ourTeam : oppTeam;
              const evPlayer = players.find((p) => p.id === ev.playerId);
              const assister = ev.assistingPlayerId
                ? players.find((p) => p.id === ev.assistingPlayerId)
                : null;

              return (
                <div
                  key={ev.id}
                  style={{
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px',
                    fontSize: '12px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      flexWrap: 'wrap',
                      minWidth: 0,
                    }}
                  >
                    <span
                      className="tabular-nums"
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 5px',
                        background: 'var(--bg-canvas)',
                        borderRadius: '4px',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {formatClock(ev.matchClockSec)}
                    </span>

                    <TeamShapeIcon
                      shape={evTeam.shapeMarker}
                      color={evTeam.primaryColorHex}
                      size={10}
                    />

                    <span style={{ fontWeight: 800 }}>
                      {evPlayer
                        ? `#${evPlayer.defaultJerseyNumber} ${evPlayer.lastName}`
                        : evTeam.shortCode}
                    </span>

                    <span
                      style={{
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 800,
                        background:
                          ev.subType === 'goal'
                            ? 'var(--sem-goal-bg)'
                            : ev.subType === 'saved'
                            ? 'var(--sem-save-bg)'
                            : ev.subType === 'assist'
                            ? 'var(--sem-assist-bg)'
                            : 'var(--sem-fault-bg)',
                        color:
                          ev.subType === 'goal'
                            ? 'var(--sem-goal)'
                            : ev.subType === 'saved'
                            ? 'var(--sem-save)'
                            : ev.subType === 'assist'
                            ? 'var(--sem-assist)'
                            : 'var(--sem-fault)',
                      }}
                    >
                      {ev.subType.toUpperCase()}
                    </span>

                    {ev.isBounceShot && (
                      <span
                        style={{
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: 'var(--sem-bounce-bg)',
                          color: 'var(--sem-bounce)',
                          fontSize: '10px',
                          fontWeight: 800,
                        }}
                      >
                        BOUNCE
                      </span>
                    )}

                    {assister && (
                      <span
                        style={{
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: 'var(--sem-assist-bg)',
                          color: 'var(--sem-assist)',
                          fontSize: '10px',
                          fontWeight: 800,
                        }}
                      >
                        AST #{assister.defaultJerseyNumber}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteEvent(ev.id)}
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: '11px',
                      padding: '2px 5px',
                      flexShrink: 0,
                    }}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {renderStickyMatchHeader()}

      <div
        style={{
          padding: isPhoneLayout ? '10px' : '14px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          width: '100%',
        }}
      >
        {renderTeamToggle()}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isPhoneLayout ? '1fr' : '1.35fr 0.65fr',
            gap: isPhoneLayout ? '10px' : '14px',
            alignItems: 'start',
          }}
        >
          {renderPlayerFirstMode()}

          {/* On Mobile: Collapsible Accordion; On Tablet/Desktop: Always Open Side Panel */}
          {isPhoneLayout ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setIsFeedExpandedOnMobile(!isFeedExpandedOnMobile)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  border: '1.5px solid var(--border-strong)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-primary)' }}>
                  ⚡ {locale === 'sl' ? 'Zadnji dogodki & Vpogledi' : 'Recent Events & Insights'} ({activeEvents.length})
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {isFeedExpandedOnMobile ? (locale === 'sl' ? 'Skrij ▲' : 'Hide ▲') : (locale === 'sl' ? 'Pokaži ▼' : 'Show ▼')}
                </span>
              </button>
              {isFeedExpandedOnMobile && renderInsightsAndFeedColumn()}
            </div>
          ) : (
            renderInsightsAndFeedColumn()
          )}
        </div>
      </div>

      {/* Fullscreen Zoomable Map Modal */}
      {activeZoomMap === 'court' && (
        <ZoomableMapModal
          isOpen={true}
          onClose={() => setActiveZoomMap(null)}
          title={locale === 'sl' ? 'Rokometno igrišče (Cel zaslon)' : 'Handball Court (Full Screen)'}
          subtitle={locale === 'sl' ? 'Povečava in premik · Tapnite cono za izbiro meta' : 'Zoom & pan · Tap zone to select shot origin'}
        >
          <div style={{ width: '100%', maxWidth: '640px' }}>
            <HandballCourt
              mode="entry"
              locale={locale}
              selectedOrigin={shotOrigin}
              onSelectOrigin={(coords) => {
                handleCourtOriginSelect(coords);
                setActiveZoomMap(null);
              }}
              teamColor={activeTeam.primaryColorHex}
            />
          </div>
        </ZoomableMapModal>
      )}

      {activeZoomMap === 'goal' && (
        <ZoomableMapModal
          isOpen={true}
          onClose={() => setActiveZoomMap(null)}
          title={locale === 'sl' ? 'Okvir gola 3×2m (Cel zaslon)' : '3×2m Goal Frame (Full Screen)'}
          subtitle={locale === 'sl' ? 'Povečava in premik · Tapnite cilj v golu' : 'Zoom & pan · Tap target inside frame'}
        >
          <div style={{ width: '100%', maxWidth: '640px' }}>
            <HandballGoal
              mode="entry"
              locale={locale}
              selectedTarget={goalTarget}
              onSelectTarget={(coords) => {
                handleGoalTargetSelect(coords);
                setActiveZoomMap(null);
              }}
              teamColor={activeTeam.primaryColorHex}
            />
          </div>
        </ZoomableMapModal>
      )}

      {/* Click-based Substitution Modal */}
      {substitutingBenchPlayer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9990,
            background: 'rgba(5, 7, 12, 0.88)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '2px solid var(--accent-primary)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7)',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <PlayerVisualPortrait
                  player={substitutingBenchPlayer.player}
                  jerseyNumber={substitutingBenchPlayer.jerseyNumber}
                  team={activeTeam}
                  size={46}
                />
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 800 }}>
                    {locale === 'sl' ? 'Menjava v igro:' : 'Substitute into court:'}{' '}
                    #{substitutingBenchPlayer.jerseyNumber} {substitutingBenchPlayer.player.firstName}{' '}
                    {substitutingBenchPlayer.player.lastName}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 600 }}>
                    {locale === 'sl'
                      ? 'Kliknite igralca na igrišču, ki ga bo zamenjal:'
                      : 'Click which on-court player he replaces:'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSubstitutingBenchPlayer(null)}
                style={{
                  minWidth: '32px',
                  minHeight: '32px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-strong)',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {/* List of 7 On-Court Players */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {onCourtPlayersWithSlot.map(({ slot, player, jerseyNumber }) => {
                const st = playerStats[player.id];
                const pm = st?.plusMinus ?? 0;
                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => {
                      performSubstitution(
                        activeTeam.id,
                        player.id,
                        substitutingBenchPlayer.player.id,
                        slot
                      );
                      setSubstitutingBenchPlayer(null);
                    }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-elevated)',
                      border: '1.5px solid var(--border-strong)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'border-color 140ms',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '3px 7px',
                          borderRadius: '4px',
                          background: 'rgba(56, 189, 248, 0.18)',
                          color: 'var(--accent-primary)',
                        }}
                      >
                        {slot}
                      </span>
                      <PlayerVisualPortrait
                        player={player}
                        jerseyNumber={jerseyNumber}
                        team={activeTeam}
                        size={38}
                      />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 800 }}>
                          #{jerseyNumber} {player.firstName} {player.lastName}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {player.primaryPosition} · {pm > 0 ? `+${pm}` : pm} +/-
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--sem-fault-bg)',
                        border: '1px solid var(--sem-fault)',
                        color: 'var(--sem-fault)',
                        fontSize: '12px',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>⇄</span>
                      <span>{locale === 'sl' ? 'Zamenjaj' : 'Sub Out'}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setSubstitutingBenchPlayer(null)}
              style={{
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-strong)',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {locale === 'sl' ? 'Prekliči' : 'Cancel'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

