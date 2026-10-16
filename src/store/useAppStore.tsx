import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  SEED_COMPETITIONS,
  SEED_EVENTS,
  SEED_MATCHES,
  SEED_PLAYERS,
  SEED_SEASONS,
  SEED_TEAMS,
} from '../data/seedData';
import {
  AnalyticalFilter,
  AuditRevision,
  Competition,
  LiveEntryMode,
  LocaleCode,
  Match,
  MatchEvent,
  Player,
  PositionCode,
  Season,
  Team,
  ThemeMode,
  ViewportSimulation,
} from '../types/domain';

const STORAGE_KEY = 'hb_analytics_store_v3';

export type ActiveTab =
  | 'start'
  | 'home'
  | 'live'
  | 'stats'
  | 'prematch'
  | 'matches'
  | 'teams'
  | 'reports';

interface PersistedState {
  seasons: Season[];
  competitions: Competition[];
  teams: Team[];
  players: Player[];
  matches: Match[];
  eventsByMatch: Record<string, MatchEvent[]>;
  auditByMatch: Record<string, AuditRevision[]>;
  redoByMatch: Record<string, AuditRevision[]>;
  matchClocks: Record<string, number>;
}

interface ToastNotification {
  id: string;
  message: string;
  canUndo: boolean;
  timestampMs: number;
}

interface AppStoreContextValue {
  // UI Preferences
  locale: LocaleCode;
  setLocale: (loc: LocaleCode) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  viewportSim: ViewportSimulation;
  setViewportSim: (v: ViewportSimulation) => void;
  liveEntryMode: LiveEntryMode;
  setLiveEntryMode: (m: LiveEntryMode) => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;

  // Entities
  seasons: Season[];
  competitions: Competition[];
  teams: Team[];
  players: Player[];
  matches: Match[];
  activeMatchId: string;
  setActiveMatchId: (id: string) => void;
  activeMatch: Match;
  activeEvents: MatchEvent[];

  // Live Match Clock
  clockSec: number;
  setClockSec: (sec: number | ((prev: number) => number)) => void;
  isClockRunning: boolean;
  setIsClockRunning: (run: boolean | ((prev: boolean) => boolean)) => void;

  // Score Flash & Toast
  lastGoalFlashTeamId: string | null;
  toast: ToastNotification | null;
  dismissToast: () => void;

  // Player Inspector Modal / Drawer
  inspectedPlayerId: string | null;
  setInspectedPlayerId: (id: string | null) => void;
  comparePlayerId: string | null;
  setComparePlayerId: (id: string | null) => void;

  // Global Filter State
  filter: AnalyticalFilter;
  setFilter: React.Dispatch<React.SetStateAction<AnalyticalFilter>>;
  resetFilter: () => void;

  // Event & Lineup Actions (Crash-safe, Immediate Local DB commit, Unlimited Undo/Redo)
  logEvent: (
    eventInput: Omit<MatchEvent, 'id' | 'matchId' | 'createdAtMs'>,
    toastLabel?: string
  ) => MatchEvent;
  updateEvent: (eventId: string, patch: Partial<MatchEvent>, reason?: string) => void;
  deleteEvent: (eventId: string) => void;
  undoLastAction: () => void;
  redoLastAction: () => void;
  canUndo: boolean;
  canRedo: boolean;
  auditLog: AuditRevision[];

  // Substitution & Lineup Actions
  performSubstitution: (
    teamId: string,
    playerOutId: string,
    playerInId: string,
    slot: PositionCode
  ) => void;
  applyLineChangePreset: (presetId: string) => void;
  toggle7v6EmptyGoal: (teamId: string, currentlyActive: boolean) => void;

  // Pre-Match & Roster Management
  confirmMatchLineup: (matchId: string) => void;
  updateJerseyNumberForMatch: (
    matchId: string,
    playerId: string,
    newJerseyNumber: number
  ) => void;
  importPlayersFromCsv: (teamId: string, csvText: string) => number;
  updatePlayerPhoto: (playerId: string, photoUri: string) => void;
  updateTeamLogo: (teamId: string, logoUri: string) => void;
  updatePreMatchPlan: (matchId: string, updater: (match: Match) => Match) => void;
  resetMatchToZero: (matchId?: string) => void;
  resetDemoDatabase: () => void;
}

const DEFAULT_FILTER: AnalyticalFilter = {
  half: 'all',
  minMinute: 0,
  maxMinute: 60,
  phase: 'all',
  zone: 'all',
  situation: 'all',
  opposingGkId: 'all',
  playerId: 'all',
};

const AppStoreContext = createContext<AppStoreContextValue | null>(null);

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedState;
      if (parsed.matches?.length && parsed.players?.length) {
        return parsed;
      }
    }
  } catch {
    // Fallback to seed data
  }
  return {
    seasons: SEED_SEASONS,
    competitions: SEED_COMPETITIONS,
    teams: SEED_TEAMS,
    players: SEED_PLAYERS,
    matches: SEED_MATCHES,
    eventsByMatch: {
      'match-derby-r8': [], // Starts fresh at 0-0!
      'match-supercup-final': SEED_EVENTS['match-supercup-final'] ?? [],
    },
    auditByMatch: {
      'match-derby-r8': [],
      'match-supercup-final': [],
    },
    redoByMatch: {
      'match-derby-r8': [],
      'match-supercup-final': [],
    },
    matchClocks: {
      'match-derby-r8': 0, // Starts at 00:00!
      'match-supercup-final': 3600, // 60:00 finished
    },
  };
}

export const AppStoreProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [persisted, setPersisted] = useState<PersistedState>(loadInitialState);
  const [locale, setLocale] = useState<LocaleCode>('en');
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [viewportSim, setViewportSim] = useState<ViewportSimulation>('auto');
  const [liveEntryMode, setLiveEntryMode] = useState<LiveEntryMode>('player_first');
  const [activeTab, setActiveTab] = useState<ActiveTab>('start');
  const [activeMatchId, setActiveMatchId] = useState<string>('match-derby-r8');
  const [isClockRunning, setIsClockRunning] = useState<boolean>(false);
  const [lastGoalFlashTeamId, setLastGoalFlashTeamId] = useState<string | null>(
    null
  );
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const [inspectedPlayerId, setInspectedPlayerId] = useState<string | null>(null);
  const [comparePlayerId, setComparePlayerId] = useState<string | null>(null);
  const [filter, setFilter] = useState<AnalyticalFilter>(DEFAULT_FILTER);

  // Sync theme attribute on <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Crash-safe local persistence on every state change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    } catch {
      // Ignore quota errors
    }
  }, [persisted]);

  // Live Match Clock Ticker: realistic, drift-free wall clock ticker with half-time limits
  useEffect(() => {
    if (!isClockRunning) return;
    const startWallTime = Date.now();
    const startClockSec = persisted.matchClocks[activeMatchId] ?? 0;
    // In handball, Half 1 stops at 1800s (30:00); Half 2 stops at 3600s (60:00).
    const halfLimitSec = startClockSec < 1800 ? 1800 : 3600;

    const timer = window.setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - startWallTime) / 1000);
      const nextSec = Math.min(halfLimitSec, startClockSec + elapsedSec);

      setPersisted((prev) => {
        const cur = prev.matchClocks[activeMatchId] ?? 0;
        if (cur === nextSec) return prev;
        return {
          ...prev,
          matchClocks: {
            ...prev.matchClocks,
            [activeMatchId]: nextSec,
          },
        };
      });

      if (nextSec >= halfLimitSec) {
        setIsClockRunning(false);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [isClockRunning, activeMatchId, persisted.matchClocks]);

  const activeMatch =
    persisted.matches.find((m) => m.id === activeMatchId) ?? persisted.matches[0];
  const activeEvents = persisted.eventsByMatch[activeMatch.id] ?? [];
  const clockSec = persisted.matchClocks[activeMatch.id] ?? 0;
  const auditLog = persisted.auditByMatch[activeMatch.id] ?? [];
  const redoStack = persisted.redoByMatch[activeMatch.id] ?? [];

  const setClockSec = (updater: number | ((prev: number) => number)) => {
    setPersisted((prev) => {
      const cur = prev.matchClocks[activeMatch.id] ?? 0;
      const next = typeof updater === 'function' ? updater(cur) : updater;
      return {
        ...prev,
        matchClocks: {
          ...prev.matchClocks,
          [activeMatch.id]: Math.max(0, Math.min(3600, next)),
        },
      };
    });
  };

  const triggerHapticAndToast = (message: string, canUndo = true, goalTeamId?: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(goalTeamId ? [20, 30, 25] : 15);
      }
    } catch {
      // Ignore vibration API restrictions
    }
    if (goalTeamId) {
      setLastGoalFlashTeamId(goalTeamId);
      window.setTimeout(() => setLastGoalFlashTeamId(null), 500);
    }
    setToast({
      id: `toast-${Date.now()}`,
      message,
      canUndo,
      timestampMs: Date.now(),
    });
  };

  const logEvent = (
    eventInput: Omit<MatchEvent, 'id' | 'matchId' | 'createdAtMs'>,
    toastLabel?: string
  ): MatchEvent => {
    const newEvent: MatchEvent = {
      ...eventInput,
      id: `${activeMatch.id}-ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      matchId: activeMatch.id,
      createdAtMs: Date.now(),
    };

    setPersisted((prev) => {
      const prevEvents = prev.eventsByMatch[activeMatch.id] ?? [];
      const nextEvents = [...prevEvents, newEvent].sort(
        (a, b) => a.matchClockSec - b.matchClockSec
      );
      const rev: AuditRevision = {
        id: `rev-${Date.now()}`,
        matchId: activeMatch.id,
        timestampMs: Date.now(),
        actor: newEvent.authorAnalyst,
        actionType: 'log_event',
        description: toastLabel || `${newEvent.category}: ${newEvent.subType}`,
        previousEvents: prevEvents,
        nextEvents,
      };
      return {
        ...prev,
        eventsByMatch: {
          ...prev.eventsByMatch,
          [activeMatch.id]: nextEvents,
        },
        auditByMatch: {
          ...prev.auditByMatch,
          [activeMatch.id]: [rev, ...(prev.auditByMatch[activeMatch.id] ?? [])],
        },
        redoByMatch: {
          ...prev.redoByMatch,
          [activeMatch.id]: [],
        },
      };
    });

    const isGoal = newEvent.category === 'shot' && newEvent.subType === 'goal';
    triggerHapticAndToast(
      toastLabel || `Logged ${newEvent.subType}`,
      true,
      isGoal ? newEvent.teamId : undefined
    );

    return newEvent;
  };

  const updateEvent = (
    eventId: string,
    patch: Partial<MatchEvent>,
    reason = 'Edited event details'
  ) => {
    setPersisted((prev) => {
      const prevEvents = prev.eventsByMatch[activeMatch.id] ?? [];
      const nextEvents = prevEvents
        .map((ev) => (ev.id === eventId ? { ...ev, ...patch } : ev))
        .sort((a, b) => a.matchClockSec - b.matchClockSec);

      const rev: AuditRevision = {
        id: `rev-${Date.now()}`,
        matchId: activeMatch.id,
        timestampMs: Date.now(),
        actor: 'Bench Tablet A',
        actionType: 'edit_event',
        description: reason,
        previousEvents: prevEvents,
        nextEvents,
      };

      return {
        ...prev,
        eventsByMatch: {
          ...prev.eventsByMatch,
          [activeMatch.id]: nextEvents,
        },
        auditByMatch: {
          ...prev.auditByMatch,
          [activeMatch.id]: [rev, ...(prev.auditByMatch[activeMatch.id] ?? [])],
        },
        redoByMatch: {
          ...prev.redoByMatch,
          [activeMatch.id]: [],
        },
      };
    });
    triggerHapticAndToast(reason, true);
  };

  const deleteEvent = (eventId: string) => {
    setPersisted((prev) => {
      const prevEvents = prev.eventsByMatch[activeMatch.id] ?? [];
      const target = prevEvents.find((e) => e.id === eventId);
      const nextEvents = prevEvents.filter((e) => e.id !== eventId);

      const rev: AuditRevision = {
        id: `rev-${Date.now()}`,
        matchId: activeMatch.id,
        timestampMs: Date.now(),
        actor: 'Bench Tablet A',
        actionType: 'delete_event',
        description: `Deleted event (${target?.subType ?? eventId})`,
        previousEvents: prevEvents,
        nextEvents,
      };

      return {
        ...prev,
        eventsByMatch: {
          ...prev.eventsByMatch,
          [activeMatch.id]: nextEvents,
        },
        auditByMatch: {
          ...prev.auditByMatch,
          [activeMatch.id]: [rev, ...(prev.auditByMatch[activeMatch.id] ?? [])],
        },
        redoByMatch: {
          ...prev.redoByMatch,
          [activeMatch.id]: [],
        },
      };
    });
    triggerHapticAndToast('Event deleted', true);
  };

  const undoLastAction = () => {
    setPersisted((prev) => {
      const audits = prev.auditByMatch[activeMatch.id] ?? [];
      if (audits.length === 0) return prev;
      const [latest, ...restAudits] = audits;
      const redos = prev.redoByMatch[activeMatch.id] ?? [];
      return {
        ...prev,
        eventsByMatch: {
          ...prev.eventsByMatch,
          [activeMatch.id]: latest.previousEvents,
        },
        auditByMatch: {
          ...prev.auditByMatch,
          [activeMatch.id]: restAudits,
        },
        redoByMatch: {
          ...prev.redoByMatch,
          [activeMatch.id]: [latest, ...redos],
        },
      };
    });
    triggerHapticAndToast('Undid last action', false);
  };

  const redoLastAction = () => {
    setPersisted((prev) => {
      const redos = prev.redoByMatch[activeMatch.id] ?? [];
      if (redos.length === 0) return prev;
      const [nextRev, ...restRedos] = redos;
      const audits = prev.auditByMatch[activeMatch.id] ?? [];
      return {
        ...prev,
        eventsByMatch: {
          ...prev.eventsByMatch,
          [activeMatch.id]: nextRev.nextEvents,
        },
        auditByMatch: {
          ...prev.auditByMatch,
          [activeMatch.id]: [nextRev, ...audits],
        },
        redoByMatch: {
          ...prev.redoByMatch,
          [activeMatch.id]: restRedos,
        },
      };
    });
    triggerHapticAndToast('Redid action', true);
  };

  const performSubstitution = (
    teamId: string,
    playerOutId: string,
    playerInId: string,
    slot: PositionCode
  ) => {
    const pOut = persisted.players.find((p) => p.id === playerOutId);
    const pIn = persisted.players.find((p) => p.id === playerInId);
    const half: 1 | 2 = clockSec >= activeMatch.format.halfDurationSec ? 2 : 1;

    logEvent(
      {
        half,
        matchClockSec: clockSec,
        authorAnalyst: 'Bench Tablet A',
        teamId,
        playerId: playerInId,
        category: 'team_state',
        subType: 'substitution',
        attackPhase: 'positional',
        situation: 'equal',
        substitution: {
          playerOutId,
          playerInId,
          slot,
        },
      },
      `Sub ${slot}: #${pOut?.defaultJerseyNumber ?? ''} OUT → #${
        pIn?.defaultJerseyNumber ?? ''
      } IN`
    );
  };

  const applyLineChangePreset = (presetId: string) => {
    const preset = activeMatch.lineChangePresets.find((p) => p.id === presetId);
    if (!preset) return;
    for (const sw of preset.swaps) {
      performSubstitution(preset.teamId, sw.outPlayerId, sw.inPlayerId, sw.slot);
    }
  };

  const toggle7v6EmptyGoal = (teamId: string, currentlyActive: boolean) => {
    const half: 1 | 2 = clockSec >= activeMatch.format.halfDurationSec ? 2 : 1;
    logEvent(
      {
        half,
        matchClockSec: clockSec,
        authorAnalyst: 'Bench Tablet A',
        teamId,
        category: 'team_state',
        subType: currentlyActive ? '7v6_end' : '7v6_start',
        attackPhase: currentlyActive ? 'positional' : 'empty_goal_7v6',
        situation: currentlyActive ? 'equal' : 'empty_goal',
      },
      currentlyActive ? 'Ended 7v6 Empty Goal' : 'Started 7v6 Empty Goal'
    );
  };

  const confirmMatchLineup = (matchId: string) => {
    setPersisted((prev) => ({
      ...prev,
      matches: prev.matches.map((m) =>
        m.id === matchId
          ? {
              ...m,
              preMatchPlan: {
                ...m.preMatchPlan,
                lineupConfirmed: true,
                confirmedAt: new Date().toISOString(),
              },
            }
          : m
      ),
    }));
    triggerHapticAndToast('Match lineup & jersey numbers confirmed', false);
  };

  const updateJerseyNumberForMatch = (
    matchId: string,
    playerId: string,
    newJerseyNumber: number
  ) => {
    setPersisted((prev) => ({
      ...prev,
      matches: prev.matches.map((m) =>
        m.id === matchId
          ? {
              ...m,
              lineups: m.lineups.map((l) =>
                l.playerId === playerId ? { ...l, jerseyNumber: newJerseyNumber } : l
              ),
            }
          : m
      ),
    }));
  };

  const importPlayersFromCsv = (teamId: string, csvText: string): number => {
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const added: Player[] = [];

    for (const line of lines) {
      if (line.toLowerCase().startsWith('number,') || line.toLowerCase().startsWith('jersey,')) {
        continue;
      }
      const parts = line.split(',').map((s) => s.trim());
      if (parts.length < 3) continue;
      const num = parseInt(parts[0], 10) || 99;
      const firstName = parts[1] || 'Player';
      const lastName = parts[2] || 'Imported';
      const pos = (parts[3]?.toUpperCase() || 'CB') as PositionCode;
      const hand = (parts[4]?.toUpperCase() === 'L' ? 'L' : 'R') as 'L' | 'R';

      added.push({
        id: `imp-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        teamId,
        firstName,
        lastName,
        monogram: `${firstName[0] ?? 'P'}${lastName[0] ?? 'I'}`.toUpperCase(),
        defaultJerseyNumber: num,
        primaryPosition: ['GK', 'LW', 'LB', 'CB', 'RB', 'RW', 'PV'].includes(pos)
          ? pos
          : 'CB',
        secondaryPositions: [],
        handedness: hand,
        defensiveRole: pos === 'GK' ? 'gk' : 'half_2',
        birthDate: '2001-01-01',
        licenceNumber: `RZS-${Math.floor(10000 + Math.random() * 89999)}`,
        nationality: 'SVN',
        availabilityStatus: 'available',
        scoutingNotes: parts[5] || 'Imported via CSV roster tool.',
      });
    }

    if (added.length > 0) {
      setPersisted((prev) => ({
        ...prev,
        players: [...prev.players, ...added],
      }));
      triggerHapticAndToast(`Imported ${added.length} players into roster`, false);
    }
    return added.length;
  };

  const updatePreMatchPlan = (matchId: string, updater: (match: Match) => Match) => {
    setPersisted((prev) => ({
      ...prev,
      matches: prev.matches.map((m) => (m.id === matchId ? updater(m) : m)),
    }));
  };

  const updatePlayerPhoto = (playerId: string, photoUri: string) => {
    setPersisted((prev) => ({
      ...prev,
      players: prev.players.map((p) =>
        p.id === playerId ? { ...p, photoUri } : p
      ),
    }));
    triggerHapticAndToast('Player image updated', false);
  };

  const updateTeamLogo = (teamId: string, logoUri: string) => {
    setPersisted((prev) => ({
      ...prev,
      teams: prev.teams.map((tm) =>
        tm.id === teamId ? { ...tm, logoUri } : tm
      ),
    }));
    triggerHapticAndToast('Team logo updated', false);
  };

  const resetMatchToZero = (matchId?: string) => {
    const targetMatchId = matchId || activeMatch.id;
    setPersisted((prev) => ({
      ...prev,
      eventsByMatch: {
        ...prev.eventsByMatch,
        [targetMatchId]: [],
      },
      auditByMatch: {
        ...prev.auditByMatch,
        [targetMatchId]: [],
      },
      redoByMatch: {
        ...prev.redoByMatch,
        [targetMatchId]: [],
      },
      matchClocks: {
        ...prev.matchClocks,
        [targetMatchId]: 0,
      },
    }));
    setIsClockRunning(false);
    triggerHapticAndToast('Match reset to 0-0 (00:00)', false);
  };

  const resetDemoDatabase = () => {
    localStorage.removeItem(STORAGE_KEY);
    setPersisted(loadInitialState());
    triggerHapticAndToast('Demo database reset to initial state', false);
  };

  return (
    <AppStoreContext.Provider
      value={{
        locale,
        setLocale,
        theme,
        setTheme,
        viewportSim,
        setViewportSim,
        liveEntryMode,
        setLiveEntryMode,
        activeTab,
        setActiveTab,
        seasons: persisted.seasons,
        competitions: persisted.competitions,
        teams: persisted.teams,
        players: persisted.players,
        matches: persisted.matches,
        activeMatchId: activeMatch.id,
        setActiveMatchId,
        activeMatch,
        activeEvents,
        clockSec,
        setClockSec,
        isClockRunning,
        setIsClockRunning,
        lastGoalFlashTeamId,
        toast,
        dismissToast: () => setToast(null),
        inspectedPlayerId,
        setInspectedPlayerId,
        comparePlayerId,
        setComparePlayerId,
        filter,
        setFilter,
        resetFilter: () => setFilter(DEFAULT_FILTER),
        logEvent,
        updateEvent,
        deleteEvent,
        undoLastAction,
        redoLastAction,
        canUndo: auditLog.length > 0,
        canRedo: redoStack.length > 0,
        auditLog,
        performSubstitution,
        applyLineChangePreset,
        toggle7v6EmptyGoal,
        confirmMatchLineup,
        updateJerseyNumberForMatch,
        importPlayersFromCsv,
        updatePlayerPhoto,
        updateTeamLogo,
        updatePreMatchPlan,
        resetMatchToZero,
        resetDemoDatabase,
      }}
    >
      {children}
    </AppStoreContext.Provider>
  );
};

export function useAppStore(): AppStoreContextValue {
  const ctx = useContext(AppStoreContext);
  if (!ctx) {
    throw new Error('useAppStore must be used within AppStoreProvider');
  }
  return ctx;
}
