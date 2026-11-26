// Pure 5-6 player Hexagonal 6-Arm Star Ludo board geometry (matching the classic 6-player layout).
// 78-cell outer track (6 arms x 13 cells), 6 radial 5-cell final lanes,
// 6 triangular home yards between the arms, and a central finishing hexagon.

import { COLORS, FINAL_LANE_LENGTH, GAME_WIDTH } from './constants.js';

export const CIRCULAR_PLAYER_ORDER = ['red', 'green', 'yellow', 'orange', 'purple', 'blue'];
export const CIRCULAR_TRACK_LENGTH = 78; // 6 * 13
export const CIRCULAR_OUTER_MAX = 76;    // 0..76 on outer track (77 steps)
export const CIRCULAR_FINISH_PROGRESS = 82; // 77..81 final lane (5), 82 center

export const CIRCULAR_START_INDEX = {
  red: 0,
  green: 13,
  yellow: 26,
  orange: 39,
  purple: 52,
  blue: 65,
};

export const CIRCULAR_STAR_INDICES = [8, 21, 34, 47, 60, 73];
export const CIRCULAR_SAFE_INDICES = [
  ...CIRCULAR_STAR_INDICES,
  ...Object.values(CIRCULAR_START_INDEX),
];

export const HEX_CELL = 32;
export const HEX_ARM_WIDTH = HEX_CELL * 3; // 96
export const HEX_INNER_DIST = HEX_ARM_WIDTH * Math.cos(Math.PI / 6); // ~83.14

// Arm k angles (clockwise): Red=120°, Green=180°, Yellow=-120°, Orange=-60°, Purple=0°, Blue=60°
export function getArmAngle(armIdx) {
  return ((120 + armIdx * 60) * Math.PI) / 180;
}

export function getCircularCenter(boardY) {
  return { cx: GAME_WIDTH / 2, cy: boardY + 330 };
}

/**
 * Transform local arm cell (across: -1 | 0 | 1, row: 0..5 from inner to outer)
 * into canvas [x, y] coordinates.
 */
export function armCellToCanvas(armIdx, across, row, boardY) {
  const { cx, cy } = getCircularCenter(boardY);
  const angle = getArmAngle(armIdx);
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  // Perpendicular clockwise vector
  const rx = -uy;
  const ry = ux;

  const radialDist = HEX_INNER_DIST + (row + 0.5) * HEX_CELL;
  const acrossDist = across * HEX_CELL;

  return [
    cx + ux * radialDist + rx * acrossDist,
    cy + uy * radialDist + ry * acrossDist,
  ];
}

/**
 * Compute [x, y, armIdx, across, row] for each of the 78 outer track cells.
 */
export function getCircularTrackCells(boardY) {
  const cells = [];
  for (let arm = 0; arm < 6; arm++) {
    const prevArm = (arm + 5) % 6;
    // 0..4: arm's clockwise-side cells moving inward (across = +1, row = 4..0)
    for (let r = 4; r >= 0; r--) {
      const [x, y] = armCellToCanvas(arm, 1, r, boardY);
      cells.push({ x, y, arm, across: 1, row: r });
    }
    // 5..10: next arm's counter-clockwise-side cells moving outward (across = -1, row = 0..5)
    const nextArm = (arm + 1) % 6;
    for (let r = 0; r <= 5; r++) {
      const [x, y] = armCellToCanvas(nextArm, -1, r, boardY);
      cells.push({ x, y, arm: nextArm, across: -1, row: r });
    }
    // 11: next arm's outer middle cell (across = 0, row = 5)
    {
      const [x, y] = armCellToCanvas(nextArm, 0, 5, boardY);
      cells.push({ x, y, arm: nextArm, across: 0, row: 5 });
    }
    // 12: next arm's outer clockwise corner (across = +1, row = 5)
    {
      const [x, y] = armCellToCanvas(nextArm, 1, 5, boardY);
      cells.push({ x, y, arm: nextArm, across: 1, row: 5 });
    }
    void prevArm;
  }
  return cells;
}

export function getCircularTrackCoords(boardY) {
  return getCircularTrackCells(boardY).map((c) => [c.x, c.y]);
}

/**
 * Each player's triangular home yard sits in the wedge between arm k and arm k+1?
 * Wait: arm k has player k's final lane! In the screenshot, player k's triangular yard
 * is immediately clockwise of arm k (at angle getArmAngle(k) + 30°).
 */
export function getTriangularYardGeometry(color, boardY) {
  const { cx, cy } = getCircularCenter(boardY);
  const idx = CIRCULAR_PLAYER_ORDER.indexOf(color);
  const midAngle = getArmAngle(idx) + (30 * Math.PI) / 180;
  const ux = Math.cos(midAngle);
  const uy = Math.sin(midAngle);
  const rx = -uy;
  const ry = ux;

  // Inner apex of triangle sits at the hexagon vertex, outer base sits at the outer arm corners
  const innerR = HEX_ARM_WIDTH + 6;
  const outerR = HEX_INNER_DIST + 6 * HEX_CELL + 2;
  const halfBase = 104;

  const apex = [cx + ux * innerR, cy + uy * innerR];
  const baseLeft = [cx + ux * outerR - rx * halfBase, cy + uy * outerR - ry * halfBase];
  const baseRight = [cx + ux * outerR + rx * halfBase, cy + uy * outerR + ry * halfBase];
  const center = [cx + ux * (innerR + (outerR - innerR) * 0.62), cy + uy * (innerR + (outerR - innerR) * 0.62)];

  return { apex, baseLeft, baseRight, center, midAngle, ux, uy, rx, ry };
}

export function getCircularHomeCenter(color, boardY) {
  return getTriangularYardGeometry(color, boardY).center;
}

export function getCircularHomeSlots(color, boardY) {
  const { center, ux, uy, rx, ry } = getTriangularYardGeometry(color, boardY);
  const [hx, hy] = center;
  // 1-2-1 or 2x2 pyramid inside the triangular yard matching the screenshot!
  return [
    [hx - ux * 24, hy - uy * 24],
    [hx - rx * 20 + ux * 2, hy - ry * 20 + uy * 2],
    [hx + rx * 20 + ux * 2, hy + ry * 20 + uy * 2],
    [hx + ux * 22, hy + uy * 22],
  ];
}

export function getCircularFinalLaneCoords(color, boardY) {
  const armIdx = CIRCULAR_PLAYER_ORDER.indexOf(color);
  const cells = [];
  // 5 cells moving inward from row 4 down to row 0
  for (let r = 4; r >= 0; r--) {
    cells.push(armCellToCanvas(armIdx, 0, r, boardY));
  }
  return cells;
}

export function getCircularFinishPos(color, boardY) {
  const { cx, cy } = getCircularCenter(boardY);
  const armIdx = CIRCULAR_PLAYER_ORDER.indexOf(color);
  const angle = getArmAngle(armIdx);
  return [cx + Math.cos(angle) * 44, cy + Math.sin(angle) * 44];
}

export function getCircularPawnCanvasPos(color, pawnIndex, progress, inHome, intruderLane, boardY) {
  if (inHome || progress == null) {
    return getCircularHomeSlots(color, boardY)[pawnIndex];
  }
  if (intruderLane) {
    return getCircularFinalLaneCoords(intruderLane.ownerColor, boardY)[intruderLane.depth - 1];
  }
  if (progress <= CIRCULAR_OUTER_MAX) {
    const raw = (CIRCULAR_START_INDEX[color] + progress) % CIRCULAR_TRACK_LENGTH;
    const trackIdx = (raw + CIRCULAR_TRACK_LENGTH) % CIRCULAR_TRACK_LENGTH;
    return getCircularTrackCoords(boardY)[trackIdx];
  }
  if (progress < CIRCULAR_FINISH_PROGRESS) {
    return getCircularFinalLaneCoords(color, boardY)[progress - (CIRCULAR_OUTER_MAX + 1)];
  }
  return getCircularFinishPos(color, boardY);
}

export { COLORS, FINAL_LANE_LENGTH };
