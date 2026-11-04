import { GameObjects, Input, Physics, Scene } from 'phaser';

import {
    PLAYER_BASE_SPEED,
    PLAYER_HAND_OFFSET_X,
    PLAYER_HAND_OFFSET_Y,
    PLAYER_SPRITESHEET_KEY,
} from '../data/constants';
import { GAME_REGISTRY } from '../data/GameRegistry';
import { InteractableObject } from './InteractableObject';
import type { InteractableObjectType } from './InteractableObject';
import type { ClientPosition } from './Client';
import { BeverageTower } from './stations/BeverageTower';
import { Grill } from './stations/Grill';
import type { Station } from './stations/Station';
import {
    GridManager,
    TILE_TYPE_BAR,
    TILE_TYPE_CHAIR,
    TILE_TYPE_TABLE,
} from '../managers/GridManager';
import {
    EVENT_GAME_WARNING,
    EVENT_PLAYER_ACTION_PROGRESS,
    GAME_MODE_NIGHT,
    eventBus,
    type PlayerActionProgressData,
} from '../utils/EventBus';

/**
 * Claves de animación registradas en el gestor global de animaciones de Phaser.
 */
export const PLAYER_ANIM_KEYS = {
    IDLE_DOWN: 'wuher-idle-down',
    IDLE_UP: 'wuher-idle-up',
    IDLE_SIDE: 'wuher-idle-side',
    WALK_DOWN: 'wuher-walk-down',
    WALK_UP: 'wuher-walk-up',
    WALK_SIDE: 'wuher-walk-side',
} as const;

export type PlayerAnimKey = (typeof PLAYER_ANIM_KEYS)[keyof typeof PLAYER_ANIM_KEYS];

/**
 * Direcciones cardinales hacia las que puede mirar el jugador.
 */
export type FacingDirection = 'down' | 'up' | 'left' | 'right';

/**
 * Vector de dirección normalizado en 2D.
 */
export interface DirectionVector {
    readonly x: number;
    readonly y: number;
}

const VECTOR_DOWN: DirectionVector = { x: 0, y: 1 };
const VECTOR_UP: DirectionVector = { x: 0, y: -1 };
const VECTOR_LEFT: DirectionVector = { x: -1, y: 0 };
const VECTOR_RIGHT: DirectionVector = { x: 1, y: 0 };

/**
 * Clase que representa a Wuher, el tabernero y personaje jugable.
 * Encapsula la física arcade, movimiento en 8 direcciones, resolución de animaciones
 * direccionales, sistema de acarreo en mano derecha y contextualización de interacciones.
 */
export class Player extends Physics.Arcade.Sprite {
    private readonly gridManager: GridManager;
    private readonly movementKeys: {
        readonly up: Input.Keyboard.Key;
        readonly down: Input.Keyboard.Key;
        readonly left: Input.Keyboard.Key;
        readonly right: Input.Keyboard.Key;
    };
    private readonly interactionKey: Input.Keyboard.Key;
    private heldObject: InteractableObject | null = null;
    private fillingStation: BeverageTower | null = null;
    private readonly actionProgressBackground: GameObjects.Rectangle;
    private readonly actionProgressFill: GameObjects.Rectangle;

    private facing: FacingDirection = 'down';
    private facingDirection: DirectionVector = VECTOR_DOWN;
    private currentAnimKey: PlayerAnimKey | null = null;
    private nightInteractionHandler: ((tileX: number, tileY: number) => boolean) | null = null;
    private nightHoldInteractionHandler: (
        target: ClientPosition | null,
        interactionHeld: boolean,
        handsEmpty: boolean,
        deltaMs: number,
    ) => boolean = () => false;
    private movementEnabled = true;

    public constructor(scene: Scene, x: number, y: number, gridManager: GridManager) {
        super(scene, x, y, PLAYER_SPRITESHEET_KEY, 0);

        this.gridManager = gridManager;

        // Registro de animaciones globales de forma idempotente
        Player.initAnimations(scene);

        // Configuración de controles
        const keyboard = scene.input.keyboard;
        if (keyboard === null) {
            throw new Error('No se encontró el gestor de teclado en la escena para inicializar al jugador.');
        }

        const keys = keyboard.addKeys({
            up: Input.Keyboard.KeyCodes.W,
            down: Input.Keyboard.KeyCodes.S,
            left: Input.Keyboard.KeyCodes.A,
            right: Input.Keyboard.KeyCodes.D,
        }) as {
            up: Input.Keyboard.Key;
            down: Input.Keyboard.Key;
            left: Input.Keyboard.Key;
            right: Input.Keyboard.Key;
        };

        this.movementKeys = keys;
        this.interactionKey = keyboard.addKey(Input.Keyboard.KeyCodes.SPACE);

        // Integración en escena y sistema de físicas
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setCollideWorldBounds(true);

        // Escalado visual exacto a 32x32
        const FRAME_ORIGINAL_SIZE = 64;
        const TILE_TARGET_SIZE = 32;
        const scaleFactor = TILE_TARGET_SIZE / FRAME_ORIGINAL_SIZE;
        this.setScale(scaleFactor);

        // Huella de colisión en los pies (28x24 px centrada en el frame de 150x150)
        this.setSize(28, 24);
        this.setOffset(61, 115);

        const progressConfig = GAME_REGISTRY.ui;
        this.actionProgressBackground = scene.add.rectangle(
            x,
            y + progressConfig.playerProgressOffsetY,
            progressConfig.playerProgressWidth,
            progressConfig.playerProgressHeight,
            progressConfig.playerProgressBackgroundColor,
        ).setStrokeStyle(1, 0x0b0b0b, 1).setVisible(false);
        this.actionProgressFill = scene.add.rectangle(
            x - progressConfig.playerProgressWidth / 2,
            y + progressConfig.playerProgressOffsetY,
            progressConfig.playerProgressWidth,
            progressConfig.playerProgressHeight,
            progressConfig.playerProgressFillColor,
        ).setOrigin(0, 0.5).setScale(0, 1).setVisible(false);
        eventBus.on(EVENT_PLAYER_ACTION_PROGRESS, this.handleActionProgress, this);

        // Estado inicial de animación
        this.playAnimation(PLAYER_ANIM_KEYS.IDLE_DOWN);

        // Limpieza segura de listeners al destruirse el objeto
        this.once(GameObjects.Events.DESTROY, this.cleanup, this);
    }

    /**
     * Inicializa las animaciones globales del jugador en el AnimationManager si no existen.
     */
    public static initAnimations(scene: Scene): void {
        const anims = scene.anims;

        if (!anims.exists(PLAYER_ANIM_KEYS.IDLE_DOWN)) {
            anims.create({
                key: PLAYER_ANIM_KEYS.IDLE_DOWN,
                frames: [{ key: PLAYER_SPRITESHEET_KEY, frame: 0 }],
                frameRate: 1,
                repeat: -1,
            });
        }

        if (!anims.exists(PLAYER_ANIM_KEYS.IDLE_UP)) {
            anims.create({
                key: PLAYER_ANIM_KEYS.IDLE_UP,
                frames: [{ key: PLAYER_SPRITESHEET_KEY, frame: 1 }],
                frameRate: 1,
                repeat: -1,
            });
        }

        if (!anims.exists(PLAYER_ANIM_KEYS.IDLE_SIDE)) {
            anims.create({
                key: PLAYER_ANIM_KEYS.IDLE_SIDE,
                frames: [{ key: PLAYER_SPRITESHEET_KEY, frame: 2 }],
                frameRate: 1,
                repeat: -1,
            });
        }

        if (!anims.exists(PLAYER_ANIM_KEYS.WALK_DOWN)) {
            anims.create({
                key: PLAYER_ANIM_KEYS.WALK_DOWN,
                frames: anims.generateFrameNumbers(PLAYER_SPRITESHEET_KEY, { start: 4, end: 7 }),
                frameRate: 8,
                repeat: -1,
            });
        }

        if (!anims.exists(PLAYER_ANIM_KEYS.WALK_UP)) {
            anims.create({
                key: PLAYER_ANIM_KEYS.WALK_UP,
                frames: anims.generateFrameNumbers(PLAYER_SPRITESHEET_KEY, { start: 8, end: 11 }),
                frameRate: 8,
                repeat: -1,
            });
        }

        if (!anims.exists(PLAYER_ANIM_KEYS.WALK_SIDE)) {
            anims.create({
                key: PLAYER_ANIM_KEYS.WALK_SIDE,
                frames: anims.generateFrameNumbers(PLAYER_SPRITESHEET_KEY, { start: 12, end: 15 }),
                frameRate: 8,
                repeat: -1,
            });
        }
    }

    /**
     * Bucle principal de actualización del jugador:
     * - Lee la entrada del teclado (WASD).
     * - Resuelve dirección y velocidad física.
     * - Actualiza eficientemente la animación y orientación (flipX).
     * - Procesa la acción contextual de interacción con la tecla Espacio.
     * - Mantiene el objeto acarreado sincronizado en la mano derecha de Wuher.
     */
    public update(delta: number): void {
        if (!this.movementEnabled) {
            this.setVelocity(0, 0);
            this.playAnimation(this.getIdleAnimKey(this.facing));
            this.updateHeldObjectPosition();
            this.updateActionProgressPosition();
            return;
        }
        const horizontal = Number(this.movementKeys.right.isDown) - Number(this.movementKeys.left.isDown);
        const vertical = Number(this.movementKeys.down.isDown) - Number(this.movementKeys.up.isDown);

        const isMoving = horizontal !== 0 || vertical !== 0;

        if (isMoving) {
            const length = Math.hypot(horizontal, vertical);
            const dirX = horizontal / length;
            const dirY = vertical / length;

            this.setVelocity(dirX * PLAYER_BASE_SPEED, dirY * PLAYER_BASE_SPEED);

            this.facing = this.resolveFacing(horizontal, vertical, this.facing);
            this.updateFacingVector(this.facing);

            // Ajuste de orientación visual
            this.setFlipX(this.facing === 'left');

            this.anims.timeScale = 1.0;

            const walkAnimKey = this.getWalkAnimKey(this.facing);
            this.playAnimation(walkAnimKey);
        } else {
            this.setVelocity(0, 0);
            this.anims.timeScale = 1.0;

            this.setFlipX(this.facing === 'left');

            const idleAnimKey = this.getIdleAnimKey(this.facing);
            this.playAnimation(idleAnimKey);
        }

        const frontTile = this.getFrontTile();
        if (this.scene.registry.get('gameMode') !== GAME_MODE_NIGHT) {
            if (
                frontTile !== null
                && Input.Keyboard.JustDown(this.interactionKey)
                && (this.nightInteractionHandler?.(frontTile.tileX, frontTile.tileY) ?? false)
            ) {
                this.updateHeldObjectPosition();
                this.updateActionProgressPosition();
                return;
            }
            this.nightHoldInteractionHandler(null, false, this.heldObject === null, delta);
            this.cancelFilling();
            this.updateHeldObjectPosition();
            this.updateActionProgressPosition();
            return;
        }

        const holdInteractionHandled = this.nightHoldInteractionHandler(
            frontTile,
            this.interactionKey.isDown,
            this.heldObject === null,
            delta,
        );
        if (holdInteractionHandled) {
            this.cancelFilling();
            this.updateHeldObjectPosition();
            this.updateActionProgressPosition();
            return;
        }

        if (frontTile !== null) {
            const station = this.gridManager.getStationAt(frontTile.tileX, frontTile.tileY);

            // Filling an empty cup held in hand at BeverageTower
            if (this.heldObject !== null && this.heldObject.isEmptyCup() && station instanceof BeverageTower) {
                if (this.interactionKey.isDown && !station.isFilling(this.heldObject)) {
                    station.startFilling(this.heldObject);
                }
                station.updateFilling(delta, this.interactionKey.isDown);
                this.fillingStation = station;
            } else if (
                Input.Keyboard.JustDown(this.interactionKey)
                && !(this.nightInteractionHandler?.(frontTile.tileX, frontTile.tileY) ?? false)
            ) {
                this.interactWithTileInFront(frontTile.tileX, frontTile.tileY, station);
            } else if (this.fillingStation !== null) {
                this.fillingStation.cancelFilling();
                this.fillingStation = null;
            }
        } else if (this.fillingStation !== null) {
            this.fillingStation.cancelFilling();
            this.fillingStation = null;
        }

        this.updateHeldObjectPosition();
        this.updateActionProgressPosition();
    }

    public setMovementEnabled(enabled: boolean): void {
        this.movementEnabled = enabled;
        if (!enabled) {
            this.setVelocity(0, 0);
            this.playAnimation(this.getIdleAnimKey(this.facing));
        }
    }

    /** Registers a scene-owned contextual handler; return true when it consumed the action. */
    public setNightInteractionHandler(handler: ((tileX: number, tileY: number) => boolean) | null): void {
        this.nightInteractionHandler = handler;
    }

    public setNightHoldInteractionHandler(
        handler: ((
            target: ClientPosition | null,
            interactionHeld: boolean,
            handsEmpty: boolean,
            deltaMs: number,
        ) => boolean) | null,
    ): void {
        this.nightHoldInteractionHandler = handler ?? (() => false);
    }

    public getFacingTile(): { readonly tileX: number; readonly tileY: number } | null {
        return this.getFrontTile();
    }

    public getHeldObjectType(): InteractableObjectType | null {
        return this.heldObject?.getObjectType() ?? null;
    }

    /** Destroys the held service item only when it matches the expected order item. */
    public consumeHeldObject(expectedType: InteractableObjectType): boolean {
        if (this.heldObject === null || this.heldObject.getObjectType() !== expectedType) {
            return false;
        }

        this.heldObject.destroy();
        this.heldObject = null;
        return true;
    }

    /**
     * Mantiene el objeto acarreado perfectamente ubicado en la mano derecha del jugador.
     */
    private updateHeldObjectPosition(): void {
        if (this.heldObject === null) {
            return;
        }

        const offsetX = this.flipX ? -PLAYER_HAND_OFFSET_X : PLAYER_HAND_OFFSET_X;
        const depthOffset = this.facing === 'up' ? -1 : 1;

        this.heldObject.updateHeldPosition(
            this.x,
            this.y,
            offsetX,
            PLAYER_HAND_OFFSET_Y,
            this.depth + depthOffset,
        );
    }

    private cancelFilling(): void {
        if (this.fillingStation !== null) {
            this.fillingStation.cancelFilling();
            this.fillingStation = null;
        }
    }

    private handleActionProgress(data: PlayerActionProgressData): void {
        if (!data.active) {
            this.actionProgressBackground.setVisible(false);
            this.actionProgressFill.setVisible(false).setScale(0, 1);
            return;
        }

        const progress = Math.max(0, Math.min(1, data.progress / 100));
        this.actionProgressBackground.setVisible(true);
        this.actionProgressFill.setVisible(true).setScale(progress, 1);
    }

    private updateActionProgressPosition(): void {
        const config = GAME_REGISTRY.ui;
        const progressY = this.y + config.playerProgressOffsetY;
        const depth = this.depth + config.playerProgressDepthOffset;
        this.actionProgressBackground.setPosition(this.x, progressY).setDepth(depth);
        this.actionProgressFill
            .setPosition(this.x - config.playerProgressWidth / 2, progressY)
            .setDepth(depth + 1);
    }

    /**
     * Resuelve la dirección cardinal evitando fluctuaciones rápidas en movimiento diagonal (histéresis).
     */
    private resolveFacing(horizontal: number, vertical: number, currentFacing: FacingDirection): FacingDirection {
        if (horizontal !== 0 && vertical === 0) {
            return horizontal > 0 ? 'right' : 'left';
        }

        if (vertical !== 0 && horizontal === 0) {
            return vertical > 0 ? 'down' : 'up';
        }

        if (horizontal > 0 && currentFacing === 'right') return 'right';
        if (horizontal < 0 && currentFacing === 'left') return 'left';
        if (vertical > 0 && currentFacing === 'down') return 'down';
        if (vertical < 0 && currentFacing === 'up') return 'up';

        return horizontal > 0 ? 'right' : 'left';
    }

    /**
     * Actualiza el vector ortogonal hacia donde mira el jugador para cálculos de interacción.
     */
    private updateFacingVector(facing: FacingDirection): void {
        switch (facing) {
            case 'down':
                this.facingDirection = VECTOR_DOWN;
                break;
            case 'up':
                this.facingDirection = VECTOR_UP;
                break;
            case 'left':
                this.facingDirection = VECTOR_LEFT;
                break;
            case 'right':
                this.facingDirection = VECTOR_RIGHT;
                break;
        }
    }

    private getWalkAnimKey(facing: FacingDirection): PlayerAnimKey {
        switch (facing) {
            case 'down':
                return PLAYER_ANIM_KEYS.WALK_DOWN;
            case 'up':
                return PLAYER_ANIM_KEYS.WALK_UP;
            case 'left':
            case 'right':
                return PLAYER_ANIM_KEYS.WALK_SIDE;
        }
    }

    private getIdleAnimKey(facing: FacingDirection): PlayerAnimKey {
        switch (facing) {
            case 'down':
                return PLAYER_ANIM_KEYS.IDLE_DOWN;
            case 'up':
                return PLAYER_ANIM_KEYS.IDLE_UP;
            case 'left':
            case 'right':
                return PLAYER_ANIM_KEYS.IDLE_SIDE;
        }
    }

    private playAnimation(animKey: PlayerAnimKey): void {
        if (this.currentAnimKey !== animKey) {
            this.currentAnimKey = animKey;
            this.play(animKey, true);
        }
    }

    /**
     * Comprueba e interactúa con el tile o estación frente al jugador.
     */
    private interactWithTileInFront(tileX: number, tileY: number, station: Station | null): void {
        const surfaceTile = this.resolveSurfaceInteractionTile(tileX, tileY);
        const targetTileX = surfaceTile?.tileX ?? tileX;
        const targetTileY = surfaceTile?.tileY ?? tileY;
        const resolvedStation = station
            ?? this.gridManager.getStationAt(tileX, tileY)
            ?? this.gridManager.getStationAt(targetTileX, targetTileY);

        // Interacción con Parrilla
        if (resolvedStation instanceof Grill) {
            if (resolvedStation.isCooking()) {
                eventBus.emit(EVENT_GAME_WARNING, { message: 'La comida se está cocinando...' });
                return;
            }

            if (resolvedStation.isFoodReady()) {
                if (this.heldObject !== null) {
                    eventBus.emit(EVENT_GAME_WARNING, { message: '¡Tienes las manos ocupadas!' });
                    return;
                }

                const food = resolvedStation.takeFood();
                if (food !== null) {
                    this.heldObject = food;
                    food.pickUp();
                }
                return;
            }

            if (this.heldObject !== null) {
                eventBus.emit(EVENT_GAME_WARNING, { message: '¡Tienes las manos ocupadas para cocinar!' });
                return;
            }

            if (!resolvedStation.canStartCooking()) {
                eventBus.emit(EVENT_GAME_WARNING, { message: '¡No quedan ingredientes para cocinar!' });
                return;
            }

            resolvedStation.startCooking();
            return;
        }

        // Interacción con Torre Central de Bebidas
        if (resolvedStation instanceof BeverageTower) {
            if (this.heldObject === null) {
                eventBus.emit(EVENT_GAME_WARNING, {
                    message: 'Necesitas traer un vaso vacío para llenarlo.',
                });
                return;
            }

            if (this.heldObject.isFoodPlate()) {
                eventBus.emit(EVENT_GAME_WARNING, {
                    message: 'No puedes llenar comida en la torre de bebidas.',
                });
                return;
            }

            if (this.heldObject.isFilledCup()) {
                eventBus.emit(EVENT_GAME_WARNING, {
                    message: 'Esta bebida ya está llena.',
                });
                return;
            }

            if (this.heldObject.isEmptyCup()) {
                eventBus.emit(EVENT_GAME_WARNING, {
                    message: 'Mantén ESPACIO para llenar la jarra.',
                });
                return;
            }
        }

        // Recoger objeto existente en superficie (mesa o barra)
        if (this.heldObject === null) {
            const object = this.gridManager.removeInteractableObject(targetTileX, targetTileY);
            if (object !== null) {
                this.heldObject = object;
                object.pickUp();
            }
            return;
        }

        // Depositar objeto acarreado sobre superficie válida (mesa o barra)
        const tileType = this.gridManager.getTileTypeAtGrid(targetTileX, targetTileY);
        const isValidSurface = tileType === TILE_TYPE_TABLE || tileType === TILE_TYPE_BAR;
        if (isValidSurface && this.gridManager.getInteractableObjectAt(targetTileX, targetTileY) === null) {
            const object = this.heldObject;
            object.drop(targetTileX, targetTileY);
            if (this.gridManager.registerInteractableObject(object, targetTileX, targetTileY)) {
                this.heldObject = null;
            }
        }
    }

    /** Uses a table or bar from the far side of one chair tile. */
    private resolveSurfaceInteractionTile(
        tileX: number,
        tileY: number,
    ): { readonly tileX: number; readonly tileY: number } | null {
        if (this.gridManager.getTileTypeAtGrid(tileX, tileY) !== TILE_TYPE_CHAIR) return null;

        const targetTileX = tileX + this.facingDirection.x;
        const targetTileY = tileY + this.facingDirection.y;
        const targetType = this.gridManager.getTileTypeAtGrid(targetTileX, targetTileY);
        return targetType === TILE_TYPE_TABLE || targetType === TILE_TYPE_BAR
            ? { tileX: targetTileX, tileY: targetTileY }
            : null;
    }

    private getFrontTile(): { tileX: number; tileY: number } | null {
        const body = this.body;
        const originX = body !== null ? body.center.x : this.x;
        const originY = body !== null ? body.center.y : this.y;

        const halfWidth = body !== null ? body.width / 2 : 14;
        const halfHeight = body !== null ? body.height / 2 : 12;
        const forwardReach = 16;

        const targetX = originX + this.facingDirection.x * (halfWidth + forwardReach);
        const targetY = originY + this.facingDirection.y * (halfHeight + forwardReach);

        const tileX = this.gridManager.tilemap.worldToTileX(targetX);
        const tileY = this.gridManager.tilemap.worldToTileY(targetY);
        if (tileX === null || tileY === null) {
            return null;
        }
        return { tileX, tileY };
    }

    /**
     * Limpia los listeners de teclado asociados para prevenir fugas de memoria al cambiar de escena.
     */
    private cleanup(): void {
        eventBus.off(EVENT_PLAYER_ACTION_PROGRESS, this.handleActionProgress, this);
        this.actionProgressBackground.destroy();
        this.actionProgressFill.destroy();
        const keyboard = this.scene.input.keyboard;
        if (keyboard !== null) {
            keyboard.removeKey(this.movementKeys.up);
            keyboard.removeKey(this.movementKeys.down);
            keyboard.removeKey(this.movementKeys.left);
            keyboard.removeKey(this.movementKeys.right);
            keyboard.removeKey(this.interactionKey);
        }
    }
}
