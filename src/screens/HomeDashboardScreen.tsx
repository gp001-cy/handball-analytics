import React from 'react';
import {
  PlayerMonogramBadge,
  SampleRateMetric,
  TeamShapeIcon,
} from '../components/design-system/Primitives';
import { SEED_EVENTS } from '../data/seedData';
import {
  computePlayerMatchStats,
  computeTeamMatchSummary,
} from '../engine/analyticsEngine';
import { formatClock, TRANSLATIONS } from '../i18n/translations';
import { useAppStore } from '../store/useAppStore';

export const HomeDashboardScreen: React.FC<{ isPhoneLayout: boolean }> = ({
  isPhoneLayout,
}) => {
  const {
    locale,
    seasons,
    competitions,
    teams,
    players,
    matches,
    activeMatch,
    activeEvents,
    clockSec,
    setActiveMatchId,
    setActiveTab,
    setInspectedPlayerId,
  } = useAppStore();

  const t = TRANSLATIONS[locale];

  // Match 1 (Derby - Active / Next) & Match 2 (Supercup - Finished Last Result)
  const nextOrLiveMatch = matches[0];
  const lastFinishedMatch = matches[1] ?? matches[0];

  const ourTeam =
    teams.find((tm) => tm.id === nextOrLiveMatch.ourTeamId) ?? teams[0];
  const oppTeam =
    teams.find((tm) => tm.id === nextOrLiveMatch.opponentTeamId) ?? teams[1];

  const liveOurSummary = computeTeamMatchSummary(ourTeam.id, activeEvents);
  const liveOppSummary = computeTeamMatchSummary(oppTeam.id, activeEvents);

  const finishedEvents =
    SEED_EVENTS[lastFinishedMatch.id] ?? activeEvents;
  const lastOurSummary = computeTeamMatchSummary(ourTeam.id, finishedEvents);
  const lastOppSummary = computeTeamMatchSummary(oppTeam.id, finishedEvents);
  const lastPlayerStats = computePlayerMatchStats(
    lastFinishedMatch,
    finishedEvents,
    players,
    3600
  );

  const topScorersLastMatch = Object.values(lastPlayerStats)
    .filter((s) => s.shots > 0)
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 4);

  return (
    <div
      style={{
        padding: isPhoneLayout ? '14px 12px' : '24px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      {/* Season & Competition Context Strip (Clean, Zero Nesting Clutter) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '12px',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--text-muted)',
              letterSpacing: '0.04em',
            }}
          >
            SEASON {seasons[0]?.name} · {competitions.map((c) => c.shortName).join(' & ')}
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, marginTop: '2px' }}>
            Analyst Bench & Scouting Desk
          </h1>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--sem-goal)',
            }}
          />
          <span>{t.nav.offlineReady}</span>
          <span>·</span>
          <span>{t.nav.collaborators}</span>
        </div>
      </div>

      {/* Main Dashboard Grid: Next/Live Match Focus + Last Result (§8 Navigation) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isPhoneLayout ? '1fr' : '1.15fr 0.85fr',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* NEXT / LIVE MATCH HERO CARD */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1.5px solid var(--border-strong)',
            borderRadius: 'var(--radius-lg)',
            padding: isPhoneLayout ? '16px' : '22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
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
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '4px',
                background: 'var(--accent-primary-subtle)',
                color: 'var(--accent-primary)',
                letterSpacing: '0.04em',
              }}
            >
              NEXT / ACTIVE MATCH · {nextOrLiveMatch.roundLabel.toUpperCase()}
            </span>
            <span
              className="tabular-nums"
              style={{ fontSize: '12px', color: 'var(--text-secondary)' }}
            >
              {nextOrLiveMatch.venue} · {nextOrLiveMatch.format.label}
            </span>
          </div>

          {/* Teams & Live Score / Status */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center',
              gap: '12px',
              padding: '14px',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <TeamShapeIcon
                shape={ourTeam.shapeMarker}
                color={ourTeam.primaryColorHex}
                size={16}
              />
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700 }}>
                  {ourTeam.name}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  Home · {ourTeam.defaultDefensiveSystem} Defence
                </div>
              </div>
            </div>

            <div
              className="tabular-nums"
              style={{
                textAlign: 'center',
                padding: '6px 14px',
                background: 'var(--bg-canvas)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-strong)',
              }}
            >
              <div style={{ fontSize: '22px', fontWeight: 700 }}>
                {liveOurSummary.goals} : {liveOppSummary.goals}
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--sem-goal)', fontWeight: 700 }}>
                LIVE {formatClock(clockSec)} (H2)
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '10px',
                textAlign: 'right',
              }}
            >
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700 }}>
                  {oppTeam.name}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  Away · {oppTeam.defaultDefensiveSystem} Defence
                </div>
              </div>
              <TeamShapeIcon
                shape={oppTeam.shapeMarker}
                color={oppTeam.primaryColorHex}
                size={16}
              />
            </div>
          </div>

          {/* Pre-Match Readiness Checklist Summary */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              fontSize: '12px',
            }}
          >
            <div
              style={{
                padding: '8px 10px',
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                Lineup & Jersey #
              </div>
              <div style={{ fontWeight: 700, color: 'var(--sem-goal)' }}>
                ✓ 11 Players Ready
              </div>
            </div>
            <div
              style={{
                padding: '8px 10px',
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                Opponent Scouting
              </div>
              <div style={{ fontWeight: 700 }}>9 Profiles + GK Map</div>
            </div>
            <div
              style={{
                padding: '8px 10px',
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                Key Alert
              </div>
              <div style={{ fontWeight: 700, color: 'var(--sem-miss)' }}>
                Opp #7 9m → TR
              </div>
            </div>
          </div>

          {/* Primary Actions: Prepare & Go Live (§8 Navigation) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setActiveMatchId(nextOrLiveMatch.id);
                setActiveTab('prematch');
              }}
              style={{
                minHeight: '50px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-interactive)',
                border: '1px solid var(--border-strong)',
                fontWeight: 700,
                fontSize: '14px',
              }}
            >
              📋 {t.common.prepare} (Scouting & Plan)
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveMatchId(nextOrLiveMatch.id);
                setActiveTab('live');
              }}
              style={{
                minHeight: '50px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-primary)',
                color: '#000',
                fontWeight: 700,
                fontSize: '14px',
              }}
            >
              ▶ {t.common.goLive} (≤3-Tap Entry)
            </button>
          </div>
        </div>

        {/* LAST RESULT ANALYTICAL CARD */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: isPhoneLayout ? '16px' : '22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                letterSpacing: '0.04em',
              }}
            >
              LAST RESULT · {lastFinishedMatch.roundLabel.toUpperCase()}
            </span>
            <span
              className="tabular-nums"
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '4px',
                background: 'var(--sem-goal-bg)',
                color: 'var(--sem-goal)',
                fontWeight: 700,
              }}
            >
              FINAL 60:00
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px' }}>
                {ourTeam.shortCode} vs {oppTeam.shortCode}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                {lastFinishedMatch.venue}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <SampleRateMetric
                successes={lastOurSummary.goals}
                attempts={lastOurSummary.shots}
                locale={locale}
                size="lg"
                highlightTone="goal"
              />
              <button
                type="button"
                onClick={() => {
                  setActiveMatchId(lastFinishedMatch.id);
                  setActiveTab('stats');
                }}
                style={{
                  minHeight: '38px',
                  padding: '0 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-interactive)',
                  border: '1px solid var(--border-strong)',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                Open Stats →
              </button>
            </div>
          </div>

          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
            Key Performers ({lastFinishedMatch.roundLabel})
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
            }}
          >
            {topScorersLastMatch.map((st) => {
              const pTeam =
                st.player.teamId === ourTeam.id ? ourTeam : oppTeam;
              return (
                <button
                  key={st.player.id}
                  type="button"
                  onClick={() => setInspectedPlayerId(st.player.id)}
                  style={{
                    padding: '8px 10px',
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    textAlign: 'left',
                  }}
                >
                  <PlayerMonogramBadge
                    jerseyNumber={st.jerseyNumber}
                    monogram={st.player.monogram}
                    teamColor={pTeam.primaryColorHex}
                    size="sm"
                  />
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 700 }}>
                      {st.player.lastName}
                    </div>
                    <SampleRateMetric
                      successes={st.goals}
                      attempts={st.shots}
                      locale={locale}
                      size="sm"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* All Seeded Matches Table (Switch active match context with 1 tap) */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <h2 style={{ fontSize: '15px', fontWeight: 700 }}>
          Season Match Log (Select any match to review Live Mode, Stats, or
          Pre-Match Prep)
        </h2>

        <div className="table-scroll-container">
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Match / Competition</th>
                <th>Venue</th>
                <th>Format</th>
                <th>Status</th>
                <th>Events Logged</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {matches.map((m) => {
                const comp = competitions.find((c) => c.id === m.competitionId);
                const isCurrent = m.id === activeMatch.id;
                const evCount =
                  m.id === activeMatch.id
                    ? activeEvents.length
                    : (SEED_EVENTS[m.id] ?? []).length;
                return (
                  <tr key={m.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>
                        {ourTeam.shortCode} vs {oppTeam.shortCode} —{' '}
                        {m.roundLabel}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {comp?.name} ({comp?.type})
                      </div>
                    </td>
                    <td>{m.venue}</td>
                    <td>{m.format.label}</td>
                    <td>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background:
                            m.status === 'live_h2'
                              ? 'var(--sem-goal-bg)'
                              : 'var(--bg-elevated)',
                          color:
                            m.status === 'live_h2'
                              ? 'var(--sem-goal)'
                              : 'var(--text-secondary)',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                      >
                        {m.status.toUpperCase()}
                      </span>
                    </td>
                    <td>{evCount} events</td>
                    <td>
                      <div
                        style={{
                          display: 'inline-flex',
                          gap: '6px',
                          justifyContent: 'flex-end',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMatchId(m.id);
                            setActiveTab('prematch');
                          }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '4px',
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-strong)',
                            fontSize: '11.5px',
                            fontWeight: 600,
                          }}
                        >
                          {t.common.prepare}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMatchId(m.id);
                            setActiveTab('stats');
                          }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '4px',
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-strong)',
                            fontSize: '11.5px',
                            fontWeight: 600,
                          }}
                        >
                          {t.common.matchHub}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMatchId(m.id);
                            setActiveTab('live');
                          }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '4px',
                            background: isCurrent
                              ? 'var(--accent-primary)'
                              : 'var(--bg-interactive)',
                            color: isCurrent ? '#000' : 'var(--text-primary)',
                            fontSize: '11.5px',
                            fontWeight: 700,
                          }}
                        >
                          {t.common.goLive}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
