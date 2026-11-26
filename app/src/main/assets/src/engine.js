// Pure, DOM-free rules engine for Ludo Revolution.
// Supports 2-4 player square board (52 cells) and 5-6 player circular board (78 cells),
// AI player flags, normal & backward capture (down to 6 behind start & from final lane),
// final-lane raids, star & start safe spaces, 2-pawn blockade & protection, and manual recovery on 6.

import {
  FINAL_LANE_LENGTH,
  FINISH_PROGRESS,
  PAWNS_PER_PLAYER,
  SQUARE_PLAYER_ORDER,
  TRACK_LENGTH,
} from './constants.js';
import { START_TRACK_INDEX, SAFE_TRACK_INDICES } from './board_square.js';
import {
  CIRCULAR_FINISH_PROGRESS,
  CIRCULAR_OUTER_MAX,
  CIRCULAR_PLAYER_ORDER,
  CIRCULAR_SAFE_INDICES,
  CIRCULAR_START_INDEX,
  CIRCULAR_TRACK_LENGTH,
} from './board_circular.js';

export const MIN_BACKWARD_PROGRESS = -12;

export function getActiveColors(playerCount) {
  const count = Math.max(2, Math.min(6, Math.floor(playerCount || 4)));
  if (count === 2) return ['blue', 'green']; // opposite corners
  if (count === 3) return ['blue', 'red', 'green'];
  if (count === 4) return [...SQUARE_PLAYER_ORDER]; // blue, red, green, yellow
  if (count === 5) return CIRCULAR_PLAYER_ORDER.slice(0, 5);
  return [...CIRCULAR_PLAYER_ORDER];
}

export function getBoardSpec(playerCount) {
  if (playerCount >= 5) {
    return {
      type: 'circular',
      trackLength: CIRCULAR_TRACK_LENGTH,
      outerMax: CIRCULAR_OUTER_MAX,
      finalLaneLength: FINAL_LANE_LENGTH,
      finishProgress: CIRCULAR_FINISH_PROGRESS,
      startIndex: CIRCULAR_START_INDEX,
      safeIndices: CIRCULAR_SAFE_INDICES,
    };
  }
  return {
    type: 'square',
    trackLength: TRACK_LENGTH,
    outerMax: 50,
    finalLaneLength: FINAL_LANE_LENGTH,
    finishProgress: FINISH_PROGRESS,
    startIndex: START_TRACK_INDEX,
    safeIndices: SAFE_TRACK_INDICES,
  };
}

export function createGameState({ playerCount = 4, aiCount = 0, initialScores = null, humanColor = null } = {}) {
  const activeColors = getActiveColors(playerCount);
  const clampedAi = Math.max(0, Math.min(activeColors.length - 1, Math.floor(aiCount || 0)));
  const board = getBoardSpec(activeColors.length);

  const chosenHuman = humanColor && activeColors.includes(humanColor) ? humanColor : activeColors[0];
  let aiAssigned = 0;
  const isAiMap = {};
  // Assign AI to non-human colors from the end so humanColor is always human
  for (let i = activeColors.length - 1; i >= 0; i--) {
    const c = activeColors[i];
    if (c !== chosenHuman && aiAssigned < clampedAi) {
      isAiMap[c] = true;
      aiAssigned++;
    } else {
      isAiMap[c] = false;
    }
  }

  const players = activeColors.map((color) => ({
    color,
    isAi: Boolean(isAiMap[color]),
    score: initialScores && typeof initialScores[color] === 'number' ? initialScores[color] : 0,
    lastDiceValue: 6,
    rollsWithoutSix: 0,
    pawns: Array.from({ length: PAWNS_PER_PLAYER }, (_, id) => ({
      id,
      color,
      inHome: true,
      progress: 0,
      intruderLane: null,
      capturedBy: null,
    })),
  }));

  const startTurnIdx = clampedAi > 0 ? Math.max(0, activeColors.indexOf(chosenHuman)) : 0;

  return {
    board,
    players,
    currentTurnIndex: startTurnIdx,
    phase: 'WAIT_ROLL',
    diceValue: null,
    diceValues: [],
    lastRolledPair: [6, 6],
    bonusRollEarned: false,
    consecutiveSixes: 0,
    legalMoves: [],
    legalPawnIds: [],
    turnCount: 1,
    lastRecovered: null,
    finishOrder: [],
    capturedThisTurnPawnIds: [],
  };
}

export function hasPlayerFinished(player, board) {
  return Boolean(player && player.pawns.every((p) => p.progress >= board.finishProgress));
}

export function getTargetFinisherCount(playerCount) {
  return Math.min(3, Math.max(1, playerCount - 1));
}

export function isMatchOver(state) {
  const finishOrder = state.finishOrder || [];
  return finishOrder.length >= getTargetFinisherCount(state.players.length);
}

export function getPlayerRanks(state, fallbackWinnerColor = null) {
  const b = state.board;
  const order = [...(state.finishOrder || [])];
  if (order.length === 0 && fallbackWinnerColor) {
    order.push(fallbackWinnerColor);
  }
  const ranked = [...state.players].sort((a, c) => {
    const idxA = order.indexOf(a.color);
    const idxC = order.indexOf(c.color);
    if (idxA !== -1 || idxC !== -1) {
      if (idxA === -1) return 1;
      if (idxC === -1) return -1;
      return idxA - idxC;
    }
    const finA = a.pawns.filter((p) => p.progress >= b.finishProgress).length;
    const finC = c.pawns.filter((p) => p.progress >= b.finishProgress).length;
    if (finC !== finA) return finC - finA;
    const progA = a.pawns.reduce((s, p) => s + (p.inHome ? 0 : Math.max(0, p.progress)), 0);
    const progC = c.pawns.reduce((s, p) => s + (p.inHome ? 0 : Math.max(0, p.progress)), 0);
    if (progC !== progA) return progC - progA;
    return (c.score || 0) - (a.score || 0);
  });

  return ranked.map((p, idx) => ({
    color: p.color,
    rank: idx + 1,
    finished: order.includes(p.color) || hasPlayerFinished(p, b),
    score: p.score || 0,
    isAi: p.isAi,
  }));
}

export function getCurrentPlayer(state) {
  return state.players[state.currentTurnIndex];
}

export function getGlobalTrackIndex(color, progress, inHome = false, intruderLane = null, board = null) {
  const b = board || getBoardSpec(4);
  if (inHome || intruderLane || progress == null || progress > b.outerMax) return null;
  const raw = (b.startIndex[color] + progress) % b.trackLength;
  return (raw + b.trackLength) % b.trackLength;
}

export function getOpponentsAtTrackIndex(state, myColor, globalTrackIdx) {
  if (globalTrackIdx == null) return [];
  const opponents = [];
  for (const player of state.players) {
    if (player.color === myColor) continue;
    for (const pawn of player.pawns) {
      if (!pawn.inHome && !pawn.intruderLane && pawn.progress <= state.board.outerMax) {
        if (getGlobalTrackIndex(pawn.color, pawn.progress, false, null, state.board) === globalTrackIdx) {
          opponents.push(pawn);
        }
      }
    }
  }
  return opponents;
}

export function getOpponentsInFinalLane(state, myColor, ownerColor, depth) {
  const targetProgress = state.board.outerMax + depth;
  const opponents = [];
  for (const player of state.players) {
    if (player.color === myColor) continue;
    for (const pawn of player.pawns) {
      if (pawn.inHome) continue;
      if (pawn.color === ownerColor && !pawn.intruderLane && pawn.progress === targetProgress) {
        opponents.push(pawn);
      } else if (pawn.intruderLane && pawn.intruderLane.ownerColor === ownerColor && pawn.intruderLane.depth === depth) {
        opponents.push(pawn);
      }
    }
  }
  return opponents;
}

/**
 * Capture rules: safe star/start spaces cannot be captured. A 2+ pawn stack
 * is protected on every space, even if that space is not a star or start.
 */
export function getCapturableOpponentsAt(state, myColor, globalTrackIdx) {
  if (globalTrackIdx == null) return [];
  if (state.board.safeIndices.includes(globalTrackIdx)) return [];
  const opponents = getOpponentsAtTrackIndex(state, myColor, globalTrackIdx);
  if (opponents.length >= 2) return [];
  return opponents;
}

export function getCapturableOpponentAt(state, myColor, globalTrackIdx) {
  const list = getCapturableOpponentsAt(state, myColor, globalTrackIdx);
  return list.length > 0 ? list[0] : null;
}

export function getCapturableOpponentsInFinalLane(state, myColor, ownerColor, depth) {
  return getOpponentsInFinalLane(state, myColor, ownerColor, depth);
}

export function getCapturableOpponentInFinalLane(state, myColor, ownerColor, depth) {
  const opponents = getCapturableOpponentsInFinalLane(state, myColor, ownerColor, depth);
  return opponents.length > 0 ? opponents[0] : null;
}

export function isPathBlocked(state, myColor, fromProgress, toProgress, direction) {
  const outerMax = state.board.outerMax;
  if (direction === 'forward') {
    for (let p = fromProgress + 1; p <= toProgress; p++) {
      if (p > outerMax) break;
      const idx = getGlobalTrackIndex(myColor, p, false, null, state.board);
      if (state.board.safeIndices.includes(idx) && getOpponentsAtTrackIndex(state, myColor, idx).length >= 2) {
        return true;
      }
    }
  } else {
    for (let p = fromProgress - 1; p >= toProgress; p--) {
      if (p > outerMax) continue;
      const idx = getGlobalTrackIndex(myColor, p, false, null, state.board);
      if (state.board.safeIndices.includes(idx) && getOpponentsAtTrackIndex(state, myColor, idx).length >= 2) {
        return true;
      }
    }
  }
  return false;
}

function getMovesForSingleValue(state, dice, isCombo = false, dieUsed = [dice]) {
  const player = getCurrentPlayer(state);
  const b = state.board;
  const moves = [];

  const lockedIds = state.capturedThisTurnPawnIds || [];
  for (const pawn of player.pawns) {
    if (lockedIds.includes(pawn.id)) continue;
    if (pawn.capturedBy != null) {
      // Captured pawns can only be recovered by a dedicated double-six move.
      // Recovery is handled in getLegalMoves so a single 6 never frees them.
      continue;
    }

    if (pawn.inHome) {
      if (!isCombo && dice === 6) {
        const startIdx = getGlobalTrackIndex(player.color, 0, false, null, b);
        const targetOpp = getCapturableOpponentAt(state, player.color, startIdx);
        moves.push({
          pawnId: pawn.id,
          direction: 'forward',
          toProgress: 0,
          captures: Boolean(targetOpp),
          diceSum: dice,
          dieUsed,
        });
      }
      continue;
    }

    if (pawn.intruderLane) {
      // Exiting an opponent's final lane requires a double 6 (handled in getLegalMoves)
      continue;
    }

    if (pawn.progress < b.finishProgress) {
      // 1. Forward move (single die OR combined d1 + d2)
      if (pawn.progress + dice <= b.finishProgress) {
        const toProgress = pawn.progress + dice;
        if (!isPathBlocked(state, player.color, pawn.progress, toProgress, 'forward')) {
          let captures = false;
          if (toProgress <= b.outerMax) {
            const targetIdx = getGlobalTrackIndex(player.color, toProgress, false, null, b);
            captures = Boolean(getCapturableOpponentAt(state, player.color, targetIdx));
          } else if (toProgress < b.finishProgress) {
            captures = Boolean(
              getCapturableOpponentInFinalLane(state, player.color, player.color, toProgress - b.outerMax)
            );
          }
          moves.push({
            pawnId: pawn.id,
            direction: isCombo ? 'forward_combo' : 'forward',
            toProgress,
            captures,
            diceSum: dice,
            dieUsed,
          });
        }
      }

      // 2. Backward capture (single die OR combined d1 + d2)
      if (pawn.progress - dice >= MIN_BACKWARD_PROGRESS) {
        const toProgress = pawn.progress - dice;
        if (!isPathBlocked(state, player.color, pawn.progress, toProgress, 'backward')) {
          let targetOpp = null;
          if (toProgress <= b.outerMax) {
            const targetIdx = getGlobalTrackIndex(player.color, toProgress, false, null, b);
            targetOpp = getCapturableOpponentAt(state, player.color, targetIdx);
          } else {
            targetOpp = getCapturableOpponentInFinalLane(state, player.color, player.color, toProgress - b.outerMax);
          }
          if (targetOpp) {
            moves.push({
              pawnId: pawn.id,
              direction: isCombo ? 'backward_combo' : 'backward',
              toProgress,
              captures: true,
              diceSum: dice,
              dieUsed,
            });
          }
        }
      }

      // 3. Final-lane raid (forward OR backward)
      if (pawn.progress <= b.outerMax) {
        const myGlobalIdx = getGlobalTrackIndex(player.color, pawn.progress, false, null, b);
        for (const oppPlayer of state.players) {
          const ownerColor = oppPlayer.color;
          if (ownerColor === player.color) continue;
          const entryIdx = (b.startIndex[ownerColor] + b.outerMax) % b.trackLength;

          // 3a. Forward raid into opponent's final lane
          const distToEntry = (entryIdx - myGlobalIdx + b.trackLength) % b.trackLength;
          if (dice > distToEntry && dice - distToEntry <= b.finalLaneLength) {
            const depth = dice - distToEntry;
            const entryProgress = pawn.progress + distToEntry;
            const blocked = isPathBlocked(state, player.color, pawn.progress, entryProgress, 'forward');
            if (!blocked) {
              const targetOpp = getCapturableOpponentInFinalLane(state, player.color, ownerColor, depth);
              if (targetOpp) {
                moves.push({
                  pawnId: pawn.id,
                  direction: 'raid',
                  ownerColor,
                  depth,
                  resumeProgress: entryProgress,
                  toProgress: entryProgress,
                  captures: true,
                  diceSum: dice,
                  dieUsed,
                });
              }
            }
          }

          // 3b. Backward raid into opponent's final lane ("par derrière")
          const distBackToEntry = (myGlobalIdx - entryIdx + b.trackLength) % b.trackLength;
          if (
            distBackToEntry >= 1 &&
            pawn.progress - distBackToEntry >= MIN_BACKWARD_PROGRESS &&
            dice > distBackToEntry &&
            dice - distBackToEntry <= b.finalLaneLength
          ) {
            const depth = dice - distBackToEntry;
            const entryProgress = pawn.progress - distBackToEntry;
            const blocked = isPathBlocked(state, player.color, pawn.progress, entryProgress, 'backward');
            if (!blocked) {
              const targetOpp = getCapturableOpponentInFinalLane(state, player.color, ownerColor, depth);
              if (targetOpp) {
                moves.push({
                  pawnId: pawn.id,
                  direction: 'raid_backward',
                  ownerColor,
                  depth,
                  resumeProgress: entryProgress,
                  toProgress: entryProgress,
                  captures: true,
                  diceSum: dice,
                  dieUsed,
                });
              }
            }
          }
        }
      }
    }
  }

  return moves;
}

export function getLegalMoves(state) {
  const diceList = Array.isArray(state.diceValues) && state.diceValues.length > 0
    ? state.diceValues
    : (state.diceValue != null ? [state.diceValue] : []);
  if (diceList.length === 0) return [];

  const allMoves = [];
  const seen = new Set();
  const pushUnique = (m) => {
    const key = `${m.pawnId}:${m.direction}:${m.diceSum}:${m.ownerColor || ''}:${m.depth || 0}`;
    if (!seen.has(key)) {
      seen.add(key);
      allMoves.push({ ...m, moveKey: key });
    }
  };

  for (const d of diceList) {
    for (const m of getMovesForSingleValue(state, d, false, [d])) {
      pushUnique(m);
    }
  }

  if (diceList.length === 2) {
    if (diceList[0] === 6 && diceList[1] === 6) {
      const player = getCurrentPlayer(state);
      const b = state.board;
      const lockedIds = state.capturedThisTurnPawnIds || [];
      for (const pawn of player.pawns) {
        if (lockedIds.includes(pawn.id)) continue;
        if (pawn.capturedBy != null) {
          // A captured pawn returns to its own base only after double six.
          pushUnique({
            pawnId: pawn.id,
            direction: 'recover',
            toProgress: 0,
            captures: false,
            diceSum: 12,
            dieUsed: [6, 6],
          });
          continue;
        }
        if (pawn.intruderLane) {
          const exitIdx = getGlobalTrackIndex(player.color, pawn.intruderLane.resumeProgress, false, null, b);
          const targetOpp = getCapturableOpponentAt(state, player.color, exitIdx);
          pushUnique({
            pawnId: pawn.id,
            direction: 'exit_raid',
            toProgress: pawn.intruderLane.resumeProgress,
            captures: Boolean(targetOpp),
            diceSum: 12,
            dieUsed: [6, 6],
          });
        }
      }
    }
    if (diceList[0] === 6 || diceList[1] === 6) {
      const player = getCurrentPlayer(state);
      const b = state.board;
      const otherDie = diceList[0] === 6 ? diceList[1] : diceList[0];
      for (const pawn of player.pawns) {
        if (!pawn.inHome || pawn.capturedBy != null) continue;
        // Forward from start (0 -> +otherDie)
        if (!isPathBlocked(state, player.color, 0, otherDie, 'forward')) {
          const fwdIdx = getGlobalTrackIndex(player.color, otherDie, false, null, b);
          const fwdOpp = getCapturableOpponentAt(state, player.color, fwdIdx);
          pushUnique({
            pawnId: pawn.id,
            direction: 'forward_combo',
            toProgress: otherDie,
            captures: Boolean(fwdOpp),
            diceSum: 6 + otherDie,
            dieUsed: [6, otherDie],
          });
        }
        // Backward capture from start (0 -> -otherDie)
        if (-otherDie >= MIN_BACKWARD_PROGRESS && !isPathBlocked(state, player.color, 0, -otherDie, 'backward')) {
          const backIdx = getGlobalTrackIndex(player.color, -otherDie, false, null, b);
          const backOpp = getCapturableOpponentAt(state, player.color, backIdx);
          if (backOpp) {
            pushUnique({
              pawnId: pawn.id,
              direction: 'backward_combo',
              toProgress: -otherDie,
              captures: true,
              diceSum: 6 + otherDie,
              dieUsed: [6, otherDie],
            });
          }
        }
      }
    }
    const sum = diceList[0] + diceList[1];
    for (const m of getMovesForSingleValue(state, sum, true, [diceList[0], diceList[1]])) {
      pushUnique(m);
    }
  }

  return allMoves;
}

export function advanceTurn(state) {
  const b = state.board;
  const finishOrder = state.finishOrder || [];
  const n = state.players.length;
  for (let step = 1; step <= n; step++) {
    const idx = (state.currentTurnIndex + step) % n;
    const p = state.players[idx];
    if (!finishOrder.includes(p.color) && !hasPlayerFinished(p, b)) {
      state.currentTurnIndex = idx;
      break;
    }
  }
  state.phase = 'WAIT_ROLL';
  state.diceValue = null;
  state.diceValues = [];
  state.bonusRollEarned = false;
  state.consecutiveSixes = 0;
  state.legalMoves = [];
  state.legalPawnIds = [];
  state.capturedThisTurnPawnIds = [];
  state.turnCount += 1;
}

export function smartRollValue(state) {
  const player = getCurrentPlayer(state);
  const b = state.board;

  // Never boost 6 if the player already rolled two 6s in a row (3rd 6 is blocked)
  if (state.consecutiveSixes >= 2) {
    return 1 + Math.floor(Math.random() * 6);
  }

  const hasActiveBoardPawn = player.pawns.some(
    (p) => !p.inHome && p.capturedBy == null && !p.intruderLane && p.progress < b.finishProgress
  );

  let sixChance = 0.24; // lively base chance
  if (!hasActiveBoardPawn) {
    const misses = player.rollsWithoutSix || 0;
    if (misses >= 3) sixChance = 0.80;
    else if (misses === 2) sixChance = 0.60;
    else if (misses === 1) sixChance = 0.45;
    else sixChance = 0.38;
  }

  if (Math.random() < sixChance) {
    return 6;
  }
  return 1 + Math.floor(Math.random() * 5);
}

export function rollDice(state, forcedD1 = null, forcedD2 = null) {
  if (state.phase !== 'WAIT_ROLL') {
    return {
      rolled: false,
      value: state.diceValue,
      values: state.diceValues || [],
      legalMoves: state.legalMoves,
      legalPawnIds: state.legalPawnIds,
      recoveredPawn: null,
    };
  }

  const d1 = forcedD1 != null ? forcedD1 : smartRollValue(state);
  const d2 = forcedD2 != null ? forcedD2 : (forcedD1 != null ? forcedD1 : (1 + Math.floor(Math.random() * 6)));

  state.diceValues = [d1, d2];
  state.diceValue = d1;
  state.lastRolledPair = [d1, d2];
  const currentPlayer = getCurrentPlayer(state);
  currentPlayer.lastDiceValue = d1;
  const hasSix = d1 === 6 || d2 === 6;
  const isDoubleSix = d1 === 6 && d2 === 6;
  currentPlayer.rollsWithoutSix = hasSix ? 0 : (currentPlayer.rollsWithoutSix || 0) + 1;
  state.lastRecovered = null;
  state.capturedThisTurnPawnIds = [];

  if (isDoubleSix) {
    state.consecutiveSixes += 1;
    if (state.consecutiveSixes >= 3) {
      advanceTurn(state);
      return {
        rolled: true,
        value: d1,
        values: [d1, d2],
        legalMoves: [],
        legalPawnIds: [],
        autoPassed: true,
        threeSixesBlocked: true,
        recoveredPawn: null,
      };
    }
  } else {
    state.consecutiveSixes = 0;
  }

  state.bonusRollEarned = isDoubleSix;

  const legalMoves = getLegalMoves(state);
  const legalPawnIds = [...new Set(legalMoves.map((m) => m.pawnId))];
  state.legalMoves = legalMoves;
  state.legalPawnIds = legalPawnIds;

  if (legalMoves.length > 0) {
    state.phase = 'WAIT_MOVE';
    return {
      rolled: true,
      value: d1,
      values: [d1, d2],
      legalMoves,
      legalPawnIds,
      autoPassed: false,
      recoveredPawn: null,
    };
  }

  if (state.bonusRollEarned) {
    state.bonusRollEarned = false;
    state.phase = 'WAIT_ROLL';
    state.diceValue = null;
    state.diceValues = [];
    state.legalMoves = [];
    state.legalPawnIds = [];
    return {
      rolled: true,
      value: d1,
      values: [d1, d2],
      legalMoves: [],
      legalPawnIds: [],
      autoPassed: false,
      bonusRollOnly: true,
      recoveredPawn: null,
    };
  }

  advanceTurn(state);
  return {
    rolled: true,
    value: d1,
    values: [d1, d2],
    legalMoves: [],
    legalPawnIds: [],
    autoPassed: true,
    recoveredPawn: null,
  };
}

export function movePawn(state, pawnId, direction = null, diceSum = null) {
  if (state.phase !== 'WAIT_MOVE') return null;

  const matchingMoves = state.legalMoves.filter((m) => m.pawnId === pawnId);
  if (matchingMoves.length === 0) return null;

  const chosenMove = matchingMoves.find(
    (m) => (!direction || m.direction === direction) && (diceSum == null || m.diceSum === diceSum)
  ) || (direction ? matchingMoves.find((m) => m.direction === direction) : matchingMoves[0]);

  if (!chosenMove) return null;

  const b = state.board;
  const player = getCurrentPlayer(state);
  const pawn = player.pawns[pawnId];
  const fromInHome = pawn.inHome;
  const fromIntruderLane = pawn.intruderLane;
  const fromProgress = pawn.progress;
  const toProgress = chosenMove.toProgress;
  const dieUsed = chosenMove.dieUsed || [chosenMove.diceSum || state.diceValue];

  function consumeDice() {
    const remaining = [...(state.diceValues || [])];
    for (const val of dieUsed) {
      const idx = remaining.indexOf(val);
      if (idx !== -1) remaining.splice(idx, 1);
    }
    state.diceValues = remaining;
    state.diceValue = remaining[0] ?? null;
  }

  if (chosenMove.direction === 'recover') {
    pawn.capturedBy = null;
    pawn.inHome = true;
    pawn.progress = 0;
    pawn.intruderLane = null;
    consumeDice();
    let bonusTurn = false;
    if (state.diceValues.length > 0) {
      const nextMoves = getLegalMoves(state);
      if (nextMoves.length > 0) {
        state.phase = 'WAIT_MOVE';
        state.legalMoves = nextMoves;
        state.legalPawnIds = [...new Set(nextMoves.map((m) => m.pawnId))];
        bonusTurn = true;
      } else if (state.bonusRollEarned) {
        state.phase = 'WAIT_ROLL';
        state.diceValue = null;
        state.diceValues = [];
        state.bonusRollEarned = false;
        state.legalMoves = [];
        state.legalPawnIds = [];
        bonusTurn = true;
      } else {
        advanceTurn(state);
      }
    } else if (state.bonusRollEarned) {
      state.phase = 'WAIT_ROLL';
      state.diceValue = null;
      state.diceValues = [];
      state.bonusRollEarned = false;
      state.legalMoves = [];
      state.legalPawnIds = [];
      bonusTurn = true;
    } else {
      advanceTurn(state);
    }
    return {
      color: player.color,
      pawnId,
      direction: 'recover',
      fromInHome: true,
      fromIntruderLane: null,
      fromProgress: 0,
      toProgress: 0,
      toIntruderLane: null,
      steps: [],
      capturedPawn: null,
      recoveredPawn: { color: player.color, pawnId },
      reachedFinish: false,
      bonusTurn,
    };
  }

  const steps = [];
  if (fromInHome) {
    steps.push({ progress: 0, inHome: false, intruderLane: null });
    if (chosenMove.direction === 'forward_combo') {
      for (let p = 1; p <= toProgress; p++) {
        steps.push({ progress: p, inHome: false, intruderLane: null });
      }
    } else if (chosenMove.direction === 'backward_combo') {
      for (let p = -1; p >= toProgress; p--) {
        steps.push({ progress: p, inHome: false, intruderLane: null });
      }
    }
  } else if (chosenMove.direction === 'raid' || chosenMove.direction === 'raid_backward') {
    if (chosenMove.direction === 'raid') {
      for (let p = fromProgress + 1; p <= chosenMove.resumeProgress; p++) {
        steps.push({ progress: p, inHome: false, intruderLane: null });
      }
    } else {
      for (let p = fromProgress - 1; p >= chosenMove.resumeProgress; p--) {
        steps.push({ progress: p, inHome: false, intruderLane: null });
      }
    }
    for (let d = 1; d <= chosenMove.depth; d++) {
      steps.push({
        progress: chosenMove.resumeProgress,
        inHome: false,
        intruderLane: {
          ownerColor: chosenMove.ownerColor,
          depth: d,
          resumeProgress: chosenMove.resumeProgress,
        },
      });
    }
  } else if (chosenMove.direction === 'exit_raid') {
    steps.push({ progress: toProgress, inHome: false, intruderLane: null });
  } else if (chosenMove.direction === 'forward' || chosenMove.direction === 'forward_combo') {
    for (let p = fromProgress + 1; p <= toProgress; p++) {
      steps.push({ progress: p, inHome: false, intruderLane: null });
    }
  } else {
    for (let p = fromProgress - 1; p >= toProgress; p--) {
      steps.push({ progress: p, inHome: false, intruderLane: null });
    }
  }

  pawn.inHome = false;
  let capturedPawn = null;

  if (chosenMove.direction === 'raid' || chosenMove.direction === 'raid_backward') {
    pawn.intruderLane = {
      ownerColor: chosenMove.ownerColor,
      depth: chosenMove.depth,
      resumeProgress: chosenMove.resumeProgress,
    };
    pawn.progress = chosenMove.resumeProgress;
    const targets = getCapturableOpponentsInFinalLane(
      state,
      player.color,
      chosenMove.ownerColor,
      chosenMove.depth
    );
    if (targets.length > 0) {
      for (const t of targets) {
        t.inHome = true;
        t.progress = 0;
        t.intruderLane = null;
        t.capturedBy = player.color;
      }
      capturedPawn = {
        color: targets[0].color,
        pawnId: targets[0].id,
        count: targets.length,
        capturedBy: player.color,
      };
    }
  } else {
    pawn.intruderLane = null;
    if ((chosenMove.direction === 'backward' || chosenMove.direction === 'backward_combo') && toProgress <= -2) {
      pawn.progress = b.trackLength + toProgress;
    } else {
      pawn.progress = toProgress;
    }

    if (pawn.progress <= b.outerMax) {
      const landingIdx = getGlobalTrackIndex(player.color, pawn.progress, false, null, b);
      const targets = getCapturableOpponentsAt(state, player.color, landingIdx);
      if (targets.length > 0) {
        for (const t of targets) {
          t.inHome = true;
          t.progress = 0;
          t.intruderLane = null;
          t.capturedBy = player.color;
        }
        capturedPawn = {
          color: targets[0].color,
          pawnId: targets[0].id,
          count: targets.length,
          capturedBy: player.color,
          trackIndex: landingIdx,
        };
      }
    } else if (pawn.progress < b.finishProgress) {
      const targets = getCapturableOpponentsInFinalLane(
        state,
        player.color,
        player.color,
        pawn.progress - b.outerMax
      );
      if (targets.length > 0) {
        for (const t of targets) {
          t.inHome = true;
          t.progress = 0;
          t.intruderLane = null;
          t.capturedBy = player.color;
        }
        capturedPawn = {
          color: targets[0].color,
          pawnId: targets[0].id,
          count: targets.length,
          capturedBy: player.color,
        };
      }
    }
  }

  const reachedFinish = !pawn.intruderLane && pawn.progress === b.finishProgress;
  if (capturedPawn) {
    const capCount = capturedPawn.count || 1;
    player.score = (player.score || 0) + 2 * capCount;
  }
  if (reachedFinish) {
    player.score = (player.score || 0) + 10;
  }

  if (!state.finishOrder) state.finishOrder = [];
  const playerFinished = hasPlayerFinished(player, b);
  let finishRank = null;
  if (playerFinished) {
    if (!state.finishOrder.includes(player.color)) {
      state.finishOrder.push(player.color);
    }
    finishRank = state.finishOrder.indexOf(player.color) + 1;
  }
  const matchOver = isMatchOver(state);
  if (reachedFinish || Boolean(capturedPawn)) {
    state.bonusRollEarned = true;
  }
  if (capturedPawn) {
    if (!state.capturedThisTurnPawnIds) state.capturedThisTurnPawnIds = [];
    if (!state.capturedThisTurnPawnIds.includes(pawnId)) {
      state.capturedThisTurnPawnIds.push(pawnId);
    }
  }
  consumeDice();

  let bonusTurn = false;
  if (matchOver) {
    state.phase = 'GAME_OVER';
    state.diceValue = null;
    state.diceValues = [];
    state.bonusRollEarned = false;
    state.legalMoves = [];
    state.legalPawnIds = [];
  } else if (playerFinished) {
    advanceTurn(state);
  } else if (state.diceValues.length > 0) {
    const nextMoves = getLegalMoves(state);
    if (nextMoves.length > 0) {
      state.phase = 'WAIT_MOVE';
      state.legalMoves = nextMoves;
      state.legalPawnIds = [...new Set(nextMoves.map((m) => m.pawnId))];
      bonusTurn = true;
    } else if (state.bonusRollEarned) {
      state.bonusRollEarned = false;
      state.phase = 'WAIT_ROLL';
      state.diceValue = null;
      state.diceValues = [];
      state.legalMoves = [];
      state.legalPawnIds = [];
      bonusTurn = true;
    } else {
      advanceTurn(state);
    }
  } else if (state.bonusRollEarned) {
    state.bonusRollEarned = false;
    state.phase = 'WAIT_ROLL';
    state.diceValue = null;
    state.diceValues = [];
    state.legalMoves = [];
    state.legalPawnIds = [];
    bonusTurn = true;
  } else {
    advanceTurn(state);
  }

  return {
    color: player.color,
    pawnId,
    direction: chosenMove.direction,
    fromInHome,
    fromIntruderLane,
    fromProgress,
    toProgress,
    toIntruderLane: pawn.intruderLane,
    steps,
    capturedPawn,
    reachedFinish,
    bonusTurn,
    playerFinished,
    finishRank,
    matchOver,
  };
}

/**
 * Awards end-of-match placement bonuses:
 * - 1st place: +160 (so 4 finished pawns x 10 + 160 = 200 min + capture points)
 * - 2nd place: +140 (-20)
 * - 3rd place: +110 (-30)
 * - Intermediate (4th/5th in 5-6p): +80 / +50
 * - Last place: +0 (keeps only earned capture/finish points)
 */
export function finalizeMatchScores(state, winnerColor = null) {
  const rankedInfo = getPlayerRanks(state, winnerColor);
  const bonuses = [160, 140, 110, 80, 50];
  return rankedInfo.map((info, idx) => {
    const p = state.players.find((pl) => pl.color === info.color);
    const isLast = idx === rankedInfo.length - 1;
    const bonus = isLast ? 0 : (bonuses[idx] ?? 0);
    p.score = (p.score || 0) + bonus;
    return {
      color: p.color,
      rank: info.rank,
      score: p.score,
      bonus,
      isAi: p.isAi,
    };
  });
}

const CODE_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function encodeMatchCode(state) {
  if (typeof state?.matchCode === 'string' && /^[A-Z0-9]{6}$/.test(state.matchCode)) {
    return state.matchCode;
  }
  const n = Math.max(2, Math.min(6, state.players.length));
  let code = CODE_CHARS[n - 2]; // 0..4 => 2..6 human players
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  for (let i = 1; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  // Ensure at least one digit and one letter for a clean mixed look like GZ6G4H
  if (!/[0-9]/.test(code)) {
    code = code.slice(0, 2) + digits[Math.floor(Math.random() * digits.length)] + code.slice(3);
  }
  if (!/[A-Z]/.test(code)) {
    code = code.slice(0, 1) + letters[Math.floor(Math.random() * letters.length)] + code.slice(2);
  }
  state.matchCode = code;
  return code;
}

export function decodeMatchCode(rawCode) {
  try {
    if (typeof rawCode !== 'string') return null;
    const code = rawCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) return null;

    const idx = CODE_CHARS.indexOf(code[0]);
    const playerCount = idx >= 0 && idx < 5 ? 2 + idx : 2 + (idx % 5);
    const state = createGameState({ playerCount, aiCount: 0 });
    state.matchCode = code;
    return state;
  } catch {
    return null;
  }
}
