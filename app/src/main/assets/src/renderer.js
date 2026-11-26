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
  ctx.fillText('Créé par Sébøx De Londres', GAME_WIDTH / 2, 382);
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
      drawGoldButton(ctx, del, '#991B1B', '🗑️', '#FFFFFF', 28);
    });
  }
  ctx.restore();

  drawGoldButton(ctx, SAVES_BACK_BTN, 'rgba(30, 41, 59, 0.9)', '← RETOUR', '#CBD5E1', 24);
}

export function renderProfileScreen(ctx, ui) {
  const { artAssets, profile } = ui;
  drawBackdrop(ctx, artAssets);

  ctx.save();
  ctx.fillStyle = '#FACC15';
  ctx.font = '900 42px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('👤  PROFIL JOUEUR', GAME_WIDTH / 2, 160);

  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  drawRoundedRect(ctx, 84, 240, 552, 680, 28);
  ctx.fill();
  ctx.strokeStyle = makeGoldGradient(ctx, 84, 240, 552, 680);
  ctx.lineWidth = 4;
  ctx.stroke();

  const stats = [
    ['Niveau', `Niv. ${profile.level}`],
    ['Pièces', `🪙 ${profile.coins}`],
    ['Victoires', `🏆 ${profile.wins}`],
    ['Parties jouées', `🎲 ${profile.gamesPlayed}`],
    ['Captures', `⚔️ ${profile.captures}`],
  ];

  stats.forEach(([label, val], idx) => {
    const y = 310 + idx * 112;
    ctx.fillStyle = 'rgba(30, 41, 59, 0.78)';
    drawRoundedRect(ctx, 118, y, 484, 86, 18);
    ctx.fill();

    ctx.fillStyle = '#CBD5E1';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, 148, y + 43);

    ctx.fillStyle = '#FACC15';
    ctx.textAlign = 'right';
    ctx.fillText(val, 572, y + 43);
  });
  ctx.restore();

  drawGoldButton(ctx, PROFILE_BACK_BTN, 'rgba(30, 41, 59, 0.9)', '← RETOUR', '#CBD5E1', 24);
}

export function renderSettingsScreen(ctx, ui) {
  const { artAssets, prefs, animationSpeed } = ui;
  drawBackdrop(ctx, artAssets);

  ctx.save();
  ctx.fillStyle = '#FACC15';
  ctx.font = '900 42px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚙️  PARAMÈTRES', GAME_WIDTH / 2, 180);
  ctx.restore();

  drawGoldButton(
    ctx,
    SETTINGS_BUTTONS.music,
    prefs.musicEnabled ? '#059669' : '#334155',
    `🎵  MUSIQUE : ${prefs.musicEnabled ? 'ON' : 'OFF'}`,
    '#FFFFFF',
    26
  );
  drawGoldButton(
    ctx,
    SETTINGS_BUTTONS.sfx,
    prefs.sfxEnabled ? '#2563EB' : '#334155',
    `🔊  EFFETS SONORES : ${prefs.sfxEnabled ? 'ON' : 'OFF'}`,
    '#FFFFFF',
    26
  );
  drawGoldButton(
    ctx,
    SETTINGS_BUTTONS.haptics,
    prefs.hapticsEnabled ? '#D97706' : '#334155',
    `📳  VIBRATIONS : ${prefs.hapticsEnabled ? 'ON' : 'OFF'}`,
    '#FFFFFF',
    26
  );
  const speedLabel =
    animationSpeed <= 0.8 ? 'LENTE' :
    animationSpeed <= 1.2 ? 'NORMALE' :
    animationSpeed <= 1.7 ? 'RAPIDE' : 'TURBO';
  drawGoldButton(
    ctx,
    SETTINGS_BUTTONS.speed,
    '#1E3A8A',
    `⚡  VITESSE PIONS : ${speedLabel} (${animationSpeed.toFixed(1)}×)`,
    '#FFFFFF',
    24
  );

  drawGoldButton(ctx, SETTINGS_BUTTONS.back, 'rgba(30, 41, 59, 0.9)', '← RETOUR', '#CBD5E1', 24);
}

export function renderSetupScreen(ctx, ui) {
  const { artAssets, setupMode, playerCount, humanColor } = ui;
  drawBackdrop(ctx, artAssets);

  ctx.save();
  ctx.fillStyle = '#FACC15';
  ctx.font = '900 40px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(setupMode === 'ai' ? 'VS ORDINATEUR' : 'MULTIJOUEUR LOCAL', GAME_WIDTH / 2, 180);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText('NOMBRE DE JOUEURS', GAME_WIDTH / 2, 325);
  ctx.restore();

  for (const btn of SETUP_BUTTONS.players) {
    const active = playerCount === btn.value;
    drawGoldButton(
      ctx,
      btn,
      active ? '#2563EB' : 'rgba(15, 23, 42, 0.78)',
      String(btn.value),
      active ? '#FACC15' : '#CBD5E1',
      32
    );
  }

  if (setupMode === 'ai') {
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`MA COULEUR (1 VS ${playerCount - 1} IA)`, GAME_WIDTH / 2, 558);
    ctx.restore();

    const colorBtns = getSetupColorButtons(playerCount);
    const activeColor = colorBtns.some((b) => b.color === humanColor) ? humanColor : colorBtns[0].color;
    for (const btn of colorBtns) {
      const selected = btn.color === activeColor;
      ctx.save();
      ctx.fillStyle = selected ? COLORS[btn.color].fill : 'rgba(15, 23, 42, 0.78)';
      drawRoundedRect(ctx, btn.x, btn.y, btn.w, btn.h, 22);
      ctx.fill();
      ctx.strokeStyle = selected
        ? makeGoldGradient(ctx, btn.x, btn.y, btn.w, btn.h)
        : COLORS[btn.color].fill;
      ctx.lineWidth = selected ? 5 : 2.5;
      ctx.stroke();
      ctx.restore();

      drawGlossyPawn(ctx, btn.x + btn.w / 2, btn.y + btn.h / 2 + 12, selected ? 1.15 : 0.95, COLORS[btn.color], false);
    }
  }

  drawGoldButton(ctx, SETUP_BUTTONS.start, '#059669', '▶  LANCER LA PARTIE', '#FFFFFF', 28);
  drawGoldButton(ctx, SETUP_BUTTONS.back, 'rgba(30, 41, 59, 0.9)', '← RETOUR', '#CBD5E1', 24);
}

export function renderLeaderboardScreen(ctx, ui) {
  const { artAssets, leaderboard } = ui;
  drawBackdrop(ctx, artAssets);

  ctx.save();
  ctx.fillStyle = '#FACC15';
  ctx.font = '900 42px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🏆  CLASSEMENT', GAME_WIDTH / 2, 160);

  // Panel
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  drawRoundedRect(ctx, 64, 230, 592, 760, 26);
  ctx.fill();
  ctx.strokeStyle = makeGoldGradient(ctx, 64, 230, 592, 760);
  ctx.lineWidth = 3.5;
  ctx.stroke();

  if (leaderboard.loading) {
    ctx.fillStyle = '#CBD5E1';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText('Chargement...', GAME_WIDTH / 2, 580);
  } else if (!leaderboard.entries || leaderboard.entries.length === 0) {
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText('Aucun score enregistré', GAME_WIDTH / 2, 580);
  } else {
    leaderboard.entries.slice(0, 8).forEach((entry, i) => {
      const rowY = 275 + i * 84;
      ctx.fillStyle = i === 0 ? 'rgba(250, 204, 21, 0.16)' : 'rgba(30, 41, 59, 0.72)';
      drawRoundedRect(ctx, 90, rowY, 540, 68, 16);
      ctx.fill();

      ctx.fillStyle = i < 3 ? '#FACC15' : '#94A3B8';
      ctx.font = 'bold 26px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`#${i + 1}`, 114, rowY + 34);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(String(entry.username || 'Joueur').slice(0, 16), 186, rowY + 34);

      ctx.fillStyle = '#34D399';
      ctx.textAlign = 'right';
      ctx.fillText(`${entry.score} pts`, 606, rowY + 34);
    });
  }
  ctx.restore();

  drawGoldButton(ctx, LEADERBOARD_BACK_BTN, 'rgba(30, 41, 59, 0.9)', '← RETOUR', '#CBD5E1', 24);
}

export function renderGame(ctx, state, ui) {
  const {
    boardY,
    animState,
    diceAnim,
    selectedPawnId,
    captureFx,
    toastBanner,
    winnerColor,
    matchStandings,
    audioMuted,
    artAssets,
    time,
    mode,
  } = ui;
  const boardType = state.board?.type || 'square';
  const rankByColor = new Map();
  for (const r of getPlayerRanks(state, winnerColor)) {
    rankByColor.set(r.color, r);
  }

  // 1. Royal Blue Geometric Background (generated image asset + rich gradient fallback)
  drawBackdrop(ctx, artAssets);

  if (boardType === 'circular') {
    renderCircularBoard(ctx, state, boardY, artAssets, rankByColor);
  } else {

  // 2. Crisp dark-bordered Board Frame (matching reference photo)
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(BOARD_X - 4, boardY - 4, BOARD_SIZE + 8, BOARD_SIZE + 8);
  ctx.restore();

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(BOARD_X, boardY, BOARD_SIZE, BOARD_SIZE);

  // 3. Outer track cells
  for (let i = 0; i < OUTER_TRACK.length; i++) {
    const [col, row] = OUTER_TRACK[i];
    const x = BOARD_X + col * CELL_SIZE;
    const y = boardY + row * CELL_SIZE;

    let startColor = null;
    for (const [color, startIdx] of Object.entries(START_TRACK_INDEX)) {
      if (i === startIdx) startColor = color;
    }

    if (startColor) {
      ctx.fillStyle = COLORS[startColor].fill;
    } else {
      ctx.fillStyle = '#FFFFFF';
    }
    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);

    if (STAR_TRACK_INDICES.includes(i)) {
      drawStar(ctx, x + CELL_SIZE / 2, y + CELL_SIZE / 2, CELL_SIZE * 0.36, CELL_SIZE * 0.16);
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }
  }

  // Entry arrows on the 4 middle-arm outer cells (matching reference photo)
  const entryArrows = [
    { col: 0, row: 7, color: COLORS.red.fill, arrow: '→' },
    { col: 7, row: 0, color: COLORS.green.fill, arrow: '↓' },
    { col: 14, row: 7, color: COLORS.yellow.fill, arrow: '←' },
    { col: 7, row: 14, color: COLORS.blue.fill, arrow: '↑' },
  ];
  for (const ea of entryArrows) {
    const ax = BOARD_X + (ea.col + 0.5) * CELL_SIZE;
    const ay = boardY + (ea.row + 0.5) * CELL_SIZE;
    ctx.fillStyle = ea.color;
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ea.arrow, ax, ay + 1);
  }

  // 4. Final lanes
  for (const [color, cells] of Object.entries(FINAL_LANES)) {
    for (const [col, row] of cells) {
      const x = BOARD_X + col * CELL_SIZE;
      const y = boardY + row * CELL_SIZE;
      ctx.fillStyle = COLORS[color].fill;
      ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
    }
  }

  // 5. Center finishing triangles (6..9, 6..9)
  const cx = BOARD_X + 7.5 * CELL_SIZE;
  const cy = boardY + 7.5 * CELL_SIZE;
  const left = BOARD_X + 6 * CELL_SIZE;
  const right = BOARD_X + 9 * CELL_SIZE;
  const top = boardY + 6 * CELL_SIZE;
  const bottom = boardY + 9 * CELL_SIZE;

  const triangles = [
    { color: COLORS.red.fill, pts: [[left, top], [cx, cy], [left, bottom]] },
    { color: COLORS.green.fill, pts: [[left, top], [right, top], [cx, cy]] },
    { color: COLORS.yellow.fill, pts: [[right, top], [right, bottom], [cx, cy]] },
    { color: COLORS.blue.fill, pts: [[left, bottom], [right, bottom], [cx, cy]] },
  ];

  for (const tri of triangles) {
    ctx.fillStyle = tri.color;
    ctx.beginPath();
    ctx.moveTo(tri.pts[0][0], tri.pts[0][1]);
    ctx.lineTo(tri.pts[1][0], tri.pts[1][1]);
    ctx.lineTo(tri.pts[2][0], tri.pts[2][1]);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }

  // 6. Corner home yards (clean flat colors, sharp white inner box, PLAYER label & rank)
  const playerOrderLabels = { blue: 'PLAYER1', red: 'PLAYER2', green: 'PLAYER3', yellow: 'PLAYER4' };
  for (const [color, yard] of Object.entries(HOME_YARDS)) {
    const x = BOARD_X + yard.col * CELL_SIZE;
    const y = boardY + yard.row * CELL_SIZE;
    const w = yard.w * CELL_SIZE;
    const h = yard.h * CELL_SIZE;

    ctx.fillStyle = COLORS[color].fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Inner white yard box
    const pad = CELL_SIZE;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x + pad, y + pad, w - pad * 2, h - pad * 2);
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(x + pad, y + pad, w - pad * 2, h - pad * 2);

    // 4 home slot circles
    for (const [sc, sr] of HOME_SLOTS[color]) {
      const sp = gridToPixel(sc, sr, boardY);
      ctx.fillStyle = COLORS[color].fill;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, CELL_SIZE * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    const rInfo = rankByColor.get(color);
    const isBottomYard = color === 'blue' || color === 'yellow';
    const labelY = isBottomYard ? y + h - pad / 2 : y + pad / 2;
    const rankY = isBottomYard ? y + pad / 2 : y + h - pad / 2;

    if (rInfo) {
      // PLAYER1..4 label in outer margin
      ctx.save();
      ctx.font = '900 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#0F172A';
      const pLabel = playerOrderLabels[color] || COLORS[color].label.toUpperCase();
      ctx.strokeText(pLabel, x + w / 2, labelY + 1);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(pLabel, x + w / 2, labelY + 1);
      ctx.restore();

      drawColorRankPill(ctx, x + w / 2, rankY, rInfo.rank, rInfo.finished, false);
      if (rInfo.finished) {
        drawColorRankPill(ctx, x + w / 2, y + h / 2, rInfo.rank, true, true);
      }
    }
  }
  } // end square board

  const currentPlayer = getCurrentPlayer(state);
  const pulse = 0.5 + 0.5 * Math.sin(time * 8);

  // 6b. Capture opportunity indicator (backward, combo, or raid)
  if (mode === 'play' && !animState && state.phase === 'WAIT_MOVE') {
    for (const opt of state.legalMoves) {
      const isHighlight =
        opt.direction === 'backward' ||
        opt.direction === 'backward_combo' ||
        opt.direction === 'raid' ||
        opt.direction === 'raid_backward' ||
        (opt.direction === 'forward_combo' && opt.captures);
      if (!isHighlight) continue;
      const optIntruder = (opt.direction === 'raid' || opt.direction === 'raid_backward')
        ? { ownerColor: opt.ownerColor, depth: opt.depth, resumeProgress: opt.resumeProgress }
        : null;
      const pt = getCellPixelPos(boardType, currentPlayer.color, opt.pawnId, opt.toProgress, false, optIntruder, boardY);
      ctx.save();
      ctx.strokeStyle = '#FACC15';
      ctx.fillStyle = 'rgba(250, 204, 21, 0.28)';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, (boardType === 'circular' ? 16 : CELL_SIZE * 0.46) + pulse * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  // 6c. Destination choice rings when a pawn is selected (shows die value / combo sum)
  if (mode === 'play' && !animState && state.phase === 'WAIT_MOVE' && selectedPawnId != null) {
    const options = state.legalMoves.filter((m) => m.pawnId === selectedPawnId);
    for (const opt of options) {
      const optIntruder = (opt.direction === 'raid' || opt.direction === 'raid_backward')
        ? { ownerColor: opt.ownerColor, depth: opt.depth, resumeProgress: opt.resumeProgress }
        : null;
      const pt = getCellPixelPos(boardType, currentPlayer.color, selectedPawnId, opt.toProgress, false, optIntruder, boardY);
      const isBack = opt.direction === 'backward' || opt.direction === 'backward_combo' || opt.direction === 'raid_backward';
      const isCombo = opt.direction === 'forward_combo' || opt.direction === 'backward_combo';
      ctx.save();
      ctx.strokeStyle = isBack ? '#FACC15' : (isCombo ? '#38BDF8' : '#34D399');
      ctx.fillStyle = isBack ? 'rgba(250, 204, 21, 0.30)' : (isCombo ? 'rgba(56, 189, 248, 0.30)' : 'rgba(52, 211, 153, 0.28)');
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, (boardType === 'circular' ? 17 : CELL_SIZE * 0.48) + pulse * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (opt.diceSum != null) {
        ctx.fillStyle = '#0F172A';
        drawRoundedRect(ctx, pt.x - 13, pt.y - 24, 26, 18, 6);
        ctx.fill();
        ctx.strokeStyle = isBack ? '#FACC15' : '#38BDF8';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${opt.diceSum}`, pt.x, pt.y - 14);
      }
      ctx.restore();
    }
  }

  // 7. Pawns
  const pawnPositions = getPawnScreenPositions(state, animState, boardY);

  for (const player of state.players) {
    for (const pawn of player.pawns) {
      const key = `${pawn.color}-${pawn.id}`;
      const pos = pawnPositions.get(key);
      if (!pos) continue;

      const isTurnPlayer = mode === 'play' && player.color === currentPlayer.color && pawn.progress < (state.board?.finishProgress || 56);
      const isLegal =
        isTurnPlayer &&
        !animState &&
        state.phase === 'WAIT_MOVE' &&
        state.legalPawnIds.includes(pawn.id);

      const isSelected = isLegal && selectedPawnId === pawn.id;
      const turnBoost = isLegal ? (1.22 + pulse * 0.08) : (isTurnPlayer && !pos.captured ? 1.08 : 1.0);
      const drawScale = pos.scale * turnBoost;
      const radius = CELL_SIZE * 0.36 * drawScale;

      if (isLegal) {
        ctx.strokeStyle = isSelected ? '#FACC15' : '#FFFFFF';
        ctx.lineWidth = (isSelected ? 5 : 4) + pulse * 3;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius + 6 + pulse * 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      drawGlossyPawn(ctx, pos.x, pos.y, drawScale, COLORS[pawn.color], pos.captured);
    }
  }

  // 7b. Capture burst FX
  if (captureFx) {
    const p = captureFx.elapsed / captureFx.duration;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - p);
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 6 * (1 - p) + 2;
    ctx.beginPath();
    ctx.arc(captureFx.px, captureFx.py, CELL_SIZE * (0.4 + p * 1.4), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 8. Reference-photo style per-player corner dice pods (Play mode)
  if (mode === 'play') {
    for (const player of state.players) {
      const isTurn = player.color === currentPlayer.color;
      const palette = COLORS[player.color];
      const box = getDiceBoxForColor(player.color, boardY, boardType);
      const dieRect = getDiceRectForColor(player.color, boardY, boardType);
      const canRoll = isTurn && !player.isAi && !animState && !diceAnim && state.phase === 'WAIT_ROLL';

      ctx.save();

      if (!box.radial) {
        // Purple-blue wing + recessed dark die socket (matching reference photo)
        const wingGrad = ctx.createLinearGradient(box.x, box.y, box.x, box.y + box.h);
        wingGrad.addColorStop(0, '#3B82F6');
        wingGrad.addColorStop(0.55, '#4F46E5');
        wingGrad.addColorStop(1, '#581C87');
        ctx.fillStyle = wingGrad;
        drawRoundedRect(ctx, box.x, box.y + 8, box.w, box.h - 16, 16);
        ctx.fill();
        ctx.strokeStyle = isTurn ? '#38BDF8' : '#1E293B';
        ctx.lineWidth = isTurn ? 3 : 2;
        ctx.stroke();

        // Recessed dark die socket
        const sockPad = 8;
        const sockX = dieRect.x - sockPad;
        const sockY = box.y - 2;
        const sockW = dieRect.w + sockPad * 2;
        const sockH = box.h + 4;
        const sockGrad = ctx.createLinearGradient(sockX, sockY, sockX, sockY + sockH);
        sockGrad.addColorStop(0, '#334155');
        sockGrad.addColorStop(1, '#0F172A');
        ctx.fillStyle = sockGrad;
        drawRoundedRect(ctx, sockX, sockY, sockW, sockH, 20);
        ctx.fill();
        ctx.strokeStyle = isTurn ? '#38BDF8' : '#1E293B';
        ctx.lineWidth = isTurn ? 3.2 : 2;
        ctx.stroke();

        // Mini 4-color Ludo badge + pawn icon in the wing
        const badgeW = 92;
        const badgeH = 58;
        const badgeX = box.diceSide === 'right' ? box.x + 14 : box.x + box.w - badgeW - 14;
        const badgeY = box.y + (box.h - badgeH) / 2;
        const mcx = badgeX + badgeW / 2;
        const mcy = badgeY + badgeH / 2;

        ctx.save();
        drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 10);
        ctx.clip();
        // 4 quadrant triangles inside mini badge
        const qTris = [
          { c: COLORS.red.fill, pts: [[badgeX, badgeY], [mcx, mcy], [badgeX, badgeY + badgeH]] },
          { c: COLORS.green.fill, pts: [[badgeX, badgeY], [badgeX + badgeW, badgeY], [mcx, mcy]] },
          { c: COLORS.yellow.fill, pts: [[badgeX + badgeW, badgeY], [badgeX + badgeW, badgeY + badgeH], [mcx, mcy]] },
          { c: COLORS.blue.fill, pts: [[badgeX, badgeY + badgeH], [badgeX + badgeW, badgeY + badgeH], [mcx, mcy]] },
        ];
        for (const qt of qTris) {
          ctx.fillStyle = qt.c;
          ctx.beginPath();
          ctx.moveTo(qt.pts[0][0], qt.pts[0][1]);
          ctx.lineTo(qt.pts[1][0], qt.pts[1][1]);
          ctx.lineTo(qt.pts[2][0], qt.pts[2][1]);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();

        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2;
        drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 10);
        ctx.stroke();

        // Mini glossy pawn of this player's color inside the badge
        drawGlossyPawn(ctx, mcx, mcy + 4, 0.92, palette, false);

        // Floating score & rank pill above top pods / below bottom pods
        const isTopPod = player.color === 'red' || player.color === 'green';
        const scoreY = isTopPod ? box.y - 16 : box.y + box.h + 16;
        const rInfo = rankByColor.get(player.color);
        const rankTxt = rInfo ? formatRankLabel(rInfo.rank, rInfo.finished) : '';
        ctx.fillStyle = '#F8FAFC';
        ctx.font = '900 17px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          `${player.score || 0} 🏅  ${rankTxt}`,
          badgeX + badgeW / 2,
          scoreY
        );

        // Bouncing yellow arrow pointing to active die when ready to roll
        if (canRoll) {
          const bounce = Math.sin(time * 8) * 6;
          const arrowOnRight = box.diceSide === 'right';
          const ax = arrowOnRight ? sockX + sockW + 18 + bounce : sockX - 18 - bounce;
          const ay = box.y + box.h / 2;
          ctx.fillStyle = '#FACC15';
          ctx.strokeStyle = '#92400E';
          ctx.lineWidth = 3;
          ctx.font = '900 34px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const arrowChar = arrowOnRight ? '⬅' : '➡';
          ctx.strokeText(arrowChar, ax, ay);
          ctx.fillText(arrowChar, ax, ay);
        }
      } else {
        // Colored outer ring on radial dice box + live rank & score pill
        const rInfo = rankByColor.get(player.color);
        const rankTxt = rInfo ? formatRankLabel(rInfo.rank, rInfo.finished) : '';
        ctx.fillStyle = isTurn ? palette.fill : 'rgba(30, 41, 59, 0.6)';
        drawRoundedRect(ctx, box.x - 4, box.y - 4, box.w + 8, box.h + 8, 22);
        ctx.fill();
        if (isTurn) {
          ctx.strokeStyle = '#FACC15';
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        ctx.fillStyle = '#0F172A';
        drawRoundedRect(ctx, box.x + 2, box.y + box.h + 2, box.w - 4, 22, 10);
        ctx.fill();
        ctx.fillStyle = '#FACC15';
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          `${rankTxt ? rankTxt + ' • ' : ''}🏅 ${player.score || 0}`,
          box.x + box.w / 2,
          box.y + box.h + 13
        );
      }

      // 3D-shaded Die
      const dcx = dieRect.x + dieRect.w / 2;
      const dcy = dieRect.y + dieRect.h / 2;
      ctx.translate(dcx, dcy);
      if (isTurn && diceAnim) {
        ctx.rotate(Math.sin(time * 28) * 0.22);
        ctx.scale(1.08, 1.08);
      } else if (canRoll) {
        const s = 1 + pulse * 0.045;
        ctx.scale(s, s);
      }

      // Dual 3D-shaded Dice inside socket
      const gap = 4;
      const subSize = Math.floor((dieRect.w - gap) / 2);
      const pairVals =
        isTurn && diceAnim
          ? (diceAnim.previewValues || [diceAnim.previewValue, diceAnim.previewValue])
          : isTurn && state.phase === 'WAIT_MOVE' && Array.isArray(state.lastRolledPair)
            ? state.lastRolledPair
            : [player.lastDiceValue || 6, player.lastDiceValue || 6];

      const rem = isTurn && state.phase === 'WAIT_MOVE' ? [...(state.diceValues || [])] : null;
      const activeFlags = [true, true];
      if (rem) {
        for (let di = 0; di < 2; di++) {
          const idx = rem.indexOf(pairVals[di]);
          if (idx !== -1) {
            rem.splice(idx, 1);
            activeFlags[di] = true;
          } else {
            activeFlags[di] = false;
          }
        }
      }

      for (let di = 0; di < 2; di++) {
        const offsetX = di === 0 ? -(subSize / 2 + gap / 2) : (subSize / 2 + gap / 2);
        const dieActive = isTurn && activeFlags[di];
        ctx.save();
        ctx.translate(offsetX, 0);
        const subGrad = ctx.createLinearGradient(-subSize / 2, -subSize / 2, subSize / 2, subSize / 2);
        if (dieActive) {
          subGrad.addColorStop(0, '#FFFFFF');
          subGrad.addColorStop(1, '#E2E8F0');
        } else {
          subGrad.addColorStop(0, '#64748B');
          subGrad.addColorStop(1, '#475569');
        }
        ctx.fillStyle = subGrad;
        drawRoundedRect(ctx, -subSize / 2, -subSize / 2, subSize, subSize, 10);
        ctx.fill();
        ctx.strokeStyle = canRoll ? '#FACC15' : (dieActive ? '#CBD5E1' : '#334155');
        ctx.lineWidth = canRoll ? 2.5 : 1.5;
        ctx.stroke();
        drawDicePips(ctx, 0, 0, subSize, pairVals[di], !dieActive);
        ctx.restore();
      }
      ctx.restore();
    }

    // Gold-bordered Forward vs Backward Capture choice buttons
    if (!animState && !diceAnim && state.phase === 'WAIT_MOVE' && selectedPawnId != null) {
      const options = state.legalMoves.filter((m) => m.pawnId === selectedPawnId);
      const backOpt = options.find((o) => o.direction === 'backward_combo') || options.find((o) => o.direction === 'backward');
      const fwdOpt = options.find((o) => o.direction === 'forward_combo') || options.find((o) => o.direction === 'forward');
      if (backOpt && fwdOpt) {
        ctx.save();
        ctx.fillStyle = '#D97706';
        drawRoundedRect(ctx, CHOICE_BTN_BACKWARD.x, CHOICE_BTN_BACKWARD.y, CHOICE_BTN_BACKWARD.w, CHOICE_BTN_BACKWARD.h, 22);
        ctx.fill();
        ctx.strokeStyle = makeGoldGradient(ctx, CHOICE_BTN_BACKWARD.x, CHOICE_BTN_BACKWARD.y, CHOICE_BTN_BACKWARD.w, CHOICE_BTN_BACKWARD.h);
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 20px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`← ARRIÈRE (${backOpt.diceSum})`, CHOICE_BTN_BACKWARD.x + CHOICE_BTN_BACKWARD.w / 2, CHOICE_BTN_BACKWARD.y + CHOICE_BTN_BACKWARD.h / 2);

        ctx.fillStyle = '#059669';
        drawRoundedRect(ctx, CHOICE_BTN_FORWARD.x, CHOICE_BTN_FORWARD.y, CHOICE_BTN_FORWARD.w, CHOICE_BTN_FORWARD.h, 22);
        ctx.fill();
        ctx.strokeStyle = makeGoldGradient(ctx, CHOICE_BTN_FORWARD.x, CHOICE_BTN_FORWARD.y, CHOICE_BTN_FORWARD.w, CHOICE_BTN_FORWARD.h);
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`AVANT (${fwdOpt.diceSum}) →`, CHOICE_BTN_FORWARD.x + CHOICE_BTN_FORWARD.w / 2, CHOICE_BTN_FORWARD.y + CHOICE_BTN_FORWARD.h / 2);
        ctx.restore();
      }
    }

    // Gold-bordered Toast banner
    if (toastBanner) {
      ctx.save();
      ctx.fillStyle = '#B91C1C';
      drawRoundedRect(ctx, GAME_WIDTH / 2 - 150, boardY + BOARD_SIZE / 2 - 30, 300, 60, 30);
      ctx.fill();
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(toastBanner.text, GAME_WIDTH / 2, boardY + BOARD_SIZE / 2);
      ctx.restore();
    }

    // Gold-bordered In-Game Toolbar: Menu, Save, Code, Audio
    drawGoldButton(
      ctx,
      MENU_BTN_IN_GAME,
      'rgba(30, 41, 59, 0.9)',
      '🏠 MENU',
      '#FFFFFF',
      20
    );

    drawGoldButton(
      ctx,
      SAVE_BTN_IN_GAME,
      '#059669',
      '💾 SAUVER',
      '#FFFFFF',
      20
    );

    if (state.players.every((p) => !p.isAi)) {
      drawGoldButton(
        ctx,
        CODE_BTN_IN_GAME,
        '#7C3AED',
        '🔗 CODE',
        '#FFFFFF',
        20
      );
    }

    ctx.save();
    ctx.fillStyle = audioMuted ? 'rgba(30, 41, 59, 0.88)' : '#1E3A8A';
    drawRoundedRect(ctx, AUDIO_BTN_RECT.x, AUDIO_BTN_RECT.y, AUDIO_BTN_RECT.w, AUDIO_BTN_RECT.h, 24);
    ctx.fill();
    ctx.strokeStyle = audioMuted ? '#64748B' : makeGoldGradient(ctx, AUDIO_BTN_RECT.x, AUDIO_BTN_RECT.y, AUDIO_BTN_RECT.w, AUDIO_BTN_RECT.h);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      audioMuted ? '🔇 MUET' : '🔊 SON',
      AUDIO_BTN_RECT.x + AUDIO_BTN_RECT.w / 2,
      AUDIO_BTN_RECT.y + AUDIO_BTN_RECT.h / 2
    );
    ctx.restore();

    // Victory overlay with full standings & Continue (+pts) vs Reset (0)
    if (winnerColor) {
      ctx.save();
      ctx.fillStyle = 'rgba(2, 6, 23, 0.78)';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      ctx.fillStyle = '#1E1B4B';
      drawRoundedRect(ctx, 56, 250, 608, 740, 30);
      ctx.fill();
      ctx.strokeStyle = makeGoldGradient(ctx, 56, 250, 608, 740);
      ctx.lineWidth = 5;
      ctx.stroke();

      ctx.fillStyle = '#FACC15';
      ctx.font = '900 40px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🏆  FIN DE PARTIE !', GAME_WIDTH / 2, 315);

      ctx.fillStyle = COLORS[winnerColor].fill;
      ctx.font = '900 30px system-ui, sans-serif';
      ctx.fillText(`${COLORS[winnerColor].label.toUpperCase()} GAGNE`, GAME_WIDTH / 2, 368);

      const standings = matchStandings || [];
      standings.forEach((row, i) => {
        const ry = 415 + i * 52;
        ctx.fillStyle = i === 0 ? 'rgba(250, 204, 21, 0.16)' : 'rgba(15, 23, 42, 0.65)';
        drawRoundedRect(ctx, 90, ry, 540, 44, 12);
        ctx.fill();

        ctx.fillStyle = i === 0 ? '#FACC15' : '#CBD5E1';
        ctx.font = 'bold 20px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`#${row.rank}  ${COLORS[row.color].label.toUpperCase()}`, 112, ry + 22);

        ctx.fillStyle = '#34D399';
        ctx.textAlign = 'right';
        ctx.fillText(`${row.score} pts`, 608, ry + 22);
      });
      ctx.restore();

      drawGoldButton(ctx, VICTORY_BUTTONS.continueSeries, '#059669', 'CONTINUER (+PTS)', '#FFFFFF', 21);
      drawGoldButton(ctx, VICTORY_BUTTONS.resetZero, '#DC2626', 'À ZÉRO', '#FFFFFF', 22);
      drawGoldButton(ctx, VICTORY_BUTTONS.menu, '#2563EB', 'MENU', '#FFFFFF', 24);
    } else if (ui.showLeaveModal) {
      ctx.save();
      ctx.fillStyle = 'rgba(2, 6, 23, 0.78)';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      ctx.fillStyle = '#1E1B4B';
      drawRoundedRect(ctx, 68, 380, 584, 496, 30);
      ctx.fill();
      ctx.strokeStyle = makeGoldGradient(ctx, 68, 380, 584, 496);
      ctx.lineWidth = 5;
      ctx.stroke();

      ctx.fillStyle = '#FACC15';
      ctx.font = '900 34px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('QUITTER LA PARTIE ?', GAME_WIDTH / 2, 444);
      ctx.restore();

      drawGoldButton(ctx, LEAVE_MATCH_BUTTONS.saveAndReturn, '#059669', '💾  SAUVER & RETOUR', '#FFFFFF', 23);
      drawGoldButton(ctx, LEAVE_MATCH_BUTTONS.deleteAndReturn, '#DC2626', '🗑️  SUPPRIMER LA PARTIE', '#FFFFFF', 22);
      drawGoldButton(ctx, LEAVE_MATCH_BUTTONS.cancel, '#2563EB', '▶  CONTINUER', '#FFFFFF', 23);
    }
  } else {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    drawRoundedRect(ctx, 140, 48, 440, 52, 26);
    ctx.fill();
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = '#F8FAFC';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EDIT MODE — DRAG BOARD TO POSITION', GAME_WIDTH / 2, 74);
  }
}
