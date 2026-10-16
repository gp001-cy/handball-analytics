import React, { useMemo, useState } from 'react';
import { HandballCourt } from '../components/design-system/HandballCourt';
import { HandballGoal } from '../components/design-system/HandballGoal';
import {
  SampleRateMetric,
  TeamShapeIcon,
} from '../components/design-system/Primitives';
import {
  computePlayerMatchStats,
  computeTeamMatchSummary,
  generateLiveInsights,
} from '../engine/analyticsEngine';
import { formatClock, TRANSLATIONS } from '../i18n/translations';
import { useAppStore } from '../store/useAppStore';

export const ReportsExportScreen: React.FC<{ isPhoneLayout: boolean }> = ({
  isPhoneLayout,
}) => {
  const {
    locale,
    teams,
    players,
    activeMatch,
    activeEvents,
    clockSec,
  } = useAppStore();

  const t = TRANSLATIONS[locale];
  const [shareLinkCopied, setShareLinkCopied] = useState(false);

  const ourTeam =
    teams.find((tm) => tm.id === activeMatch.ourTeamId) ?? teams[0];
  const oppTeam =
    teams.find((tm) => tm.id === activeMatch.opponentTeamId) ?? teams[1];

  const ourSummary = useMemo(
    () => computeTeamMatchSummary(ourTeam.id, activeEvents),
    [ourTeam.id, activeEvents]
  );
  const oppSummary = useMemo(
    () => computeTeamMatchSummary(oppTeam.id, activeEvents),
    [oppTeam.id, activeEvents]
  );
  const playerStats = useMemo(
    () => computePlayerMatchStats(activeMatch, activeEvents, players, clockSec),
    [activeMatch, activeEvents, players, clockSec]
  );
  const insights = useMemo(
    () => generateLiveInsights(activeMatch, activeEvents, players, clockSec),
    [activeMatch, activeEvents, players, clockSec]
  );

  const handleExportCsv = () => {
    const headers = [
      'id',
      'matchId',
      'half',
      'matchClock',
      'matchClockSec',
      'team',
      'playerNumber',
      'playerName',
      'category',
      'subType',
      'isBounceShot',
      'assistingPlayerId',
      'attackPhase',
      'situation',
      'originZone',
      'originXMeters',
      'originYMeters',
      'goalTargetCell',
      'goalNormX',
      'goalNormY',
      'opposingGk',
    ];
    const rows = activeEvents.map((ev) => {
      const tm = teams.find((x) => x.id === ev.teamId);
      const pl = players.find((x) => x.id === ev.playerId);
      const gk = players.find((x) => x.id === ev.opposingGkId);
      return [
        ev.id,
        ev.matchId,
        ev.half,
        formatClock(ev.matchClockSec),
        ev.matchClockSec,
        tm?.shortCode ?? ev.teamId,
        pl?.defaultJerseyNumber ?? '',
        pl ? `${pl.firstName} ${pl.lastName}` : '',
        ev.category,
        ev.subType,
        ev.isBounceShot ? 'true' : 'false',
        ev.assistingPlayerId ?? '',
        ev.attackPhase,
        ev.situation,
        ev.shotOrigin?.zone ?? '',
        ev.shotOrigin?.xMeters ?? '',
        ev.shotOrigin?.yMeters ?? '',
        ev.goalTarget?.cell ?? '',
        ev.goalTarget?.normX ?? '',
        ev.goalTarget?.normY ?? '',
        gk ? `#${gk.defaultJerseyNumber} ${gk.lastName}` : '',
      ].join(',');
    });

    const csvBlob = new Blob([[headers.join(','), ...rows].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(csvBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeMatch.id}-events.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      match: activeMatch,
      teams: [ourTeam, oppTeam],
      events: activeEvents,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeMatch.id}-full-export.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyShareLink = () => {
    const shareUrl = `${window.location.origin}/?match=${activeMatch.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
    }
    setShareLinkCopied(true);
    window.setTimeout(() => setShareLinkCopied(false), 2500);
  };

  return (
    <div
      style={{
        padding: isPhoneLayout ? '10px' : '20px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        width: '100%',
      }}
    >
      <div
        className="no-print"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '14px', fontWeight: 800 }}>
          Match & Scouting Report Export
        </span>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              minHeight: '40px',
              padding: '0 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--sem-goal)',
              color: '#080c14',
              fontWeight: 800,
              fontSize: '12px',
            }}
          >
            ⎙ Print / Save PDF
          </button>

          <button
            type="button"
            onClick={handleCopyShareLink}
            style={{
              minHeight: '40px',
              padding: '0 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              fontWeight: 700,
              fontSize: '12px',
            }}
          >
            {shareLinkCopied ? '✓ Copied' : '🔗 Share Link'}
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            style={{
              minHeight: '40px',
              padding: '0 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              fontWeight: 700,
              fontSize: '12px',
            }}
          >
            ⬇ {t.common.exportCsv}
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            style={{
              minHeight: '40px',
              padding: '0 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              fontWeight: 700,
              fontSize: '12px',
            }}
          >
            ⬇ {t.common.exportJson}
          </button>
        </div>
      </div>

      {/* Report Sheet */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          padding: isPhoneLayout ? '14px' : '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-strong)',
            paddingBottom: '12px',
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
              }}
            >
              40×20 HANDBALL ANALYTICS REPORT
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 800 }}>
              {ourTeam.name} vs {oppTeam.name}
            </h1>
          </div>

          <div
            className="tabular-nums"
            style={{
              padding: '6px 14px',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 800,
              fontSize: '18px',
            }}
          >
            {ourTeam.shortCode} {ourSummary.goals} : {oppSummary.goals}{' '}
            {oppTeam.shortCode}
          </div>
        </div>

        {/* Key Insights */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isPhoneLayout ? '1fr' : 'repeat(2, 1fr)',
            gap: '8px',
          }}
        >
          {insights.map((ins) => (
            <div
              key={ins.id}
              style={{
                padding: '10px',
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-sm)',
                borderLeft: '3px solid var(--sem-goal)',
              }}
            >
              <div style={{ fontWeight: 800, fontSize: '13px' }}>
                {ins.headline}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                {ins.detail}
              </div>
            </div>
          ))}
        </div>

        {/* Spatial Maps */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isPhoneLayout ? '1fr' : '1fr 1fr',
            gap: '14px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 800,
                marginBottom: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <TeamShapeIcon
                shape={oppTeam.shapeMarker}
                color={oppTeam.primaryColorHex}
                size={12}
              />
              <span>{oppTeam.shortCode} Shot Origins</span>
            </div>
            <HandballCourt
              mode="analytics"
              locale={locale}
              events={activeEvents.filter((e) => e.teamId === oppTeam.id)}
              teamColor={oppTeam.primaryColorHex}
            />
          </div>

          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 800,
                marginBottom: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <TeamShapeIcon
                shape={oppTeam.shapeMarker}
                color={oppTeam.primaryColorHex}
                size={12}
              />
              <span>{oppTeam.shortCode} Goal Placement</span>
            </div>
            <HandballGoal
              mode="analytics"
              perspective="shooter"
              locale={locale}
              events={activeEvents.filter((e) => e.teamId === oppTeam.id)}
              teamColor={oppTeam.primaryColorHex}
            />
          </div>
        </div>

        {/* Box Score with Bounce Shots & Assists */}
        <div className="table-scroll-container">
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Player ({ourTeam.shortCode})</th>
                <th>Pos</th>
                <th>Goals / Shots · %</th>
                <th>Bounce</th>
                <th>AST</th>
                <th>TF</th>
                <th>2′</th>
                <th>+/-</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {players
                .filter(
                  (p) => p.teamId === ourTeam.id && p.primaryPosition !== 'GK'
                )
                .map((p) => {
                  const st = playerStats[p.id];
                  if (!st) return null;
                  return (
                    <tr key={p.id}>
                      <td>
                        <strong>#{st.jerseyNumber}</strong> {p.lastName}
                      </td>
                      <td>{p.primaryPosition}</td>
                      <td>
                        <SampleRateMetric
                          successes={st.goals}
                          attempts={st.shots}
                          locale={locale}
                        />
                      </td>
                      <td>
                        <SampleRateMetric
                          successes={st.bounceGoals}
                          attempts={st.bounceShots}
                          locale={locale}
                        />
                      </td>
                      <td>{st.assists}</td>
                      <td>{st.technicalFaults}</td>
                      <td>{st.twoMinSuspensions}</td>
                      <td>
                        {st.plusMinus >= 0 ? `+${st.plusMinus}` : st.plusMinus}
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
