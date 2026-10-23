import { GameObjects, Input, Physics, Scene, Types } from 'phaser';

import { TILE } from '../data/constants';
import { Player } from '../entities/Player';
import {
    EVENT_DRAG_END,
    EVENT_DRAG_MOVE,
    EVENT_FURNITURE_PLACED,
    EVENT_FURNITURE_REMOVED,
    EVENT_START_PLACEMENT,
    eventBus,
    type FurnitureType,
    type PlacementEndData,
    type PlacementMoveData,
    type PlacementStartData,
} from '../utils/EventBus';
import { GridManager } from './GridManager';

interface PlacedFurnitureRecord {
    readonly sprite: Types.Physics.Arcade.ImageWithStaticBody;
    readonly collider: Physics.Arcade.Collider;
    readonly type: FurnitureType;
    readonly tileX: number;
    readonly tileY: number;
}

const TEXTURE_MESA = 'furniture_mesa';
const TEXTURE_SILLA = 'furniture_silla';

const TINT_VALID = 0x00ff00;
const TINT_INVALID = 0xff0000;

/**
 * Handles the Drag & Drop placement and removal of cantina furniture
 * (Mesas and Sillas) during the Pre-Opening Construction phase.
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
    private currentType: FurnitureType | null = null;
    private currentTileX: number = -1;
    private currentTileY: number = -1;
    private isCurrentValid: boolean = false;

    private ghostSprite: GameObjects.Image | null = null;
    private tileHighlight: GameObjects.Rectangle | null = null;

    private readonly placedFurnitureMap: Map<string, PlacedFurnitureRecord> = new Map();

    private readonly onStartPlacementBound = (data: PlacementStartData): void => {
        this.startDrag(data.type, data.screenX, data.screenY);
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

        this.ensureTextures();
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
     * Removes dynamically placed furniture at grid coordinates and returns it to inventory.
     *
     * @param tileX Grid X coordinate.
     * @param tileY Grid Y coordinate.
     * @returns True if furniture was removed, false if none existed at those coordinates.
     */
    public removeFurnitureAt(tileX: number, tileY: number): boolean {
        const key = this.getTileKey(tileX, tileY);
        const record = this.placedFurnitureMap.get(key);

        if (record === undefined) {
            return false;
        }

        record.collider.destroy();
        record.sprite.destroy();
        this.placedFurnitureMap.delete(key);
        this.gridManager.removeFurniture(tileX, tileY);

        eventBus.emit(EVENT_FURNITURE_REMOVED, {
            type: record.type,
            tileX,
            tileY,
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
     * Begins dragging a ghost item corresponding to the chosen furniture type.
     */
    private startDrag(type: FurnitureType, screenX?: number, screenY?: number): void {
        if (!this.isEnabled) {
            return;
        }
        this.isDragging = true;
        this.currentType = type;

        const textureKey = type === 'MESA' ? TEXTURE_MESA : TEXTURE_SILLA;
        if (this.ghostSprite !== null) {
            this.ghostSprite.setTexture(textureKey);
            this.ghostSprite.setVisible(true);
            this.ghostSprite.setAlpha(0.75);
        }

        if (this.tileHighlight !== null) {
            this.tileHighlight.setVisible(true);
        }

        const pointer = this.scene.input.activePointer;
        const initialX = screenX ?? pointer.x;
        const initialY = screenY ?? pointer.y;

        this.updateDragPosition(initialX, initialY);
    }

    /**
     * Updates ghost position with grid snapping and visual feedback (green/red).
     */
    private updateDragPosition(screenX: number, screenY: number): void {
        if (!this.isDragging || this.ghostSprite === null || this.tileHighlight === null) {
            return;
        }

        // Convert screen coordinates through camera viewport/zoom into cantina world pixels
        const worldPoint = this.scene.cameras.main.getWorldPoint(screenX, screenY);
        const tileX = Math.floor(worldPoint.x / TILE);
        const tileY = Math.floor(worldPoint.y / TILE);

        this.currentTileX = tileX;
        this.currentTileY = tileY;

        // Snapping: position center of the 32x32 grid tile
        const snappedX = (tileX + 0.5) * TILE;
        const snappedY = (tileY + 0.5) * TILE;

        this.ghostSprite.setPosition(snappedX, snappedY);
        this.tileHighlight.setPosition(snappedX, snappedY);

        // Check buildability through GridManager
        const buildable = this.gridManager.isTileBuildable(tileX, tileY);
        this.isCurrentValid = buildable;

        if (buildable) {
            this.ghostSprite.setTint(TINT_VALID);
            this.tileHighlight.setFillStyle(TINT_VALID, 0.35);
            this.tileHighlight.setStrokeStyle(1.5, TINT_VALID, 0.9);
        } else {
            this.ghostSprite.setTint(TINT_INVALID);
            this.tileHighlight.setFillStyle(TINT_INVALID, 0.35);
            this.tileHighlight.setStrokeStyle(1.5, TINT_INVALID, 0.9);
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

        if (this.isCurrentValid && this.currentType !== null) {
            const placed = this.gridManager.placeFurniture(
                this.currentTileX,
                this.currentTileY,
                this.currentType,
            );

            if (placed) {
                this.spawnPlacedFurniture(this.currentTileX, this.currentTileY, this.currentType);
                eventBus.emit(EVENT_FURNITURE_PLACED, {
                    type: this.currentType,
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
        this.currentType = null;
        this.currentTileX = -1;
        this.currentTileY = -1;
        this.isCurrentValid = false;

        this.ghostSprite?.setVisible(false);
        this.tileHighlight?.setVisible(false);
    }

    /**
     * Instantiates real, interactive furniture on the map at the given grid coordinates.
     */
    private spawnPlacedFurniture(tileX: number, tileY: number, type: FurnitureType): void {
        const textureKey = type === 'MESA' ? TEXTURE_MESA : TEXTURE_SILLA;
        const snappedX = (tileX + 0.5) * TILE;
        const snappedY = (tileY + 0.5) * TILE;

        const sprite = this.scene.physics.add.staticImage(snappedX, snappedY, textureKey);
        sprite.setOrigin(0.5, 0.5);
        sprite.setDepth(5);
        sprite.clearTint();
        sprite.setInteractive({ useHandCursor: true });
        const collider = this.scene.physics.add.collider(this.player, sprite);

        // Left click on placed furniture removes it and returns it to inventory
        sprite.on('pointerdown', (pointer: Input.Pointer) => {
            if (this.isDragging) {
                return;
            }

            if (pointer.leftButtonDown()) {
                this.removeFurnitureAt(tileX, tileY);
            }
        });

        this.placedFurnitureMap.set(this.getTileKey(tileX, tileY), {
            sprite,
            collider,
            type,
            tileX,
            tileY,
        });
    }

    /**
     * Creates the ghost image and 32x32 cell highlight game objects.
     */
    private createVisualIndicators(): void {
        this.tileHighlight = this.scene.add.rectangle(0, 0, TILE, TILE, TINT_VALID, 0.35);
        this.tileHighlight.setStrokeStyle(1.5, TINT_VALID, 0.9);
        this.tileHighlight.setDepth(15);
        this.tileHighlight.setVisible(false);

        this.ghostSprite = this.scene.add.image(0, 0, TEXTURE_MESA);
        this.ghostSprite.setOrigin(0.5, 0.5);
        this.ghostSprite.setDepth(16);
        this.ghostSprite.setAlpha(0.75);
        this.ghostSprite.setVisible(false);
    }

    /**
     * Generates clean procedural textures for Mesa and Silla if they don't already exist.
     */
    private ensureTextures(): void {
        if (!this.scene.textures.exists(TEXTURE_MESA)) {
            const graphics = this.scene.make.graphics({ x: 0, y: 0 });

            // Table base & surface
            graphics.fillStyle(0x784212);
            graphics.fillCircle(16, 16, 14);
            graphics.lineStyle(2, 0xd4ac0d, 1);
            graphics.strokeCircle(16, 16, 14);

            // Inner wood disc
            graphics.fillStyle(0xa0522d);
            graphics.fillCircle(16, 16, 11);

            // Central metal bolt / plate
            graphics.fillStyle(0x2c3e50);
            graphics.fillCircle(16, 16, 4);
            graphics.lineStyle(1, 0xbdc3c7, 1);
            graphics.strokeCircle(16, 16, 4);

            graphics.generateTexture(TEXTURE_MESA, 32, 32);
            graphics.destroy();
        }

        if (!this.scene.textures.exists(TEXTURE_SILLA)) {
            const graphics = this.scene.make.graphics({ x: 0, y: 0 });

            // Cantina stool legs
            graphics.lineStyle(2, 0x34495e, 1);
            graphics.lineBetween(8, 8, 24, 24);
            graphics.lineBetween(8, 24, 24, 8);

            // Seat cushion
            graphics.fillStyle(0x2980b9);
            graphics.fillCircle(16, 16, 9);
            graphics.lineStyle(2, 0x5dade2, 1);
            graphics.strokeCircle(16, 16, 9);

            // Center rivet
            graphics.fillStyle(0x1f618d);
            graphics.fillCircle(16, 16, 4);

            graphics.generateTexture(TEXTURE_SILLA, 32, 32);
            graphics.destroy();
        }
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
