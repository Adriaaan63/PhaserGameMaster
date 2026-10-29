import { GameObjects, Scene } from 'phaser';

import { BEVERAGE_FILL_DURATION_MS, TILE } from '../../data/constants';
import { InteractableObject } from '../InteractableObject';
import {
    EVENT_BEVERAGE_FILL_PROGRESS,
    eventBus,
    type BeverageFillProgressData,
} from '../../utils/EventBus';
import type { Station } from './Station';

/**
 * Central Drink Cylinder Tower where beverages are dispensed.
 *
 * Implements a strictly conservationist refill station:
 * - Does NOT create or generate new cups or drinks out of thin air.
 * - Only refills empty beverage cups (`kitchen_props2_25`) brought by the player.
 * - Fills the held cup over time while holding SPACE, turning it into `kitchen_props_3`.
 */
export class BeverageTower extends GameObjects.Zone implements Station {
    public readonly tileX: number;
    public readonly tileY: number;
    public readonly widthTiles: number;
    public readonly heightTiles: number;

    private fillingObject: InteractableObject | null = null;
    private fillProgress: number = 0;

    public constructor(
        scene: Scene,
        tileX: number,
        tileY: number,
        widthTiles: number = 1,
        heightTiles: number = 1,
    ) {
        const centerX = (tileX + widthTiles / 2) * TILE;
        const centerY = (tileY + heightTiles / 2) * TILE;

        super(scene, centerX, centerY, widthTiles * TILE, heightTiles * TILE);

        this.tileX = tileX;
        this.tileY = tileY;
        this.widthTiles = widthTiles;
        this.heightTiles = heightTiles;

        scene.add.existing(this);

        this.once(GameObjects.Events.DESTROY, this.cleanup, this);
    }

    /**
     * Checks if a specific object is currently being filled at the tower.
     */
    public isFilling(object: InteractableObject): boolean {
        return this.fillingObject === object;
    }

    /**
     * Begins filling an empty cup brought by the player to the tower.
     */
    public startFilling(object: InteractableObject): boolean {
        if (!object.isEmptyCup() || this.fillingObject !== null) {
            return false;
        }

        this.fillingObject = object;
        this.fillProgress = 0;
        this.emitProgress(true);
        return true;
    }

    /**
     * Updates filling progress while the player holds down the interaction key.
     */
    public updateFilling(delta: number, interactionHeld: boolean): void {
        if (this.fillingObject === null) {
            return;
        }

        if (!interactionHeld) {
            this.cancelFilling();
            return;
        }

        this.fillProgress = Math.min(
            100,
            this.fillProgress + (delta / BEVERAGE_FILL_DURATION_MS) * 100,
        );
        this.emitProgress(true);

        if (this.fillProgress >= 100) {
            this.fillingObject.fillBeverage();
            this.fillingObject = null;
            this.fillProgress = 0;
            this.emitProgress(false);
        }
    }

    /**
     * Cancels any active filling process and hides HUD progress bar.
     */
    public cancelFilling(): void {
        if (this.fillingObject === null) {
            return;
        }

        this.fillingObject = null;
        this.fillProgress = 0;
        this.emitProgress(false);
    }

    private emitProgress(active: boolean): void {
        const data: BeverageFillProgressData = {
            progress: this.fillProgress,
            active,
        };
        eventBus.emit(EVENT_BEVERAGE_FILL_PROGRESS, data);
    }

    private cleanup(): void {
        this.cancelFilling();
    }
}
