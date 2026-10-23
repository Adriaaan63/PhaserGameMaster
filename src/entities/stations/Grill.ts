import { GameObjects, Scene } from 'phaser';

import { TILE } from '../../data/constants';
import { InteractableObject } from '../InteractableObject';
import {
    EVENT_FOOD_STOCK_UPDATED,
    eventBus,
    type FoodStockUpdatedData,
} from '../../utils/EventBus';
import type { Station } from './Station';

export class Grill extends GameObjects.Zone implements Station {
    public readonly tileX: number;
    public readonly tileY: number;

    public constructor(scene: Scene, tileX: number, tileY: number) {
        super(scene, (tileX + 0.5) * TILE, (tileY + 0.5) * TILE, TILE, TILE);

        this.tileX = tileX;
        this.tileY = tileY;
        scene.add.existing(this);
    }

    public takeFood(): InteractableObject | null {
        const currentStock = this.getStock();
        if (currentStock <= 0) {
            return null;
        }

        this.scene.registry.set('foodStock', currentStock - 1);
        const data: FoodStockUpdatedData = { stock: currentStock - 1 };
        eventBus.emit(EVENT_FOOD_STOCK_UPDATED, data);
        return InteractableObject.createFoodPlate(this.scene);
    }

    private getStock(): number {
        const value = this.scene.registry.get('foodStock');
        return typeof value === 'number' && Number.isFinite(value) ? value : 0;
    }

}
