import { GameObjects, Input, Physics, Scene } from 'phaser';

import {
    PLAYER_BASE_SPEED,
    PLAYER_DASH_SPEED,
    PLAYER_SPRITESHEET_KEY,
} from '../data/constants';
import { GridManager } from '../managers/GridManager';

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
 * Encapsula la física arcade, la máquina de movimiento en 8 direcciones con Dash (Shift),
 * la resolución de animaciones direccionales basadas en spritesheets y la interacción contextual.
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
    private readonly dashKey: Input.Keyboard.Key;

    private facing: FacingDirection = 'down';
    private facingDirection: DirectionVector = VECTOR_DOWN;
    private currentAnimKey: PlayerAnimKey | null = null;

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
        this.dashKey = keyboard.addKey(Input.Keyboard.KeyCodes.SHIFT);

        // Integración en escena y sistema de físicas
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setCollideWorldBounds(true);

        // 2. ESCALADO VISUAL EXACTO A 32x32 (o similar)
        // Asumiendo que el frame original es de 48x48.
        // Si quieres que visualmente ocupe exactamente 32x32: 32 / 48 = ~0.66
        // Puedes ajustar el 48 si tu spritesheet tiene otro tamaño por frame.
        const FRAME_ORIGINAL_SIZE = 64;
        const TILE_TARGET_SIZE = 32;
        const scaleFactor = TILE_TARGET_SIZE / FRAME_ORIGINAL_SIZE;
        this.setScale(scaleFactor);
        // Huella de colisión en los pies (28x24 px centrada en el frame de 150x150)
        // Offset X = (150 - 28) / 2 = 61 (simétrico para que flipX no desplace el body)
        // Offset Y = 139 - 24 = 115 (la suela de las botas de Wuher está en Y=139)
        this.setSize(28, 24);
        this.setOffset(61, 115);

        // Estado inicial de animación
        this.playAnimation(PLAYER_ANIM_KEYS.IDLE_DOWN);

        // Limpieza segura de listeners al destruirse el objeto (Regla SRP y Memory Leaks)
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
     * - Lee la entrada del teclado (WASD + Shift).
     * - Resuelve dirección y velocidad física.
     * - Actualiza eficientemente la animación y orientación (flipX) sin sobrecoste.
     * - Procesa la acción contextual de interacción con la tecla Espacio.
     */
    public update(): void {
        const horizontal = Number(this.movementKeys.right.isDown) - Number(this.movementKeys.left.isDown);
        const vertical = Number(this.movementKeys.down.isDown) - Number(this.movementKeys.up.isDown);

        const isMoving = horizontal !== 0 || vertical !== 0;

        if (isMoving) {
            const length = Math.hypot(horizontal, vertical);
            const dirX = horizontal / length;
            const dirY = vertical / length;

            const isDashing = this.dashKey.isDown;
            const currentSpeed = isDashing ? PLAYER_DASH_SPEED : PLAYER_BASE_SPEED;

            this.setVelocity(dirX * currentSpeed, dirY * currentSpeed);

            this.facing = this.resolveFacing(horizontal, vertical, this.facing);
            this.updateFacingVector(this.facing);

            // Ajuste de orientación visual
            this.setFlipX(this.facing === 'left');

            // Ajuste dinámico de velocidad de animación si está corriendo
            this.anims.timeScale = isDashing ? 1.35 : 1.0;

            const walkAnimKey = this.getWalkAnimKey(this.facing);
            this.playAnimation(walkAnimKey);
        } else {
            this.setVelocity(0, 0);
            this.anims.timeScale = 1.0;

            this.setFlipX(this.facing === 'left');

            const idleAnimKey = this.getIdleAnimKey(this.facing);
            this.playAnimation(idleAnimKey);
        }

        if (Input.Keyboard.JustDown(this.interactionKey)) {
            this.interactWithTileInFront();
        }
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

        // En movimiento diagonal, si la dirección actual coincide con uno de los componentes, se preserva
        if (horizontal > 0 && currentFacing === 'right') return 'right';
        if (horizontal < 0 && currentFacing === 'left') return 'left';
        if (vertical > 0 && currentFacing === 'down') return 'down';
        if (vertical < 0 && currentFacing === 'up') return 'up';

        // Preferencia por defecto en diagonales simétricas
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

    /**
     * Obtiene la clave de animación de andar según la orientación.
     */
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

    /**
     * Obtiene la clave de animación en reposo (idle) según la última orientación.
     */
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

    /**
     * Reproduce una animación únicamente si difiere de la actual, evitando llamadas redundantes a Phaser.
     */
    private playAnimation(animKey: PlayerAnimKey): void {
        if (this.currentAnimKey !== animKey) {
            this.currentAnimKey = animKey;
            this.play(animKey, true);
        }
    }

    /**
     * Comprueba e interactúa con el tile situado inmediatamente delante de los pies del jugador.
     */
    private interactWithTileInFront(): void {
        const originX = this.body !== null ? this.body.center.x : this.x;
        const originY = this.body !== null ? this.body.center.y : this.y;

        const targetX = originX + this.facingDirection.x * this.gridManager.tilemap.tileWidth;
        const targetY = originY + this.facingDirection.y * this.gridManager.tilemap.tileHeight;

        const tileType = this.gridManager.getTileTypeAtWorldPosition(targetX, targetY);
        console.log(`Interactuando con: ${tileType}`);
    }

    /**
     * Limpia los listeners de teclado asociados para prevenir fugas de memoria al cambiar de escena.
     */
    private cleanup(): void {
        const keyboard = this.scene.input.keyboard;
        if (keyboard !== null) {
            keyboard.removeKey(this.movementKeys.up);
            keyboard.removeKey(this.movementKeys.down);
            keyboard.removeKey(this.movementKeys.left);
            keyboard.removeKey(this.movementKeys.right);
            keyboard.removeKey(this.interactionKey);
            keyboard.removeKey(this.dashKey);
        }
    }
}
