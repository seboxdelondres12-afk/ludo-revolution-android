/**
 * Ludo Revolution — Game Entry Point
 * Integrates Main Menu, Profile, Settings, Setup, Leaderboard, Save/Resume unfinished games,
 * Square (2-4p) & Hexagonal (5-6p) boards, AI opponents, Web Audio + OGG audio, and Edit mode.
 */

import { COLORS, GAME_WIDTH, GAME_HEIGHT } from './src/constants.js';
import {
  createGameState,
  decodeMatchCode,
  encodeMatchCode,
  finalizeMatchScores,
  getCurrentPlayer,
  getGlobalTrackIndex,
  isMatchOver,
  rollDice,
  movePawn,
} from './src/engine.js';
import { chooseAiMove } from './src/ai.js';
import {
  AUDIO_BTN_RECT,
  BOARD_X,
  BOARD_SIZE,
  CELL_SIZE,
  CHOICE_BTN_BACKWARD,
  CHOICE_BTN_FORWARD,
  CODE_BTN_IN_GAME,
  LEADERBOARD_BACK_BTN,
  LEAVE_MATCH_BUTTONS,
  MENU_BTN_IN_GAME,
  MENU_BUTTONS,
  MENU_TOP_BUTTONS,
  PROFILE_BACK_BTN,
  SAVE_BTN_IN_GAME,
  SAVES_BACK_BTN,
  SETTINGS_BUTTONS,
  SETUP_BUTTONS,
  VICTORY_BUTTONS,
  getCellPixelPos,
  getDiceBoxForColor,
  getPawnScreenPositions,
  getSaveDeleteRect,
  getSaveRowRect,
  getSetupColorButtons,
  renderGame,
  renderLeaderboardScreen,
  renderMenuScreen,
  renderProfileScreen,
  renderSavesScreen,
  renderSettingsScreen,
  renderSetupScreen,
} from './src/renderer.js';
import { AudioManager, loadAudioPrefs } from './src/audio.js';
import { DEFAULT_PROFILE, deleteSavedGame, loadCodeSnapshot, loadUserData, saveCodeSnapshot, saveUserData, upsertSavedGame } from './src/storage.js';

let cleanupCurrentRun = null;

function ensureDefaults(config) {
  if (typeof config.playerCount !== 'number') config.playerCount = 4;
  if (typeof config.aiCount !== 'number') config.aiCount = 0;
  if (typeof config.humanColor !== 'string') config.humanColor = 'blue';
  if (typeof config.boardY !== 'number') config.boardY = 190;
  const prefs = loadAudioPrefs(config);
  if (typeof config.animationSpeed !== 'number') config.animationSpeed = prefs.pawnSpeed;
  if (typeof config.musicEnabled !== 'boolean') config.musicEnabled = prefs.musicEnabled;
  if (typeof config.sfxEnabled !== 'boolean') config.sfxEnabled = prefs.sfxEnabled;
  if (typeof config.musicVolume !== 'number') config.musicVolume = prefs.musicVolume;
  if (typeof config.sfxVolume !== 'number') config.sfxVolume = prefs.sfxVolume;
  if (typeof config.hapticsEnabled !== 'boolean') config.hapticsEnabled = prefs.hapticsEnabled;
}

function toCanvasCoords(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * GAME_WIDTH,
    y: ((clientY - rect.top) / rect.height) * GAME_HEIGHT,
  };
}

function inRect(pt, rect) {
  return pt.x >= rect.x && pt.x <= rect.x + rect.w && pt.y >= rect.y && pt.y <= rect.y + rect.h;
}

function run(mode = 'play') {
  if (cleanupCurrentRun) {
    cleanupCurrentRun();
    cleanupCurrentRun = null;
  }

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const config = window.gameConfig || {};
  ensureDefaults(config);

  const audio = new AudioManager({
    musicEnabled: config.musicEnabled,
    sfxEnabled: config.sfxEnabled,
    musicVolume: config.musicVolume,
    sfxVolume: config.sfxVolume,
    hapticsEnabled: config.hapticsEnabled,
  });

  const artAssets = { bg: null, star: null };
  function loadArtAsset(id, key) {
    const entry = window.lib?.getAsset?.(id);
    if (!entry?.url) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      artAssets[key] = img;
    };
    img.src = entry.url;
  }
  loadArtAsset('bg_royal_geometric', 'bg');
  loadArtAsset('star_gold', 'star');

  if (mode === 'play') {
    audio.startMusic('music_gameplay');
  }

  let screen = mode === 'edit' ? 'PLAYING' : 'MENU';
  let setupMode = 'ai';
  let state = createGameState({
    playerCount: config.playerCount,
    aiCount: config.aiCount,
    humanColor: config.humanColor,
  });
  let currentMatchId = `match-${Date.now()}`;
  let savedGames = [];
  let profile = { ...DEFAULT_PROFILE };
  let animState = null;
  let diceAnim = null;
  let selectedPawnId = null;
  let captureFx = null;
  let toastBanner = null;
  let winnerColor = null;
  let showLeaveModal = false;
  let codeOverlayEl = null;
  let matchStandings = null;
  let carryScores = null;
  let dragBoard = null;
  let aiTimer = 0;
  let elapsedTime = 0;
  let lastTs = performance.now();
  let rafId = 0;
  const leaderboard = { loading: false, entries: [] };

  loadUserData().then((data) => {
    savedGames = data.savedGames;
    profile = data.profile;
  });

  function persistCurrentMatch(showToast = false, status = 'en_cours', winColor = null) {
    const entry = {
      id: currentMatchId,
      savedAt: Date.now(),
      playerCount: state.players.length,
      aiCount: state.players.filter((p) => p.isAi).length,
      status,
      winnerColor: winColor,
      state: status === 'en_cours' ? JSON.parse(JSON.stringify(state)) : null,
    };
    savedGames = upsertSavedGame(savedGames, entry);
    saveUserData({ savedGames, profile });
    if (showToast) {
      toastBanner = { text: 'PARTIE SAUVEGARDÉE !', elapsed: 0, duration: 1.4 };
    }
  }

  function openSavedEntry(entry) {
    if (!entry) return;
    if (entry.status === 'en_cours' && entry.state) {
      currentMatchId = entry.id;
      state = entry.state;
      state.finishOrder = state.finishOrder || [];
      config.playerCount = entry.playerCount || state.players.length;
      config.aiCount = entry.aiCount || 0;
      animState = null;
      diceAnim = null;
      selectedPawnId = null;
      captureFx = null;
      toastBanner = null;
      winnerColor = null;
      showLeaveModal = false;
      matchStandings = null;
      aiTimer = 0;
      screen = 'PLAYING';
      audio.startMusic('music_gameplay');
    } else {
      resetMatch(entry.playerCount || 4, entry.aiCount || 0, false);
    }
  }

  function resetMatch(playerCount, aiCount, keepScores = false) {
    config.playerCount = playerCount;
    config.aiCount = aiCount;
    currentMatchId = `match-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    if (!keepScores) {
      carryScores = null;
    }
    state = createGameState({
      playerCount,
      aiCount,
      initialScores: keepScores ? carryScores : null,
      humanColor: config.humanColor,
    });
    profile.gamesPlayed += 1;
    saveUserData({ savedGames, profile });
    animState = null;
    diceAnim = null;
    selectedPawnId = null;
    captureFx = null;
    toastBanner = null;
    winnerColor = null;
    showLeaveModal = false;
    matchStandings = null;
    aiTimer = 0;
    screen = 'PLAYING';
    audio.startMusic('music_gameplay');
  }

  function closeCodeModal() {
    if (codeOverlayEl) {
      codeOverlayEl.remove();
      codeOverlayEl = null;
    }
  }

  function applyDecodedMatch(decoded) {
    state = decoded;
    for (const p of state.players) {
      p.isAi = false;
    }
    config.playerCount = state.players.length;
    config.aiCount = 0;
    currentMatchId = `match-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    animState = null;
    diceAnim = null;
    selectedPawnId = null;
    captureFx = null;
    showLeaveModal = false;
    aiTimer = 0;
    if (isMatchOver(state)) {
      winnerColor = (state.finishOrder && state.finishOrder[0]) || state.players[0].color;
      matchStandings = finalizeMatchScores(state, winnerColor);
    } else {
      winnerColor = null;
      matchStandings = null;
    }
    screen = 'PLAYING';
    audio.startMusic('music_gameplay');
    toastBanner = { text: 'PARTIE CHARGÉE !', elapsed: 0, duration: 1.6 };
  }

  function openCodeModal(initialTab = 'export') {
    closeCodeModal();
    const canExport = screen === 'PLAYING' && Boolean(state);
    let activeTab = canExport && initialTab === 'export' ? 'export' : 'import';

    const overlay = document.createElement('div');
    overlay.id = 'ludo-code-overlay';
    overlay.style.cssText = [
      'position:fixed;inset:0;z-index:50;background:rgba(2,6,23,0.82);',
      'display:flex;align-items:center;justify-content:center;padding:24px;',
      'font-family:system-ui,-apple-system,sans-serif;',
    ].join('');

    const card = document.createElement('div');
    card.style.cssText = [
      'width:100%;max-width:580px;background:#1E1B4B;border:3px solid #FACC15;',
      'border-radius:26px;padding:28px;color:#F8FAFC;box-shadow:0 20px 50px rgba(0,0,0,0.6);',
      'display:flex;flex-direction:column;gap:16px;',
    ].join('');

    const title = document.createElement('div');
    title.textContent = '🔗 CODE DE PARTIE HORS-LIGNE';
    title.style.cssText = 'font-size:26px;font-weight:900;color:#FACC15;text-align:center;';
    card.appendChild(title);

    const tabsRow = document.createElement('div');
    tabsRow.style.cssText = 'display:flex;gap:10px;';

    const tabExport = document.createElement('button');
    tabExport.textContent = '📤 PARTAGER MON TOUR';
    tabExport.style.cssText = 'flex:1;min-height:56px;border-radius:14px;border:2px solid #FACC15;font-size:17px;font-weight:800;cursor:pointer;';
    tabExport.style.display = canExport ? 'block' : 'none';

    const tabImport = document.createElement('button');
    tabImport.textContent = '📥 COLLER UN CODE';
    tabImport.style.cssText = 'flex:1;min-height:56px;border-radius:14px;border:2px solid #FACC15;font-size:17px;font-weight:800;cursor:pointer;';

    tabsRow.appendChild(tabExport);
    tabsRow.appendChild(tabImport);
    card.appendChild(tabsRow);

    const textarea = document.createElement('textarea');
    textarea.rows = 2;
    textarea.style.cssText = [
      'width:100%;box-sizing:border-box;border-radius:14px;border:2px solid #475569;',
      'background:#0F172A;color:#FACC15;padding:16px;font-size:32px;font-weight:900;',
      'font-family:monospace;letter-spacing:8px;text-align:center;text-transform:uppercase;',
      'resize:none;',
    ].join('');
    card.appendChild(textarea);

    const statusMsg = document.createElement('div');
    statusMsg.style.cssText = 'min-height:24px;font-size:16px;font-weight:700;text-align:center;';
    card.appendChild(statusMsg);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;';

    const primaryBtn = document.createElement('button');
    primaryBtn.style.cssText = 'flex:1;min-width:180px;min-height:64px;border-radius:16px;border:2px solid #FDE047;background:#059669;color:#FFF;font-size:19px;font-weight:800;cursor:pointer;';

    const pasteBtn = document.createElement('button');
    pasteBtn.textContent = '📋 COLLER';
    pasteBtn.style.cssText = 'min-width:130px;min-height:64px;border-radius:16px;border:2px solid #FDE047;background:#2563EB;color:#FFF;font-size:18px;font-weight:800;cursor:pointer;';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ FERMER';
    closeBtn.style.cssText = 'min-width:140px;min-height:64px;border-radius:16px;border:2px solid #94A3B8;background:#334155;color:#FFF;font-size:18px;font-weight:800;cursor:pointer;';

    btnRow.appendChild(pasteBtn);
    btnRow.appendChild(primaryBtn);
    btnRow.appendChild(closeBtn);
    card.appendChild(btnRow);

    function syncTabUi() {
      statusMsg.textContent = '';
      if (activeTab === 'export' && canExport) {
        tabExport.style.background = '#7C3AED';
        tabExport.style.color = '#FFF';
        tabImport.style.background = '#0F172A';
        tabImport.style.color = '#CBD5E1';
        textarea.readOnly = true;
        textarea.removeAttribute('maxlength');
        const code = encodeMatchCode(state);
        saveCodeSnapshot(code, state);
        textarea.value = code;
        textarea.placeholder = '';
        pasteBtn.style.display = 'none';
        primaryBtn.textContent = '📋 COPIER LE CODE';
        primaryBtn.style.background = '#7C3AED';
      } else {
        tabExport.style.background = '#0F172A';
        tabExport.style.color = '#CBD5E1';
        tabImport.style.background = '#059669';
        tabImport.style.color = '#FFF';
        textarea.readOnly = false;
        textarea.maxLength = 6;
        textarea.value = '';
        textarea.placeholder = 'GZ6G4H';
        pasteBtn.style.display = 'block';
        primaryBtn.textContent = '▶ CHARGER LA PARTIE';
        primaryBtn.style.background = '#059669';
      }
    }

    tabExport.onclick = () => {
      audio.playUiClick();
      activeTab = 'export';
      syncTabUi();
    };
    tabImport.onclick = () => {
      audio.playUiClick();
      activeTab = 'import';
      syncTabUi();
    };

    pasteBtn.onclick = async () => {
      audio.playUiClick();
      try {
        const text = await navigator.clipboard?.readText?.();
        if (text) {
          textarea.value = text;
          statusMsg.style.color = '#34D399';
          statusMsg.textContent = 'Code collé !';
          return;
        }
      } catch {
        // ignore clipboard read restriction
      }
      textarea.focus();
      statusMsg.style.color = '#FACC15';
      statusMsg.textContent = 'Maintiens appuyé dans la zone pour coller';
    };

    primaryBtn.onclick = async () => {
      audio.playUiClick();
      if (activeTab === 'export') {
        textarea.select();
        let copied = false;
        try {
          await navigator.clipboard?.writeText?.(textarea.value);
          copied = true;
        } catch {
          try {
            copied = document.execCommand('copy');
          } catch {
            copied = false;
          }
        }
        statusMsg.style.color = '#34D399';
        statusMsg.textContent = copied
          ? '✅ Code copié ! Envoie-le à ton ami par message.'
          : 'Sélectionne et copie le code ci-dessus !';
      } else {
        const clean = textarea.value.trim().toUpperCase();
        const localSnap = /^[A-Z0-9]{6}$/.test(clean) ? loadCodeSnapshot(clean) : null;
        const decoded = localSnap || decodeMatchCode(clean);
        if (!decoded) {
          audio.playError();
          statusMsg.style.color = '#F87171';
          statusMsg.textContent = '❌ Entre 6 lettres/chiffres (ex: GZ6G4H)';
          return;
        }
        closeCodeModal();
        applyDecodedMatch(decoded);
      }
    };

    closeBtn.onclick = () => {
      audio.playUiClick();
      closeCodeModal();
    };

    syncTabUi();
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    codeOverlayEl = overlay;
  }

  async function openLeaderboard() {
    screen = 'LEADERBOARD';
    leaderboard.loading = true;
    try {
      const res = await window.lib?.getLeaderboard?.({ limit: 8 });
      leaderboard.entries = res?.entries || [];
    } catch {
      leaderboard.entries = [];
    } finally {
      leaderboard.loading = false;
    }
  }

  if (window.lib && typeof window.lib.showGameParameters === 'function') {
    window.lib.showGameParameters({
      name: 'Ludo Revolution',
      params: {
        'Players (2-6)': {
          key: 'playerCount',
          type: 'slider',
          min: 2,
          max: 6,
          step: 1,
          defaultValue: config.playerCount,
          onChange: (val) => {
            config.playerCount = val;
            audio.playUiClick();
            if (mode === 'play' && screen === 'PLAYING') {
              resetMatch(config.playerCount, config.aiCount);
            }
          },
        },
        'AI Opponents (0-5)': {
          key: 'aiCount',
          type: 'slider',
          min: 0,
          max: 5,
          step: 1,
          defaultValue: config.aiCount,
          onChange: (val) => {
            config.aiCount = val;
            audio.playUiClick();
            if (mode === 'play' && screen === 'PLAYING') {
              resetMatch(config.playerCount, config.aiCount);
            }
          },
        },
        'Vitesse des pions': {
          key: 'animationSpeed',
          type: 'slider',
          min: 0.5,
          max: 3.0,
          step: 0.1,
          defaultValue: config.animationSpeed,
          onChange: (val) => {
            config.animationSpeed = val;
            audio.updatePrefs({ pawnSpeed: val });
          },
        },
        'Board Y': {
          key: 'boardY',
          type: 'slider',
          min: 100,
          max: 320,
          step: 5,
          defaultValue: config.boardY,
          onChange: (val) => {
            config.boardY = val;
          },
        },
        'Music': {
          key: 'musicEnabled',
          type: 'checkbox',
          defaultValue: config.musicEnabled,
          onChange: (val) => {
            config.musicEnabled = val;
            audio.updatePrefs({ musicEnabled: val });
          },
        },
        'Music Volume': {
          key: 'musicVolume',
          type: 'slider',
          min: 0,
          max: 1,
          step: 0.05,
          defaultValue: config.musicVolume,
          onChange: (val) => {
            config.musicVolume = val;
            audio.updatePrefs({ musicVolume: val });
          },
        },
        'Sound FX': {
          key: 'sfxEnabled',
          type: 'checkbox',
          defaultValue: config.sfxEnabled,
          onChange: (val) => {
            config.sfxEnabled = val;
            audio.updatePrefs({ sfxEnabled: val });
          },
        },
        'SFX Volume': {
          key: 'sfxVolume',
          type: 'slider',
          min: 0,
          max: 1,
          step: 0.05,
          defaultValue: config.sfxVolume,
          onChange: (val) => {
            config.sfxVolume = val;
            audio.updatePrefs({ sfxVolume: val });
          },
        },
        'Vibrations': {
          key: 'hapticsEnabled',
          type: 'checkbox',
          defaultValue: config.hapticsEnabled,
          onChange: (val) => {
            config.hapticsEnabled = val;
            audio.updatePrefs({ hapticsEnabled: val });
          },
        },
      },
    });
  }

  function triggerDiceRoll() {
    if (mode !== 'play' || screen !== 'PLAYING' || winnerColor || animState || diceAnim || state.phase !== 'WAIT_ROLL') return;
    selectedPawnId = null;
    audio.playDiceRoll();
    diceAnim = {
      elapsed: 0,
      duration: 0.36 / (config.animationSpeed || 1),
      previewValue: 1 + Math.floor(Math.random() * 6),
      previewValues: [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)],
      swapTimer: 0,
    };
  }

  function startPawnMove(pawnId, direction = null, diceSum = null) {
    const moveRes = movePawn(state, pawnId, direction, diceSum);
    if (!moveRes) {
      audio.playError();
      return;
    }
    selectedPawnId = null;
    if (moveRes.direction === 'recover') {
      audio.playPawnRecovered();
      return;
    }
    if (moveRes.fromInHome) {
      audio.playPawnExit();
    }

    const b = state.board;
    const enteredFinalLane =
      !moveRes.fromInHome &&
      moveRes.fromProgress <= b.outerMax &&
      moveRes.toProgress > b.outerMax &&
      moveRes.toProgress < b.finishProgress;

    const landingIdx = getGlobalTrackIndex(moveRes.color, moveRes.toProgress, false, null, b);
    const landedOnSafe = landingIdx != null && b.safeIndices.includes(landingIdx);

    const movedPlayer = state.players.find((p) => p.color === moveRes.color);
    const allFinished = Boolean(moveRes.playerFinished);

    animState = {
      key: `${moveRes.color}-${moveRes.pawnId}`,
      color: moveRes.color,
      pawnId: moveRes.pawnId,
      direction: moveRes.direction,
      fromInHome: moveRes.fromInHome,
      fromIntruderLane: moveRes.fromIntruderLane,
      fromProgress: moveRes.fromProgress,
      steps: moveRes.steps,
      stepIndex: 0,
      t: 0,
      px: 0,
      py: 0,
      hopHeight: 0,
      capturedPawn: moveRes.capturedPawn,
      reachedFinish: moveRes.reachedFinish,
      enteredFinalLane,
      landedOnSafe,
      bonusTurn: moveRes.bonusTurn,
      allFinished,
      finishRank: moveRes.finishRank,
      matchOver: Boolean(moveRes.matchOver),
      isAiMover: Boolean(movedPlayer?.isAi),
      toProgress: moveRes.toProgress,
      toIntruderLane: moveRes.toIntruderLane,
    };
    updatePawnAnim(0);
  }

  function updatePawnAnim(dt) {
    if (!animState) return;
    const speed = (config.animationSpeed || 1) * 5.2;
    animState.t += dt * speed;

    while (animState && animState.t >= 1) {
      animState.t -= 1;
      animState.stepIndex += 1;
      audio.playPawnStep(animState.stepIndex);
      if (animState.stepIndex >= animState.steps.length) {
        if (animState.capturedPawn) {
          const pt = getCellPixelPos(
            state.board.type,
            animState.color,
            animState.pawnId,
            animState.toProgress,
            false,
            animState.toIntruderLane,
            config.boardY
          );
          captureFx = { px: pt.x, py: pt.y, elapsed: 0, duration: 0.45 };
          audio.playPawnCapture(animState.direction === 'backward');
          if (!animState.isAiMover) {
            profile.captures += 1;
            profile.coins += 10;
            saveUserData({ savedGames, profile });
          }
        }
        if (animState.matchOver) {
          winnerColor = (state.finishOrder && state.finishOrder[0]) || animState.color;
          matchStandings = finalizeMatchScores(state, winnerColor);
          carryScores = {};
          for (const row of matchStandings) {
            carryScores[row.color] = row.score;
          }
          audio.playVictory();
          const firstWinner = state.players.find((p) => p.color === winnerColor);
          if (!firstWinner?.isAi) {
            profile.wins += 1;
            profile.coins += 50;
            profile.level = 1 + Math.floor(profile.wins / 3);
            const winnerRow = matchStandings.find((r) => r.color === winnerColor);
            window.lib?.addPlayerScoreToLeaderboard?.(winnerRow?.score || 200)?.catch?.(() => {});
          }
          persistCurrentMatch(false, 'terminée', winnerColor);
        } else if (animState.allFinished) {
          audio.playPawnFinish();
          const r = animState.finishRank || 1;
          const medal = r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : '🏁';
          const rankTxt = r === 1 ? '1er' : `${r}e`;
          const colorLabel = (COLORS[animState.color]?.label || animState.color).toUpperCase();
          toastBanner = { text: `${medal} ${colorLabel} TERMINE ${rankTxt} !`, elapsed: 0, duration: 2.0 };
        } else if (animState.reachedFinish) {
          audio.playPawnFinish();
        } else if (animState.enteredFinalLane) {
          audio.playFinalLaneEnter();
        } else if (animState.landedOnSafe && !animState.fromInHome) {
          audio.playSafeSpace();
        }
        if (!animState.bonusTurn && !animState.matchOver) {
          audio.playTurnStart();
        }
        animState = null;
        return;
      }
    }

    if (!animState) return;
    const prevStep =
      animState.stepIndex === 0
        ? { progress: animState.fromProgress, inHome: animState.fromInHome, intruderLane: animState.fromIntruderLane }
        : animState.steps[animState.stepIndex - 1];
    const nextStep = animState.steps[animState.stepIndex];
    const p0 = getCellPixelPos(
      state.board.type,
      animState.color,
      animState.pawnId,
      prevStep.progress,
      prevStep.inHome,
      prevStep.intruderLane,
      config.boardY
    );
    const p1 = getCellPixelPos(
      state.board.type,
      animState.color,
      animState.pawnId,
      nextStep.progress,
      nextStep.inHome,
      nextStep.intruderLane,
      config.boardY
    );

    const p = animState.t;
    animState.px = p0.x + (p1.x - p0.x) * p;
    animState.py = p0.y + (p1.y - p0.y) * p;
    animState.hopHeight = Math.sin(p * Math.PI) * 18;
  }

  function toggleAudioMute() {
    const nextMute = audio.prefs.musicEnabled || audio.prefs.sfxEnabled;
    config.musicEnabled = !nextMute;
    config.sfxEnabled = !nextMute;
    audio.updatePrefs({ musicEnabled: !nextMute, sfxEnabled: !nextMute });
    if (!nextMute) audio.playUiClick();
  }

  function handlePointerDown(e) {
    audio.unlock();
    const pt = toCanvasCoords(canvas, e.clientX, e.clientY);

    if (mode === 'edit') {
      if (
        pt.x >= BOARD_X &&
        pt.x <= BOARD_X + BOARD_SIZE &&
        pt.y >= config.boardY &&
        pt.y <= config.boardY + BOARD_SIZE
      ) {
        dragBoard = { startY: pt.y, initialBoardY: config.boardY };
      }
      return;
    }

    // --- MENU SCREEN ---
    if (screen === 'MENU') {
      if (inRect(pt, MENU_TOP_BUTTONS.profile)) {
        audio.playUiClick();
        screen = 'PROFILE';
      } else if (inRect(pt, MENU_TOP_BUTTONS.settings)) {
        audio.playUiClick();
        screen = 'SETTINGS';
      } else if (inRect(pt, MENU_BUTTONS.saves)) {
        audio.playUiClick();
        screen = 'SAVES';
      } else if (inRect(pt, MENU_BUTTONS.vsAi)) {
        audio.playUiClick();
        setupMode = 'ai';
        config.aiCount = config.playerCount - 1;
        screen = 'SETUP';
      } else if (inRect(pt, MENU_BUTTONS.localMulti)) {
        audio.playUiClick();
        setupMode = 'local';
        config.aiCount = 0;
        screen = 'SETUP';
      } else if (inRect(pt, MENU_BUTTONS.leaderboard)) {
        audio.playUiClick();
        openLeaderboard();