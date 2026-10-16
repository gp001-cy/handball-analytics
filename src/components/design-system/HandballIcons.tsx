import React from 'react';
import { CourtZone, GoalTargetCell, Player, PositionCode, Team } from '../../types/domain';

export const IconGoalNet: React.FC<{ size?: number; color?: string }> = ({
  size = 20,
  color = 'var(--sem-goal)',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M3 19V6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v13"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path d="M6 5v13M12 5v13M18 5v13M3 10h18M3 15h18" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" />
    <circle cx="16.5" cy="9.5" r="3.5" fill={color} />
    <path d="M8 17l6.5-6" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const IconGkSave: React.FC<{ size?: number; color?: string }> = ({
  size = 20,
  color = 'var(--sem-save)',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 3L4 6.5v5.5c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V6.5L12 3z"
      fill={`${color}26`}
      stroke={color}
      strokeWidth="2"
    />
    <path d="M9 12l2 2 4-4" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconMissTarget: React.FC<{ size?: number; color?: string }> = ({
  size = 20,
  color = 'var(--sem-miss)',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 19V8h12v11" stroke="currentColor" strokeOpacity="0.5" strokeWidth="2" />
    <path d="M13 15L20 5M20 5h-4.5M20 5v4.5" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconPostHit: React.FC<{ size?: number; color?: string }> = ({
  size = 20,
  color = 'var(--sem-miss)',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M5 20V5h14v15" stroke="currentColor" strokeWidth="2.2" />
    <circle cx="5" cy="10" r="3.5" fill={color} />
    <path d="M12 16L6.5 11.5M6.5 8.5L11 4" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const IconBlockWall: React.FC<{ size?: number; color?: string }> = ({
  size = 20,
  color = 'var(--sem-block)',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="4" y="9" width="16" height="11" rx="2" fill={`${color}24`} stroke={color} strokeWidth="2" />
    <path d="M8 9V4M12 9V3M16 9V4" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

/**
 * Self-explanatory Bounce Shot diagram icon: ball hits court floor and angles up into the net.
 */
export const IconBounceShot: React.FC<{ size?: number; color?: string }> = ({
  size = 20,
  color = 'var(--sem-bounce)',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    {/* Floor line */}
    <line x1="2" y1="19" x2="22" y2="19" stroke="currentColor" strokeOpacity="0.5" strokeWidth="2" />
    {/* Bounce trajectory: starts top-left -> hits floor at x=11,y=18.5 -> shoots up to top-right */}
    <path
      d="M3 8l8 10.5L19.5 6"
      stroke={color}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="11" cy="18.5" r="2.2" fill={color} />
    <circle cx="19.5" cy="6" r="3" fill={color} />
  </svg>
);

export const IconDirectShot: React.FC<{ size?: number; color?: string }> = ({
  size = 20,
  color = 'var(--accent-primary)',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M4 17L19 6M19 6h-5M19 6v5"
      stroke={color}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="4" cy="17" r="2.5" fill={color} />
  </svg>
);

export const IconAssistPass: React.FC<{ size?: number; color?: string }> = ({
  size = 20,
  color = 'var(--sem-assist)',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="5" cy="16" r="3" stroke={color} strokeWidth="2" />
    <circle cx="19" cy="8" r="3" fill={color} />
    <path
      d="M7.5 14C10 9.5 13.5 8 15.8 8"
      stroke={color}
      strokeWidth="2"
      strokeDasharray="3 2"
      strokeLinecap="round"
    />
  </svg>
);

export const IconTurnoverFault: React.FC<{ size?: number; color?: string }> = ({
  size = 20,
  color = 'var(--sem-fault)',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" fill={`${color}20`} stroke={color} strokeWidth="2" />
    <path d="M9 9l6 6M15 9l-6 6" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

export const IconStealBall: React.FC<{ size?: number; color?: string }> = ({
  size = 20,
  color = 'var(--sem-goal)',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z" fill={`${color}26`} stroke={color} strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

export const IconTwoMinSuspension: React.FC<{ size?: number; color?: string }> = ({
  size = 20,
  color = 'var(--sem-fault)',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="13" r="8" fill={`${color}22`} stroke={color} strokeWidth="2" />
    <path d="M12 9v4l2.8 2" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    <path d="M9 2h6" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const IconTimeoutCard: React.FC<{ size?: number; color?: string }> = ({
  size = 20,
  color = 'var(--sem-save)',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="3" fill={`${color}22`} stroke={color} strokeWidth="2" />
    <path d="M8 8.5h8M12 8.5v8" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

/**
 * Mini Court Zone Diagram icon that visually shows which part of the handball court a stat/button refers to!
 */
export const MiniCourtZoneDiagram: React.FC<{
  highlight: '9m' | '6m' | 'wing' | '7m' | 'fb' | CourtZone;
  size?: number;
  color?: string;
}> = ({ highlight, size = 34, color = 'var(--accent-primary)' }) => {
  const isWing = highlight === 'wing' || highlight === 'LW' || highlight === 'RW';
  const is6m =
    highlight === '6m' ||
    highlight === '6M_LEFT' ||
    highlight === '6M_CENTRE' ||
    highlight === '6M_RIGHT' ||
    highlight === 'BREAKTHROUGH';
  const is7m = highlight === '7m' || highlight === '7M';
  const isFb = highlight === 'fb' || highlight === 'FAST_BREAK' || highlight === 'EMPTY_NET_OWN_HALF';
  const is9m =
    highlight === '9m' ||
    highlight === 'LB_9M' ||
    highlight === 'CB_9M' ||
    highlight === 'RB_9M';

  return (
    <svg
      width={size}
      height={Math.round(size * 0.72)}
      viewBox="0 0 40 28"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <rect x="1" y="1" width="38" height="26" rx="3" fill="var(--bg-court)" stroke="var(--border-strong)" strokeWidth="1.2" />
      {/* 6m arc */}
      <path
        d="M7 1 A 11 11 0 0 0 33 1"
        fill={is6m ? `${color}55` : 'var(--bg-court-6m)'}
        stroke={is6m ? color : 'var(--court-line)'}
        strokeWidth="1.2"
      />
      {/* 9m arc */}
      <path
        d="M2 8 A 18 18 0 0 0 38 8"
        fill="none"
        stroke={is9m ? color : 'var(--court-line)'}
        strokeWidth={is9m ? '2.2' : '1'}
        strokeDasharray="2 2"
      />
      {/* Wing corners */}
      {isWing && (
        <>
          <polygon points="1,1 8,1 5,11 1,11" fill={color} />
          <polygon points="39,1 32,1 35,11 39,11" fill={color} />
        </>
      )}
      {/* 7m dot */}
      {is7m && <circle cx="20" cy="14" r="3.2" fill={color} />}
      {/* 9m backcourt highlight */}
      {is9m && <rect x="8" y="15" width="24" height="7" rx="2" fill={`${color}66`} />}
      {/* Fast break arrow */}
      {isFb && (
        <path d="M20 25V6M20 6l-4 4M20 6l4 4" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
      )}
    </svg>
  );
};

/**
 * Visual Broadcast Player Card Avatar — generates a stylized handball kit + athletic portrait SVG
 * with team colors, jersey number, and position tag so player cards look like a true sports broadcast!
 */
export const PlayerVisualPortrait: React.FC<{
  player: Player;
  jerseyNumber: number;
  team: Team;
  slot?: PositionCode;
  size?: number;
}> = ({ player, jerseyNumber, team, slot, size = 56 }) => {
  const pos = slot || player.primaryPosition;
  const isGk = pos === 'GK';
  const kitPrimary = isGk ? '#2563eb' : team.primaryColorHex;
  const kitSecondary = team.secondaryColorHex || '#f8fafc';

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '12px',
        background: `linear-gradient(145deg, ${kitPrimary}30, var(--bg-elevated))`,
        border: `2px solid ${kitPrimary}`,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {player.photoUri ? (
        <>
          <img
            src={player.photoUri}
            alt={`${player.firstName} ${player.lastName}`}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          {/* Jersey Number badge overlay for custom photos */}
          <span
            style={{
              position: 'absolute',
              bottom: '2px',
              right: '2px',
              fontSize: '11px',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              padding: '1px 4px',
              borderRadius: '4px',
              background: 'rgba(2, 4, 8, 0.88)',
              color: '#ffffff',
              border: `1px solid ${kitPrimary}`,
            }}
          >
            #{jerseyNumber}
          </span>
        </>
      ) : (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          aria-hidden="true"
        >
          {/* Head & Neck silhouette */}
          <circle cx="32" cy="18" r="9.5" fill="#cbd5e1" />
          {/* Stylized Hair/Brow accent */}
          <path
            d="M23 15c2-5 16-5 18 0"
            stroke="#475569"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Handball Jersey Shoulders & Torso */}
          <path
            d="M12 58c1-16 8-24 20-24s19 8 20 24H12z"
            fill={kitPrimary}
            stroke={kitSecondary}
            strokeWidth="1.5"
          />
          {/* Jersey Collar V-Neck */}
          <polygon points="26,34 38,34 32,41" fill={kitSecondary} />
          {/* Jersey Number on Chest */}
          <text
            x="32"
            y="55"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="16"
            fontWeight="800"
            fontFamily="var(--font-mono)"
          >
            {jerseyNumber}
          </text>
        </svg>
      )}

      {/* Handedness Corner Pill */}
      <span
        style={{
          position: 'absolute',
          top: '3px',
          right: '3px',
          fontSize: '9px',
          fontWeight: 800,
          padding: '1px 4px',
          borderRadius: '4px',
          background: 'rgba(8, 12, 20, 0.82)',
          color: player.handedness === 'L' ? 'var(--sem-miss)' : 'var(--text-secondary)',
        }}
      >
        {player.handedness}
      </span>

      {/* Position Corner Pill */}
      <span
        style={{
          position: 'absolute',
          top: '3px',
          left: '3px',
          fontSize: '9px',
          fontWeight: 800,
          padding: '1px 4px',
          borderRadius: '4px',
          background: isGk ? 'var(--sem-save)' : 'rgba(8, 12, 20, 0.82)',
          color: '#ffffff',
        }}
      >
        {pos}
      </span>
    </div>
  );
};
