import React, { useMemo, useState } from 'react';
import { HandballCourt } from '../components/design-system/HandballCourt';
import { HandballGoal } from '../components/design-system/HandballGoal';
import { ZoomableMapModal } from '../components/modals/ZoomableMapModal';
import {
  IconAssistPass,
  IconBounceShot,
  IconGkSave,
  IconGoalNet,
  IconTurnoverFault,
  MiniCourtZoneDiagram,
  PlayerVisualPortrait,
} from '../components/design-system/HandballIcons';
import {
  SampleRateMetric,
  TeamShapeIcon,
} from '../components/design-system/Primitives';
import {
  computeGoalkeeperStats,
  computePlayerMatchStats,
  computeTeamMatchSummary,
  filterMatchEvents,
} from '../engine/analyticsEngine';
import { formatClock, TRANSLATIONS } from '../i18n/translations';
import { useAppStore } from '../store/useAppStore';
import {
  AttackPhase,
  CourtZone,
  TechnicalFaultType,
} from '../types/domain';

export const MatchStatsScreen: React.FC<{ isPhoneLayout: boolean }> = ({
  isPhoneLayout,
}) => {
  const {
    locale,
    teams,
    players,
    activeMatch,
    activeEvents,
    clockSec,
    filter,
    setFilter,
    resetFilter,
    setInspectedPlayerId,
  } = useAppStore();

  const t = TRANSLATIONS[locale];
  const ourTeam =
    teams.find((tm) => tm.id === activeMatch.ourTeamId) ?? teams[0];
  const oppTeam =
    teams.find((tm) => tm.id === activeMatch.opponentTeamId) ?? teams[1];

  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>(
    ourTeam.id
  );
  const [viewStyle, setViewStyle] = useState<'visual_cards' | 'table'>(
    'visual_cards'
  );
  const [activeZoomMap, setActiveZoomMap] = useState<null | 'court' | 'goal'>(null);

  const filteredEvents = useMemo(
    () => filterMatchEvents(activeEvents, filter),
    [activeEvents, filter]
  );

  const playerStatsMap = useMemo(
    () =>
      computePlayerMatchStats(activeMatch, filteredEvents, players, clockSec),
    [activeMatch, filteredEvents, players, clockSec]
  );

  const gkStatsMap = useMemo(
    () => computeGoalkeeperStats(activeMatch, filteredEvents, players),
    [activeMatch, filteredEvents, players]
  );

  const ourSummary = useMemo(
    () => computeTeamMatchSummary(ourTeam.id, filteredEvents),
    [ourTeam.id, filteredEvents]
  );
  const oppSummary = useMemo(
    () => computeTeamMatchSummary(oppTeam.id, filteredEvents),
    [oppTeam.id, filteredEvents]
  );

  const activeTeamObj =
    selectedTeamFilter === ourTeam.id ? ourTeam : oppTeam;
  const activeTeamEvents = filteredEvents.filter(
    (e) => e.teamId === activeTeamObj.id
  );

  const teamOutfieldPlayers = players.filter(
    (p) => p.teamId === activeTeamObj.id && p.primaryPosition !== 'GK'
  );
  const teamGoalkeepers = players.filter(
    (p) => p.teamId === activeTeamObj.id && p.primaryPosition === 'GK'
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
      {/* Diagrammed Quick Filter Buttons (Half & Court Zones shown visually!) */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '12px',
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
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 800 }}>
            VISUAL FILTERS · {filteredEvents.length} EVENTS
          </span>

          <div style={{ display: 'flex', gap: '6px' }}>
            {(['all', 1, 2] as const).map((h) => {
              const active = filter.half === h;
              return (
                <button
                  key={String(h)}
                  type="button"
                  onClick={() => setFilter((f) => ({ ...f, half: h }))}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: active
                      ? 'var(--accent-primary)'
                      : 'var(--bg-elevated)',
                    color: active ? '#080c14' : 'var(--text-secondary)',
                    fontSize: '11.5px',
                    fontWeight: 800,
                  }}
                >
                  {h === 'all' ? 'All Match' : `Half ${h}`}
                </button>
              );
            })}
            <button
              type="button"
              onClick={resetFilter}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-strong)',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Diagrammed Court Zone Filter Buttons */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isPhoneLayout
              ? 'repeat(3, 1fr)'
              : 'repeat(6, 1fr)',
            gap: '6px',
          }}
        >
          {(
            [
              { zone: 'all' as const, label: 'All Zones', diag: '9m' as const },
              { zone: 'LB_9M' as CourtZone, label: 'LB 9m', diag: '9m' as const },
              { zone: 'CB_9M' as CourtZone, label: 'CB 9m', diag: '9m' as const },
              { zone: '6M_CENTRE' as CourtZone, label: '6m Line', diag: '6m' as const },
              { zone: 'LW' as CourtZone, label: 'Left Wing', diag: 'wing' as const },
              { zone: '7M' as CourtZone, label: '7m Pen', diag: '7m' as const },
            ]
          ).map((item) => {
            const active = filter.zone === item.zone;
            return (
              <button
                key={item.zone}
                type="button"
                onClick={() =>
                  setFilter((f) => ({
                    ...f,
                    zone: f.zone === item.zone ? 'all' : item.zone,
                  }))
                }
                style={{
                  padding: '6px 8px',
                  borderRadius: 'var(--radius-sm)',
                  background: active
                    ? 'var(--accent-primary-subtle)'
                    : 'var(--bg-elevated)',
                  border: active
                    ? '1.5px solid var(--accent-primary)'
                    : '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11.5px',
                  fontWeight: 800,
                }}
              >
                <MiniCourtZoneDiagram
                  highlight={item.diag}
                  size={28}
                  color={active ? 'var(--accent-primary)' : 'var(--sem-goal)'}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Color-Coded Team Comparison Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isPhoneLayout ? '1fr' : '1fr 1fr',
          gap: '12px',
        }}
      >
        {[
          { tm: ourTeam, sum: ourSummary },
          { tm: oppTeam, sum: oppSummary },
        ].map(({ tm, sum }) => {
          const teamBounceShots = filteredEvents.filter(
            (e) =>
              e.teamId === tm.id && e.category === 'shot' && e.isBounceShot
          );
          const teamBounceGoals = teamBounceShots.filter(
            (e) => e.subType === 'goal'
          );
          const teamAssists = filteredEvents.filter(
            (e) =>
              e.teamId === tm.id &&
              ((e.category === 'attack_other' && e.subType === 'assist') ||
                (e.category === 'shot' &&
                  e.subType === 'goal' &&
                  e.assistingPlayerId))
          );

          return (
            <div
              key={tm.id}
              style={{
                background: 'var(--bg-surface)',
                border: `2px solid ${
                  selectedTeamFilter === tm.id
                    ? tm.primaryColorHex
                    : 'var(--border-subtle)'
                }`,
                borderRadius: 'var(--radius-md)',
                padding: '14px',
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
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TeamShapeIcon
                    shape={tm.shapeMarker}
                    color={tm.primaryColorHex}
                    logoUri={tm.logoUri}
                    size={20}
                  />
                  <span style={{ fontSize: '15px', fontWeight: 800 }}>
                    {tm.name}
                  </span>
                </div>
                <span
                  className="tabular-nums"
                  style={{
                    fontSize: '24px',
                    fontWeight: 800,
                    color: tm.primaryColorHex,
                  }}
                >
                  {sum.goals}
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    padding: '8px 10px',
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-sm)',
                    borderLeft: '3px solid var(--sem-goal)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                      Goals / Shots
                    </div>
                    <SampleRateMetric
                      successes={sum.goals}
                      attempts={sum.shots}
                      locale={locale}
                      highlightTone="goal"
                    />
                  </div>
                  <IconGoalNet size={20} />
                </div>

                <div
                  style={{
                    padding: '8px 10px',
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-sm)',
                    borderLeft: '3px solid var(--sem-bounce)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                      Bounce Shots
                    </div>
                    <SampleRateMetric
                      successes={teamBounceGoals.length}
                      attempts={teamBounceShots.length}
                      locale={locale}
                    />
                  </div>
                  <IconBounceShot size={20} />
                </div>

                <div
                  style={{
                    padding: '8px 10px',
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-sm)',
                    borderLeft: '3px solid var(--sem-assist)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                      Assists · Fast Break
                    </div>
                    <div className="tabular-nums" style={{ fontWeight: 800, fontSize: '13px' }}>
                      {teamAssists.length} AST ·{' '}
                      {sum.phaseBreakdown.fast_break.goals}/
                      {sum.phaseBreakdown.fast_break.shots} FB
                    </div>
                  </div>
                  <IconAssistPass size={20} />
                </div>

                <div
                  style={{
                    padding: '8px 10px',
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-sm)',
                    borderLeft: '3px solid var(--sem-fault)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                      Turnovers · 2′ Susp
                    </div>
                    <div className="tabular-nums" style={{ fontWeight: 800, fontSize: '13px', color: 'var(--sem-fault)' }}>
                      {sum.technicalFaults} TF · {sum.twoMinCount} × 2′
                    </div>
                  </div>
                  <IconTurnoverFault size={20} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Team Switcher for Court/Goal Spatial Maps & Player Cards */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', gap: '6px' }}>
          {[ourTeam, oppTeam].map((tm) => {
            const active = selectedTeamFilter === tm.id;
            return (
              <button
                key={tm.id}
                type="button"
                onClick={() => setSelectedTeamFilter(tm.id)}
                style={{
                  minHeight: '42px',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: active
                    ? `${tm.primaryColorHex}28`
                    : 'var(--bg-surface)',
                  border: active
                    ? `2px solid ${tm.primaryColorHex}`
                    : '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 800,
                  fontSize: '13px',
                }}
              >
                <TeamShapeIcon
                  shape={tm.shapeMarker}
                  color={tm.primaryColorHex}
                  logoUri={tm.logoUri}
                  size={16}
                />
                <span>{tm.shortCode} Players & Maps</span>
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: 'inline-flex',
            background: 'var(--bg-surface)',
            padding: '3px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <button
            type="button"
            onClick={() => setViewStyle('visual_cards')}
            style={{
              padding: '5px 10px',
              borderRadius: '4px',
              background:
                viewStyle === 'visual_cards'
                  ? 'var(--accent-primary)'
                  : 'transparent',
              color:
                viewStyle === 'visual_cards'
                  ? '#080c14'
                  : 'var(--text-secondary)',
              fontSize: '11.5px',
              fontWeight: 800,
            }}
          >
            Visual Cards
          </button>
          <button
            type="button"
            onClick={() => setViewStyle('table')}
            style={{
              padding: '5px 10px',
              borderRadius: '4px',
              background:
                viewStyle === 'table'
                  ? 'var(--accent-primary)'
                  : 'transparent',
              color:
                viewStyle === 'table'
                  ? '#080c14'
                  : 'var(--text-secondary)',
              fontSize: '11.5px',
              fontWeight: 800,
            }}
          >
            Full Table
          </button>
        </div>
      </div>

      {/* Court & Goal Spatial Analytics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isPhoneLayout ? '1fr' : '1.15fr 0.85fr',
          gap: '12px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '12px',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '6px',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: 800,
                color: 'var(--text-secondary)',
              }}
            >
              {activeTeamObj.shortCode} {locale === 'sl' ? 'IZKORISTEK CON IGRIŠČA' : 'COURT ZONE CONVERSION'}
            </span>
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
                cursor: 'pointer',
              }}
            >
              ⛶ {locale === 'sl' ? 'Povečaj' : 'Enlarge'}
            </button>
          </div>
          <HandballCourt
            mode="analytics"
            locale={locale}
            events={activeTeamEvents}
            activeZoneFilter={filter.zone}
            onZoneFilterSelect={(z) =>
              setFilter((f) => ({ ...f, zone: f.zone === z ? 'all' : z }))
            }
            teamColor={activeTeamObj.primaryColorHex}
          />
        </div>

        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '6px',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: 800,
                color: 'var(--text-secondary)',
              }}
            >
              {activeTeamObj.shortCode} {locale === 'sl' ? '3×3 MERITEV V GOL' : '3×3 GOAL TARGET PLACEMENT'}
            </span>
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
                cursor: 'pointer',
              }}
            >
              ⛶ {locale === 'sl' ? 'Povečaj' : 'Enlarge'}
            </button>
          </div>
          <HandballGoal
            mode="analytics"
            perspective="shooter"
            locale={locale}
            events={activeTeamEvents}
            teamColor={activeTeamObj.primaryColorHex}
          />
        </div>
      </div>

      {/* Outfield Players: Colorful Visual Cards (Default) OR Fixed-First-Column Table */}
      {viewStyle === 'visual_cards' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isPhoneLayout ? '1fr' : 'repeat(2, 1fr)',
            gap: '10px',
          }}
        >
          {teamOutfieldPlayers.map((p) => {
            const st = playerStatsMap[p.id];
            if (!st) return null;
            const pct = st.shots > 0 ? Math.round((st.goals / st.shots) * 100) : 0;
            const barColor =
              pct >= 65
                ? 'var(--sem-goal)'
                : pct >= 45
                ? 'var(--accent-primary)'
                : 'var(--sem-miss)';

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setInspectedPlayerId(p.id)}
                style={{
                  padding: '12px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <PlayerVisualPortrait
                      player={p}
                      jerseyNumber={st.jerseyNumber}
                      team={activeTeamObj}
                      size={48}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '15px', fontWeight: 800 }}>
                        {p.firstName} {p.lastName}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                        {p.primaryPosition} · +/-{' '}
                        <strong
                          style={{
                            color:
                              st.plusMinus >= 0
                                ? 'var(--sem-goal)'
                                : 'var(--sem-fault)',
                          }}
                        >
                          {st.plusMinus >= 0 ? `+${st.plusMinus}` : st.plusMinus}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <SampleRateMetric
                      successes={st.goals}
                      attempts={st.shots}
                      locale={locale}
                      size="lg"
                      highlightTone="goal"
                    />
                    <div
                      style={{
                        width: '84px',
                        height: '6px',
                        borderRadius: '999px',
                        background: 'var(--bg-canvas)',
                        overflow: 'hidden',
                        marginTop: '4px',
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: barColor,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Color-coded Stat Badges Row */}
                <div
                  className="tabular-nums"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '6px',
                    fontSize: '11px',
                  }}
                >
                  <div
                    style={{
                      padding: '5px 6px',
                      borderRadius: '6px',
                      background: 'var(--sem-bounce-bg)',
                      color: 'var(--sem-bounce)',
                      fontWeight: 800,
                      textAlign: 'center',
                    }}
                  >
                    Bounce {st.bounceGoals}/{st.bounceShots}
                  </div>
                  <div
                    style={{
                      padding: '5px 6px',
                      borderRadius: '6px',
                      background: 'var(--sem-assist-bg)',
                      color: 'var(--sem-assist)',
                      fontWeight: 800,
                      textAlign: 'center',
                    }}
                  >
                    Ast {st.assists}
                  </div>
                  <div
                    style={{
                      padding: '5px 6px',
                      borderRadius: '6px',
                      background: 'var(--sem-fault-bg)',
                      color: 'var(--sem-fault)',
                      fontWeight: 800,
                      textAlign: 'center',
                    }}
                  >
                    TF {st.technicalFaults}
                  </div>
                  <div
                    style={{
                      padding: '5px 6px',
                      borderRadius: '6px',
                      background: 'var(--bg-elevated)',
                      color: 'var(--text-secondary)',
                      fontWeight: 800,
                      textAlign: 'center',
                    }}
                  >
                    STL {st.steals} · 2′ {st.twoMinSuspensions}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="table-scroll-container">
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Pos</th>
                <th>Goals / Shots · %</th>
                <th>Bounce Shots</th>
                <th>9m</th>
                <th>6m / Break</th>
                <th>Wing</th>
                <th>AST</th>
                <th>TF</th>
                <th>STL / BLK</th>
                <th>2′</th>
                <th>+/-</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {teamOutfieldPlayers.map((p) => {
                const st = playerStatsMap[p.id];
                if (!st) return null;
                const nineMG =
                  st.byZone.LB_9M.goals +
                  st.byZone.CB_9M.goals +
                  st.byZone.RB_9M.goals;
                const nineMS =
                  st.byZone.LB_9M.shots +
                  st.byZone.CB_9M.shots +
                  st.byZone.RB_9M.shots;
                const sixMG =
                  st.byZone['6M_LEFT'].goals +
                  st.byZone['6M_CENTRE'].goals +
                  st.byZone['6M_RIGHT'].goals +
                  st.byZone.BREAKTHROUGH.goals;
                const sixMS =
                  st.byZone['6M_LEFT'].shots +
                  st.byZone['6M_CENTRE'].shots +
                  st.byZone['6M_RIGHT'].shots +
                  st.byZone.BREAKTHROUGH.shots;
                const wingG = st.byZone.LW.goals + st.byZone.RW.goals;
                const wingS = st.byZone.LW.shots + st.byZone.RW.shots;

                return (
                  <tr
                    key={p.id}
                    onClick={() => setInspectedPlayerId(p.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <strong style={{ color: activeTeamObj.primaryColorHex }}>
                        #{st.jerseyNumber}
                      </strong>{' '}
                      {p.lastName}
                    </td>
                    <td>{p.primaryPosition}</td>
                    <td>
                      <SampleRateMetric
                        successes={st.goals}
                        attempts={st.shots}
                        locale={locale}
                        highlightTone="goal"
                      />
                    </td>
                    <td>
                      <SampleRateMetric
                        successes={st.bounceGoals}
                        attempts={st.bounceShots}
                        locale={locale}
                      />
                    </td>
                    <td>
                      <SampleRateMetric
                        successes={nineMG}
                        attempts={nineMS}
                        locale={locale}
                      />
                    </td>
                    <td>
                      <SampleRateMetric
                        successes={sixMG}
                        attempts={sixMS}
                        locale={locale}
                      />
                    </td>
                    <td>
                      <SampleRateMetric
                        successes={wingG}
                        attempts={wingS}
                        locale={locale}
                      />
                    </td>
                    <td style={{ color: 'var(--sem-assist)', fontWeight: 700 }}>
                      {st.assists}
                    </td>
                    <td style={{ color: 'var(--sem-fault)', fontWeight: 700 }}>
                      {st.technicalFaults}
                    </td>
                    <td>
                      {st.steals} / {st.blocks}
                    </td>
                    <td>{st.twoMinSuspensions}</td>
                    <td
                      style={{
                        fontWeight: 700,
                        color:
                          st.plusMinus >= 0
                            ? 'var(--sem-goal)'
                            : 'var(--sem-fault)',
                      }}
                    >
                      {st.plusMinus >= 0 ? `+${st.plusMinus}` : st.plusMinus}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Goalkeeper Visual Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 800 }}>
          {activeTeamObj.shortCode} Goalkeepers (Tap GK for 3×3 Save Map)
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isPhoneLayout ? '1fr' : '1fr 1fr',
            gap: '10px',
          }}
        >
          {teamGoalkeepers.map((gk) => {
            const gs = gkStatsMap[gk.id];
            if (!gs) return null;
            return (
              <button
                key={gk.id}
                type="button"
                onClick={() => setInspectedPlayerId(gk.id)}
                style={{
                  padding: '12px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--sem-save)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <PlayerVisualPortrait
                    player={gk}
                    jerseyNumber={gs.jerseyNumber}
                    team={activeTeamObj}
                    slot="GK"
                    size={48}
                  />
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 800 }}>
                      #{gs.jerseyNumber} {gk.firstName} {gk.lastName}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                      9m: {gs.nineMeterSaves}/{gs.nineMeterFaced} · 6m:{' '}
                      {gs.sixMeterSaves}/{gs.sixMeterFaced} · 7m:{' '}
                      {gs.sevenMeterSaves}/{gs.sevenMeterFaced}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <SampleRateMetric
                    successes={gs.saves}
                    attempts={gs.shotsOnTargetFaced}
                    locale={locale}
                    size="lg"
                    highlightTone="save"
                  />
                  <IconGkSave size={22} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fullscreen Zoomable Map Modal for Stats */}
      {activeZoomMap === 'court' && (
        <ZoomableMapModal
          isOpen={true}
          onClose={() => setActiveZoomMap(null)}
          title={`${activeTeamObj.name} — ${locale === 'sl' ? 'Izkoristek con igrišča' : 'Court Zone Conversion'}`}
          subtitle={locale === 'sl' ? 'Povečava in premik · Tapni cono za filtriranje' : 'Zoom & pan · Tap zone to filter events'}
        >
          <div style={{ width: '100%', maxWidth: '640px' }}>
            <HandballCourt
              mode="analytics"
              locale={locale}
              events={activeTeamEvents}
              activeZoneFilter={filter.zone}
              onZoneFilterSelect={(z) => {
                setFilter((f) => ({ ...f, zone: f.zone === z ? 'all' : z }));
                setActiveZoomMap(null);
              }}
              teamColor={activeTeamObj.primaryColorHex}
            />
          </div>
        </ZoomableMapModal>
      )}

      {activeZoomMap === 'goal' && (
        <ZoomableMapModal
          isOpen={true}
          onClose={() => setActiveZoomMap(null)}
          title={`${activeTeamObj.name} — ${locale === 'sl' ? '3×3 Postavitev strelov v gol' : '3×3 Goal Target Placement'}`}
          subtitle={locale === 'sl' ? 'Povečava in premik tarč' : 'Zoom & pan target heatmap'}
        >
          <div style={{ width: '100%', maxWidth: '640px' }}>
            <HandballGoal
              mode="analytics"
              perspective="shooter"
              locale={locale}
              events={activeTeamEvents}
              teamColor={activeTeamObj.primaryColorHex}
            />
          </div>
        </ZoomableMapModal>
      )}
    </div>
  );
};
