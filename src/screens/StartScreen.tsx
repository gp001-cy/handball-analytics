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
    teams,
    players,
    matches,
    activeMatch,
    setActiveMatchId,
    activeEvents,
    clockSec,
    liveEntryMode,
    setLiveEntryMode,
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
                Our Team
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
                Opponent
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

      {/* Choose Live Input Mode Section (2 Ways to Input Data During Match) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 800,
            color: 'var(--text-secondary)',
            letterSpacing: '0.03em',
          }}
        >
          CHOOSE YOUR LIVE MATCH INPUT MODE
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isPhoneLayout ? '1fr' : '1fr 1fr',
            gap: '14px',
          }}
        >
          {/* INPUT MODE 1: PLAYER-FIRST VISUAL FLOW */}
          <button
            type="button"
            onClick={() => {
              setLiveEntryMode('player_first');
              setActiveTab('live');
            }}
            style={{
              padding: '18px',
              borderRadius: 'var(--radius-lg)',
              background:
                liveEntryMode === 'player_first'
                  ? 'var(--bg-elevated)'
                  : 'var(--bg-surface)',
              border:
                liveEntryMode === 'player_first'
                  ? '2px solid var(--sem-goal)'
                  : '1.5px solid var(--border-strong)',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '14px',
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
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'var(--sem-goal-bg)',
                    color: 'var(--sem-goal)',
                  }}
                >
                  MODE 1 · STEP-BY-STEP VISUAL
                </span>
                <IconGoalNet size={22} color="var(--sem-goal)" />
              </div>

              <div style={{ fontSize: '17px', fontWeight: 800 }}>
                1. Player Portraits First → Action → Court → Goal
              </div>
              <div
                style={{
                  fontSize: '12.5px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.45,
                }}
              >
                Shows only players and their portraits on screen. Tap a player to
                open Goal / Bounce / Assist / Turnover buttons, then pick where
                it was scored from on the court, then tap the goal frame.
              </div>
            </div>

            {/* Visual Step Diagram Preview inside the button */}
            <div
              style={{
                padding: '10px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', gap: '4px' }}>
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
                  fontSize: '11px',
                  fontWeight: 800,
                }}
              >
                GOAL / TF
              </div>
              <span style={{ color: 'var(--sem-goal)', fontWeight: 800 }}>→</span>
              <MiniCourtZoneDiagram highlight="9m" size={34} color="var(--sem-goal)" />
            </div>

            <div
              style={{
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--sem-goal)',
                color: '#080c14',
                fontWeight: 800,
                fontSize: '13.5px',
                textAlign: 'center',
              }}
            >
              ▶ Start Live Match (Player-First Mode)
            </div>
          </button>

          {/* INPUT MODE 2: ALL-IN-ONE COURT + PLAYERS VIEW */}
          <button
            type="button"
            onClick={() => {
              setLiveEntryMode('all_in_one');
              setActiveTab('live');
            }}
            style={{
              padding: '18px',
              borderRadius: 'var(--radius-lg)',
              background:
                liveEntryMode === 'all_in_one'
                  ? 'var(--bg-elevated)'
                  : 'var(--bg-surface)',
              border:
                liveEntryMode === 'all_in_one'
                  ? '2px solid var(--accent-primary)'
                  : '1.5px solid var(--border-strong)',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '14px',
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
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'var(--accent-primary-subtle)',
                    color: 'var(--accent-primary)',
                  }}
                >
                  MODE 2 · PRO ALL-IN-ONE
                </span>
                <IconBounceShot size={22} color="var(--accent-primary)" />
              </div>

              <div style={{ fontSize: '17px', fontWeight: 800 }}>
                2. All Players + Court & Goal Charts Together
              </div>
              <div
                style={{
                  fontSize: '12.5px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.45,
                }}
              >
                Displays all on-court players, the interactive court map, 3×3
                goal target, bounce shot toggle, assist picker, and live feed on
                a single unified screen.
              </div>
            </div>

            {/* Visual Diagram Preview inside the button */}
            <div
              style={{
                padding: '10px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around',
                gap: '8px',
              }}
            >
              <MiniCourtZoneDiagram highlight="6m" size={40} color="var(--accent-primary)" />
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--sem-bounce)',
                }}
              >
                <IconBounceShot size={18} />
                <span>Bounce + Assist</span>
              </div>
              <IconAssistPass size={20} />
            </div>

            <div
              style={{
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--accent-primary)',
                color: '#080c14',
                fontWeight: 800,
                fontSize: '13.5px',
                textAlign: 'center',
              }}
            >
              ▶ Start Live Match (All-in-One Mode)
            </div>
          </button>
        </div>
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
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 800 }}>
              Match Stats
            </span>
            <MiniCourtZoneDiagram highlight="wing" size={28} color="var(--sem-goal)" />
          </div>
          <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
            Visual bars, court zones, bounce shots & GK saves
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
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 800 }}>
              Pre-Match Scout
            </span>
            <IconGkSave size={20} color="var(--sem-save)" />
          </div>
          <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
            Opponent profile, shooter cards & lineup confirm
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
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 800 }}>
              Teams & Rosters
            </span>
            <IconAssistPass size={20} color="var(--sem-assist)" />
          </div>
          <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
            Own & opponent squads, jersey # & CSV import
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
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 800 }}>
              Export & PDF
            </span>
            <IconGoalNet size={20} color="var(--sem-bounce)" />
          </div>
          <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
            Print PDF report, share link, CSV & JSON export
          </span>
        </button>
      </div>
    </div>
  );
};
