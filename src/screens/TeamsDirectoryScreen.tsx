import React, { useState } from 'react';
import { PlayerVisualPortrait } from '../components/design-system/HandballIcons';
import {
  PlayerMonogramBadge,
  TeamShapeIcon,
} from '../components/design-system/Primitives';
import { TRANSLATIONS } from '../i18n/translations';
import { useAppStore } from '../store/useAppStore';

export const TeamsDirectoryScreen: React.FC<{ isPhoneLayout: boolean }> = ({
  isPhoneLayout,
}) => {
  const {
    locale,
    teams,
    players,
    matches,
    importPlayersFromCsv,
    updatePlayerPhoto,
    updateTeamLogo,
    setInspectedPlayerId,
  } = useAppStore();

  const t = TRANSLATIONS[locale];
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.id);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvInputText, setCsvInputText] = useState(
    '77,Domen,Makuc,CB,R,Creative playmaker and 1v1 breakthrough specialist\n88,Blaž,Janc,RW,L,Explosive fast-break finisher and 5-1 defender'
  );

  const selectedTeam =
    teams.find((tm) => tm.id === selectedTeamId) ?? teams[0];
  const teamPlayers = players.filter((p) => p.teamId === selectedTeam.id);

  const handlePhotoUpload = (
    playerId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        updatePlayerPhoto(playerId, result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        updateTeamLogo(selectedTeam.id, result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      style={{
        padding: isPhoneLayout ? '12px' : '20px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {/* Team Entity Switcher (Both Own and Opponent Teams are First-Class Entities) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {teams.map((tm) => {
            const active = tm.id === selectedTeam.id;
            return (
              <button
                key={tm.id}
                type="button"
                onClick={() => setSelectedTeamId(tm.id)}
                style={{
                  minHeight: '46px',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: active
                    ? `${tm.primaryColorHex}26`
                    : 'var(--bg-surface)',
                  border: active
                    ? `2px solid ${tm.primaryColorHex}`
                    : '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 700,
                  fontSize: '13.5px',
                }}
              >
                <TeamShapeIcon
                  shape={tm.shapeMarker}
                  color={tm.primaryColorHex}
                  logoUri={tm.logoUri}
                  size={18}
                />
                <span>{tm.name}</span>
                <span
                  style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'var(--bg-canvas)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {tm.isOwnTeam ? 'OWN TEAM' : 'OPPONENT'}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setShowCsvImport((s) => !s)}
          style={{
            minHeight: '42px',
            padding: '0 14px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-interactive)',
            border: '1px solid var(--border-strong)',
            fontSize: '12.5px',
            fontWeight: 600,
          }}
        >
          📥 {t.common.importCsv}
        </button>
      </div>

      {/* CSV / Paste Roster Import Panel (§7 Import: rosters from CSV or paste) */}
      {showCsvImport && (
        <div
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--accent-primary)',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 700 }}>
            Import Players into {selectedTeam.name} (Format:
            JerseyNumber,FirstName,LastName,Position,Handedness,ScoutingNotes)
          </div>
          <textarea
            rows={3}
            value={csvInputText}
            onChange={(e) => setCsvInputText(e.target.value)}
            className="tabular-nums"
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-strong)',
              fontSize: '12px',
            }}
          />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setShowCsvImport(false)}
              style={{
                minHeight: '38px',
                padding: '0 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-strong)',
                fontSize: '12px',
              }}
            >
              {t.common.cancel}
            </button>
            <button
              type="button"
              onClick={() => {
                importPlayersFromCsv(selectedTeam.id, csvInputText);
                setShowCsvImport(false);
              }}
              style={{
                minHeight: '38px',
                padding: '0 16px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--accent-primary)',
                color: '#000',
                fontWeight: 700,
                fontSize: '12px',
              }}
            >
              Import into {selectedTeam.shortCode} Roster
            </button>
          </div>
        </div>
      )}

      {/* Team Entity Metadata Card */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          display: 'grid',
          gridTemplateColumns: isPhoneLayout ? '1fr' : '1.2fr 0.8fr',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TeamShapeIcon
              shape={selectedTeam.shapeMarker}
              color={selectedTeam.primaryColorHex}
              size={16}
            />
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>
              {selectedTeam.name} ({selectedTeam.shortCode})
            </h2>
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            Home Venue: <strong>{selectedTeam.homeVenue}</strong> · Base
            Defensive System:{' '}
            <strong>{selectedTeam.defaultDefensiveSystem}</strong> · Logged
            Matches in DB: <strong>{matches.length}</strong>
          </div>
          <div
            style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              marginTop: '4px',
            }}
          >
            {selectedTeam.scoutingNotes}
          </div>
        </div>

        <div
          style={{
            padding: '12px',
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ fontWeight: 700 }}>
            Team Identity & Accessibility Palette
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {selectedTeam.logoUri ? (
              <img
                src={selectedTeam.logoUri}
                alt={selectedTeam.name}
                style={{
                  width: '32px',
                  height: '32px',
                  objectFit: 'contain',
                  borderRadius: '4px',
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-subtle)',
                  padding: '2px',
                }}
              />
            ) : (
              <span
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '4px',
                  background: selectedTeam.primaryColorHex,
                  display: 'inline-block',
                }}
              />
            )}
            <span className="tabular-nums">{selectedTeam.primaryColorHex}</span>
            <span>·</span>
            <span>Shape Marker: {selectedTeam.shapeMarker.toUpperCase()}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-strong)',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              📷 {selectedTeam.logoUri ? 'Change Team Logo' : 'Upload Team Logo'}
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleLogoUpload}
              />
            </label>
            {selectedTeam.logoUri && (
              <button
                type="button"
                onClick={() => updateTeamLogo(selectedTeam.id, '')}
                style={{
                  padding: '5px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '11.5px',
                  color: 'var(--accent-danger)',
                  cursor: 'pointer',
                }}
              >
                ✕ Remove Logo
              </button>
            )}
          </div>

          <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
            Custom team logos replace short codes across match scoreboards, headers, and team views.
          </div>
        </div>
      </div>

      {/* Full Roster Table (§3 Player fields: monogram fallback, default jersey #, primary/secondary positions, handedness, defensive role, birthdate, licence #, nationality, notes) */}
      <div className="table-scroll-container">
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Default #</th>
              <th>Primary / Sec Pos</th>
              <th>Hand</th>
              <th>Defensive Role</th>
              <th>Birthdate</th>
              <th>Licence #</th>
              <th>Nat.</th>
              <th>Scouting & Tactical Note</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {teamPlayers.map((p) => (
              <tr
                key={p.id}
                onClick={() => setInspectedPlayerId(p.id)}
                style={{ cursor: 'pointer' }}
              >
                <td>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <PlayerVisualPortrait
                      player={p}
                      jerseyNumber={p.defaultJerseyNumber}
                      team={selectedTeam}
                      size={44}
                    />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '13.5px' }}>
                        {p.firstName} {p.lastName}
                      </div>
                      <label
                        htmlFor={`upload-photo-${p.id}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          color: 'var(--accent-primary)',
                          cursor: 'pointer',
                          marginTop: '2px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'var(--bg-interactive)',
                          border: '1px solid var(--border-strong)',
                        }}
                      >
                        📷 {p.photoUri ? 'Change Photo' : 'Upload Photo'}
                      </label>
                      <input
                        id={`upload-photo-${p.id}`}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => handlePhotoUpload(p.id, e)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                </td>
                <td style={{ fontWeight: 700 }}>#{p.defaultJerseyNumber}</td>
                <td>
                  <strong>{p.primaryPosition}</strong>
                  {p.secondaryPositions.length
                    ? ` / ${p.secondaryPositions.join(', ')}`
                    : ''}
                </td>
                <td>{p.handedness}</td>
                <td>{p.defensiveRole.replace('_', ' ')}</td>
                <td>{p.birthDate}</td>
                <td>{p.licenceNumber}</td>
                <td>{p.nationality}</td>
                <td
                  style={{
                    maxWidth: '280px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {p.scoutingNotes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
