import React from 'react';
import { formatSampleRate } from '../../i18n/translations';
import { LocaleCode, Player, PositionCode, ShapeMarker, Team } from '../../types/domain';

/**
 * Geometric shape marker so team identity never relies on colour alone (A11y §7).
 */
export const TeamShapeIcon: React.FC<{
  shape: ShapeMarker;
  color: string;
  logoUri?: string;
  size?: number;
}> = ({ shape, color, logoUri, size = 16 }) => {
  if (logoUri) {
    const clubImgSize = Math.max(Math.round(size * 1.3), 28);
    return (
      <img
        src={logoUri}
        alt=""
        style={{
          width: clubImgSize,
          height: clubImgSize,
          objectFit: 'contain',
          borderRadius: '4px',
          flexShrink: 0,
          display: 'inline-block',
        }}
      />
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden="true"
      style={{ flexShrink: 0, display: 'inline-block' }}
    >
      {shape === 'circle' && <circle cx="8" cy="8" r="6" fill={color} />}
      {shape === 'square' && <rect x="2.5" y="2.5" width="11" height="11" rx="2" fill={color} />}
      {shape === 'diamond' && <polygon points="8,1.5 14.5,8 8,14.5 1.5,8" fill={color} />}
      {shape === 'triangle' && <polygon points="8,2 14.5,13.5 1.5,13.5" fill={color} />}
    </svg>
  );
};

/**
 * Sample-size aware metric badge (§2 Core Principle 6 & §5 Tables).
 * Always displays "5/7 · 71%" (or "5/7 · 71 %" in SL), never a bare percentage.
 * Zero attempts renders "—". Low sample (<4 attempts) is visually de-emphasised.
 */
export const SampleRateMetric: React.FC<{
  successes: number;
  attempts: number;
  locale: LocaleCode;
  decimals?: number;
  size?: 'sm' | 'md' | 'lg';
  highlightTone?: 'neutral' | 'goal' | 'save' | 'warning';
}> = ({
  successes,
  attempts,
  locale,
  decimals = 0,
  size = 'md',
  highlightTone = 'neutral',
}) => {
  const formatted = formatSampleRate(successes, attempts, locale, decimals);

  if (!formatted.hasData) {
    return (
      <span
        className="tabular-nums"
        style={{
          color: 'var(--text-muted)',
          fontSize: size === 'lg' ? 'var(--text-base)' : 'var(--text-sm)',
        }}
      >
        —
      </span>
    );
  }

  const toneColor =
    highlightTone === 'goal'
      ? 'var(--sem-goal)'
      : highlightTone === 'save'
      ? 'var(--sem-save)'
      : highlightTone === 'warning'
      ? 'var(--sem-miss)'
      : 'var(--text-primary)';

  return (
    <span
      className="tabular-nums"
      title={formatted.isLowSample ? 'Low sample size (< 4 attempts)' : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: '5px',
        opacity: formatted.isLowSample ? 0.62 : 1,
        fontSize:
          size === 'lg'
            ? 'var(--text-base)'
            : size === 'sm'
            ? 'var(--text-xs)'
            : 'var(--text-sm)',
      }}
    >
      <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
        {formatted.fractionText}
      </span>
      <span style={{ color: 'var(--text-muted)' }}>·</span>
      <span
        style={{
          color: formatted.isLowSample ? 'var(--text-secondary)' : toneColor,
          fontWeight: formatted.isLowSample ? 500 : 700,
        }}
      >
        {formatted.percentText}
      </span>
    </span>
  );
};

/**
 * Player Monogram / Jersey badge. Never uses generic silhouette avatars (§3 Player).
 */
export const PlayerMonogramBadge: React.FC<{
  jerseyNumber: number;
  monogram: string;
  teamColor: string;
  isGk?: boolean;
  size?: 'sm' | 'md' | 'lg';
}> = ({ jerseyNumber, monogram, teamColor, isGk = false, size = 'md' }) => {
  const dim = size === 'lg' ? 44 : size === 'sm' ? 28 : 36;
  return (
    <div
      className="tabular-nums"
      style={{
        width: dim,
        height: dim,
        borderRadius: isGk ? 'var(--radius-sm)' : '50%',
        background: `${teamColor}22`,
        border: `1.5px solid ${teamColor}`,
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        lineHeight: 1,
      }}
    >
      <span
        style={{
          fontSize: size === 'lg' ? '15px' : size === 'sm' ? '11px' : '13px',
          fontWeight: 700,
          color: 'var(--text-primary)',
        }}
      >
        {jerseyNumber}
      </span>
      {size !== 'sm' && (
        <span
          style={{
            fontSize: '9px',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            letterSpacing: '0.02em',
            marginTop: '1px',
          }}
        >
          {monogram}
        </span>
      )}
    </div>
  );
};

/**
 * Interactive Jersey Number Chip used in Live Mode (≥ 48dp touch target, zero alphabetical lists).
 */
export const LiveJerseyChip: React.FC<{
  player: Player;
  jerseyNumber: number;
  slot?: PositionCode;
  team: Team;
  selected: boolean;
  suggested?: boolean;
  miniStatText?: string;
  suspensionRemainingSec?: number;
  onSelect: () => void;
  onInspectPlayer?: (playerId: string) => void;
  compact?: boolean;
}> = ({
  player,
  jerseyNumber,
  slot,
  team,
  selected,
  suggested = false,
  miniStatText,
  suspensionRemainingSec,
  onSelect,
  compact = false,
}) => {
  const posLabel = slot || player.primaryPosition;
  const isSuspended = (suspensionRemainingSec ?? 0) > 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        minHeight: compact ? '48px' : '54px',
        minWidth: compact ? '56px' : '68px',
        padding: compact ? '4px 8px' : '6px 10px',
        borderRadius: 'var(--radius-md)',
        background: selected
          ? `${team.primaryColorHex}2E`
          : suggested
          ? 'var(--bg-interactive)'
          : 'var(--bg-surface)',
        border: selected
          ? `2px solid ${team.primaryColorHex}`
          : suggested
          ? `1.5px dashed ${team.primaryColorHex}`
          : '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
        position: 'relative',
        opacity: isSuspended ? 0.55 : 1,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          width: '100%',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            color: posLabel === 'GK' ? 'var(--sem-save)' : 'var(--text-secondary)',
            letterSpacing: '0.03em',
          }}
        >
          {posLabel}
        </span>
        <span
          style={{
            fontSize: '10px',
            color: 'var(--text-muted)',
            fontWeight: 600,
          }}
        >
          {player.handedness}
        </span>
      </div>

      <div
        className="tabular-nums"
        style={{
          fontSize: compact ? '16px' : '18px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          lineHeight: 1.1,
        }}
      >
        #{jerseyNumber}
      </div>

      <div
        style={{
          fontSize: '11px',
          color: 'var(--text-secondary)',
          fontWeight: 500,
          maxWidth: '76px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {player.lastName}
      </div>

      {miniStatText && (
        <div
          className="tabular-nums"
          style={{
            fontSize: '10px',
            color: 'var(--text-muted)',
          }}
        >
          {miniStatText}
        </div>
      )}

      {isSuspended && suspensionRemainingSec !== undefined && (
        <span
          className="tabular-nums"
          style={{
            position: 'absolute',
            top: '-6px',
            right: '-6px',
            background: 'var(--sem-fault)',
            color: '#fff',
            fontSize: '10px',
            fontWeight: 700,
            padding: '1px 5px',
            borderRadius: '999px',
          }}
        >
          {Math.floor(suspensionRemainingSec / 60)}:
          {(suspensionRemainingSec % 60).toString().padStart(2, '0')}
        </span>
      )}
    </button>
  );
};

/**
 * Empty state (§8 Design direction):
 * "a one-line explanation plus one clear action. No illustrations."
 */
export const EmptyStateLine: React.FC<{
  explanation: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ explanation, actionLabel, onAction }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--space-2)',
      padding: 'var(--space-2) var(--space-3)',
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      color: 'var(--text-secondary)',
      fontSize: 'var(--text-sm)',
    }}
  >
    <span>{explanation}</span>
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        style={{
          minHeight: '38px',
          padding: '6px 14px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-interactive)',
          border: '1px solid var(--border-strong)',
          color: 'var(--text-primary)',
          fontWeight: 600,
          fontSize: 'var(--text-xs)',
          whiteSpace: 'nowrap',
        }}
      >
        {actionLabel}
      </button>
    )}
  </div>
);
