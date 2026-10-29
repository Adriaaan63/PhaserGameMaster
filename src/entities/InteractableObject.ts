import { GameObjects, Scene } from 'phaser';

import {
    PLAYER_HAND_OFFSET_X,
    PLAYER_HAND_OFFSET_Y,
    TEXTURE_DRINK_EMPTY,
    TEXTURE_DRINK_FULL,
    TEXTURE_FOOD,
    TILE,
} from '../data/constants';

export type InteractableObjectType = 'EMPTY_CUP' | 'FILLED_CUP' | 'FOOD_PLATE';

/**
 * Resolves the appropriate texture key based on the object's type and state.
 */
function resolveTextureKey(type: InteractableObjectType): string {
    switch (type) {
        case 'FOOD_PLATE':
            return TEXTURE_FOOD;
        case 'FILLED_CUP':
            return TEXTURE_DRINK_FULL;
        case 'EMPTY_CUP':
            return TEXTURE_DRINK_EMPTY;
    }
}

/**
 * Represents a physical object (drink or food plate) that can be picked up,
 * held in the player's hand, or placed onto a surface (table/bar counter).
 *
 * Visual states and transitions:
 * - Empty cup: `kitchen_props2_25`
 * - Full drink: `kitchen_props_3`
 * - Food plate: `kitchen_props2_4`
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
        const textureKey = resolveTextureKey(objectType);
        const posX = tileX >= 0 ? (tileX + 0.5) * TILE : 0;
        const posY = tileY >= 0 ? (tileY + 0.5) * TILE : 0;

        super(scene, posX, posY, textureKey);

        this.tileSize = TILE;
        this.tileX = tileX;
        this.tileY = tileY;
        this.objectType = objectType;

        this.setOrigin(0.5, 0.5);
        this.setDepth(this.y);
        scene.add.existing(this);
    }

    /**
     * Factory method for creating a food plate ready to be picked up.
     */
    public static createFoodPlate(scene: Scene): InteractableObject {
        return new InteractableObject(scene, -1, -1, 'FOOD_PLATE');
    }

    /**
     * Factory method for creating a drink (filled or empty).
     */
    public static createDrink(scene: Scene, filled: boolean = true): InteractableObject {
        return new InteractableObject(scene, -1, -1, filled ? 'FILLED_CUP' : 'EMPTY_CUP');
    }

    /**
     * Backward-compatible texture stub (textures are now loaded in PreloadScene).
     */
    public static ensureTexture(_scene: Scene): void {
        // No-op: textures are loaded in PreloadScene
    }

    /**
     * Fills the beverage cup and immediately switches its texture to full.
     */
    public fillBeverage(): void {
        this.objectType = 'FILLED_CUP';
        this.setTexture(TEXTURE_DRINK_FULL);
        this.clearTint();
    }

    /**
     * Empties the beverage cup (e.g. after customer consumption) and
     * immediately switches its texture to empty.
     */
    public emptyBeverage(): void {
        this.objectType = 'EMPTY_CUP';
        this.setTexture(TEXTURE_DRINK_EMPTY);
        this.clearTint();
    }

    public isEmptyCup(): boolean {
        return this.objectType === 'EMPTY_CUP';
    }

    public isFilledCup(): boolean {
        return this.objectType === 'FILLED_CUP';
    }

    public isFoodPlate(): boolean {
        return this.objectType === 'FOOD_PLATE';
    }

    public getObjectType(): InteractableObjectType {
        return this.objectType;
    }

    /**
     * Sets the object into held state, ready to track player position.
     */
    public pickUp(): void {
        this.held = true;
    }

    /**
     * Drops the object at the centre of the specified grid tile and restores depth.
     */
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

    /**
     * Updates position to follow the player's right hand every frame.
     *
     * @param playerX Current player body X coordinate.
     * @param playerY Current player body Y coordinate.
     * @param offsetX Hand horizontal offset (respecting flipX).
     * @param offsetY Hand vertical offset.
     * @param depth Depth value to prevent visual occlusion issues.
     */
    public updateHeldPosition(
        playerX: number,
        playerY: number,
        offsetX: number = PLAYER_HAND_OFFSET_X,
        offsetY: number = PLAYER_HAND_OFFSET_Y,
        depth: number = playerY + 1,
    ): void {
        if (this.held) {
            this.setPosition(playerX + offsetX, playerY + offsetY);
            this.setDepth(depth);
        }
    }

    public isHeld(): boolean {
        return this.held;
    }

    public getTileX(): number {
        return this.tileX;
    }

    public getTileY(): number {
        return this.tileY;
    }
}
