export const COURT_WIDTH_M = 20;
export const HALF_LENGTH_M = 20;
export const GOAL_WIDTH_M = 3;
export const GOAL_HEIGHT_M = 2;
export const GOAL_POST_HALF_M = GOAL_WIDTH_M / 2;
export const POST_BUFFER_M = 0.35;
export const CROSSBAR_BUFFER_M = 0.35;

export const SIX_M_LINE_M = 6;
export const SEVEN_M_LINE_M = 7;
export const NINE_M_LINE_M = 9;

export interface CourtPoint {
  x: number;
  y: number;
}

export function courtDistanceM(p: CourtPoint): number {
  return Math.sqrt(p.x * p.x + p.y * p.y);
}

export function visibleGoalAngleRad(p: CourtPoint): number {
  if (p.y <= 0.05) return 0;
  const leftPost = Math.atan2(-GOAL_POST_HALF_M - p.x, p.y);
  const rightPost = Math.atan2(GOAL_POST_HALF_M - p.x, p.y);
  const angle = rightPost - leftPost;
  return Math.max(0, angle);
}

export const MAX_VISIBLE_ANGLE_RAD = visibleGoalAngleRad({ x: 0, y: SIX_M_LINE_M });

export function courtToGoalVector(origin: CourtPoint): { distanceM: number; angleRad: number } {
  return {
    distanceM: courtDistanceM(origin),
    angleRad: visibleGoalAngleRad(origin),
  };
}

export interface GoalPlanePoint {
  x: number;
  y: number;
}

export function inGoalMouth(g: GoalPlanePoint): boolean {
  return Math.abs(g.x) <= GOAL_POST_HALF_M && g.y >= 0 && g.y <= GOAL_HEIGHT_M;
}

export function inGoalBuffer(g: GoalPlanePoint): boolean {
  return (
    Math.abs(g.x) <= GOAL_POST_HALF_M + POST_BUFFER_M &&
    g.y >= -CROSSBAR_BUFFER_M * 0.5 &&
    g.y <= GOAL_HEIGHT_M + CROSSBAR_BUFFER_M
  );
}

export function hitPost(g: GoalPlanePoint): boolean {
  if (!inGoalBuffer(g)) return false;
  const nearPost = Math.abs(Math.abs(g.x) - GOAL_POST_HALF_M) <= POST_BUFFER_M && g.y <= GOAL_HEIGHT_M;
  const nearBar = Math.abs(g.y - GOAL_HEIGHT_M) <= CROSSBAR_BUFFER_M && Math.abs(g.x) <= GOAL_POST_HALF_M;
  return nearPost || nearBar;
}

export function goalPlacementQuality(g: GoalPlanePoint): number {
  const nx = g.x / GOAL_POST_HALF_M;
  const ny = g.y / GOAL_HEIGHT_M;
  const cornerNorm = Math.min(1, Math.hypot(nx, ny) / Math.SQRT2);
  const centralNorm = 1 - Math.min(1, Math.hypot(nx, ny) / 0.75);
  return cornerNorm - centralNorm;
}

export function normalizeCourtPoint(p: CourtPoint): CourtPoint {
  return {
    x: Math.max(-COURT_WIDTH_M / 2 + 0.2, Math.min(COURT_WIDTH_M / 2 - 0.2, p.x)),
    y: Math.max(0.3, Math.min(HALF_LENGTH_M, p.y)),
  };
}
