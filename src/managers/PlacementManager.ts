import { GameObjects, Input, Physics, Scene, Types } from 'phaser';

import { TILE } from '../data/constants';
import { getFurnitureConfig, type FurnitureConfig } from '../data/FurnitureRegistry';
import { Player } from '../entities/Player';
import {
    EVENT_DRAG_END,
    EVENT_DRAG_MOVE,
    EVENT_FURNITURE_PLACED,
    EVENT_FURNITURE_REMOVED,
    EVENT_START_PLACEMENT,
    eventBus,
    type PlacementEndData,
    type PlacementMoveData,
    type PlacementStartData,
} from '../utils/EventBus';
import { GridManager, TILE_TYPE_CHAIR, TILE_TYPE_TABLE, type FurnitureTileType } from './GridManager';

/** Internal record for every placed furniture sprite. Keyed by root tile. */
interface PlacedFurnitureRecord {
    readonly sprite: Types.Physics.Arcade.ImageWithStaticBody;
    readonly collider: Physics.Arcade.Collider;
    readonly furnitureId: string;
    readonly config: FurnitureConfig;
    readonly rootTileX: number;
    readonly rootTileY: number;
}

const TINT_VALID = 0x00ff00;
const TINT_INVALID = 0xff0000;
const GHOST_ALPHA = 0.75;
const HIGHLIGHT_FILL_ALPHA = 0.35;
const HIGHLIGHT_STROKE_ALPHA = 0.9;
const HIGHLIGHT_STROKE_WIDTH = 1.5;
const GHOST_DEPTH = 16;
const HIGHLIGHT_DEPTH = 15;

/**
 * Maps a `FurnitureCategory` to its semantic `FurnitureTileType`
 * so the `GridManager` tile map stays consistent.
 */
function categoryToTileType(category: string): FurnitureTileType {
    switch (category) {
        case 'MESA':
            return TILE_TYPE_TABLE;
        case 'SILLA':
            return TILE_TYPE_CHAIR;
        default:
            return TILE_TYPE_TABLE;
    }
}

/**
 * Handles the Drag & Drop placement and removal of cantina furniture
 * (Mesas and Sillas) during the Pre-Opening Construction phase.
 *
 * Now fully data-driven: every drag operation resolves its dimensions,
 * texture, and grid footprint from the `FurnitureRegistry` instead of
 * hardcoded 1×1 procedural textures.
 *
 * Responsibilities:
 * - Listens to inventory drag events from EventBus.
 * - Displays a grid-snapped ghost sprite and dynamic highlight tile following the pointer.
 * - Performs real-time validation via GridManager.isTileBuildable().
 * - Places real interactive furniture on valid drop.
 * - Enables single-click removal of placed furniture to return it to inventory.
 */
export class PlacementManager {
    private readonly scene: Scene;
    private readonly gridManager: GridManager;
    private readonly player: Player;

    private isDragging: boolean = false;
    private isEnabled: boolean = true;
    private currentConfig: FurnitureConfig | null = null;
    private currentTileX: number = -1;
    private currentTileY: number = -1;
    private isCurrentValid: boolean = false;

    private ghostSprite: GameObjects.Image | null = null;
    private tileHighlight: GameObjects.Rectangle | null = null;

    /** Keyed by root tile key (`rootX:rootY`). */
    private readonly placedFurnitureMap: Map<string, PlacedFurnitureRecord> = new Map();

    private readonly onStartPlacementBound = (data: PlacementStartData): void => {
        this.startDrag(data.furnitureId, data.screenX, data.screenY);
    };

    private readonly onDragMoveBound = (data: PlacementMoveData): void => {
        this.updateDragPosition(data.screenX, data.screenY);
    };

    private readonly onDragEndBound = (data: PlacementEndData): void => {
        this.endDrag(data.screenX, data.screenY);
    };

    public constructor(scene: Scene, gridManager: GridManager, player: Player) {
        this.scene = scene;
        this.gridManager = gridManager;
        this.player = player;

        this.createVisualIndicators();
        this.setupEventListeners();

        this.scene.events.once('shutdown', this.destroy, this);
        this.scene.events.once('destroy', this.destroy, this);
    }

    /**
     * Optional update hook called from NightCantinaScene.update() if continuous checks are desired.
     */
    public update(): void {
        if (!this.isEnabled || !this.isDragging) {
            return;
        }

        const pointer = this.scene.input.activePointer;
        if (pointer.isDown) {
            this.updateDragPosition(pointer.x, pointer.y);
        }
    }

    public setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
        if (!enabled) {
            this.cancelDrag();
        }
    }

    /**
     * Removes dynamically placed furniture whose footprint includes the
     * given grid coordinates and returns it to inventory.
     *
     * @param tileX Grid X coordinate (any cell of the piece).
     * @param tileY Grid Y coordinate.
     * @returns True if furniture was removed, false if none existed at those coordinates.
     */
    public removeFurnitureAt(tileX: number, tileY: number): boolean {
        // The GridManager entry knows the root tile; look it up.
        const gridEntry = this.gridManager.getFurnitureAt(tileX, tileY);
        if (gridEntry === null) {
            return false;
        }

        const rootKey = this.getTileKey(gridEntry.rootX, gridEntry.rootY);
        const record = this.placedFurnitureMap.get(rootKey);

        if (record === undefined) {
            return false;
        }

        record.collider.destroy();
        record.sprite.destroy();
        this.placedFurnitureMap.delete(rootKey);
        this.gridManager.removeFurniture(tileX, tileY);

        eventBus.emit(EVENT_FURNITURE_REMOVED, {
            furnitureId: record.furnitureId,
            tileX: record.rootTileX,
            tileY: record.rootTileY,
        });

        return true;
    }

    /**
     * Cleans up all listeners, ghost visuals, and placed sprites.
     */
    public destroy(): void {
        eventBus.off(EVENT_START_PLACEMENT, this.onStartPlacementBound);
        eventBus.off(EVENT_DRAG_MOVE, this.onDragMoveBound);
        eventBus.off(EVENT_DRAG_END, this.onDragEndBound);

        this.scene.input.off('pointermove', this.handleScenePointerMove, this);
        this.scene.input.off('pointerup', this.handleScenePointerUp, this);
        this.scene.input.off('pointerdown', this.handleScenePointerDown, this);

        this.ghostSprite?.destroy();
        this.tileHighlight?.destroy();

        for (const record of this.placedFurnitureMap.values()) {
            record.collider.destroy();
            record.sprite.destroy();
        }
        this.placedFurnitureMap.clear();
    }

    /**
     * Begins dragging a ghost item corresponding to the chosen furniture ID.
     * Looks up the `FurnitureConfig` from the registry and adjusts the
     * ghost sprite texture and highlight dimensions dynamically.
     */
    private startDrag(furnitureId: string, screenX?: number, screenY?: number): void {
        if (!this.isEnabled) {
            return;
        }

        const config = getFurnitureConfig(furnitureId);
        if (config === undefined) {
            console.warn(`PlacementManager: unknown furniture ID "${furnitureId}".`);
            return;
        }

        this.isDragging = true;
        this.currentConfig = config;

        const pixelWidth = config.widthTiles * TILE;
        const pixelHeight = config.heightTiles * TILE;

        if (this.ghostSprite !== null) {
            this.ghostSprite.setTexture(config.texture);
            this.ghostSprite.setDisplaySize(pixelWidth, pixelHeight);
            this.ghostSprite.setVisible(true);
            this.ghostSprite.setAlpha(GHOST_ALPHA);
        }

        if (this.tileHighlight !== null) {
            this.tileHighlight.setSize(pixelWidth, pixelHeight);
            this.tileHighlight.setVisible(true);
        }

        const pointer = this.scene.input.activePointer;
        const initialX = screenX ?? pointer.x;
        const initialY = screenY ?? pointer.y;

        this.updateDragPosition(initialX, initialY);
    }

    /**
     * Updates ghost position with grid snapping and visual feedback (green/red).
     *
     * The ghost and highlight are centred over the multi-tile footprint:
     *   `centreX = rootTileX * TILE + (widthTiles * TILE) / 2`
     *   `centreY = rootTileY * TILE + (heightTiles * TILE) / 2`
     */
    private updateDragPosition(screenX: number, screenY: number): void {
        if (!this.isDragging || this.ghostSprite === null || this.tileHighlight === null || this.currentConfig === null) {
            return;
        }

        const config = this.currentConfig;

        // Convert screen coordinates through camera viewport/zoom into cantina world pixels
        const worldPoint = this.scene.cameras.main.getWorldPoint(screenX, screenY);
        const tileX = Math.floor(worldPoint.x / TILE);
        const tileY = Math.floor(worldPoint.y / TILE);

        this.currentTileX = tileX;
        this.currentTileY = tileY;

        // Snapping: centre the ghost over the multi-tile footprint
        const snappedX = tileX * TILE + (config.widthTiles * TILE) / 2;
        const snappedY = tileY * TILE + (config.heightTiles * TILE) / 2;

        this.ghostSprite.setPosition(snappedX, snappedY);
        this.tileHighlight.setPosition(snappedX, snappedY);

        // Check buildability for the entire footprint through GridManager
        const buildable = this.gridManager.isTileBuildable(
            tileX,
            tileY,
            config.widthTiles,
            config.heightTiles,
        );
        this.isCurrentValid = buildable;

        if (buildable) {
            this.ghostSprite.setTint(TINT_VALID);
            this.tileHighlight.setFillStyle(TINT_VALID, HIGHLIGHT_FILL_ALPHA);
            this.tileHighlight.setStrokeStyle(HIGHLIGHT_STROKE_WIDTH, TINT_VALID, HIGHLIGHT_STROKE_ALPHA);
        } else {
            this.ghostSprite.setTint(TINT_INVALID);
            this.tileHighlight.setFillStyle(TINT_INVALID, HIGHLIGHT_FILL_ALPHA);
            this.tileHighlight.setStrokeStyle(HIGHLIGHT_STROKE_WIDTH, TINT_INVALID, HIGHLIGHT_STROKE_ALPHA);
        }
    }

    /**
     * Finishes drag action on pointer release: places furniture if valid, cancels if invalid.
     */
    private endDrag(screenX: number, screenY: number): void {
        if (!this.isDragging) {
            return;
        }

        // Perform final check at drop coordinates
        this.updateDragPosition(screenX, screenY);

        if (this.isCurrentValid && this.currentConfig !== null) {
            const config = this.currentConfig;
            const tileType = categoryToTileType(config.type);

            const placed = this.gridManager.placeFurniture(
                this.currentTileX,
                this.currentTileY,
                tileType,
                config.id,
                config.widthTiles,
                config.heightTiles,
            );

            if (placed) {
                this.spawnPlacedFurniture(this.currentTileX, this.currentTileY, config);
                eventBus.emit(EVENT_FURNITURE_PLACED, {
                    furnitureId: config.id,
                    tileX: this.currentTileX,
                    tileY: this.currentTileY,
                });
            }
        }

        this.cancelDrag();
    }

    /**
     * Resets drag state and hides ghost indicators.
     */
    private cancelDrag(): void {
        this.isDragging = false;
        this.currentConfig = null;
        this.currentTileX = -1;
        this.currentTileY = -1;
        this.isCurrentValid = false;

        this.ghostSprite?.setVisible(false);
        this.tileHighlight?.setVisible(false);
    }

    /**
     * Instantiates a real, interactive furniture sprite on the map at the
     * given grid coordinates. The sprite is sized to match the furniture
     * config's tile footprint and its Y-depth is calculated from the
     * **bottom edge** of the piece to ensure correct Y-sorting.
     */
    private spawnPlacedFurniture(rootTileX: number, rootTileY: number, config: FurnitureConfig): void {
        const pixelWidth = config.widthTiles * TILE;
        const pixelHeight = config.heightTiles * TILE;

        const snappedX = rootTileX * TILE + pixelWidth / 2;
        const snappedY = rootTileY * TILE + pixelHeight / 2;

        const sprite = this.scene.physics.add.staticImage(snappedX, snappedY, config.texture);
        sprite.setOrigin(0.5, 0.5);
        sprite.setDisplaySize(pixelWidth, pixelHeight);

        // Resize the physics body to cover the full footprint
        sprite.body?.setSize(pixelWidth, pixelHeight);
        sprite.body?.setOffset(0, 0);

        // Y-Sorting depth uses the bottom edge of the furniture piece
        const bottomEdgeY = snappedY + pixelHeight / 2;
        sprite.setDepth(bottomEdgeY);

        sprite.clearTint();
        sprite.setInteractive({ useHandCursor: true });

        const collider = this.scene.physics.add.collider(this.player, sprite);

        // Left click on placed furniture removes it and returns it to inventory
        sprite.on('pointerdown', (pointer: Input.Pointer) => {
            if (this.isDragging) {
                return;
            }

            if (pointer.leftButtonDown()) {
                this.removeFurnitureAt(rootTileX, rootTileY);
            }
        });

        this.placedFurnitureMap.set(this.getTileKey(rootTileX, rootTileY), {
            sprite,
            collider,
            furnitureId: config.id,
            config,
            rootTileX,
            rootTileY,
        });
    }

    /**
     * Creates the ghost image and cell highlight game objects.
     * Initial size is 1×1 tile; `startDrag` resizes dynamically.
     */
    private createVisualIndicators(): void {
        this.tileHighlight = this.scene.add.rectangle(0, 0, TILE, TILE, TINT_VALID, HIGHLIGHT_FILL_ALPHA);
        this.tileHighlight.setStrokeStyle(HIGHLIGHT_STROKE_WIDTH, TINT_VALID, HIGHLIGHT_STROKE_ALPHA);
        this.tileHighlight.setDepth(HIGHLIGHT_DEPTH);
        this.tileHighlight.setVisible(false);

        // Use a 1×1 transparent placeholder; startDrag sets the real texture
        this.ghostSprite = this.scene.add.image(0, 0, '__DEFAULT');
        this.ghostSprite.setOrigin(0.5, 0.5);
        this.ghostSprite.setDepth(GHOST_DEPTH);
        this.ghostSprite.setAlpha(GHOST_ALPHA);
        this.ghostSprite.setVisible(false);
    }

    /**
     * Binds input and event bus handlers.
     */
    private setupEventListeners(): void {
        eventBus.on(EVENT_START_PLACEMENT, this.onStartPlacementBound);
        eventBus.on(EVENT_DRAG_MOVE, this.onDragMoveBound);
        eventBus.on(EVENT_DRAG_END, this.onDragEndBound);

        this.scene.input.on('pointermove', this.handleScenePointerMove, this);
        this.scene.input.on('pointerup', this.handleScenePointerUp, this);
        this.scene.input.on('pointerdown', this.handleScenePointerDown, this);
    }

    private handleScenePointerMove(pointer: Input.Pointer): void {
        if (!this.isDragging) {
            return;
        }
        this.updateDragPosition(pointer.x, pointer.y);
    }

    private handleScenePointerUp(pointer: Input.Pointer): void {
        if (!this.isDragging) {
            return;
        }
        this.endDrag(pointer.x, pointer.y);
    }

    private handleScenePointerDown(pointer: Input.Pointer): void {
        if (!this.isEnabled || this.isDragging || !pointer.leftButtonDown()) {
            return;
        }

        // Allow clicking on a tile to remove placed furniture if sprite click didn't trigger
        const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const tileX = Math.floor(worldPoint.x / TILE);
        const tileY = Math.floor(worldPoint.y / TILE);

        this.removeFurnitureAt(tileX, tileY);
    }

    private getTileKey(tileX: number, tileY: number): string {
        return `${tileX}:${tileY}`;
    }
}
