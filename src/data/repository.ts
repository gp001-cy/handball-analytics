import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Id, SavedMatch, TeamSide } from '../domain/types';
import { deriveGame } from '../domain/selectors';

export interface MatchSummary {
  id: Id;
  createdAt: number;
  updatedAt: number;
  homeName: string;
  awayName: string;
  homeScore: number;
  awayScore: number;
  finished: boolean;
  clockMs: number;
  period: 1 | 2;
  eventCount: number;
  homeColor: string;
  awayColor: string;
}

export interface MatchRepository {
  list(): Promise<MatchSummary[]>;
  get(id: Id): Promise<SavedMatch | null>;
  save(match: SavedMatch): Promise<void>;
  remove(id: Id): Promise<void>;
}

const INDEX_KEY = 'hb.matches.index.v1';
const matchKey = (id: Id) => `hb.match.${id}.v1`;

export function summarise(match: SavedMatch): MatchSummary {
  const game = deriveGame(match.setup, match.events, match.clock.elapsedMs);
  return {
    id: match.id,
    createdAt: match.createdAt,
    updatedAt: match.updatedAt,
    homeName: match.setup.home.name,
    awayName: match.setup.away.name,
    homeScore: game.score.home,
    awayScore: game.score.away,
    finished: match.clock.finished,
    clockMs: match.clock.elapsedMs,
    period: match.clock.period,
    eventCount: match.events.length,
    homeColor: match.setup.home.color,
    awayColor: match.setup.away.color,
  };
}

export function createAsyncStorageRepository(): MatchRepository {
  const readIndex = async (): Promise<MatchSummary[]> => {
    try {
      const raw = await AsyncStorage.getItem(INDEX_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as MatchSummary[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  return {
    async list() {
      const index = await readIndex();
      return index.slice().sort((a, b) => b.updatedAt - a.updatedAt);
    },

    async get(id) {
      try {
        const raw = await AsyncStorage.getItem(matchKey(id));
        if (!raw) return null;
        return JSON.parse(raw) as SavedMatch;
      } catch {
        return null;
      }
    },

    async save(match) {
      const summary = summarise(match);
      await AsyncStorage.setItem(matchKey(match.id), JSON.stringify({ ...match, updatedAt: match.updatedAt }));
      const index = await readIndex();
      const next = index.filter((s) => s.id !== match.id);
      next.push(summary);
      await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(next));
    },

    async remove(id) {
      await AsyncStorage.removeItem(matchKey(id));
      const index = await readIndex();
      await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(index.filter((s) => s.id !== id)));
    },
  };
}

export const matchRepository: MatchRepository = createAsyncStorageRepository();

export function teamLabel(match: SavedMatch, side: TeamSide): string {
  return match.setup[side].name;
}
