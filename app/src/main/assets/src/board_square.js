// Pure 15x15 square cross-shaped Ludo board geometry.
// Maps track indices (0..51), final lanes, home slots, and center finish to (col, row) grid cells.

import { FINISH_PROGRESS, TRACK_LENGTH } from './constants.js';

export const GRID_SIZE = 15;

// 52-cell clockwise outer track around the 15x15 cross
export const OUTER_TRACK = [
  [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],       // 0..4  (0 = Red start)
  [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0], // 5..10
  [7, 0],                                         // 11
  [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], // 12..17 (13 = Green start)
  [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6], // 18..23
  [14, 7],                                        // 24
  [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8], // 25..30 (26 = Yellow start)
  [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14], // 31..36
  [7, 14],                                        // 37
  [6, 14], [6, 13], [6, 12], [6, 11], [6, 10], [6, 9], // 38..43 (39 = Blue start)
  [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8], // 44..49
  [0, 7],                                         // 50
  [0, 6],                                         // 51
];

export const START_TRACK_INDEX = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

// Classic Ludo star safe spaces (8 steps ahead of each player's start)
export const STAR_TRACK_INDICES = [8, 21, 34, 47];

// All safe outer-track spaces: 4 stars + 4 colored starting spaces
export const SAFE_TRACK_INDICES = [
  ...STAR_TRACK_INDICES,
  ...Object.values(START_TRACK_INDEX),
];

export const FINAL_LANES = {
  red:    [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  green:  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  yellow: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
  blue:   [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
};

export const FINISH_CENTERS = {
  red:    [6.35, 7],
  green:  [7, 6.35],
  yellow: [7.65, 7],
  blue:   [7, 7.65],
};

// 4 home pawn slots inside each 6x6 corner yard (centered in the inner 4x4 white box)
export const HOME_SLOTS = {
  red:    [[1.8, 1.8], [3.2, 1.8], [1.8, 3.2], [3.2, 3.2]],
  green:  [[10.8, 1.8], [12.2, 1.8], [10.8, 3.2], [12.2, 3.2]],
  yellow: [[10.8, 10.8], [12.2, 10.8], [10.8, 12.2], [12.2, 12.2]],
  blue:   [[1.8, 10.8], [3.2, 10.8], [1.8, 12.2], [3.2, 12.2]],
};

// Corner yard bounding boxes (col, row, w, h)
export const HOME_YARDS = {
  red:    { col: 0, row: 0, w: 6, h: 6 },
  green:  { col: 9, row: 0, w: 6, h: 6 },
  yellow: { col: 9, row: 9, w: 6, h: 6 },
  blue:   { col: 0, row: 9, w: 6, h: 6 },
};

/**
 * Convert a pawn's (color, pawnIndex, progress, inHome, intruderLane) to fractional grid coordinates [col, row].
 */
export function getPawnGridPos(color, pawnIndex, progress, inHome = false, intruderLane = null) {
  if (inHome || progress == null) {
    return HOME_SLOTS[color][pawnIndex];
  }
  if (intruderLane) {
    return FINAL_LANES[intruderLane.ownerColor][intruderLane.depth - 1];
  }
  if (progress <= 50) {
    const raw = (START_TRACK_INDEX[color] + progress) % TRACK_LENGTH;
    const trackIdx = (raw + TRACK_LENGTH) % TRACK_LENGTH;
    return OUTER_TRACK[trackIdx];
  }
  if (progress < FINISH_PROGRESS) {
    return FINAL_LANES[color][progress - 51];
  }
  return FINISH_CENTERS[color];
}
