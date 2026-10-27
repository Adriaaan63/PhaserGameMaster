import { GameObjects, Scene } from 'phaser';

import { TILE } from '../data/constants';

const TEXTURE_KEY = 'interactable-jar';
const OBJECT_SIZE = 16;

export type InteractableObjectType = 'EMPTY_CUP' | 'FILLED_CUP' | 'FOOD_PLATE';

/**
 * Represents an object that can be picked up and placed on a valid surface.
 * Its map registration is managed by GridManager; this class owns only its
 * visual state and tile position.
 */
export class InteractableObject extends GameObjects.Image {
    private readonly tileSize: number;
    private held: boolean = false;
    private tileX: number;
    private tileY: number;
    private objectType: InteractableObjectType;

    public constructor(
        scene: Scene,
        tileX: number,
        tileY: number,
        objectType: InteractableObjectType = 'EMPTY_CUP',
    ) {
        InteractableObject.ensureTexture(scene);

        super(
            scene,
            (tileX + 0.5) * TILE,
            (tileY + 0.5) * TILE,
            TEXTURE_KEY,
        );

        this.tileSize = TILE;
        this.tileX = tileX;
        this.tileY = tileY;
        this.objectType = objectType;
        this.setDepth(this.y);
        scene.add.existing(this);
    }

    public static createFoodPlate(scene: Scene): InteractableObject {
        const object = new InteractableObject(scene, -1, -1, 'FOOD_PLATE');
        object.setTint(0xf5f5f5);
        return object;
    }

    public fillBeverage(): void {
        this.objectType = 'FILLED_CUP';
        this.setTint(0x27ae60);
    }

    public isEmptyCup(): boolean {
        return this.objectType === 'EMPTY_CUP';
    }

    public static ensureTexture(scene: Scene): void {
        if (scene.textures.exists(TEXTURE_KEY)) {
            return;
        }

        const graphics = scene.make.graphics({ x: 0, y: 0 });
        graphics.fillStyle(0xd4ac0d);
        graphics.fillRoundedRect(2, 2, 12, 12, 3);
        graphics.lineStyle(1, 0x6e4b12, 1);
        graphics.strokeRoundedRect(2, 2, 12, 12, 3);
        graphics.generateTexture(TEXTURE_KEY, OBJECT_SIZE, OBJECT_SIZE);
        graphics.destroy();
    }

    /** Makes the object follow the player's hands above the character. */
    public pickUp(): void {
        this.held = true;
        this.setDepth(this.y + this.tileSize);
    }

    /** Places the object at the centre of the supplied tile. */
    public drop(tileX: number, tileY: number): void {
        this.held = false;
        this.tileX = tileX;
        this.tileY = tileY;
        this.setPosition(
            (tileX + 0.5) * this.tileSize,
            (tileY + 0.5) * this.tileSize,
        );
        this.setDepth(this.y);
    }

    public updateHeldPosition(playerX: number, playerY: number): void {
        if (this.held) {
            this.setPosition(playerX, playerY - this.tileSize * 0.75);
            this.setDepth(playerY);
        }
    }

    public getTileX(): number {
        return this.tileX;
    }

    public getTileY(): number {
        return this.tileY;
    }
}
