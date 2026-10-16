import React, { useMemo, useState } from 'react';
import { HandballCourt } from '../components/design-system/HandballCourt';
import { HandballGoal } from '../components/design-system/HandballGoal';
import {
  IconBounceShot,
  IconGkSave,
  IconGoalNet,
  MiniCourtZoneDiagram,
  PlayerVisualPortrait,
} from '../components/design-system/HandballIcons';
import {
  SampleRateMetric,
  TeamShapeIcon,
} from '../components/design-system/Primitives';
import { SEED_EVENTS } from '../data/seedData';
import {
  computeGoalkeeperStats,
  computePlayerMatchStats,
  computeTeamMatchSummary,
} from '../engine/analyticsEngine';
import { TRANSLATIONS } from '../i18n/translations';
import { useAppStore } from '../store/useAppStore';

export const PreMatchPrepScreen: React.FC<{ isPhoneLayout: boolean }> = ({
  isPhoneLayout,
}) => {
  const {
    locale,
    teams,
    players,
    matches,
    activeMatch,
    activeEvents,
    confirmMatchLineup,
    updateJerseyNumberForMatch,
    setInspectedPlayerId,
    setActiveTab,
  } = useAppStore();

  const t = TRANSLATIONS[locale];

  const ourTeam =
    teams.find((tm) => tm.id === activeMatch.ourTeamId) ?? teams[0];
  const oppTeam =
    teams.find((tm) => tm.id === activeMatch.opponentTeamId) ?? teams[1];

  // Simplified 3-tab workflow (Game Plan & Diagrams removed per user request)
  const [activeSubTab, setActiveSubTab] = useState<
    'opponent_profile' | 'shooter_cards' | 'our_readiness'
  >('opponent_profile');

  const allHistoricalEventsVsOpponent = useMemo(() => {
    const combined = [
      ...(SEED_EVENTS['match-supercup-final'] ?? []),
      ...activeEvents,
    ];
    const seen = new Set<string>();
    return combined.filter((ev) => {
      if (seen.has(ev.id)) return false;
      seen.add(ev.id);
      return true;
    });
  }, [activeEvents]);

  const aggregatedPlayerStats = useMemo(
    () =>
      computePlayerMatchStats(
        activeMatch,
        allHistoricalEventsVsOpponent,
        players,
        3600
      ),
    [activeMatch, allHistoricalEventsVsOpponent, players]
  );

  const aggregatedGkStats = useMemo(
    () =>
      computeGoalkeeperStats(
        activeMatch,
        allHistoricalEventsVsOpponent,
        players
      ),
    [activeMatch, allHistoricalEventsVsOpponent, players]
  );

  const oppSummary = useMemo(
    () => computeTeamMatchSummary(oppTeam.id, allHistoricalEventsVsOpponent),
    [oppTeam.id, allHistoricalEventsVsOpponent]
  );

  const oppPlayers = players.filter((p) => p.teamId === oppTeam.id);
  const oppOutfield = oppPlayers.filter((p) => p.primaryPosition !== 'GK');
  const oppGks = oppPlayers.filter((p) => p.primaryPosition === 'GK');
  const ourPlayers = players.filter((p) => p.teamId === ourTeam.id);

  const [selectedShooterId, setSelectedShooterId] = useState<string>(
    oppOutfield[0]?.id ?? ''
  );

  return (
    <div
      style={{
        padding: isPhoneLayout ? '10px' : '16px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        width: '100%',
      }}
    >
      {/* Top Pre-Match Banner */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: 'var(--accent-primary)',
              letterSpacing: '0.04em',
            }}
          >
            PRE-MATCH SCOUTING · AUTO-BUILT FROM {matches.length} MATCHES
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginTop: '2px' }}>
            {ourTeam.shortCode} vs {oppTeam.name}
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab('live')}
          style={{
            minHeight: '42px',
            padding: '0 16px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--sem-goal)',
            color: '#080c14',
            fontSize: '12.5px',
            fontWeight: 800,
          }}
        >
          ▶ {t.common.goLive}
        </button>
      </div>

      {/* 3-Tab Switcher (Clean, Diagrammed, No Game Plan Clutter) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '6px',
          background: 'var(--bg-surface)',
          padding: '4px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {(
          [
            {
              id: 'opponent_profile',
              label: isPhoneLayout ? '1. Opponent' : '1. Opponent Profile',
            },
            {
              id: 'shooter_cards',
              label: isPhoneLayout ? '2. Shooters' : '2. GK Shooter Cards',
            },
            {
              id: 'our_readiness',
              label: isPhoneLayout ? '3. Lineup' : '3. Lineup & Numbers',
            },
          ] as const
        ).map((tab) => {
          const active = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              style={{
                minHeight: '42px',
                padding: '4px 6px',
                borderRadius: 'var(--radius-sm)',
                background: active
                  ? 'var(--accent-primary-subtle)'
                  : 'transparent',
                border: active
                  ? '1.5px solid var(--accent-primary)'
                  : '1px solid transparent',
                fontWeight: 800,
                fontSize: isPhoneLayout ? '11.5px' : '13px',
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OPPONENT PROFILE */}
      {activeSubTab === 'opponent_profile' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isPhoneLayout ? '1fr' : '1.15fr 0.85fr',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TeamShapeIcon
                  shape={oppTeam.shapeMarker}
                  color={oppTeam.primaryColorHex}
                  logoUri={oppTeam.logoUri}
                  size={20}
                />
                <h3 style={{ fontSize: '15px', fontWeight: 800 }}>
                  {oppTeam.name} — Key Numbers
                </h3>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isPhoneLayout
                    ? '1fr'
                    : 'repeat(3, 1fr)',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    padding: '10px',
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-sm)',
                    borderLeft: '3px solid var(--sem-goal)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Shot Conversion
                    </div>
                    <SampleRateMetric
                      successes={oppSummary.goals}
                      attempts={oppSummary.shots}
                      locale={locale}
                      size="lg"
                      highlightTone="goal"
                    />
                  </div>
                  <IconGoalNet size={24} />
                </div>

                <div
                  style={{
                    padding: '10px',
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-sm)',
                    borderLeft: '3px solid var(--sem-miss)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Fast-Break Rate
                    </div>
                    <SampleRateMetric
                      successes={oppSummary.phaseBreakdown.fast_break.goals}
                      attempts={oppSummary.phaseBreakdown.fast_break.shots}
                      locale={locale}
                      size="lg"
                      highlightTone="warning"
                    />
                  </div>
                  <MiniCourtZoneDiagram highlight="fb" size={32} color="var(--sem-miss)" />
                </div>

                <div
                  style={{
                    padding: '10px',
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-sm)',
                    borderLeft: '3px solid var(--sem-bounce)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      7v6 Empty Goal
                    </div>
                    <SampleRateMetric
                      successes={oppSummary.phaseBreakdown.empty_goal_7v6.goals}
                      attempts={oppSummary.phaseBreakdown.empty_goal_7v6.shots}
                      locale={locale}
                      size="lg"
                    />
                  </div>
                  <IconBounceShot size={24} />
                </div>
              </div>

              {/* Opponent Player Cards List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    color: 'var(--text-secondary)',
                  }}
                >
                  TOP OPPONENT THREATS (TAP ANY PLAYER FOR SHOT MAP)
                </div>
                {oppOutfield.map((p) => {
                  const st = aggregatedPlayerStats[p.id];
                  const pct =
                    st && st.shots > 0
                      ? Math.round((st.goals / st.shots) * 100)
                      : 0;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setInspectedPlayerId(p.id)}
                      style={{
                        padding: '10px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <PlayerVisualPortrait
                          player={p}
                          jerseyNumber={p.defaultJerseyNumber}
                          team={oppTeam}
                          size={44}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '13.5px', fontWeight: 800 }}>
                            #{p.defaultJerseyNumber} {p.firstName} {p.lastName}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {p.primaryPosition} · Bounce:{' '}
                            {st?.bounceGoals ?? 0}/{st?.bounceShots ?? 0} · Ast:{' '}
                            {st?.assists ?? 0}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <SampleRateMetric
                          successes={st?.goals ?? 0}
                          attempts={st?.shots ?? 0}
                          locale={locale}
                          highlightTone="goal"
                        />
                        {/* Visual colored progress bar */}
                        <div
                          style={{
                            width: '72px',
                            height: '5px',
                            background: 'var(--bg-canvas)',
                            borderRadius: '999px',
                            overflow: 'hidden',
                            marginTop: '4px',
                          }}
                        >
                          <div
                            style={{
                              width: `${pct}%`,
                              height: '100%',
                              background: 'var(--sem-goal)',
                            }}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Opponent Goalkeepers' Weak Zones */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconGkSave size={20} color="var(--sem-save)" />
                <h3 style={{ fontSize: '14px', fontWeight: 800 }}>
                  Opponent GK Weak Zones ({oppGks[0]?.lastName})
                </h3>
              </div>
              {oppGks.slice(0, 1).map((gk) => {
                const gkEvents = allHistoricalEventsVsOpponent.filter(
                  (e) => e.opposingGkId === gk.id
                );
                return (
                  <div
                    key={gk.id}
                    style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                  >
                    <HandballGoal
                      mode="analytics"
                      perspective="shooter"
                      locale={locale}
                      events={gkEvents}
                      teamColor={ourTeam.primaryColorHex}
                    />
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        padding: '10px',
                        background: 'var(--bg-elevated)',
                        borderRadius: 'var(--radius-sm)',
                        borderLeft: '3px solid var(--sem-goal)',
                      }}
                    >
                      {gk.scoutingNotes}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SHOOTER CARDS FOR OUR GOALKEEPERS */}
      {activeSubTab === 'shooter_cards' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isPhoneLayout
                ? 'repeat(2, 1fr)'
                : 'repeat(4, 1fr)',
              gap: '8px',
            }}
          >
            {oppOutfield.map((p) => {
              const active = selectedShooterId === p.id;
              const st = aggregatedPlayerStats[p.id];
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedShooterId(p.id)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    background: active
                      ? `${oppTeam.primaryColorHex}28`
                      : 'var(--bg-surface)',
                    border: active
                      ? `2px solid ${oppTeam.primaryColorHex}`
                      : '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    textAlign: 'left',
                  }}
                >
                  <PlayerVisualPortrait
                    player={p}
                    jerseyNumber={p.defaultJerseyNumber}
                    team={oppTeam}
                    size={40}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 800,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {p.lastName}
                    </div>
                    <SampleRateMetric
                      successes={st?.goals ?? 0}
                      attempts={st?.shots ?? 0}
                      locale={locale}
                      size="sm"
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {(() => {
            const shooter =
              oppOutfield.find((p) => p.id === selectedShooterId) ??
              oppOutfield[0];
            if (!shooter) return null;
            const shooterEvents = allHistoricalEventsVsOpponent.filter(
              (e) => e.playerId === shooter.id && e.category === 'shot'
            );
            const st = aggregatedPlayerStats[shooter.id];

            return (
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: `2px solid ${oppTeam.primaryColorHex}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
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
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <PlayerVisualPortrait
                      player={shooter}
                      jerseyNumber={shooter.defaultJerseyNumber}
                      team={oppTeam}
                      size={56}
                    />
                    <div>
                      <h3 style={{ fontSize: '17px', fontWeight: 800 }}>
                        #{shooter.defaultJerseyNumber} {shooter.firstName}{' '}
                        {shooter.lastName}
                      </h3>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {shooter.primaryPosition} ·
                        Bounce Shots: {st?.bounceGoals ?? 0}/{st?.bounceShots ?? 0}
                      </div>
                    </div>
                  </div>

                  <SampleRateMetric
                    successes={st?.goals ?? 0}
                    attempts={st?.shots ?? 0}
                    locale={locale}
                    size="lg"
                    highlightTone="goal"
                  />
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isPhoneLayout ? '1fr' : '1fr 1fr',
                    gap: '12px',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 800,
                        color: 'var(--text-secondary)',
                        marginBottom: '6px',
                      }}
                    >
                      3×3 Goal Placement
                    </div>
                    <HandballGoal
                      mode="analytics"
                      perspective="shooter"
                      locale={locale}
                      events={shooterEvents}
                      teamColor={oppTeam.primaryColorHex}
                    />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 800,
                        color: 'var(--text-secondary)',
                        marginBottom: '6px',
                      }}
                    >
                      Court Shot Origins
                    </div>
                    <HandballCourt
                      mode="analytics"
                      locale={locale}
                      events={shooterEvents}
                      teamColor={oppTeam.primaryColorHex}
                    />
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 3: OUR TEAM READINESS & AUTO-CARRIED JERSEY NUMBERS */}
      {activeSubTab === 'our_readiness' && (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
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
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800 }}>
                {ourTeam.name} — Match Lineup
              </h3>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Jersey numbers carry automatically from match to match.
              </div>
            </div>

            <button
              type="button"
              onClick={() => confirmMatchLineup(activeMatch.id)}
              style={{
                minHeight: '42px',
                padding: '0 16px',
                borderRadius: 'var(--radius-sm)',
                background: activeMatch.preMatchPlan.lineupConfirmed
                  ? 'var(--sem-goal-bg)'
                  : 'var(--accent-primary)',
                border: activeMatch.preMatchPlan.lineupConfirmed
                  ? '1.5px solid var(--sem-goal)'
                  : 'none',
                color: activeMatch.preMatchPlan.lineupConfirmed
                  ? 'var(--sem-goal)'
                  : '#000',
                fontWeight: 800,
                fontSize: '12.5px',
              }}
            >
              {activeMatch.preMatchPlan.lineupConfirmed
                ? '✓ Lineup Confirmed'
                : 'Confirm Match Lineup'}
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isPhoneLayout
                ? '1fr'
                : 'repeat(2, 1fr)',
              gap: '8px',
            }}
          >
            {ourPlayers.map((p) => {
              const lEntry = activeMatch.lineups.find(
                (l) => l.playerId === p.id
              );
              const jersey = lEntry?.jerseyNumber ?? p.defaultJerseyNumber;
              return (
                <div
                  key={p.id}
                  style={{
                    padding: '10px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <PlayerVisualPortrait
                      player={p}
                      jerseyNumber={jersey}
                      team={ourTeam}
                      size={44}
                    />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '13.5px' }}>
                        {p.firstName} {p.lastName}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {p.primaryPosition} ·{' '}
                        {lEntry?.isStarter ? 'Starter 7' : 'Rotation'}
                      </div>
                    </div>
                  </div>

                  <input
                    type="number"
                    value={jersey}
                    onChange={(e) =>
                      updateJerseyNumberForMatch(
                        activeMatch.id,
                        p.id,
                        parseInt(e.target.value, 10) || p.defaultJerseyNumber
                      )
                    }
                    className="tabular-nums"
                    style={{
                      width: '54px',
                      padding: '5px',
                      borderRadius: '6px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-strong)',
                      fontWeight: 800,
                      textAlign: 'center',
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
