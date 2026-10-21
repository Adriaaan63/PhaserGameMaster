export const TILE = 32;
export const ROOM_W = 24;
export const ROOM_H = 15;
export const VIEW_Y = 64;
export const ROOM_SCALE = 2;

export const GAME_WIDTH = ROOM_W * TILE * ROOM_SCALE;
export const GAME_HEIGHT = (ROOM_H * TILE + VIEW_Y) * ROOM_SCALE;

export const TILES = {
    SUELO: 1,
    PARED: 2,
    MOBILIARIO: 3
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
        y: 11
    },
    drinkTanks: [
        { x: 17, y: 3 },
        { x: 18, y: 3 },
        { x: 19, y: 3 }
    ]
};
