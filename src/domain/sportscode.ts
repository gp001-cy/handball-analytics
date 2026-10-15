import type { GameDerivation } from './selectors';
import { ZONE_LABELS } from './types';
import type { MatchEvent, SavedMatch } from './types';
import { playerName } from './selectors';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const CODE_BASE: Record<string, number> = {
  SHOT: 1,
  TURNOVER: 2,
  DEF_STOP_FOUL: 3,
  DEF_CHARGE_DRAWN: 4,
  SEVEN_M_AWARDED: 5,
  SUBSTITUTION: 6,
  SUSPENSION_2MIN: 7,
  RED_CARD: 8,
  TIMEOUT: 9,
  PERIOD_START: 10,
  PERIOD_END: 11,
  MATCH_END: 12,
  ATO_EXECUTION: 13,
  EMPTY_NET_ON: 14,
  EMPTY_NET_OFF: 15,
  REBOUND_RECOVERED: 16,
  NOTE: 17,
};

function codeNameOf(ev: MatchEvent): string {
  switch (ev.type) {
    case 'SHOT': {
      const outcome = ev.outcome ?? 'SHOT';
      const outcomeLabel = outcome.charAt(0) + outcome.slice(1).toLowerCase();
      if (ev.sevenMeter) return `7m ${outcomeLabel}`;
      if (ev.fastBreak) return `Fast Break ${outcomeLabel}`;
      return `Shot ${outcomeLabel}`;
    }
    case 'TURNOVER':
      return `Turnover ${ev.turnoverCode ?? ''}`.trim();
    case 'DEF_STOP_FOUL': return 'Stop Foul';
    case 'DEF_CHARGE_DRAWN': return 'Charge Drawn';
    case 'SEVEN_M_AWARDED': return '7m Awarded';
    case 'SUBSTITUTION': return 'Substitution';
    case 'SUSPENSION_2MIN': return 'Suspension 2min';
    case 'RED_CARD': return 'Red Card';
    case 'TIMEOUT': return 'Timeout';
    case 'PERIOD_START': return 'Period Start';
    case 'PERIOD_END': return 'Period End';
    case 'MATCH_END': return 'Match End';
    case 'ATO_EXECUTION': return 'ATO Execution';
    case 'EMPTY_NET_ON': return 'Empty Net On';
    case 'EMPTY_NET_OFF': return 'Empty Net Off';
    case 'REBOUND_RECOVERED': return 'Rebound Recovered';
    case 'NOTE': return 'Note';
  }
}

function xgBracket(xg: number | undefined): string | null {
  if (xg == null) return null;
  if (xg < 0.1) return '<10%';
  if (xg < 0.2) return '10-20%';
  if (xg < 0.35) return '20-35%';
  if (xg < 0.5) return '35-50%';
  if (xg < 0.7) return '50-70%';
  return '>70%';
}

function label(group: string, text: string): string {
  return `      <label><group>${escapeXml(group)}</group><text>${escapeXml(text)}</text></label>`;
}

export function eventToSportscodeXml(
  ev: MatchEvent,
  game: GameDerivation,
  videoOffsetMs: number,
  teamNames: Record<string, string>,
): string {
  const code = CODE_BASE[ev.type] ?? 99;
  const codeName = codeNameOf(ev);
  const start = Math.max(0, ev.clockMs + videoOffsetMs) / 1000;
  const end = start + (ev.type === 'SHOT' || ev.type === 'TURNOVER' ? 3 : 1);
  const lines: string[] = [];
  lines.push('    <instance>');
  lines.push(`      <ID>${escapeXml(ev.id)}</ID>`);
  lines.push(`      <start>${start.toFixed(3)}</start>`);
  lines.push(`      <end>${end.toFixed(3)}</end>`);
  lines.push(`      <code>${code}</code>`);
  lines.push(`      <code_name>${escapeXml(codeName)}</code_name>`);
  lines.push(label('Period', String(ev.period)));
  lines.push(label('Team', teamNames[ev.teamSide] ?? ev.teamSide));
  lines.push(label('TeamSide', ev.teamSide));
  if (ev.playerId) lines.push(label('Player', playerName(game, ev.playerId)));
  if (ev.assistPlayerId) lines.push(label('Assist', playerName(game, ev.assistPlayerId)));
  if (ev.defenderId) lines.push(label('Defender', playerName(game, ev.defenderId)));
  if (ev.gkPlayerId) lines.push(label('Goalkeeper', playerName(game, ev.gkPlayerId)));
  if (ev.zone) lines.push(label('Zone', ZONE_LABELS[ev.zone]));
  if (ev.technique) lines.push(label('Technique', ev.technique));
  if (ev.contested != null) lines.push(label('Contested', ev.contested ? 'Yes' : 'No'));
  if (ev.numericalState) lines.push(label('NumericalState', ev.numericalState));
  if (ev.wave) lines.push(label('Wave', ev.wave));
  if (ev.callCode) lines.push(label('Call', ev.callCode));
  if (ev.outcome) lines.push(label('Outcome', ev.outcome));
  if (ev.courtX != null && ev.courtY != null) {
    lines.push(label('CourtOrigin', `${ev.courtX.toFixed(2)},${ev.courtY.toFixed(2)}`));
  }
  if (ev.goalX != null && ev.goalY != null) {
    lines.push(label('GoalImpact', `${ev.goalX.toFixed(2)},${ev.goalY.toFixed(2)}`));
  }
  if (ev.distanceM != null) lines.push(label('DistanceM', ev.distanceM.toFixed(2)));
  if (ev.angleRad != null) lines.push(label('AngleRad', ev.angleRad.toFixed(3)));
  const bracket = xgBracket(ev.xg);
  if (bracket) lines.push(label('xG', bracket));
  if (ev.xgot != null) lines.push(label('xGOT', (ev.xgot * 100).toFixed(0) + '%'));
  if (ev.tags && ev.tags.length > 0) lines.push(label('Tags', ev.tags.join('+')));
  if (ev.note) lines.push(label('Note', ev.note));
  lines.push('    </instance>');
  return lines.join('\n');
}

export function toSportscodeXml(match: SavedMatch, game: GameDerivation): string {
  const teamNames: Record<string, string> = {
    home: match.setup.home.name,
    away: match.setup.away.name,
  };
  const instances = match.events
    .slice()
    .sort((a, b) => a.seq - b.seq)
    .map((ev) => eventToSportscodeXml(ev, game, match.videoOffsetMs, teamNames))
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<file>\n  <ALL_INSTANCES>\n${instances}\n  </ALL_INSTANCES>\n</file>\n`;
}

export function toMatchJson(match: SavedMatch, game: GameDerivation): string {
  return JSON.stringify(
    {
      app: 'handball-analytics',
      exportedAt: new Date().toISOString(),
      match: {
        id: match.id,
        createdAt: match.createdAt,
        setup: match.setup,
        clock: match.clock,
        videoOffsetMs: match.videoOffsetMs,
        notes: match.notes,
      },
      score: game.score,
      possessions: game.possessions.map((p) => ({
        id: p.id,
        teamSide: p.teamSide,
        startMs: p.startMs,
        endMs: p.endMs,
        wave: p.wave,
        goals: p.goals,
        endedBy: p.endedBy,
      })),
      events: match.events,
    },
    null,
    2,
  );
}
