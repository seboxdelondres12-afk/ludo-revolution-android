// Pure AI decision module for Ludo Revolution.
// Evaluates all legal moves dynamically so every color plays competitively and fairly.

import { getGlobalTrackIndex } from './engine.js';

export function chooseAiMove(state) {
  const moves = state.legalMoves;
  if (!moves || moves.length === 0) return null;

  let bestMove = moves[0];
  let bestScore = -Infinity;

  const player = state.players[state.currentTurnIndex];
  const b = state.board;

  for (const move of moves) {
    let score = 0;
    const pawn = player.pawns[move.pawnId];

    if (move.captures) score += 105;
    if (move.direction === 'raid') score += 115;
    if (move.toProgress === b.finishProgress) score += 95;
    if (move.direction === 'recover') score += 65;
    if (pawn.inHome && move.direction === 'forward') score += 60;
    if (move.direction === 'exit_raid') score += 55;

    // Entering final lane
    if (!pawn.inHome && pawn.progress <= b.outerMax && move.toProgress > b.outerMax) {
      score += 48;
    }

    // Bonus for landing on a safe star/start space or forming a 2-pawn protected stack
    if (move.direction === 'forward' && move.toProgress <= b.outerMax) {
      const targetIdx = getGlobalTrackIndex(player.color, move.toProgress, false, null, b);
      if (targetIdx != null) {
        if (b.safeIndices.includes(targetIdx)) {
          score += 20;
        }
        const allyOnCell = player.pawns.some(
          (other) =>
            other.id !== pawn.id &&
            !other.inHome &&
            !other.intruderLane &&
            other.progress <= b.outerMax &&
            getGlobalTrackIndex(player.color, other.progress, false, null, b) === targetIdx
        );
        if (allyOnCell) {
          score += 18;
        }
      }
    }

    // Prefer advancing pawns that are further along
    score += (move.toProgress || 0) * 0.45;

    // Small random tie-breaker so all colors stay unpredictable
    score += Math.random() * 2.0;

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}
