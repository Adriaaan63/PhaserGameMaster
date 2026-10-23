import { GameObjects, Scene } from 'phaser';

import { TILE } from '../../data/constants';
import { InteractableObject } from '../InteractableObject';
import {
    EVENT_BEVERAGE_FILL_PROGRESS,
    eventBus,
    type BeverageFillProgressData,
} from '../../utils/EventBus';
import type { Station } from './Station';

const FILL_DURATION_MS = 2000;

export class BeverageTower extends GameObjects.Zone implements Station {
    public readonly tileX: number;
    public readonly tileY: number;

    private fillingObject: InteractableObject | null = null;
    private fillProgress: number = 0;

    public constructor(scene: Scene, tileX: number, tileY: number) {
        super(scene, (tileX + 0.5) * TILE, (tileY + 0.5) * TILE, TILE, TILE);

        this.tileX = tileX;
        this.tileY = tileY;
        scene.add.existing(this);
    }

    public isFilling(object: InteractableObject): boolean {
        return this.fillingObject === object;
    }

    public startFilling(object: InteractableObject): boolean {
        if (!object.isEmptyCup() || this.fillingObject !== null) {
            return false;
        }

        this.fillingObject = object;
        this.fillProgress = 0;
        this.emitProgress(true);
        return true;
    }

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
            this.fillProgress + (delta / FILL_DURATION_MS) * 100,
        );
        this.emitProgress(true);

        if (this.fillProgress >= 100) {
            this.fillingObject.fillBeverage();
            this.fillingObject = null;
            this.emitProgress(false);
        }
    }

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

}
