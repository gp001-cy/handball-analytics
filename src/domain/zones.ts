import type { CourtZone } from './types';
import { courtDistanceM } from './court';

export const PIVOT_MAX_X_M = 3.5;
export const PIVOT_MAX_Y_M = 4.5;
export const WING_MIN_X_M = 7.5;
export const WING_MAX_Y_M = 7;
export const SIX_M_BAND_M = 6.8;
export const BT_BAND_M = 8.6;
export const NINE_M_BAND_M = 10.5;
export const ZONE_CENTER_HALF_M = 2.5;
export const NINE_M_CENTER_HALF_M = 3.5;

export function classifyZone(
  x: number,
  y: number,
  opts?: { fastBreak?: boolean; sevenMeter?: boolean },
): CourtZone {
  if (opts?.sevenMeter) return 'M7';
  if (opts?.fastBreak) return 'FB';

  const ax = Math.abs(x);
  const d = courtDistanceM({ x, y });

  if (ax >= WING_MIN_X_M && y <= WING_MAX_Y_M) {
    return x < 0 ? 'LW' : 'RW';
  }
  if (ax <= PIVOT_MAX_X_M && y <= PIVOT_MAX_Y_M) {
    return 'PV';
  }

  const side = (half: number, l: CourtZone, c: CourtZone, r: CourtZone): CourtZone =>
    x < -half ? l : x > half ? r : c;

  if (d <= SIX_M_BAND_M) return side(ZONE_CENTER_HALF_M, 'L6M', 'C6M', 'R6M');
  if (d <= BT_BAND_M) return side(ZONE_CENTER_HALF_M, 'LBT', 'CBT', 'RBT');
  if (d <= NINE_M_BAND_M) return side(NINE_M_CENTER_HALF_M, 'L9M', 'C9M', 'R9M');
  return 'LONG';
}

export const ZONE_ORDER: CourtZone[] = [
  'LW', 'L6M', 'LBT', 'L9M', 'C6M', 'CBT', 'C9M', 'R9M', 'RBT', 'R6M', 'RW', 'PV', 'M7', 'FB', 'LONG',
];

export const ZONE_GROUPS: { key: string; label: string; zones: CourtZone[] }[] = [
  { key: 'all', label: 'All', zones: ZONE_ORDER },
  { key: 'wing', label: 'Wings', zones: ['LW', 'RW'] },
  { key: 'six', label: '6m', zones: ['L6M', 'C6M', 'R6M'] },
  { key: 'bt', label: 'Breakthrough', zones: ['LBT', 'CBT', 'RBT'] },
  { key: 'nine', label: '9m', zones: ['L9M', 'C9M', 'R9M'] },
  { key: 'pivot', label: 'Pivot', zones: ['PV'] },
];

export function zoneGroupOf(zone: CourtZone): string {
  for (const g of ZONE_GROUPS) {
    if (g.zones.includes(zone)) return g.key;
  }
  return 'all';
}
