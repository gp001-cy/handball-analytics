import type { CourtZone, Id, Player, ShotTechnique, TeamSide } from '../domain/types';
import { SHOT_TECHNIQUES } from '../domain/types';

export interface GoalGrid {
  rows: number;
  cols: number;
  cells: number[];
}

export interface PenaltyTree {
  attempts: number;
  conversion: number;
  sequence: ('G' | 'S' | 'M')[];
  note: string;
}

export interface PlayerPriors {
  playerId: Id;
  side: TeamSide;
  zoneWeights: Partial<Record<CourtZone, number>>;
  techniqueMix: Record<ShotTechnique, number>;
  contestedShare: number;
  goalGridOpen: GoalGrid;
  goalGridContested: GoalGrid;
  penalty: PenaltyTree;
  notes: string[];
}

function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const POSITION_ZONES: Record<string, CourtZone[]> = {
  LW: ['LW'],
  RW: ['RW'],
  LB: ['L9M', 'LBT', 'C9M', 'LONG'],
  CB: ['C9M', 'CBT', 'C6M', 'PV'],
  RB: ['R9M', 'RBT', 'C9M', 'LONG'],
  PV: ['PV', 'C6M'],
  GK: [],
};

function normaliseGrid(cells: number[], rng: () => number, heat = 0): number[] {
  const out = cells.map((c) => Math.max(0, c + rng() * heat));
  const total = out.reduce((a, b) => a + b, 0) || 1;
  return out.map((c) => c / total);
}

export function generatePriors(player: Player): PlayerPriors {
  const rng = mulberry32(hashString(player.id));
  const baseZones = POSITION_ZONES[player.position] ?? ['C9M'];
  const zoneWeights: Partial<Record<CourtZone, number>> = {};
  let remaining = 1;
  baseZones.forEach((z, idx) => {
    const share = idx === baseZones.length - 1 ? remaining : Math.min(remaining, (0.35 + rng() * 0.45) * remaining);
    zoneWeights[z] = Math.round(share * 100) / 100;
    remaining -= share;
  });

  const techniqueMix = {} as Record<ShotTechnique, number>;
  let techRemaining = 1;
  SHOT_TECHNIQUES.forEach((t, idx) => {
    const share = idx === SHOT_TECHNIQUES.length - 1 ? techRemaining : Math.min(techRemaining, Math.max(0.01, (0.05 + rng() * 0.5) * techRemaining));
    techniqueMix[t] = Math.round(share * 100) / 100;
    techRemaining -= share;
  });

  const contestedShare = Math.round((0.35 + rng() * 0.4) * 100) / 100;

  const openCells = new Array(15).fill(0).map(() => rng());
  const contestedCells = new Array(15).fill(0).map(() => rng());

  const attempts = 4 + Math.floor(rng() * 8);
  const conversion = Math.round((0.6 + rng() * 0.3) * 100) / 100;
  const sequence: ('G' | 'S' | 'M')[] = [];
  for (let i = 0; i < Math.min(attempts, 6); i++) {
    const r = rng();
    sequence.push(r < conversion ? 'G' : r < conversion + (1 - conversion) * 0.6 ? 'S' : 'M');
  }

  const notesPool = [
    `${player.name} releases early on the wing before the defence sets`,
    'Shifts target to low-left corner when jumping under pressure',
    'High-right on standing throws, low placement on spin shots',
    'Prefers back-pass to second pivot under aggressive 6:0 pressure',
    'Draws contact intentionally near the 6m line',
    'Lobs the goalkeeper when off-balance at 7m+',
    'Second-half shot volume drops sharply after 40th minute',
  ];
  const notes: string[] = [];
  const noteCount = 1 + Math.floor(rng() * 2);
  for (let i = 0; i < noteCount; i++) {
    notes.push(notesPool[Math.floor(rng() * notesPool.length)] as string);
  }

  return {
    playerId: player.id,
    side: player.teamSide,
    zoneWeights,
    techniqueMix,
    contestedShare,
    goalGridOpen: { rows: 3, cols: 5, cells: normaliseGrid(openCells, rng, 0.6) },
    goalGridContested: { rows: 3, cols: 5, cells: normaliseGrid(contestedCells, rng, 0.6) },
    penalty: {
      attempts,
      conversion,
      sequence,
      note:
        conversion > 0.8
          ? 'Very reliable from 7m: high conversion, rarely changes sides'
          : sequence.includes('M')
            ? 'After a miss, tends to repeat the same side — goalkeeper cue'
            : 'Mixes placement each attempt; watch the approach angle',
    },
    notes,
  };
}

export function generatePriorsForTeam(players: Player[]): Map<Id, PlayerPriors> {
  const map = new Map<Id, PlayerPriors>();
  for (const player of players) {
    map.set(player.id, generatePriors(player));
  }
  return map;
}

export function importPriors(json: string): PlayerPriors[] {
  const parsed = JSON.parse(json) as PlayerPriors[];
  if (!Array.isArray(parsed)) throw new Error('Priors file must be an array');
  return parsed.filter((p) => p && typeof p.playerId === 'string');
}

export function penaltyTreeText(priors: PlayerPriors): string {
  return `Last ${priors.penalty.sequence.length}: ${priors.penalty.sequence.join('-')} (${Math.round(priors.penalty.conversion * 100)}% season conversion)`;
}
