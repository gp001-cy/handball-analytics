import React from 'react';
import {
  IconAssistPass,
  IconBounceShot,
  IconGkSave,
  IconGoalNet,
  MiniCourtZoneDiagram,
  PlayerVisualPortrait,
} from '../components/design-system/HandballIcons';
import { TeamShapeIcon } from '../components/design-system/Primitives';
import { computeTeamMatchSummary } from '../engine/analyticsEngine';
import { formatClock } from '../i18n/translations';
import { useAppStore } from '../store/useAppStore';

export const StartScreen: React.FC<{ isPhoneLayout: boolean }> = ({
  isPhoneLayout,
}) => {
  const {
    locale,
    teams,
    players,
    matches,
    activeMatch,
    setActiveMatchId,
    activeEvents,
    clockSec,
    setActiveTab,
  } = useAppStore();

  const ourTeam =
    teams.find((tm) => tm.id === activeMatch.ourTeamId) ?? teams[0];
  const oppTeam =
    teams.find((tm) => tm.id === activeMatch.opponentTeamId) ?? teams[1];

  const ourSummary = computeTeamMatchSummary(ourTeam.id, activeEvents);
  const oppSummary = computeTeamMatchSummary(oppTeam.id, activeEvents);

  const samplePlayers = players
    .filter((p) => p.teamId === ourTeam.id)
    .slice(0, 3);

  return (
    <div
      style={{
        padding: isPhoneLayout ? '14px 12px' : '28px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        maxWidth: '980px',
        margin: '0 auto',
      }}
    >
      {/* Hero Launch Banner */}
      <div
        style={{
          background:
            'linear-gradient(135deg, rgba(56, 189, 248, 0.14), rgba(0, 229, 163, 0.08))',
          border: '1.5px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          padding: isPhoneLayout ? '16px' : '22px 26px',
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
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              className="tabular-nums"
              style={{
                padding: '4px 9px',
                borderRadius: '6px',
                background: 'var(--sem-goal)',
                color: '#080c14',
                fontWeight: 800,
                fontSize: '12px',
              }}
            >
              40×20 PRO
            </span>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--accent-primary)',
                letterSpacing: '0.04em',
              }}
            >
              HANDBALL LIVE BENCH & SCOUTING
            </span>
          </div>

          {/* Match Selector Dropdown */}
          <select
            value={activeMatch.id}
            onChange={(e) => setActiveMatchId(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-strong)',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.roundLabel} ({m.status === 'live_h2' ? 'LIVE' : 'FINAL'})
              </option>
            ))}
          </select>
        </div>

        {/* Active Match Scoreboard Strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: '10px',
            padding: isPhoneLayout ? '12px 10px' : '16px 20px',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TeamShapeIcon
              shape={ourTeam.shapeMarker}
              color={ourTeam.primaryColorHex}
              logoUri={ourTeam.logoUri}
              size={isPhoneLayout ? 24 : 30}
            />
            <div>
              <div
                style={{
                  fontSize: isPhoneLayout ? '14px' : '17px',
                  fontWeight: 800,
                }}
              >
                {isPhoneLayout ? ourTeam.shortCode : ourTeam.name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {locale === 'sl' ? 'Naša ekipa' : 'Our Team'}
              </div>
            </div>
          </div>

          <div
            className="tabular-nums"
            style={{
              textAlign: 'center',
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-canvas)',
              border: '1.5px solid var(--border-strong)',
            }}
          >
            <div
              style={{
                fontSize: isPhoneLayout ? '22px' : '28px',
                fontWeight: 800,
                color: 'var(--text-primary)',
              }}
            >
              {ourSummary.goals} : {oppSummary.goals}
            </div>
            <div
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                color: 'var(--sem-goal)',
              }}
            >
              ● {formatClock(clockSec)}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '8px',
              textAlign: 'right',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: isPhoneLayout ? '14px' : '17px',
                  fontWeight: 800,
                }}
              >
                {isPhoneLayout ? oppTeam.shortCode : oppTeam.name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {locale === 'sl' ? 'Nasprotnik' : 'Opponent'}
              </div>
            </div>
            <TeamShapeIcon
              shape={oppTeam.shapeMarker}
              color={oppTeam.primaryColorHex}
              logoUri={oppTeam.logoUri}
              size={isPhoneLayout ? 24 : 30}
            />
          </div>
        </div>
      </div>

      {/* Single Live Match Entry Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('live')}
          style={{
            padding: isPhoneLayout ? '18px 16px' : '22px 24px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-surface)',
            border: '2px solid var(--sem-goal)',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(0, 229, 163, 0.08)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 800,
                  padding: '3px 9px',
                  borderRadius: '6px',
                  background: 'var(--sem-goal-bg)',
                  color: 'var(--sem-goal)',
                  letterSpacing: '0.04em',
                }}
              >
                {locale === 'sl'
                  ? 'VNOS TEKME V ŽIVO'
                  : 'LIVE MATCH ENTRY FLOW'}
              </span>
              <IconGoalNet size={24} color="var(--sem-goal)" />
            </div>

            <div style={{ fontSize: isPhoneLayout ? '18px' : '20px', fontWeight: 800 }}>
              {locale === 'sl'
                ? 'Portreti igralcev → Akcija → Mesto meta (2s potrditev) → Okvir gola'
                : 'Player Portraits → Action Menu → Court Origin (2s Confirm) → Goal Target'}
            </div>
            <div
              style={{
                fontSize: '13px',
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
              }}
            >
              {locale === 'sl'
                ? 'Hitro beleženje zadetkov, metov od tal, podaj in tehničnih napak. Klik na klop za takojšnjo menjavo igralca.'
                : 'Rapid tracking of goals, bounce shots, assists, and turnovers. Click any substitute to swap them onto the court.'}
            </div>
          </div>

          {/* Visual Step Diagram Preview */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {samplePlayers.slice(0, 2).map((p) => (
                <PlayerVisualPortrait
                  key={p.id}
                  player={p}
                  jerseyNumber={p.defaultJerseyNumber}
                  team={ourTeam}
                  size={38}
                />
              ))}
            </div>
            <span style={{ color: 'var(--sem-goal)', fontWeight: 800 }}>→</span>
            <div
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                background: 'var(--sem-goal-bg)',
                color: 'var(--sem-goal)',
                fontSize: '11.5px',
                fontWeight: 800,
              }}
            >
              {locale === 'sl' ? 'GOL / TF' : 'GOAL / TF'}
            </div>
            <span style={{ color: 'var(--sem-goal)', fontWeight: 800 }}>→</span>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '6px',
                background: 'rgba(56, 189, 248, 0.12)',
                color: 'var(--accent-primary)',
                fontSize: '11px',
                fontWeight: 800,
              }}
            >
              <MiniCourtZoneDiagram highlight="9m" size={24} color="var(--accent-primary)" />
              <span>{locale === 'sl' ? 'Igrišče (2s)' : 'Court (2s)'}</span>
            </div>
            <span style={{ color: 'var(--sem-goal)', fontWeight: 800 }}>→</span>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '6px',
                background: 'var(--sem-goal-bg)',
                color: 'var(--sem-goal)',
                fontSize: '11px',
                fontWeight: 800,
              }}
            >
              <IconGoalNet size={18} color="var(--sem-goal)" />
              <span>{locale === 'sl' ? 'Gol (2s)' : 'Goal (2s)'}</span>
            </div>
          </div>

          <div
            style={{
              padding: '12px 18px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--sem-goal)',
              color: '#080c14',
              fontWeight: 800,
              fontSize: '14px',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <span>▶</span>
            <span>
              {locale === 'sl'
                ? 'Začni beleženje tekme v živo'
                : 'Start Live Match Tracking'}
            </span>
          </div>
        </button>
      </div>

      {/* Quick Navigation Cards to Stats, Pre-Match Scouting, Teams & Reports */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isPhoneLayout ? '1fr 1fr' : 'repeat(4, 1fr)',
          gap: '10px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('stats')}
          style={{
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 800 }}>
              {locale === 'sl' ? 'Statistika tekme' : 'Match Stats'}
            </span>
            <MiniCourtZoneDiagram highlight="wing" size={28} color="var(--sem-goal)" />
          </div>
          <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
            {locale === 'sl'
              ? 'Grafični stolpci, cone igrišča, streli od tal in obrambe'
              : 'Visual bars, court zones, bounce shots & GK saves'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('prematch')}
          style={{
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 800 }}>
              {locale === 'sl' ? 'Priprava na tekmo' : 'Pre-Match Scout'}
            </span>
            <IconGkSave size={20} color="var(--sem-save)" />
          </div>
          <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
            {locale === 'sl'
              ? 'Profil nasprotnika, kartice strelcev in potrditev postave'
              : 'Opponent profile, shooter cards & lineup confirm'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('teams')}
          style={{
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 800 }}>
              {locale === 'sl' ? 'Ekipe in postave' : 'Teams & Rosters'}
            </span>
            <IconAssistPass size={20} color="var(--sem-assist)" />
          </div>
          <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
            {locale === 'sl'
              ? 'Domača in gostujoča ekipa, logotipi in uvoz'
              : 'Own & opponent squads, jersey # & CSV import'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          style={{
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 800 }}>
              {locale === 'sl' ? 'Izvoz in PDF' : 'Export & PDF'}
            </span>
            <IconGoalNet size={20} color="var(--sem-bounce)" />
          </div>
          <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
            {locale === 'sl'
              ? 'Tiskanje PDF poročila, deljenje povezave in CSV izvoz'
              : 'Print PDF report, share link, CSV & JSON export'}
          </span>
        </button>
      </div>
    </div>
  );
};
