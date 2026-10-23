import { Events } from 'phaser';

export const EVENT_GAME_READY = 'game-ready';

// Pre-Apertura (Construcción) / Placement events
export const EVENT_START_PLACEMENT = 'placement:start';
export const EVENT_DRAG_MOVE = 'placement:move';
export const EVENT_DRAG_END = 'placement:end';
export const EVENT_FURNITURE_PLACED = 'furniture:placed';
export const EVENT_FURNITURE_REMOVED = 'furniture:removed';
export const EVENT_CANTINA_OPEN = 'cantina:open';

export type FurnitureType = 'MESA' | 'SILLA';

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

export class EventBus extends Events.EventEmitter {}

export const eventBus = new EventBus();
