// Player definitions and flat placeholder palette for Ludo Revolution.
// Purple and Orange are included here for future 5-6 player circular board support.

export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 1280;

export const COLORS = {
  red: {
    id: 'red',
    label: 'Red',
    fill: '#EF1B1B',
    light: '#FECACA',
    dark: '#B91C1C',
  },
  green: {
    id: 'green',
    label: 'Green',
    fill: '#14B84E',
    light: '#BBF7D0',
    dark: '#15803D',
  },
  yellow: {
    id: 'yellow',
    label: 'Yellow',
    fill: '#F2D614',
    light: '#FEF08A',
    dark: '#CA8A04',
  },
  blue: {
    id: 'blue',
    label: 'Blue',
    fill: '#17A1EC',
    light: '#BAE6FD',
    dark: '#0369A1',
  },
  purple: {
    id: 'purple',
    label: 'Purple',
    fill: '#8E24AA',
    light: '#E1BEE7',
    dark: '#4A148C',
  },
  orange: {
    id: 'orange',
    label: 'Orange',
    fill: '#FB8C00',
    light: '#FFE0B2',
    dark: '#E65100',
  },
};

export const SQUARE_PLAYER_ORDER = ['blue', 'red', 'green', 'yellow'];
export const PAWNS_PER_PLAYER = 4;
export const TRACK_LENGTH = 52;
export const FINAL_LANE_LENGTH = 5;
export const FINISH_PROGRESS = 56; // 0..50 outer track, 51..55 final lane, 56 center finish
