import { Events } from 'phaser';

import type { FurnitureCategory } from '../data/FurnitureRegistry';

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
export const EVENT_CLIENT_SELECTED = 'client:selected';
export const EVENT_CHAIR_ASSIGNED = 'client:chair-assigned';
export const EVENT_CLIENT_SEATED = 'client:seated';
export const EVENT_TOGGLE_BUILD_MODE = 'build-mode:toggled';

export interface BuildModeToggledData { readonly enabled: boolean; }

export interface ClientSelectedData { readonly clientId: number; }
export interface ChairAssignedData { readonly clientId: number; readonly tileX: number; readonly tileY: number; }
export interface ClientSeatedData { readonly clientId: number; }

/**
 * @deprecated Use `FurnitureCategory` from `FurnitureRegistry` instead.
 * Kept temporarily for backward-compatible tile-type checks.
 */
export type FurnitureType = FurnitureCategory;

export type GameMode = 'PRE_APERTURA' | 'NOCHE';
export const GAME_MODE_PRE_OPENING: GameMode = 'PRE_APERTURA';
export const GAME_MODE_NIGHT: GameMode = 'NOCHE';

export interface GameModeChangedData {
    readonly mode: GameMode;
}

export interface GameWarningData {
    readonly message: string;
}

/**
 * Emitted when the player starts dragging a furniture item from inventory.
 * Now carries the specific `furnitureId` from the registry instead of a
 * generic type string.
 */
export interface PlacementStartData {
    /** ID of the furniture config (e.g. `mesa_redonda_0`). */
    readonly furnitureId: string;
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

/**
 * Emitted when a piece of furniture is successfully placed on the grid.
 * Carries the specific `furnitureId` and the root tile coordinates.
 */
export interface FurniturePlacedData {
    readonly furnitureId: string;
    readonly tileX: number;
    readonly tileY: number;
}

/**
 * Emitted when a piece of placed furniture is removed from the grid.
 * Carries the specific `furnitureId` and the root tile coordinates.
 */
export interface FurnitureRemovedData {
    readonly furnitureId: string;
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
