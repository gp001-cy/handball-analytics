import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HandballCourt } from '../components/design-system/HandballCourt';
import { HandballGoal } from '../components/design-system/HandballGoal';
import { ZoomableMapModal } from '../components/modals/ZoomableMapModal';
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

  // Drag & drop live substitution state
  const [draggedPlayer, setDraggedPlayer] = useState<{
    id: string;
    source: 'on_court' | 'bench';
    slot?: PositionCode;
  } | null>(null);
  const [dropTargetSlot, setDropTargetSlot] = useState<PositionCode | null>(null);
  const [dropTargetBenchId, setDropTargetBenchId] = useState<string | null>(null);

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

  // Mode 2 Non-Shot Expanders & Subs
  const [openActionSheet, setOpenActionSheet] = useState<
    null | 'tf_types' | 'sub_panel'
  >(null);
  const [subOutPlayerId, setSubOutPlayerId] = useState<string | null>(null);
  const [subOutSlot, setSubOutSlot] = useState<PositionCode | null>(null);

  // Inline Event Editor
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editClockStr, setEditClockStr] = useState<string>('00:00');

  // Zoomable Fullscreen Court / Goal Modal State
  const [activeZoomMap, setActiveZoomMap] = useState<null | 'court' | 'goal'>(null);

  // Fast touch-drag substitution state (120ms hold activation + auto-scroll)
  const touchHoldTimerRef = useRef<number | null>(null);
  const isTouchDraggingRef = useRef<boolean>(false);

  useEffect(() => {
    // Only in Mode 2 (all_in_one) do we auto-select CB/LB as active shooter.
    // In Mode 1 (player_first), do NOT auto-select so user always chooses a player!
    if (liveEntryMode !== 'all_in_one') {
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
  }, [selectedTeamId, activeTeamCourt, selectedPlayerId, liveEntryMode]);

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
        padding: isPhoneLayout ? '8px 10px' : '10px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
          flexWrap: 'wrap',
        }}
      >
        {/* Compact Scoreboard */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div
            className={lastGoalFlashTeamId === ourTeam.id ? 'score-flash-active' : ''}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: isPhoneLayout ? '4px 7px' : '5px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-elevated)',
              border: `2px solid ${ourTeam.primaryColorHex}`,
            }}
          >
            <TeamShapeIcon
              shape={ourTeam.shapeMarker}
              color={ourTeam.primaryColorHex}
              logoUri={ourTeam.logoUri}
              size={isPhoneLayout ? 20 : 24}
            />
            <span style={{ fontSize: '12px', fontWeight: 800 }}>{ourTeam.shortCode}</span>
            <span
              className="tabular-nums"
              style={{
                fontSize: isPhoneLayout ? '19px' : '24px',
                fontWeight: 800,
                color: 'var(--text-primary)',
              }}
            >
              {ourSummary.goals}
            </span>
          </div>

          <span className="tabular-nums" style={{ fontWeight: 800, color: 'var(--text-muted)' }}>
            :
          </span>

          <div
            className={lastGoalFlashTeamId === oppTeam.id ? 'score-flash-active' : ''}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: isPhoneLayout ? '4px 7px' : '5px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-elevated)',
              border: `2px solid ${oppTeam.primaryColorHex}`,
            }}
          >
            <span
              className="tabular-nums"
              style={{
                fontSize: isPhoneLayout ? '19px' : '24px',
                fontWeight: 800,
                color: 'var(--text-primary)',
              }}
            >
              {oppSummary.goals}
            </span>
            <span style={{ fontSize: '12px', fontWeight: 800 }}>{oppTeam.shortCode}</span>
            <TeamShapeIcon
              shape={oppTeam.shapeMarker}
              color={oppTeam.primaryColorHex}
              logoUri={oppTeam.logoUri}
              size={isPhoneLayout ? 20 : 24}
            />
          </div>
        </div>

        {/* Clock + Rewind/Forward 10s + Undo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setClockSec((s) => Math.max(0, s - 10))}
            title="Rewind 10s"
            style={{
              minHeight: '38px',
              padding: '0 6px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              fontSize: '11px',
              fontWeight: 800,
              color: 'var(--text-secondary)',
            }}
          >
            -10s
          </button>

          <button
            type="button"
            onClick={() => setIsClockRunning((r) => !r)}
            style={{
              minHeight: '38px',
              padding: isPhoneLayout ? '0 8px' : '0 12px',
              borderRadius: 'var(--radius-sm)',
              background: isClockRunning ? 'var(--sem-goal-bg)' : 'var(--bg-interactive)',
              border: isClockRunning ? '2px solid var(--sem-goal)' : '1.5px solid var(--border-strong)',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: isClockRunning ? '50%' : '2px',
                background: isClockRunning ? 'var(--sem-goal)' : 'var(--sem-miss)',
              }}
            />
            <span
              className="tabular-nums"
              style={{
                fontSize: isPhoneLayout ? '15px' : '18px',
                fontWeight: 800,
              }}
            >
              {formatClock(clockSec)}
            </span>
            <span
              style={{
                fontSize: '10px',
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
            onClick={() => setClockSec((s) => Math.min(3600, s + 10))}
            title="Advance 10s"
            style={{
              minHeight: '38px',
              padding: '0 6px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              fontSize: '11px',
              fontWeight: 800,
              color: 'var(--text-secondary)',
            }}
          >
            +10s
          </button>

          <button
            type="button"
            disabled={!canUndo}
            onClick={undoLastAction}
            style={{
              minHeight: '42px',
              padding: '0 10px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              opacity: canUndo ? 1 : 0.35,
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            ↶ {isPhoneLayout ? '' : t.common.undo}
          </button>
          {!isPhoneLayout && (
            <button
              type="button"
              disabled={!canRedo}
              onClick={redoLastAction}
              style={{
                minHeight: '42px',
                padding: '0 10px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-strong)',
                opacity: canRedo ? 1 : 0.35,
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              ↷ {t.common.redo}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (window.confirm('Reset this match to 0-0 and clock to 00:00?')) {
                resetMatchToZero();
              }
            }}
            title="Reset match to 0-0"
            style={{
              minHeight: '42px',
              padding: '0 8px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              fontSize: '11px',
              fontWeight: 800,
              color: 'var(--sem-miss)',
            }}
          >
            0-0
          </button>
        </div>
      </div>

      {/* Mode Switcher Bar (Switch between Mode 1: Player-First & Mode 2: All-in-One anytime!) + Active 2' Suspensions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            background: 'var(--bg-canvas)',
            padding: '2px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-strong)',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setLiveEntryMode('player_first');
              setPfStep('select_player');
            }}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              background:
                liveEntryMode === 'player_first'
                  ? 'var(--sem-goal)'
                  : 'transparent',
              color:
                liveEntryMode === 'player_first'
                  ? '#080c14'
                  : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 800,
            }}
          >
            1. Players Only Flow
          </button>
          <button
            type="button"
            onClick={() => setLiveEntryMode('all_in_one')}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              background:
                liveEntryMode === 'all_in_one'
                  ? 'var(--accent-primary)'
                  : 'transparent',
              color:
                liveEntryMode === 'all_in_one'
                  ? '#080c14'
                  : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 800,
            }}
          >
            2. All-in-One Charts
          </button>
        </div>

        {/* Active 2-min suspension badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
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
                  fontSize: '11px',
                  fontWeight: 800,
                  color: 'var(--sem-fault)',
                }}
              >
                ⏱ 2′ {suspTeam.shortCode} #{susp.jerseyNumber} {formatClock(susp.remainingSec)}
              </span>
            );
          })}
        </div>
      </div>
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
              setSelectedPlayerId(null);
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
            <span>Direct Shot</span>
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
            <span>{isBounceShot ? '✓ Bounce Shot' : 'Bounce Shot'}</span>
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
            <span>{attackPhase === 'fast_break' ? '✓ Fast Break' : 'Fast Break'}</span>
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
            {activeTeamCourt?.is7v6Active ? '● 7v6 Empty Net' : '7v6 Empty Net'}
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
            Assist by:
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
            None
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
  // Fast Touch-Drag Substitution Handlers (120ms activation + auto-scroll down/up)
  // =====================================================
  const handleCardPointerDown = (
    player: (typeof players)[0],
    source: 'on_court' | 'bench',
    slot?: PositionCode
  ) => {
    if (touchHoldTimerRef.current) {
      window.clearTimeout(touchHoldTimerRef.current);
    }
    touchHoldTimerRef.current = window.setTimeout(() => {
      isTouchDraggingRef.current = true;
      setDraggedPlayer({ id: player.id, source, slot });
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(30);
      }
    }, 120);
  };

  const handleCardPointerMove = (e: React.PointerEvent) => {
    if (!isTouchDraggingRef.current) {
      return;
    }
    // Auto-scroll page when dragging near top or bottom screen boundary
    const threshold = 110;
    if (e.clientY > window.innerHeight - threshold) {
      window.scrollBy({ top: 14, behavior: 'instant' });
    } else if (e.clientY < threshold) {
      window.scrollBy({ top: -14, behavior: 'instant' });
    }

    // Hit test drop targets
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const courtTarget = el?.closest('[data-drop-slot]');
    const benchTarget = el?.closest('[data-drop-bench-id]');

    if (courtTarget) {
      const targetSlot = courtTarget.getAttribute('data-drop-slot') as PositionCode;
      setDropTargetSlot(targetSlot);
      setDropTargetBenchId(null);
    } else if (benchTarget) {
      const targetBenchId = benchTarget.getAttribute('data-drop-bench-id');
      setDropTargetBenchId(targetBenchId);
      setDropTargetSlot(null);
    } else {
      setDropTargetSlot(null);
      setDropTargetBenchId(null);
    }
  };

  const handleCardPointerUp = (
    player: (typeof players)[0],
    e: React.PointerEvent
  ) => {
    if (touchHoldTimerRef.current) {
      window.clearTimeout(touchHoldTimerRef.current);
      touchHoldTimerRef.current = null;
    }

    if (isTouchDraggingRef.current) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const courtTarget = el?.closest('[data-drop-slot]');
      const benchTarget = el?.closest('[data-drop-bench-id]');

      if (draggedPlayer) {
        if (courtTarget) {
          const targetSlot = courtTarget.getAttribute('data-drop-slot') as PositionCode;
          const targetPlayerId = courtTarget.getAttribute('data-player-id');
          if (draggedPlayer.source === 'bench' && targetPlayerId) {
            performSubstitution(activeTeam.id, targetPlayerId, draggedPlayer.id, targetSlot);
          } else if (
            draggedPlayer.source === 'on_court' &&
            targetPlayerId &&
            targetPlayerId !== draggedPlayer.id
          ) {
            performSubstitution(activeTeam.id, targetPlayerId, draggedPlayer.id, targetSlot);
          }
        } else if (benchTarget) {
          const targetBenchId = benchTarget.getAttribute('data-drop-bench-id');
          if (draggedPlayer.source === 'on_court' && draggedPlayer.slot && targetBenchId) {
            performSubstitution(activeTeam.id, draggedPlayer.id, targetBenchId, draggedPlayer.slot);
          }
        }
      }

      isTouchDraggingRef.current = false;
      setDraggedPlayer(null);
      setDropTargetSlot(null);
      setDropTargetBenchId(null);
    } else {
      // Normal quick tap (< 120ms): open player action menu
      setSelectedPlayerId(player.id);
      setPfStep('choose_action');
    }
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
                    ? `NA IGRIŠČU (7 · ${activeTeam.name.toUpperCase()})`
                    : `ON COURT (7 PLAYERS · ${activeTeam.name.toUpperCase()})`}
                </span>
                <span
                  style={{
                    fontSize: '10.5px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'var(--bg-elevated)',
                    color: 'var(--accent-primary)',
                    fontWeight: 700,
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {locale === 'sl' ? '⇄ Povleci za menjavo' : '⇄ Drag & Drop to Sub'}
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
                  ? 'repeat(2, 1fr)'
                  : 'repeat(auto-fill, minmax(210px, 1fr))',
                gap: '10px',
              }}
            >
              {onCourtPlayersWithSlot.map(({ slot, player, jerseyNumber }) => {
                const st = playerStats[player.id];
                const susp = activeTeamCourt?.activeSuspensions.find(
                  (s) => s.playerId === player.id
                );
                const isDragOver = dropTargetSlot === slot;
                const isBeingDragged = draggedPlayer?.id === player.id;
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
                    data-drop-slot={slot}
                    data-player-id={player.id}
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', player.id);
                      setDraggedPlayer({
                        id: player.id,
                        source: 'on_court',
                        slot,
                      });
                    }}
                    onDragEnd={() => {
                      setDraggedPlayer(null);
                      setDropTargetSlot(null);
                      setDropTargetBenchId(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDropTargetSlot(slot);
                    }}
                    onDragLeave={() => {
                      if (dropTargetSlot === slot) setDropTargetSlot(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDropTargetSlot(null);
                      if (!draggedPlayer) return;
                      if (draggedPlayer.source === 'bench') {
                        performSubstitution(
                          activeTeam.id,
                          player.id,
                          draggedPlayer.id,
                          slot
                        );
                      } else if (
                        draggedPlayer.source === 'on_court' &&
                        draggedPlayer.id !== player.id
                      ) {
                        performSubstitution(
                          activeTeam.id,
                          player.id,
                          draggedPlayer.id,
                          slot
                        );
                      }
                      setDraggedPlayer(null);
                    }}
                    onPointerDown={() => handleCardPointerDown(player, 'on_court', slot)}
                    onPointerMove={handleCardPointerMove}
                    onPointerUp={(e) => handleCardPointerUp(player, e)}
                    onPointerCancel={() => {
                      if (touchHoldTimerRef.current) clearTimeout(touchHoldTimerRef.current);
                      isTouchDraggingRef.current = false;
                      setDraggedPlayer(null);
                      setDropTargetSlot(null);
                      setDropTargetBenchId(null);
                    }}
                    style={{
                      padding: isPhoneLayout ? '10px 8px' : '14px 12px',
                      minHeight: isPhoneLayout ? '96px' : '115px',
                      borderRadius: 'var(--radius-lg)',
                      background: isDragOver
                        ? 'var(--sem-goal-bg)'
                        : 'var(--bg-surface)',
                      border: isDragOver
                        ? '2px dashed var(--sem-goal)'
                        : `1.5px solid ${activeTeam.primaryColorHex}77`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: isPhoneLayout ? '8px' : '12px',
                      textAlign: 'left',
                      position: 'relative',
                      opacity: isBeingDragged ? 0.45 : 1,
                      cursor: 'grab',
                      transition: 'border 160ms, background 160ms',
                      overflow: 'hidden',
                      touchAction: 'pan-y',
                    }}
                  >
                    <PlayerVisualPortrait
                      player={player}
                      jerseyNumber={jerseyNumber}
                      team={activeTeam}
                      slot={slot}
                      size={isPhoneLayout ? 54 : 64}
                    />
                    <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                      <div
                        style={{
                          fontSize: isPhoneLayout ? '14px' : '16px',
                          fontWeight: 800,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {player.lastName}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-secondary)',
                          marginBottom: '4px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        #{jerseyNumber} · <strong>{slot}</strong>
                      </div>

                      {/* Colorful Mini Stat Pills: G, A, TF, and +/- */}
                      <div
                        className="tabular-nums"
                        style={{
                          display: 'flex',
                          gap: '3px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '1px 4px',
                            borderRadius: '3px',
                            background: 'var(--sem-goal-bg)',
                            color: 'var(--sem-goal)',
                          }}
                        >
                          {st?.goals ?? 0}/{st?.shots ?? 0} G
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '1px 4px',
                            borderRadius: '3px',
                            background: 'var(--sem-assist-bg)',
                            color: 'var(--sem-assist)',
                          }}
                        >
                          {st?.assists ?? 0} A
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '1px 4px',
                            borderRadius: '3px',
                            background: 'var(--sem-fault-bg)',
                            color: 'var(--sem-fault)',
                          }}
                        >
                          {st?.technicalFaults ?? 0} TF
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '1px 4px',
                            borderRadius: '3px',
                            background: 'var(--bg-elevated)',
                            color: pmColor,
                            border: `1px solid ${pmColor}44`,
                          }}
                        >
                          {pm > 0 ? `+${pm}` : pm} +/-
                        </span>
                      </div>
                    </div>

                    {isDragOver && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'var(--sem-goal)',
                          color: '#020408',
                          fontSize: '10px',
                          fontWeight: 800,
                        }}
                      >
                        ⇄ SUB
                      </span>
                    )}

                    {susp && !isDragOver && (
                      <span
                        className="tabular-nums"
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          padding: '2px 6px',
                          borderRadius: '999px',
                          background: 'var(--sem-fault)',
                          color: '#fff',
                          fontSize: '10px',
                          fontWeight: 800,
                        }}
                      >
                        2′ {formatClock(susp.remainingSec)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* BENCH PLAYER PORTRAIT CARDS */}
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
              }}
            >
              <span>{locale === 'sl' ? `KLOP (${benchPlayers.length})` : `BENCH PLAYERS (${benchPlayers.length})`}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {locale === 'sl'
                  ? 'Pridrži 120ms in povleci na igrišče'
                  : 'Hold 120ms & drag onto on-court to sub'}
              </span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isPhoneLayout
                  ? 'repeat(2, 1fr)'
                  : 'repeat(auto-fill, minmax(210px, 1fr))',
                gap: '10px',
              }}
            >
              {benchPlayers.map(({ player, jerseyNumber }) => {
                const st = playerStats[player.id];
                const isDragOver = dropTargetBenchId === player.id;
                const isBeingDragged = draggedPlayer?.id === player.id;
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
                    data-drop-bench-id={player.id}
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', player.id);
                      setDraggedPlayer({ id: player.id, source: 'bench' });
                    }}
                    onDragEnd={() => {
                      setDraggedPlayer(null);
                      setDropTargetSlot(null);
                      setDropTargetBenchId(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDropTargetBenchId(player.id);
                    }}
                    onDragLeave={() => {
                      if (dropTargetBenchId === player.id)
                        setDropTargetBenchId(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDropTargetBenchId(null);
                      if (
                        draggedPlayer &&
                        draggedPlayer.source === 'on_court' &&
                        draggedPlayer.slot
                      ) {
                        performSubstitution(
                          activeTeam.id,
                          draggedPlayer.id,
                          player.id,
                          draggedPlayer.slot
                        );
                      }
                      setDraggedPlayer(null);
                    }}
                    onPointerDown={() => handleCardPointerDown(player, 'bench')}
                    onPointerMove={handleCardPointerMove}
                    onPointerUp={(e) => handleCardPointerUp(player, e)}
                    onPointerCancel={() => {
                      if (touchHoldTimerRef.current) clearTimeout(touchHoldTimerRef.current);
                      isTouchDraggingRef.current = false;
                      setDraggedPlayer(null);
                      setDropTargetSlot(null);
                      setDropTargetBenchId(null);
                    }}
                    style={{
                      padding: isPhoneLayout ? '10px 8px' : '12px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: isDragOver
                        ? 'var(--sem-goal-bg)'
                        : 'var(--bg-surface)',
                      border: isDragOver
                        ? '2px dashed var(--sem-goal)'
                        : '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: isPhoneLayout ? '8px' : '10px',
                      textAlign: 'left',
                      position: 'relative',
                      opacity: isBeingDragged ? 0.45 : 1,
                      cursor: 'grab',
                      overflow: 'hidden',
                      touchAction: 'pan-y',
                    }}
                  >
                    <PlayerVisualPortrait
                      player={player}
                      jerseyNumber={jerseyNumber}
                      team={activeTeam}
                      size={isPhoneLayout ? 46 : 52}
                    />
                    <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                      <div
                        style={{
                          fontSize: isPhoneLayout ? '13.5px' : '14.5px',
                          fontWeight: 800,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {player.lastName}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-secondary)',
                          marginBottom: '4px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        #{jerseyNumber} · {player.primaryPosition}
                      </div>

                      {/* Stat summary with G and +/- */}
                      <div
                        className="tabular-nums"
                        style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}
                      >
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '1px 4px',
                            borderRadius: '3px',
                            background: 'var(--sem-goal-bg)',
                            color: 'var(--sem-goal)',
                          }}
                        >
                          {st?.goals ?? 0}/{st?.shots ?? 0} G
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '1px 4px',
                            borderRadius: '3px',
                            background: 'var(--bg-elevated)',
                            color: pmColor,
                          }}
                        >
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

    // STEP 1: PLAYER CLICKED -> SHOWS GOAL MENU & BUTTONS FOR TURNOVER / ASSIST / DEFENCE
    if (pfStep === 'choose_action' && selectedPlayer) {
      return (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: `2px solid ${activeTeam.primaryColorHex}`,
            borderRadius: 'var(--radius-lg)',
            padding: isPhoneLayout ? '14px' : '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Selected Player Header Banner */}
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
              }}
            >
              ← Players
            </button>
          </div>

          {/* SHOT OUTCOME MENU (Selecting Goal or Shot advances to Step 2: Pick Court Origin!) */}
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
              SHOTS & GOALS (OPENS COURT ORIGIN → GOAL FRAME)
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
                    label: 'GOAL SCORED',
                    sub: 'Pick origin → goal frame',
                    color: 'var(--sem-goal)',
                    bg: 'var(--sem-goal-bg)',
                    icon: <IconGoalNet size={26} color="var(--sem-goal)" />,
                  },
                  {
                    key: 'saved' as const,
                    label: 'GK SAVED',
                    sub: 'Shot stopped on target',
                    color: 'var(--sem-save)',
                    bg: 'var(--sem-save-bg)',
                    icon: <IconGkSave size={26} color="var(--sem-save)" />,
                  },
                  {
                    key: 'miss' as const,
                    label: 'MISSED SHOT',
                    sub: 'Wide or over crossbar',
                    color: 'var(--sem-miss)',
                    bg: 'var(--sem-miss-bg)',
                    icon: <IconMissTarget size={26} color="var(--sem-miss)" />,
                  },
                  {
                    key: 'post' as const,
                    label: 'POST / BAR',
                    sub: 'Hit goalpost or crossbar',
                    color: 'var(--sem-miss)',
                    bg: 'var(--sem-miss-bg)',
                    icon: <IconPostHit size={26} color="var(--sem-miss)" />,
                  },
                  {
                    key: 'blocked' as const,
                    label: 'BLOCKED',
                    sub: 'Stopped by defender',
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

          {/* QUICK 1-TAP ASSIST, TURNOVER, DEFENCE & DISCIPLINE BUTTONS */}
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
              INSTANT 1-TAP EVENTS (ASSISTS, TURNOVERS, DEFENCE, 2 MIN)
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
                  handleQuickNonShotEvent('attack_other', 'assist', 'Assist')
                }
                style={{
                  minHeight: '54px',
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--sem-assist-bg)',
                  border: '1.5px solid var(--sem-assist)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 800,
                  fontSize: '13px',
                }}
              >
                <IconAssistPass size={22} />
                <span>+ Assist Pass</span>
              </button>

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
                }}
              >
                <IconTurnoverFault size={22} />
                <span>TF: Bad Pass</span>
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
                }}
              >
                <IconTurnoverFault size={22} />
                <span>TF: Steps / Line</span>
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
                }}
              >
                <IconTurnoverFault size={22} />
                <span>TF: Off. Foul</span>
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
                }}
              >
                <IconStealBall size={22} />
                <span>Steal / Interc.</span>
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
                }}
              >
                <IconBlockWall size={22} />
                <span>Defensive Block</span>
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
                }}
              >
                <IconTwoMinSuspension size={22} />
                <span>2′ Suspension</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleQuickNonShotEvent(
                    'attack_other',
                    'earned_7m',
                    'Earned 7m'
                  )
                }
                style={{
                  minHeight: '54px',
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)',
                  border: '1.5px solid var(--border-strong)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 800,
                  fontSize: '13px',
                }}
              >
                <MiniCourtZoneDiagram highlight="7m" size={26} />
                <span>Earned 7m Pen</span>
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
                STEP 2 OF 3 · #{selectedJersey} {selectedPlayer.lastName} ({pendingOutcome.toUpperCase()})
              </div>
              <div style={{ fontSize: '16px', fontWeight: 800 }}>
                Tap where the shot was taken from
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setActiveZoomMap('court')}
                style={{
                  minHeight: '38px',
                  padding: '0 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--accent-primary-subtle)',
                  border: '1px solid var(--accent-primary)',
                  fontWeight: 700,
                  fontSize: '12px',
                  color: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                ⛶ {locale === 'sl' ? 'Povečaj' : 'Enlarge'}
              </button>
              <button
                type="button"
                onClick={() => setPfStep('choose_action')}
                style={{
                  minHeight: '38px',
                  padding: '0 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-strong)',
                  fontWeight: 700,
                  fontSize: '12px',
                }}
              >
                ← Back
              </button>
            </div>
          </div>

          <HandballCourt
            mode="entry"
            locale={locale}
            selectedOrigin={shotOrigin}
            onSelectOrigin={(coords) => {
              setShotOrigin(coords);
              if (coords.zone === 'FAST_BREAK') {
                setAttackPhase('fast_break');
              }
              setPfStep('pick_goal_target');
            }}
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
                STEP 3 OF 3 · FROM {shotOrigin ? t.zones[shotOrigin.zone] : 'COURT'}
              </div>
              <div style={{ fontSize: '16px', fontWeight: 800 }}>
                Tap the Goal Frame where #{selectedJersey} {selectedPlayer.lastName} shot it
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setActiveZoomMap('goal')}
                style={{
                  minHeight: '38px',
                  padding: '0 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--sem-goal-bg)',
                  border: '1px solid var(--sem-goal)',
                  fontWeight: 700,
                  fontSize: '12px',
                  color: 'var(--sem-goal)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                ⛶ {locale === 'sl' ? 'Povečaj' : 'Enlarge'}
              </button>
              <button
                type="button"
                onClick={() => setPfStep('pick_court_origin')}
                style={{
                  minHeight: '38px',
                  padding: '0 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-strong)',
                  fontWeight: 700,
                  fontSize: '12px',
                }}
              >
                ← Court
              </button>
            </div>
          </div>

          {/* Bounce Shot Toggle & Assisted By Picker */}
          {renderBounceAndAssistControls()}

          <HandballGoal
            mode="entry"
            locale={locale}
            selectedTarget={goalTarget}
            onSelectTarget={(coords) => {
              setGoalTarget(coords);
              commitShotWithDetails(pendingOutcome, shotOrigin ?? undefined, coords);
            }}
            teamColor={activeTeam.primaryColorHex}
          />
        </div>
      );
    }

    return null;
  };

  // =====================================================
  // MODE 2: ALL-IN-ONE COURT + PLAYERS + CHARTS VIEW
  // =====================================================
  const renderAllInOneMode = () => {
    const selectedPlayer = players.find((p) => p.id === selectedPlayerId);
    const selectedPlayerLineup = activeMatch.lineups.find(
      (l) => l.playerId === selectedPlayerId
    );
    const selectedJersey =
      selectedPlayerLineup?.jerseyNumber ??
      selectedPlayer?.defaultJerseyNumber ??
      0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* On-Court Players Visual Strip (Clean, Zero Overflow) */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '6px',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)' }}>
              ACTIVE SHOOTER / PLAYER:{' '}
              <strong style={{ color: activeTeam.primaryColorHex }}>
                #{selectedJersey} {selectedPlayer?.lastName}
              </strong>
            </span>
            <button
              type="button"
              onClick={() =>
                setOpenActionSheet((s) => (s === 'sub_panel' ? null : 'sub_panel'))
              }
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-strong)',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              ⇄ Substitutions & Bench ({benchPlayers.length})
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isPhoneLayout
                ? 'repeat(4, 1fr)'
                : 'repeat(7, 1fr)',
              gap: '6px',
            }}
          >
            {onCourtPlayersWithSlot.map(({ slot, player, jerseyNumber }) => {
              const st = playerStats[player.id];
              const isSel = selectedPlayerId === player.id;
              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => setSelectedPlayerId(player.id)}
                  style={{
                    padding: '6px',
                    borderRadius: 'var(--radius-sm)',
                    background: isSel
                      ? `${activeTeam.primaryColorHex}2E`
                      : 'var(--bg-elevated)',
                    border: isSel
                      ? `2px solid ${activeTeam.primaryColorHex}`
                      : autoSuggestedSlot === slot
                      ? `1.5px dashed ${activeTeam.primaryColorHex}`
                      : '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                >
                  <PlayerVisualPortrait
                    player={player}
                    jerseyNumber={jerseyNumber}
                    team={activeTeam}
                    slot={slot}
                    size={40}
                  />
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {player.lastName}
                  </span>
                  <span
                    className="tabular-nums"
                    style={{ fontSize: '10px', color: 'var(--sem-goal)', fontWeight: 700 }}
                  >
                    {st?.goals ?? 0}/{st?.shots ?? 0}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Expandable Bench & Line Change Panel */}
          {openActionSheet === 'sub_panel' && (
            <div
              style={{
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                Tap an on-court player first, then tap a bench player below to
                substitute:
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isPhoneLayout
                    ? 'repeat(2, 1fr)'
                    : 'repeat(4, 1fr)',
                  gap: '6px',
                }}
              >
                {benchPlayers.map(({ player, jerseyNumber }) => (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => {
                      if (selectedPlayerId) {
                        const slotObj = onCourtPlayersWithSlot.find(
                          (x) => x.player.id === selectedPlayerId
                        );
                        if (slotObj) {
                          performSubstitution(
                            activeTeam.id,
                            selectedPlayerId,
                            player.id,
                            slotObj.slot
                          );
                          setSelectedPlayerId(player.id);
                          setOpenActionSheet(null);
                          return;
                        }
                      }
                      setSelectedPlayerId(player.id);
                    }}
                    style={{
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-strong)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <PlayerVisualPortrait
                      player={player}
                      jerseyNumber={jerseyNumber}
                      team={activeTeam}
                      size={36}
                    />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700 }}>
                        #{jerseyNumber} {player.lastName}
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                        Sub IN ({player.primaryPosition})
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Court Origin (Left/Top) + Goal Frame (Right/Bottom) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isPhoneLayout ? '1fr' : '1.12fr 0.88fr',
            gap: '10px',
            alignItems: 'start',
          }}
        >
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '10px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '6px',
              }}
            >
              <div
                style={{
                  fontSize: '11.5px',
                  fontWeight: 800,
                  color: shotOrigin ? 'var(--sem-goal)' : 'var(--accent-primary)',
                }}
              >
                {shotOrigin
                  ? `✓ 1. Origin: ${t.zones[shotOrigin.zone]}`
                  : '1. Tap Court Shot Origin'}
              </div>
              <button
                type="button"
                onClick={() => setActiveZoomMap('court')}
                style={{
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                ⛶ {locale === 'sl' ? 'Povečaj' : 'Enlarge'}
              </button>
            </div>
            <HandballCourt
              mode="entry"
              locale={locale}
              selectedOrigin={shotOrigin}
              onSelectOrigin={(coords, suggestedPos) => {
                setShotOrigin(coords);
                setAutoSuggestedSlot(suggestedPos);
                if (coords.zone === 'FAST_BREAK') setAttackPhase('fast_break');
                const onCourtByPos = activeTeamCourt?.onCourtByPosition;
                if (onCourtByPos && onCourtByPos[suggestedPos]) {
                  setSelectedPlayerId(onCourtByPos[suggestedPos]);
                }
              }}
              teamColor={activeTeam.primaryColorHex}
              compact={isPhoneLayout}
            />
          </div>

          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div
                style={{
                  fontSize: '11.5px',
                  fontWeight: 800,
                  color: goalTarget ? 'var(--sem-goal)' : 'var(--accent-primary)',
                }}
              >
                {goalTarget
                  ? `✓ 2. Target: ${t.goalCells[goalTarget.cell]}`
                  : '2. Tap 3×2m Goal Target'}
              </div>
              <button
                type="button"
                onClick={() => setActiveZoomMap('goal')}
                style={{
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--sem-goal)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                ⛶ {locale === 'sl' ? 'Povečaj' : 'Enlarge'}
              </button>
            </div>
            <HandballGoal
              mode="entry"
              locale={locale}
              selectedTarget={goalTarget}
              onSelectTarget={(coords) => setGoalTarget(coords)}
              teamColor={activeTeam.primaryColorHex}
            />
          </div>
        </div>

        {/* Bounce Shot & Assist Controls */}
        {renderBounceAndAssistControls()}

        {/* Step 3: Diagrammed Shot Outcome Buttons */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isPhoneLayout
              ? 'repeat(3, 1fr)'
              : 'repeat(5, 1fr)',
            gap: '6px',
          }}
        >
          {(
            [
              {
                key: 'goal' as const,
                label: t.live.goal,
                color: 'var(--sem-goal)',
                bg: 'var(--sem-goal-bg)',
                icon: <IconGoalNet size={20} color="var(--sem-goal)" />,
              },
              {
                key: 'saved' as const,
                label: t.live.saved,
                color: 'var(--sem-save)',
                bg: 'var(--sem-save-bg)',
                icon: <IconGkSave size={20} color="var(--sem-save)" />,
              },
              {
                key: 'miss' as const,
                label: t.live.miss,
                color: 'var(--sem-miss)',
                bg: 'var(--sem-miss-bg)',
                icon: <IconMissTarget size={20} color="var(--sem-miss)" />,
              },
              {
                key: 'post' as const,
                label: t.live.post,
                color: 'var(--sem-miss)',
                bg: 'var(--sem-miss-bg)',
                icon: <IconPostHit size={20} color="var(--sem-miss)" />,
              },
              {
                key: 'blocked' as const,
                label: t.live.block,
                color: 'var(--sem-block)',
                bg: 'var(--sem-block-bg)',
                icon: <IconBlockWall size={20} color="var(--sem-block)" />,
              },
            ]
          ).map((btn) => (
            <button
              key={btn.key}
              type="button"
              onClick={() => commitShotWithDetails(btn.key)}
              style={{
                minHeight: '54px',
                padding: '6px 8px',
                borderRadius: 'var(--radius-md)',
                background: btn.bg,
                border: `2px solid ${btn.color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontWeight: 800,
                fontSize: '13.5px',
                gridColumn:
                  isPhoneLayout && btn.key === 'goal' ? 'span 3' : undefined,
              }}
            >
              {btn.icon}
              <span>{btn.label}</span>
            </button>
          ))}
        </div>

        {/* Diagrammed Non-Shot Action Buttons */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isPhoneLayout
              ? 'repeat(3, 1fr)'
              : 'repeat(6, 1fr)',
            gap: '6px',
          }}
        >
          <button
            type="button"
            onClick={() =>
              handleQuickNonShotEvent('attack_other', 'assist', t.live.assist)
            }
            style={{
              minHeight: '48px',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--sem-assist-bg)',
              border: '1px solid var(--sem-assist)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontWeight: 700,
              fontSize: '12px',
            }}
          >
            <IconAssistPass size={18} />
            <span>{t.live.assist}</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setOpenActionSheet((prev) =>
                prev === 'tf_types' ? null : 'tf_types'
              )
            }
            style={{
              minHeight: '48px',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--sem-fault-bg)',
              border: '1px solid var(--sem-fault)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontWeight: 700,
              fontSize: '12px',
            }}
          >
            <IconTurnoverFault size={18} />
            <span>{t.live.technicalFault} ▾</span>
          </button>

          <button
            type="button"
            onClick={() =>
              handleQuickNonShotEvent('defence', 'steal', t.live.steal)
            }
            style={{
              minHeight: '48px',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--sem-goal-bg)',
              border: '1px solid var(--sem-goal)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontWeight: 700,
              fontSize: '12px',
            }}
          >
            <IconStealBall size={18} />
            <span>{t.live.steal}</span>
          </button>

          <button
            type="button"
            onClick={() =>
              handleQuickNonShotEvent('defence', 'block', t.live.block)
            }
            style={{
              minHeight: '48px',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--sem-block-bg)',
              border: '1px solid var(--sem-block)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontWeight: 700,
              fontSize: '12px',
            }}
          >
            <IconBlockWall size={18} />
            <span>{t.live.block}</span>
          </button>

          <button
            type="button"
            onClick={() =>
              handleQuickNonShotEvent('discipline', '2min', t.live.twoMin)
            }
            style={{
              minHeight: '48px',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--sem-fault-bg)',
              border: '1px solid var(--sem-fault)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontWeight: 700,
              fontSize: '12px',
            }}
          >
            <IconTwoMinSuspension size={18} />
            <span>2′ Susp</span>
          </button>

          <button
            type="button"
            onClick={() =>
              handleQuickNonShotEvent('team_state', 'timeout', t.live.timeout)
            }
            style={{
              minHeight: '48px',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-strong)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontWeight: 700,
              fontSize: '12px',
            }}
          >
            <IconTimeoutCard size={18} />
            <span>{t.live.timeout}</span>
          </button>
        </div>

        {openActionSheet === 'tf_types' && (
          <div
            style={{
              padding: '10px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--sem-fault)',
              borderRadius: 'var(--radius-md)',
              display: 'grid',
              gridTemplateColumns: isPhoneLayout
                ? 'repeat(2, 1fr)'
                : 'repeat(4, 1fr)',
              gap: '6px',
            }}
          >
            {(
              [
                'bad_pass',
                'catching_error',
                'steps',
                'double_dribble',
                'offensive_foul',
                'line_violation',
                'passive_play',
              ] as TechnicalFaultType[]
            ).map((tfKey) => (
              <button
                key={tfKey}
                type="button"
                onClick={() =>
                  handleQuickNonShotEvent(
                    'technical_fault',
                    tfKey,
                    t.faults[tfKey]
                  )
                }
                style={{
                  minHeight: '42px',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-strong)',
                  fontSize: '12px',
                  fontWeight: 700,
                  textAlign: 'left',
                }}
              >
                ✕ {t.faults[tfKey]}
              </button>
            ))}
          </div>
        )}
      </div>
    );
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

        {liveEntryMode === 'player_first' ? (
          /* MODE 1: Player Portraits First -> Action Menu -> Court Origin -> Goal Frame */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isPhoneLayout ? '1fr' : '1.35fr 0.65fr',
              gap: '14px',
              alignItems: 'start',
            }}
          >
            {renderPlayerFirstMode()}
            {renderInsightsAndFeedColumn()}
          </div>
        ) : (
          /* MODE 2: All-in-One Court + Goal + Players + Live Insights */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isPhoneLayout ? '1fr' : '1.4fr 0.6fr',
              gap: '14px',
              alignItems: 'start',
            }}
          >
            {renderAllInOneMode()}
            {renderInsightsAndFeedColumn()}
          </div>
        )}
      </div>

      {/* Fullscreen Zoomable Map Lightbox */}
      {activeZoomMap === 'court' && (
        <ZoomableMapModal
          isOpen={true}
          onClose={() => setActiveZoomMap(null)}
          title={locale === 'sl' ? 'Interaktivno rokometno igrišče (Cel zaslon)' : 'Interactive Handball Court (Full Screen)'}
          subtitle={locale === 'sl' ? 'Povečava in premik · Tapni cono za izbiro meta' : 'Zoom & pan · Tap zone to select shot origin'}
        >
          <div style={{ width: '100%', maxWidth: '640px' }}>
            <HandballCourt
              mode="entry"
              locale={locale}
              selectedOrigin={shotOrigin}
              onSelectOrigin={(coords, suggestedPos) => {
                setShotOrigin(coords);
                setAutoSuggestedSlot(suggestedPos);
                if (coords.zone === 'FAST_BREAK') setAttackPhase('fast_break');
                if (liveEntryMode === 'player_first') {
                  setPfStep('pick_goal_target');
                } else {
                  const onCourtByPos = activeTeamCourt?.onCourtByPosition;
                  if (onCourtByPos && onCourtByPos[suggestedPos]) {
                    setSelectedPlayerId(onCourtByPos[suggestedPos]);
                  }
                }
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
          subtitle={locale === 'sl' ? 'Povečava in premik · Tapni tarčo v golu' : 'Zoom & pan · Tap target inside frame'}
        >
          <div style={{ width: '100%', maxWidth: '640px' }}>
            <HandballGoal
              mode="entry"
              locale={locale}
              selectedTarget={goalTarget}
              onSelectTarget={(coords) => {
                setGoalTarget(coords);
                if (liveEntryMode === 'player_first' && pfStep === 'pick_goal_target') {
                  commitShotWithDetails(pendingOutcome, shotOrigin ?? undefined, coords);
                }
                setActiveZoomMap(null);
              }}
              teamColor={activeTeam.primaryColorHex}
            />
          </div>
        </ZoomableMapModal>
      )}
    </div>
  );
};
