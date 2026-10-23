import { Events } from 'phaser';

export const EVENT_GAME_READY = 'game-ready';

// Pre-Apertura (Construcción) / Placement events
export const EVENT_START_PLACEMENT = 'placement:start';
export const EVENT_DRAG_MOVE = 'placement:move';
export const EVENT_DRAG_END = 'placement:end';
export const EVENT_FURNITURE_PLACED = 'furniture:placed';
export const EVENT_FURNITURE_REMOVED = 'furniture:removed';
export const EVENT_CANTINA_OPEN = 'cantina:open';
export const EVENT_GAME_MODE_CHANGED = 'game:mode-changed';
export const EVENT_GAME_WARNING = 'game:warning';
export const EVENT_BEVERAGE_FILL_PROGRESS = 'station:beverage-fill-progress';
export const EVENT_FOOD_STOCK_UPDATED = 'station:food-stock-updated';

export type FurnitureType = 'MESA' | 'SILLA';
export type GameMode = 'PRE_APERTURA' | 'NOCHE';
export const GAME_MODE_PRE_OPENING: GameMode = 'PRE_APERTURA';
export const GAME_MODE_NIGHT: GameMode = 'NOCHE';

export interface GameModeChangedData {
    readonly mode: GameMode;
}

export interface GameWarningData {
    readonly message: string;
}

export interface PlacementStartData {
    readonly type: FurnitureType;
    readonly screenX?: number;
    readonly screenY?: number;
}

export interface PlacementMoveData {
    readonly screenX: number;
    readonly screenY: number;
}

export interface PlacementEndData {
    readonly screenX: number;
    readonly screenY: number;
}

export interface FurniturePlacedData {
    readonly type: FurnitureType;
    readonly tileX: number;
    readonly tileY: number;
}

export interface FurnitureRemovedData {
    readonly type: FurnitureType;
    readonly tileX: number;
    readonly tileY: number;
}

export interface BeverageFillProgressData {
    readonly progress: number;
    readonly active: boolean;
}

export interface FoodStockUpdatedData {
    readonly stock: number;
}

export class EventBus extends Events.EventEmitter {}

export const eventBus = new EventBus();
