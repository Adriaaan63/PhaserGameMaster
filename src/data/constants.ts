export const TILE = 32;
export const ROOM_W = 24;
export const ROOM_H = 22;
export const VIEW_Y = 64;
export const ROOM_SCALE = 1.0;

export const GAME_WIDTH = ROOM_W * TILE * ROOM_SCALE;
export const GAME_HEIGHT = (ROOM_H * TILE + VIEW_Y) * ROOM_SCALE;

export const PLAYER_SPRITESHEET_KEY = 'wuher-andar';
export const PLAYER_FRAME_WIDTH = 150;
export const PLAYER_FRAME_HEIGHT = 150;
export const PLAYER_BASE_SPEED = 160;
export const PLAYER_DASH_SPEED = 240;

/** Offsets for rendering held objects in the player's right hand. */
export const PLAYER_HAND_OFFSET_X = 12;
export const PLAYER_HAND_OFFSET_Y = 6;

/** Texture keys for kitchen props & items. */
export const TEXTURE_FOOD = 'kitchen_props2_4';
export const TEXTURE_DRINK_FULL = 'kitchen_props_3';
export const TEXTURE_DRINK_EMPTY = 'kitchen_props2_25';

/** Station timing and animation configuration. */
export const COOKING_TIME_MS = 4000;
export const COOKING_ALPHA_MIN = 0.35;
export const COOKING_ALPHA_MAX = 0.85;
export const COOKING_PULSE_DURATION_MS = 450;
export const BEVERAGE_FILL_DURATION_MS = 2000;

export const CHAIR_HIGHLIGHT_COLOR = 0x70ff80;
export const ORPHAN_CHAIR_COLOR = 0xff3030;

export const TILES = {
    SUELO: 1,
    PARED: 2,
    MOBILIARIO: 3,
} as const;

export interface TilePosition {
    readonly x: number;
    readonly y: number;
}

export interface CantinaData {
    readonly spawn: TilePosition;
    readonly drinkTanks: readonly TilePosition[];
}

export const cantinaData: CantinaData = {
    spawn: {
        x: 18,
        y: 11,
    },
    drinkTanks: [
        { x: 17, y: 3 },
        { x: 18, y: 3 },
        { x: 19, y: 3 },
    ],
};
