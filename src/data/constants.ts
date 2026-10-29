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

/** Night customer flow tuning. */
export const CLIENT_PATIENCE_MS = 30000;
export const CLIENT_SPAWN_INTERVAL_MS = 8000;
export const CLIENT_MAX_WAITING = 4;
export const CLIENT_MOVE_SPEED = 72;
export const CLIENT_LEAVE_FADE_MS = 350;
export const CLIENT_PATIENCE_WARNING_RATIO = 0.6;
export const CLIENT_PATIENCE_CRITICAL_RATIO = 0.25;
export const CLIENT_PATIENCE_HEALTHY_COLOR = 0x00ff00;
export const CLIENT_PATIENCE_WARNING_COLOR = 0xffb000;
export const CLIENT_PATIENCE_CRITICAL_COLOR = 0xff2020;
export const CHAIR_HIGHLIGHT_COLOR = 0x70ff80;
export const ORPHAN_CHAIR_COLOR = 0xff3030;
export const CLIENT_BODY_COLOR = 0x8b6f47;

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
