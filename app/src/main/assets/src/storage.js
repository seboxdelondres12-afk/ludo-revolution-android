// Persistence helper for Ludo Revolution.
// Saves/loads all played & unfinished games (with timestamps) and player profile
// via Astrocade lib.saveUserGameState with localStorage fallback.

const LOCAL_KEY = 'ludo_revolution_user_data_v1';
const MAX_SAVED_GAMES = 12;

export const DEFAULT_PROFILE = {
  level: 1,
  coins: 100,
  wins: 0,
  gamesPlayed: 0,
  captures: 0,
};

export async function loadUserData() {
  let data = null;
  try {
    if (window.lib && typeof window.lib.getUserGameState === 'function') {
      const res = await window.lib.getUserGameState();
      if (res && res.state) {
        data = res.state;
      }
    }
  } catch {
    // ignore and fallback
  }

  if (!data) {
    try {
      const raw = window.localStorage?.getItem(LOCAL_KEY);
      if (raw) data = JSON.parse(raw);
    } catch {
      // ignore
    }
  }

  let savedGames = Array.isArray(data?.savedGames) ? data.savedGames : [];
  if (savedGames.length === 0 && data?.savedMatch?.state) {
    savedGames = [
      {
        id: `migrated-${data.savedMatch.savedAt || Date.now()}`,
        savedAt: data.savedMatch.savedAt || Date.now(),
        playerCount: data.savedMatch.playerCount || data.savedMatch.state.players?.length || 4,
        aiCount: data.savedMatch.aiCount || 0,
        status: 'en_cours',
        winnerColor: null,
        state: data.savedMatch.state,
      },
    ];
  }

  return {
    savedGames: savedGames.slice(0, MAX_SAVED_GAMES),
    profile: { ...DEFAULT_PROFILE, ...(data?.profile || {}) },
  };
}

export async function saveUserData(data) {
  const payload = {
    savedGames: (data.savedGames || []).slice(0, MAX_SAVED_GAMES),
    profile: { ...DEFAULT_PROFILE, ...(data.profile || {}) },
  };

  try {
    window.localStorage?.setItem(LOCAL_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }

  try {
    if (window.lib && typeof window.lib.saveUserGameState === 'function') {
      await window.lib.saveUserGameState(payload);
    }
  } catch {
    // ignore
  }
}

export function upsertSavedGame(savedGames, entry) {
  const filtered = (savedGames || []).filter((g) => g.id !== entry.id);
  return [entry, ...filtered].slice(0, MAX_SAVED_GAMES);
}

export function deleteSavedGame(savedGames, id) {
  return (savedGames || []).filter((g) => g.id !== id);
}

const CODE_MAP_KEY = 'ludo_code_snapshots_v1';

export function saveCodeSnapshot(code, state) {
  if (!code || !state) return;
  try {
    const raw = window.localStorage?.getItem(CODE_MAP_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[code] = JSON.parse(JSON.stringify(state));
    const keys = Object.keys(map);
    if (keys.length > 20) {
      delete map[keys[0]];
    }
    window.localStorage?.setItem(CODE_MAP_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function loadCodeSnapshot(code) {
  if (!code) return null;
  try {
    const raw = window.localStorage?.getItem(CODE_MAP_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw);
    const key = code.trim().toUpperCase();
    return map[key] || null;
  } catch {
    return null;
  }
}
