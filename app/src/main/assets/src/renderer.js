// Polished Art Pass Canvas renderer for Ludo Revolution (Step 2).
// Features royal blue geometric background asset, gold-bordered board & buttons,
// glossy 3D pawns, golden star safe spaces, and 3D-shaded per-player dice boxes.

import { COLORS, GAME_WIDTH, GAME_HEIGHT } from './constants.js';
import {
  FINAL_LANES,
  GRID_SIZE,
  HOME_SLOTS,
  HOME_YARDS,
  OUTER_TRACK,
  STAR_TRACK_INDICES,
  START_TRACK_INDEX,
  getPawnGridPos,
} from './board_square.js';
import {
  CIRCULAR_PLAYER_ORDER,
  CIRCULAR_STAR_INDICES,
  CIRCULAR_START_INDEX,
  CIRCULAR_TRACK_LENGTH,
  HEX_ARM_WIDTH,
  HEX_CELL,
  armCellToCanvas,
  getArmAngle,
  getCircularCenter,
  getCircularFinalLaneCoords,
  getCircularHomeCenter,
  getCircularHomeSlots,
  getCircularPawnCanvasPos,
  getCircularTrackCells,
  getTriangularYardGeometry,
} from './board_circular.js';
import { getActiveColors, getCurrentPlayer, getPlayerRanks } from './engine.js';

function formatRankLabel(rank, finished = false) {
  const ord = rank === 1 ? '1er' : `${rank}e`;
  if (!finished) return ord;
  if (rank === 1) return `🥇 ${ord}`;
  if (rank === 2) return `🥈 ${ord}`;
  if (rank === 3) return `🥉 ${ord}`;
  return ord;
}

function drawColorRankPill(ctx, cx, cy, rank, finished, large = false) {
  const text = formatRankLabel(rank, finished);
  const w = large ? 128 : (finished ? 86 : 62);
  const h = large ? 44 : 26;
  const r = large ? 16 : 11;
  const borderColor = finished
    ? (rank === 1 ? '#FACC15' : rank === 2 ? '#E2E8F0' : rank === 3 ? '#F59E0B' : '#94A3B8')
    : 'rgba(248, 250, 252, 0.55)';
  const textColor = finished
    ? (rank === 1 ? '#FDE047' : rank === 2 ? '#F8FAFC' : rank === 3 ? '#FDBA74' : '#E2E8F0')
    : '#F8FAFC';

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = large ? 10 : 5;
  ctx.fillStyle = finished ? 'rgba(15, 23, 42, 0.92)' : 'rgba(15, 23, 42, 0.78)';
  drawRoundedRect(ctx, cx - w / 2, cy - h / 2, w, h, r);
  ctx.fill();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = finished ? 2.4 : 1.4;
  ctx.stroke();

  ctx.fillStyle = textColor;
  ctx.font = large ? '900 22px system-ui, sans-serif' : 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy + 1);
  ctx.restore();
}

export const BOARD_SIZE = 660;
export const BOARD_X = (GAME_WIDTH - BOARD_SIZE) / 2; // 30
export const CELL_SIZE = BOARD_SIZE / GRID_SIZE; // 44

export const DICE_BOX_W = 240;
export const DICE_BOX_H = 104;
export const DICE_SIZE = 84;

export function getDiceBoxForColor(color, boardY, boardType = 'square') {
  if (boardType === 'circular') {
    const idx = CIRCULAR_PLAYER_ORDER.indexOf(color);
    const { cx, cy } = getCircularCenter(boardY);
    const midAngle = getArmAngle(idx) + (30 * Math.PI) / 180;
    const dist = 326;
    const size = 84;
    const bx = cx + Math.cos(midAngle) * dist - size / 2;
    const by = cy + Math.sin(midAngle) * dist - size / 2;
    return { x: bx, y: by, w: size, h: size, compact: true, radial: true };
  }

  const topY = Math.max(18, boardY - DICE_BOX_H - 20);
  const bottomY = boardY + BOARD_SIZE + 20;
  switch (color) {
    case 'red':
      return { x: BOARD_X, y: topY, w: DICE_BOX_W, h: DICE_BOX_H, diceSide: 'right' };
    case 'green':
      return { x: BOARD_X + BOARD_SIZE - DICE_BOX_W, y: topY, w: DICE_BOX_W, h: DICE_BOX_H, diceSide: 'left' };
    case 'blue':
      return { x: BOARD_X, y: bottomY, w: DICE_BOX_W, h: DICE_BOX_H, diceSide: 'right' };
    case 'yellow':
    default:
      return { x: BOARD_X + BOARD_SIZE - DICE_BOX_W, y: bottomY, w: DICE_BOX_W, h: DICE_BOX_H, diceSide: 'left' };
  }
}

export function getDiceRectForColor(color, boardY, boardType = 'square') {
  const box = getDiceBoxForColor(color, boardY, boardType);
  if (box.radial) {
    const pad = 6;
    return {
      x: box.x + pad,
      y: box.y + pad,
      w: box.w - pad * 2,
      h: box.h - pad * 2,
    };
  }
  const size = box.compact ? 70 : DICE_SIZE;
  const pad = (box.h - size) / 2;
  const dx = box.diceSide === 'right' ? box.x + box.w - size - pad : box.x + pad;
  return {
    x: dx,
    y: box.y + pad,
    w: size,
    h: size,
  };
}

export const CHOICE_BTN_BACKWARD = {
  x: 64,
  y: 1020,
  w: 280,
  h: 96,
};

export const CHOICE_BTN_FORWARD = {
  x: 376,
  y: 1020,
  w: 280,
  h: 96,
};

export const AUDIO_BTN_RECT = {
  x: 546,
  y: 1152,
  w: 150,
  h: 96,
};

export const CODE_BTN_IN_GAME = {
  x: 364,
  y: 1152,
  w: 168,
  h: 96,
};

export const SAVE_BTN_IN_GAME = {
  x: 190,
  y: 1152,
  w: 160,
  h: 96,
};

export const MENU_BTN_IN_GAME = {
  x: 24,
  y: 1152,
  w: 152,
  h: 96,
};

export const MENU_TOP_BUTTONS = {
  profile:  { x: 32, y: 34, w: 220, h: 96 },
  settings: { x: 584, y: 34, w: 104, h: 96 },
};

export const MENU_BUTTONS = {
  saves:       { x: 110, y: 520, w: 500, h: 98, label: '💾  SAUVEGARDES', fill: '#D97706' },
  vsAi:        { x: 110, y: 642, w: 500, h: 98, label: '🤖  VS ORDINATEUR', fill: '#2563EB' },
  localMulti:  { x: 110, y: 764, w: 500, h: 98, label: '👥  MULTIJOUEUR LOCAL', fill: '#DC2626' },
  leaderboard: { x: 110, y: 896, w: 240, h: 96, label: '🏆 CLASSEMENT', fill: '#059669' },
  audio:       { x: 370, y: 896, w: 240, h: 96, fill: '#1E3A8A' },
  joinCode:    { x: 110, y: 1018, w: 500, h: 96, label: '🔗  CODE À DISTANCE', fill: '#7C3AED' },
};

export const SAVES_BACK_BTN = { x: 180, y: 1060, w: 360, h: 96 };
export function getSaveRowRect(idx) {
  return { x: 68, y: 230 + idx * 108, w: 474, h: 96 };
}
export function getSaveDeleteRect(idx) {
  return { x: 556, y: 230 + idx * 108, w: 96, h: 96 };
}

export const LEAVE_MATCH_BUTTONS = {
  saveAndReturn:   { x: 110, y: 500, w: 500, h: 96 },
  deleteAndReturn: { x: 110, y: 618, w: 500, h: 96 },
  cancel:          { x: 110, y: 736, w: 500, h: 96 },
};

export const PROFILE_BACK_BTN = { x: 180, y: 1040, w: 360, h: 96 };

export const SETTINGS_BUTTONS = {
  music:    { x: 110, y: 340, w: 500, h: 96 },
  sfx:      { x: 110, y: 466, w: 500, h: 96 },
  haptics:  { x: 110, y: 592, w: 500, h: 96 },
  speed:    { x: 110, y: 718, w: 500, h: 96 },
  back:     { x: 180, y: 1040, w: 360, h: 96 },
};

export const SETUP_BUTTONS = {
  players: [2, 3, 4, 5, 6].map((n, i) => ({
    value: n,
    x: 68 + i * 118,
    y: 380,
    w: 104,
    h: 104,
  })),
  aiCounts: [],
  start: { x: 110, y: 830, w: 500, h: 108 },
  back:  { x: 180, y: 980, w: 360, h: 96 },
};

export function getSetupColorButtons(playerCount) {
  const colors = getActiveColors(playerCount);
  const w = 96;
  const gap = 14;
  const totalW = colors.length * w + (colors.length - 1) * gap;
  const startX = (GAME_WIDTH - totalW) / 2;
  return colors.map((color, i) => ({
    color,
    x: startX + i * (w + gap),
    y: 610,
    w,
    h: 96,
  }));
}

export const LEADERBOARD_BACK_BTN = { x: 180, y: 1060, w: 360, h: 96 };

export const VICTORY_BUTTONS = {
  continueSeries: { x: 86, y: 740, w: 264, h: 96 },
  resetZero:      { x: 370, y: 740, w: 264, h: 96 },
  menu:           { x: 210, y: 856, w: 300, h: 96 },
};

function drawStar(ctx, cx, cy, outerR, innerR) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawGlossyPawn(ctx, x, y, scale, palette, isCaptured) {
  const baseR = CELL_SIZE * 0.36 * scale;
  const bodyH = CELL_SIZE * 0.56 * scale;
  const headR = baseR * 0.58;
  const headY = y - bodyH * 0.72;

  // 1. Soft drop shadow under base
  ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
  ctx.beginPath();
  ctx.ellipse(x, y + baseR * 0.28, baseR * 1.05, baseR * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Circular base rim
  const baseGrad = ctx.createRadialGradient(
    x - baseR * 0.25,
    y - baseR * 0.25,
    baseR * 0.1,
    x,
    y,
    baseR
  );
  baseGrad.addColorStop(0, palette.light);
  baseGrad.addColorStop(0.55, palette.fill);
  baseGrad.addColorStop(1, palette.dark);

  ctx.fillStyle = baseGrad;
  ctx.beginPath();
  ctx.ellipse(x, y + baseR * 0.08, baseR, baseR * 0.78, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = isCaptured ? '#0F172A' : '#FFFFFF';
  ctx.lineWidth = isCaptured ? 2 : 2.2;
  ctx.stroke();

  // 3. Tapered 3D cone body
  const coneGrad = ctx.createLinearGradient(x - baseR * 0.7, y, x + baseR * 0.7, y);
  coneGrad.addColorStop(0, palette.dark);
  coneGrad.addColorStop(0.35, palette.light);
  coneGrad.addColorStop(0.6, palette.fill);
  coneGrad.addColorStop(1, palette.dark);

  ctx.fillStyle = coneGrad;
  ctx.beginPath();
  ctx.moveTo(x - baseR * 0.62, y + baseR * 0.04);
  ctx.quadraticCurveTo(x - headR * 0.65, headY + headR * 0.5, x - headR * 0.58, headY);
  ctx.lineTo(x + headR * 0.58, headY);
  ctx.quadraticCurveTo(x + headR * 0.65, headY + headR * 0.5, x + baseR * 0.62, y + baseR * 0.04);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = palette.dark;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // 4. Glossy spherical head
  const headGrad = ctx.createRadialGradient(
    x - headR * 0.35,
    headY - headR * 0.35,
    headR * 0.1,
    x,
    headY,
    headR
  );
  headGrad.addColorStop(0, '#FFFFFF');
  headGrad.addColorStop(0.28, palette.light);
  headGrad.addColorStop(0.68, palette.fill);
  headGrad.addColorStop(1, palette.dark);

  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(x, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = palette.dark;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // 5. Crisp white specular highlight on head
  ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
  ctx.beginPath();
  ctx.ellipse(x - headR * 0.32, headY - headR * 0.34, headR * 0.28, headR * 0.16, -0.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function makeGoldGradient(ctx, x, y, w, h) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, '#FEF08A');
  g.addColorStop(0.35, '#FACC15');
  g.addColorStop(0.7, '#D97706');
  g.addColorStop(1, '#FDE047');
  return g;
}

function drawDicePips(ctx, cx, cy, size, value, dimmed = false) {
  const offset = size * 0.26;
  const r = size * 0.088;
  const pips = {
    1: [[0, 0]],
    2: [[-offset, -offset], [offset, offset]],
    3: [[-offset, -offset], [0, 0], [offset, offset]],
    4: [[-offset, -offset], [offset, -offset], [-offset, offset], [offset, offset]],
    5: [[-offset, -offset], [offset, -offset], [0, 0], [-offset, offset], [offset, offset]],
    6: [[-offset, -offset], [offset, -offset], [-offset, 0], [offset, 0], [-offset, offset], [offset, offset]],
  };

  ctx.fillStyle = dimmed ? '#334155' : '#0F172A';
  for (const [dx, dy] of pips[value] || pips[1]) {
    ctx.beginPath();
    ctx.arc(cx + dx, cy + dy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function gridToPixel(col, row, boardY) {
  return {
    x: BOARD_X + (col + 0.5) * CELL_SIZE,
    y: boardY + (row + 0.5) * CELL_SIZE,
  };
}

export function getCellPixelPos(boardType, color, pawnIndex, progress, inHome, intruderLane, boardY) {
  if (boardType === 'circular') {
    const [x, y] = getCircularPawnCanvasPos(color, pawnIndex, progress, inHome, intruderLane, boardY);
    return { x, y };
  }
  const [col, row] = getPawnGridPos(color, pawnIndex, progress, inHome, intruderLane);
  return gridToPixel(col, row, boardY);
}

export function getPawnScreenPositions(state, animState, boardY) {
  const positions = new Map();
  const cellGroups = new Map();
  const prisonGroups = new Map();
  const isCircular = state.board?.type === 'circular';

  for (const player of state.players) {
    for (const pawn of player.pawns) {
      const key = `${pawn.color}-${pawn.id}`;
      if (animState && animState.key === key) {
        positions.set(key, {
          x: animState.px,
          y: animState.py - animState.hopHeight,
          scale: isCircular ? 0.85 : 1.15,
          captured: false,
        });
        continue;
      }

      if (pawn.capturedBy != null) {
        if (!prisonGroups.has(pawn.capturedBy)) prisonGroups.set(pawn.capturedBy, []);
        prisonGroups.get(pawn.capturedBy).push({ key });
        continue;
      }

      const pt = getCellPixelPos(
        state.board?.type || 'square',
        pawn.color,
        pawn.id,
        pawn.progress,
        pawn.inHome,
        pawn.intruderLane,
        boardY
      );
      const cellKey = `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
      if (!cellGroups.has(cellKey)) cellGroups.set(cellKey, []);
      cellGroups.get(cellKey).push({ key, x: pt.x, y: pt.y });
    }
  }

  for (const group of cellGroups.values()) {
    const count = group.length;
    group.forEach((item, idx) => {
      const baseScale = isCircular ? 0.72 : 1;
      if (count === 1) {
        positions.set(item.key, { x: item.x, y: item.y, scale: baseScale, captured: false });
      } else {
        const angle = (idx / count) * Math.PI * 2;
        const spread = isCircular ? 6 : 8;
        positions.set(item.key, {
          x: item.x + Math.cos(angle) * spread,
          y: item.y + Math.sin(angle) * spread,
          scale: baseScale * 0.82,
          captured: false,
        });
      }
    });
  }

  for (const [capturerColor, list] of prisonGroups.entries()) {
    if (isCircular) {
      const [hx, hy] = getCircularHomeCenter(capturerColor, boardY);
      list.forEach((item, idx) => {
        positions.set(item.key, {
          x: hx - 22 + (idx % 4) * 15,
          y: hy + 48,
          scale: 0.48,
          captured: true,
        });
      });
    } else {
      const yard = HOME_YARDS[capturerColor];
      if (!yard) continue;
      const baseX = BOARD_X + (yard.col + 1.25) * CELL_SIZE;
      const baseY = boardY + (yard.row + 5.38) * CELL_SIZE;
      list.forEach((item, idx) => {
        positions.set(item.key, {
          x: baseX + (idx % 6) * (CELL_SIZE * 0.68),
          y: baseY,
          scale: 0.62,
          captured: true,
        });
      });
    }
  }

  return positions;
}

function renderCircularBoard(ctx, state, boardY, artAssets, rankByColor = null) {
  const { cx, cy } = getCircularCenter(boardY);

  // 1. Triangular home yards in each of the 6 wedges
  for (const color of CIRCULAR_PLAYER_ORDER) {
    const tri = getTriangularYardGeometry(color, boardY);
    const palette = COLORS[color];

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = palette.fill;
    ctx.beginPath();
    ctx.moveTo(tri.apex[0], tri.apex[1]);
    ctx.lineTo(tri.baseLeft[0], tri.baseLeft[1]);
    ctx.lineTo(tri.baseRight[0], tri.baseRight[1]);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    // Inner white triangle
    const inset = 0.22;
    const lerpPt = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const inApex = lerpPt(tri.apex, tri.center, inset);
    const inLeft = lerpPt(tri.baseLeft, tri.center, inset);
    const inRight = lerpPt(tri.baseRight, tri.center, inset);

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(inApex[0], inApex[1]);
    ctx.lineTo(inLeft[0], inLeft[1]);
    ctx.lineTo(inRight[0], inRight[1]);
    ctx.closePath();
    ctx.fill();

    // 4 home slot circles
    for (const [sx, sy] of getCircularHomeSlots(color, boardY)) {
      ctx.fillStyle = palette.light;
      ctx.beginPath();
      ctx.arc(sx, sy, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = palette.fill;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    const rInfo = rankByColor?.get(color);
    if (rInfo && rInfo.finished) {
      drawColorRankPill(ctx, tri.center[0], tri.center[1], rInfo.rank, true, true);
    }
  }

  // Helper to draw a rotated square cell on arm `armIdx`
  function drawArmCell(x, y, armIdx, fill, stroke = '#94A3B8', lw = 1.4) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(getArmAngle(armIdx));
    ctx.fillStyle = fill;
    ctx.fillRect(-HEX_CELL / 2, -HEX_CELL / 2, HEX_CELL, HEX_CELL);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.strokeRect(-HEX_CELL / 2, -HEX_CELL / 2, HEX_CELL, HEX_CELL);
    ctx.restore();
  }

  // 2. 78 outer track cells on the 6 rotated 3x6 arms
  const trackCells = getCircularTrackCells(boardY);
  for (let i = 0; i < CIRCULAR_TRACK_LENGTH; i++) {
    const cell = trackCells[i];
    let startColor = null;
    for (const color of CIRCULAR_PLAYER_ORDER) {
      if (CIRCULAR_START_INDEX[color] === i) startColor = color;
    }
    drawArmCell(
      cell.x,
      cell.y,
      cell.arm,
      startColor ? COLORS[startColor].fill : '#FFFFFF',
      startColor ? '#FFFFFF' : '#94A3B8',
      1.4
    );

    if (CIRCULAR_STAR_INDICES.includes(i)) {
      if (artAssets?.star) {
        ctx.drawImage(artAssets.star, cell.x - 11, cell.y - 11, 22, 22);
      } else {
        drawStar(ctx, cell.x, cell.y, 10, 4.5);
        ctx.fillStyle = '#FACC15';
        ctx.fill();
      }
    }
  }

  // 3. 6 radial final lanes (5 cells each)
  for (let armIdx = 0; armIdx < 6; armIdx++) {
    const color = CIRCULAR_PLAYER_ORDER[armIdx];
    const laneCells = getCircularFinalLaneCoords(color, boardY);
    for (const [lx, ly] of laneCells) {
      drawArmCell(lx, ly, armIdx, COLORS[color].fill, '#FFFFFF', 1.4);
    }
    // Outer middle entry arrow
    const [ax, ay] = armCellToCanvas(armIdx, 0, 5, boardY);
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(getArmAngle(armIdx));
    ctx.fillStyle = COLORS[color].fill;
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('←', 0, 0);
    ctx.restore();
  }

  // 4. Central 6-colored finishing hexagon
  for (let armIdx = 0; armIdx < 6; armIdx++) {
    const color = CIRCULAR_PLAYER_ORDER[armIdx];
    const a0 = getArmAngle(armIdx) - Math.PI / 6;
    const a1 = getArmAngle(armIdx) + Math.PI / 6;
    const r = HEX_ARM_WIDTH;
    ctx.fillStyle = COLORS[color].fill;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r);
    ctx.lineTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Inner gold-rimmed center badge
  ctx.fillStyle = '#1E1B4B';
  ctx.beginPath();
  ctx.arc(cx, cy, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 3;
  ctx.stroke();
  if (artAssets?.star) {
    ctx.drawImage(artAssets.star, cx - 20, cy - 20, 40, 40);
  }
}

function drawGoldButton(ctx, rect, fill, label, textColor = '#FFFFFF', fontSize = 26) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = fill;
  drawRoundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 24);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = makeGoldGradient(ctx, rect.x, rect.y, rect.w, rect.h);
  ctx.lineWidth = 4;
  drawRoundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 24);
  ctx.stroke();

  ctx.fillStyle = textColor;
  ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.restore();
}

function drawBackdrop(ctx, artAssets) {
  if (artAssets?.bg) {
    ctx.drawImage(artAssets.bg, 0, 0, GAME_WIDTH, GAME_HEIGHT);
  } else {
    const bgGrad = ctx.createRadialGradient(GAME_WIDTH / 2, GAME_HEIGHT * 0.42, 80, GAME_WIDTH / 2, GAME_HEIGHT * 0.5, 760);
    bgGrad.addColorStop(0, '#1D4ED8');
    bgGrad.addColorStop(0.55, '#1E3A8A');
    bgGrad.addColorStop(1, '#0B1530');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }
}

function drawTitleHeader(ctx, artAssets) {
  if (artAssets?.star) {
    ctx.drawImage(artAssets.star, GAME_WIDTH / 2 - 40, 152, 80, 80);
  }
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 54px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillText('LUDO', GAME_WIDTH / 2 + 3, 274);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('LUDO', GAME_WIDTH / 2, 270);

  ctx.font = '900 48px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillText('REVOLUTION', GAME_WIDTH / 2 + 3, 334);
  ctx.fillStyle = '#FACC15';
  ctx.fillText('REVOLUTION', GAME_WIDTH / 2, 330);
  ctx.font = '600 20px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.fillText('Créé par Sébastien Houeto', GAME_WIDTH / 2, 382);
  ctx.restore();

  // Decorative glossy pawns row
  const demoColors = ['red', 'green', 'yellow', 'blue', 'purple', 'orange'];
  demoColors.forEach((c, i) => {
    drawGlossyPawn(ctx, 160 + i * 80, 446, 1.25, COLORS[c], false);
  });
}

export function renderMenuScreen(ctx, ui) {
  const { artAssets, audioMuted, savedGamesCount, profile } = ui;
  drawBackdrop(ctx, artAssets);

  // Top bar: Profile (left), Coins (center), Settings gear (right)
  drawGoldButton(
    ctx,
    MENU_TOP_BUTTONS.profile,
    'rgba(30, 27, 75, 0.9)',
    `👤 Niv. ${profile?.level || 1}`,
    '#FFFFFF',
    22
  );

  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  drawRoundedRect(ctx, 272, 46, 290, 72, 22);
  ctx.fill();
  ctx.strokeStyle = makeGoldGradient(ctx, 272, 46, 290, 72);
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#FACC15';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`🪙  ${profile?.coins ?? 100}`, 417, 82);
  ctx.restore();

  drawGoldButton(ctx, MENU_TOP_BUTTONS.settings, 'rgba(30, 27, 75, 0.9)', '⚙️', '#FACC15', 34);

  drawTitleHeader(ctx, artAssets);

  const savesLabel = savedGamesCount > 0 ? `💾  SAUVEGARDES (${savedGamesCount})` : '💾  SAUVEGARDES';
  drawGoldButton(ctx, MENU_BUTTONS.saves, MENU_BUTTONS.saves.fill, savesLabel);
  drawGoldButton(ctx, MENU_BUTTONS.vsAi, MENU_BUTTONS.vsAi.fill, MENU_BUTTONS.vsAi.label);
  drawGoldButton(ctx, MENU_BUTTONS.localMulti, MENU_BUTTONS.localMulti.fill, MENU_BUTTONS.localMulti.label);
  drawGoldButton(ctx, MENU_BUTTONS.leaderboard, MENU_BUTTONS.leaderboard.fill, MENU_BUTTONS.leaderboard.label, '#FFFFFF', 22);
  drawGoldButton(
    ctx,
    MENU_BUTTONS.audio,
    audioMuted ? '#334155' : MENU_BUTTONS.audio.fill,
    audioMuted ? '🔇 MUET' : '🔊 SON',
    '#FFFFFF',
    22
  );
  drawGoldButton(ctx, MENU_BUTTONS.joinCode, MENU_BUTTONS.joinCode.fill, MENU_BUTTONS.joinCode.label, '#FFFFFF', 24);
}

function formatDateTime(ts) {
  const d = new Date(ts || Date.now());
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} • ${hh}:${min}`;
}

export function renderSavesScreen(ctx, ui) {
  const { artAssets, savedGames } = ui;
  drawBackdrop(ctx, artAssets);

  ctx.save();
  ctx.fillStyle = '#FACC15';
  ctx.font = '900 40px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('💾  MES SAUVEGARDES', GAME_WIDTH / 2, 140);

  if (!savedGames || savedGames.length === 0) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    drawRoundedRect(ctx, 84, 340, 552, 220, 26);
    ctx.fill();
    ctx.strokeStyle = makeGoldGradient(ctx, 84, 340, 552, 220);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText('Aucune partie enregistrée', GAME_WIDTH / 2, 450);
  } else {
    savedGames.slice(0, 7).forEach((g, idx) => {
      const r = getSaveRowRect(idx);
      const isOngoing = g.status === 'en_cours';

      ctx.fillStyle = isOngoing ? 'rgba(30, 58, 138, 0.92)' : 'rgba(15, 23, 42, 0.88)';
      drawRoundedRect(ctx, r.x, r.y, r.w, r.h, 20);
      ctx.fill();
      ctx.strokeStyle = isOngoing ? makeGoldGradient(ctx, r.x, r.y, r.w, r.h) : 'rgba(148, 163, 184, 0.45)';
      ctx.lineWidth = isOngoing ? 3 : 2;
      ctx.stroke();

      const modeText = g.aiCount > 0 ? `🤖 VS IA (${g.playerCount}J)` : `👥 LOCAL (${g.playerCount}J)`;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(modeText, r.x + 22, r.y + 32);

      ctx.fillStyle = '#94A3B8';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText(formatDateTime(g.savedAt), r.x + 22, r.y + 66);

      // Right status pill
      const badgeColor = isOngoing ? '#059669' : '#334155';
      const badgeText = isOngoing
        ? '▶ REPRENDRE'
        : `🏆 ${COLORS[g.winnerColor]?.label?.toUpperCase() || 'FINI'}`;
      ctx.fillStyle = badgeColor;
      drawRoundedRect(ctx, r.x + r.w - 166, r.y + 20, 150, 56, 14);
      ctx.fill();
      ctx.fillStyle = isOngoing ? '#FFFFFF' : '#FACC15';
      ctx.font = 'bold 17px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(badgeText, r.x + r.w - 91, r.y + 48);

      // Delete button for this saved game
      const del = getSaveDeleteRect(idx);