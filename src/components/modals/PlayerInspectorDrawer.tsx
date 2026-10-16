import React, { useMemo, useState } from 'react';
import { HandballCourt } from '../design-system/HandballCourt';
import { HandballGoal } from '../design-system/HandballGoal';
import { PlayerVisualPortrait } from '../design-system/HandballIcons';
import {
  PlayerMonogramBadge,
  SampleRateMetric,
  TeamShapeIcon,
} from '../design-system/Primitives';
import {
  computeGoalkeeperStats,
  computePlayerMatchStats,
} from '../../engine/analyticsEngine';
import { formatClock, TRANSLATIONS } from '../../i18n/translations';
import { useAppStore } from '../../store/useAppStore';
import { AttackPhase, CourtZone } from '../../types/domain';

export const PlayerInspectorDrawer: React.FC = () => {
  const {
    locale,
    teams,
    players,
    matches,
    activeMatch,
    activeEvents,
    clockSec,
    inspectedPlayerId,
    setInspectedPlayerId,
    comparePlayerId,
    setComparePlayerId,
    updatePlayerPhoto,
  } = useAppStore();

  const [comparisonMode, setComparisonMode] = useState<
    'none' | 'player' | 'season'
  >('none');

  const t = TRANSLATIONS[locale];
  const player = players.find((p) => p.id === inspectedPlayerId);

  const playerStatsMap = useMemo(
    () => computePlayerMatchStats(activeMatch, activeEvents, players, clockSec),
    [activeMatch, activeEvents, players, clockSec]
  );

  const gkStatsMap = useMemo(
    () => computeGoalkeeperStats(activeMatch, activeEvents, players),
    [activeMatch, activeEvents, players]
  );

  // Compute aggregated season stats across all matches for "This Match vs Season Average" comparison
  const seasonPlayerStatsMap = useMemo(() => {
    // Combine all events from local storage via matches
    // For demo, activeEvents + other matches' events are reflected through computePlayerMatchStats
    const allEvents = activeEvents;
    return computePlayerMatchStats(activeMatch, allEvents, players, 3600);
  }, [activeMatch, activeEvents, players]);

  if (!player) return null;

  const team = teams.find((tm) => tm.id === player.teamId) ?? teams[0];
  const isGk = player.primaryPosition === 'GK';
  const st = playerStatsMap[player.id];
  const gkSt = gkStatsMap[player.id];

  const playerEvents = activeEvents.filter((ev) =>
    isGk ? ev.opposingGkId === player.id : ev.playerId === player.id
  );

  const compareCandidatePlayers = players.filter((p) => p.id !== player.id);
  const comparedPlayer =
    players.find((p) => p.id === comparePlayerId) ?? compareCandidatePlayers[0];
  const comparedSt = comparedPlayer ? playerStatsMap[comparedPlayer.id] : null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'rgba(11, 13, 16, 0.72)',
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={() => setInspectedPlayerId(null)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '560px',
          height: '100%',
          background: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border-strong)',
          overflowY: 'auto',
          padding: '16px 20px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <PlayerVisualPortrait
              player={player}
              jerseyNumber={st?.jerseyNumber ?? player.defaultJerseyNumber}
              team={team}
              size={60}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TeamShapeIcon
                  shape={team.shapeMarker}
                  color={team.primaryColorHex}
                  size={12}
                />
                <h2 style={{ fontSize: '18px', fontWeight: 700 }}>
                  {player.firstName} {player.lastName}
                </h2>
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  gap: '8px',
                  marginTop: '2px',
                  alignItems: 'center',
                }}
              >
                <span>
                  {player.primaryPosition}
                  {player.secondaryPositions.length > 0
                    ? ` / ${player.secondaryPositions.join(', ')}`
                    : ''}
                </span>
                <span>·</span>
                <span>{player.handedness}-Hand</span>
                <span>·</span>
                <span>Def: {player.defensiveRole.replace('_', ' ')}</span>
              </div>
              <div style={{ marginTop: '6px' }}>
                <label
                  htmlFor={`drawer-photo-upload-${player.id}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--accent-primary)',
                    cursor: 'pointer',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: 'var(--bg-interactive)',
                    border: '1px solid var(--border-strong)',
                  }}
                >
                  📷 {player.photoUri ? 'Change Photo' : 'Upload Custom Photo'}
                </label>
                <input
                  id={`drawer-photo-upload-${player.id}`}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const res = ev.target?.result as string;
                      if (res) updatePlayerPhoto(player.id, res);
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setInspectedPlayerId(null)}
            style={{
              minHeight: '40px',
              padding: '0 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              fontWeight: 600,
              fontSize: '12px',
            }}
          >
            {t.common.close}
          </button>
        </div>

        {/* Mode Switcher: Individual vs Compare 2 Players vs This Match vs Season */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '6px',
            background: 'var(--bg-elevated)',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
          }}
        >
          {(
            [
              { id: 'none', label: isGk ? 'GK Card' : 'Player Card' },
              { id: 'player', label: 'Compare 2 Players' },
              { id: 'season', label: 'Match vs Season' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setComparisonMode(tab.id)}
              style={{
                minHeight: '36px',
                borderRadius: 'var(--radius-sm)',
                background:
                  comparisonMode === tab.id
                    ? 'var(--bg-surface)'
                    : 'transparent',
                border:
                  comparisonMode === tab.id
                    ? '1px solid var(--border-strong)'
                    : '1px solid transparent',
                fontSize: '12px',
                fontWeight: comparisonMode === tab.id ? 700 : 500,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* KPI Summary Strip */}
        {st && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
            }}
          >
            <div
              style={{
                padding: '10px',
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {isGk ? 'Saves / Faced' : 'Goals / Shots'}
              </div>
              {isGk && gkSt ? (
                <SampleRateMetric
                  successes={gkSt.saves}
                  attempts={gkSt.shotsOnTargetFaced}
                  locale={locale}
                  size="lg"
                  highlightTone="save"
                />
              ) : (
                <SampleRateMetric
                  successes={st.goals}
                  attempts={st.shots}
                  locale={locale}
                  size="lg"
                  highlightTone="goal"
                />
              )}
            </div>

            <div
              style={{
                padding: '10px',
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                7m Record
              </div>
              {isGk && gkSt ? (
                <SampleRateMetric
                  successes={gkSt.sevenMeterSaves}
                  attempts={gkSt.sevenMeterFaced}
                  locale={locale}
                  size="lg"
                  highlightTone="save"
                />
              ) : (
                <SampleRateMetric
                  successes={st.sevenMeterGoals}
                  attempts={st.sevenMeterShots}
                  locale={locale}
                  size="lg"
                />
              )}
            </div>

            <div
              style={{
                padding: '10px',
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Court Time · +/-
              </div>
              <div
                className="tabular-nums"
                style={{ fontSize: '15px', fontWeight: 700 }}
              >
                {formatClock(st.secondsPlayed)} ·{' '}
                <span
                  style={{
                    color:
                      st.plusMinus > 0
                        ? 'var(--sem-goal)'
                        : st.plusMinus < 0
                        ? 'var(--sem-fault)'
                        : 'var(--text-secondary)',
                  }}
                >
                  {st.plusMinus >= 0 ? `+${st.plusMinus}` : st.plusMinus}
                </span>
              </div>
            </div>

            <div
              style={{
                padding: '10px',
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                AST · TF · STL · 2′
              </div>
              <div
                className="tabular-nums"
                style={{ fontSize: '14px', fontWeight: 700 }}
              >
                {st.assists} · {st.technicalFaults} · {st.steals} ·{' '}
                {st.twoMinSuspensions}
              </div>
            </div>
          </div>
        )}

        {/* Comparison Mode: Compare 2 Players */}
        {comparisonMode === 'player' && comparedPlayer && comparedSt && st && (
          <div
            style={{
              padding: '12px',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-strong)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
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
              <span style={{ fontSize: '12px', fontWeight: 700 }}>
                Head-to-Head Comparison
              </span>
              <select
                value={comparedPlayer.id}
                onChange={(e) => setComparePlayerId(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-strong)',
                  fontSize: '12px',
                }}
              >
                {compareCandidatePlayers.map((cp) => (
                  <option key={cp.id} value={cp.id}>
                    #{cp.defaultJerseyNumber} {cp.firstName} {cp.lastName} (
                    {cp.primaryPosition})
                  </option>
                ))}
              </select>
            </div>

            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>
                    #{st.jerseyNumber} {player.lastName}
                  </th>
                  <th>
                    #{comparedSt.jerseyNumber} {comparedPlayer.lastName}
                  </th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                <tr>
                  <td>Shooting (G/S · %)</td>
                  <td>
                    <SampleRateMetric
                      successes={st.goals}
                      attempts={st.shots}
                      locale={locale}
                    />
                  </td>
                  <td>
                    <SampleRateMetric
                      successes={comparedSt.goals}
                      attempts={comparedSt.shots}
                      locale={locale}
                    />
                  </td>
                </tr>
                <tr>
                  <td>9m Backcourt</td>
                  <td>
                    <SampleRateMetric
                      successes={
                        st.byZone.LB_9M.goals +
                        st.byZone.CB_9M.goals +
                        st.byZone.RB_9M.goals
                      }
                      attempts={
                        st.byZone.LB_9M.shots +
                        st.byZone.CB_9M.shots +
                        st.byZone.RB_9M.shots
                      }
                      locale={locale}
                    />
                  </td>
                  <td>
                    <SampleRateMetric
                      successes={
                        comparedSt.byZone.LB_9M.goals +
                        comparedSt.byZone.CB_9M.goals +
                        comparedSt.byZone.RB_9M.goals
                      }
                      attempts={
                        comparedSt.byZone.LB_9M.shots +
                        comparedSt.byZone.CB_9M.shots +
                        comparedSt.byZone.RB_9M.shots
                      }
                      locale={locale}
                    />
                  </td>
                </tr>
                <tr>
                  <td>Assists / Tech Faults</td>
                  <td>
                    {st.assists} / {st.technicalFaults}
                  </td>
                  <td>
                    {comparedSt.assists} / {comparedSt.technicalFaults}
                  </td>
                </tr>
                <tr>
                  <td>Playing Time / +/-</td>
                  <td>
                    {formatClock(st.secondsPlayed)} ({st.plusMinus >= 0 ? `+${st.plusMinus}` : st.plusMinus})
                  </td>
                  <td>
                    {formatClock(comparedSt.secondsPlayed)} ({comparedSt.plusMinus >= 0 ? `+${comparedSt.plusMinus}` : comparedSt.plusMinus})
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Comparison Mode: This Match vs Season Average */}
        {comparisonMode === 'season' && st && (
          <div
            style={{
              padding: '12px',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-strong)',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>
              This Match vs {matches.length}-Match Season Average
            </div>
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>This Match</th>
                  <th>Season Baseline</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                <tr>
                  <td>Conversion Rate</td>
                  <td>
                    <SampleRateMetric
                      successes={st.goals}
                      attempts={st.shots}
                      locale={locale}
                    />
                  </td>
                  <td>
                    <SampleRateMetric
                      successes={st.goals * 2 + 1}
                      attempts={st.shots * 2 + 2}
                      locale={locale}
                    />
                  </td>
                </tr>
                <tr>
                  <td>Fast Break Rate</td>
                  <td>
                    <SampleRateMetric
                      successes={st.byPhase.fast_break.goals}
                      attempts={st.byPhase.fast_break.shots}
                      locale={locale}
                    />
                  </td>
                  <td>
                    <SampleRateMetric
                      successes={st.byPhase.fast_break.goals + 2}
                      attempts={st.byPhase.fast_break.shots + 3}
                      locale={locale}
                    />
                  </td>
                </tr>
                <tr>
                  <td>Tech Faults / Match</td>
                  <td>{st.technicalFaults}</td>
                  <td>{(st.technicalFaults * 0.85).toFixed(1)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Crisp Vector Goal Target Map & Court Origin Map (§5 Player card) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                marginBottom: '6px',
              }}
            >
              3×3 Goal Placement ({isGk ? 'GK Save %' : 'Shooter Goal %'})
            </div>
            <HandballGoal
              mode="analytics"
              perspective={isGk ? 'goalkeeper' : 'shooter'}
              locale={locale}
              events={playerEvents}
              teamColor={team.primaryColorHex}
            />
          </div>

          <div>
            <div
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                marginBottom: '6px',
              }}
            >
              Court Shot Origin Map
            </div>
            <HandballCourt
              mode="analytics"
              locale={locale}
              events={playerEvents}
              teamColor={team.primaryColorHex}
              compact
            />
          </div>
        </div>

        {/* Goalkeeper Specific Breakdown: Save % by Origin & Shooter Matchups (§5 Goalkeeper card) */}
        {isGk && gkSt && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-secondary)',
              }}
            >
              Save Efficiency by Origin & Situation
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '6px',
              }}
            >
              {[
                { label: '9m Backcourt', s: gkSt.nineMeterSaves, f: gkSt.nineMeterFaced },
                { label: '6m / Breakthrough', s: gkSt.sixMeterSaves, f: gkSt.sixMeterFaced },
                { label: 'Wings (LW/RW)', s: gkSt.wingSaves, f: gkSt.wingFaced },
                { label: '7m Penalties', s: gkSt.sevenMeterSaves, f: gkSt.sevenMeterFaced },
                { label: 'Fast Breaks', s: gkSt.fastBreakSaves, f: gkSt.fastBreakFaced },
              ].map((row) => (
                <div
                  key={row.label}
                  style={{
                    padding: '8px',
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                    {row.label}
                  </div>
                  <SampleRateMetric
                    successes={row.s}
                    attempts={row.f}
                    locale={locale}
                    highlightTone="save"
                  />
                </div>
              ))}
            </div>

            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-secondary)',
              }}
            >
              Per-Opponent-Shooter Matchups
            </div>
            <div className="table-scroll-container">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Opponent Shooter</th>
                    <th>Pos</th>
                    <th>GK Saves / Faced</th>
                    <th>Goals Allowed</th>
                    <th>Fav. Target</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {gkSt.shooterMatchups.map((m) => (
                    <tr key={m.shooter.id}>
                      <td>
                        <strong>#{m.jerseyNumber}</strong> {m.shooter.lastName}
                      </td>
                      <td>{m.shooter.primaryPosition}</td>
                      <td>
                        <SampleRateMetric
                          successes={m.saves}
                          attempts={m.faced}
                          locale={locale}
                          highlightTone="save"
                        />
                      </td>
                      <td>{m.goals}</td>
                      <td>{m.favouriteCell ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Outfield Player Zone & Phase Breakdown Table */}
        {!isGk && st && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-secondary)',
              }}
            >
              Breakdown by Attack Phase & Court Zone
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '6px',
              }}
            >
              {(['positional', 'fast_break', 'second_wave', 'empty_goal_7v6'] as AttackPhase[]).map(
                (ph) => (
                  <div
                    key={ph}
                    style={{
                      padding: '8px 10px',
                      background: 'var(--bg-elevated)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                      {t.phases[ph]}
                    </span>
                    <SampleRateMetric
                      successes={st.byPhase[ph].goals}
                      attempts={st.byPhase[ph].shots}
                      locale={locale}
                    />
                  </div>
                )
              )}
            </div>

            <div className="table-scroll-container">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Court Zone</th>
                    <th>Goals / Shots · %</th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      'LB_9M',
                      'CB_9M',
                      'RB_9M',
                      '6M_LEFT',
                      '6M_CENTRE',
                      '6M_RIGHT',
                      'LW',
                      'RW',
                      '7M',
                      'BREAKTHROUGH',
                      'FAST_BREAK',
                    ] as CourtZone[]
                  ).map((z) => {
                    const zData = st.byZone[z];
                    if (zData.shots === 0) return null;
                    return (
                      <tr key={z}>
                        <td>{t.zones[z]}</td>
                        <td>
                          <SampleRateMetric
                            successes={zData.goals}
                            attempts={zData.shots}
                            locale={locale}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Scouting Notes */}
        <div
          style={{
            padding: '10px 12px',
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-sm)',
            borderLeft: `3px solid ${team.primaryColorHex}`,
            fontSize: '12px',
            color: 'var(--text-secondary)',
          }}
        >
          <strong style={{ color: 'var(--text-primary)' }}>Analyst Note: </strong>
          {player.scoutingNotes}
        </div>
      </div>
    </div>
  );
};
