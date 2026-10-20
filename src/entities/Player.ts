import { Input, Physics, Scene } from 'phaser';

import { GridManager } from '../managers/GridManager';

const PLAYER_TEXTURE_KEY = 'player-placeholder';
const PLAYER_SPEED = 160;
const FACING_DOWN = { x: 0, y: 1 };

type Direction = {
    x: number;
    y: number;
};

export class Player extends Physics.Arcade.Sprite {
    private readonly gridManager: GridManager;
    private readonly movementKeys: {
        up: Input.Keyboard.Key;
        down: Input.Keyboard.Key;
        left: Input.Keyboard.Key;
        right: Input.Keyboard.Key;
    };
    private readonly interactionKey: Input.Keyboard.Key;
    private facingDirection: Direction = FACING_DOWN;

    public constructor(scene: Scene, x: number, y: number, gridManager: GridManager) {
        super(scene, x, y, PLAYER_TEXTURE_KEY);

        this.gridManager = gridManager;
        this.movementKeys = scene.input.keyboard!.addKeys({
            up: Input.Keyboard.KeyCodes.W,
            down: Input.Keyboard.KeyCodes.S,
            left: Input.Keyboard.KeyCodes.A,
            right: Input.Keyboard.KeyCodes.D
        }) as {
            up: Input.Keyboard.Key;
            down: Input.Keyboard.Key;
            left: Input.Keyboard.Key;
            right: Input.Keyboard.Key;
        };
        this.interactionKey = scene.input.keyboard!.addKey(Input.Keyboard.KeyCodes.SPACE);

        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setCollideWorldBounds(true);
        this.setSize(28, 28);
    }

    public update(): void {
        const horizontal = Number(this.movementKeys.right.isDown) - Number(this.movementKeys.left.isDown);
        const vertical = Number(this.movementKeys.down.isDown) - Number(this.movementKeys.up.isDown);

        if (horizontal !== 0 || vertical !== 0) {
            const length = Math.hypot(horizontal, vertical);
            const direction = {
                x: horizontal / length,
                y: vertical / length
            };

            this.facingDirection = direction;
            this.setVelocity(direction.x * PLAYER_SPEED, direction.y * PLAYER_SPEED);
        } else {
            this.setVelocity(0, 0);
        }

        if (Input.Keyboard.JustDown(this.interactionKey)) {
            this.interactWithTileInFront();
        }
    }

    private interactWithTileInFront(): void {
        const tileType = this.gridManager.getTileTypeAtWorldPosition(
            this.x + this.facingDirection.x * this.gridManager.tilemap.tileWidth,
            this.y + this.facingDirection.y * this.gridManager.tilemap.tileHeight
        );

        console.log(`Interactuando con: ${tileType}`);
    }
}