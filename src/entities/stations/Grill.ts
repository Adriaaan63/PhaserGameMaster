import { GameObjects, Scene, Time, Tweens } from 'phaser';

import {
    COOKING_ALPHA_MAX,
    COOKING_ALPHA_MIN,
    COOKING_PULSE_DURATION_MS,
    COOKING_TIME_MS,
    TEXTURE_FOOD,
    TILE,
} from '../../data/constants';
import { InteractableObject } from '../InteractableObject';
import {
    EVENT_FOOD_STOCK_UPDATED,
    eventBus,
    type FoodStockUpdatedData,
} from '../../utils/EventBus';
import type { Station } from './Station';

export type GrillCookingState = 'IDLE' | 'COOKING' | 'READY';

/**
 * Fusion Grill cooking station where Wuher prepares food skewers and steaks.
 *
 * Implements an asynchronous cooking timer and visual state machine:
 * - IDLE: Awaiting player interaction with available raw food stock.
 * - COOKING: Food is on the grill with a pulsing alpha indicator (`kitchen_props2_4`).
 *            Collection is strictly blocked during this phase.
 * - READY: Cooking timer finished (`COOKING_TIME_MS`). Food is solid (alpha = 1.0)
 *          and can be picked up into the player's hand.
 */
export class Grill extends GameObjects.Zone implements Station {
    public readonly tileX: number;
    public readonly tileY: number;
    public readonly widthTiles: number;
    public readonly heightTiles: number;

    private cookingState: GrillCookingState = 'IDLE';
    private readonly foodSprite: GameObjects.Image;
    private cookingTimer: Time.TimerEvent | null = null;
    private pulseTween: Tweens.Tween | null = null;

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

        // Visual food indicator placed on the cooking surface of the grill (top row: tileY)
        const foodY = (tileY + 0.5) * TILE;
        this.foodSprite = scene.add.image(centerX, foodY, TEXTURE_FOOD);
        this.foodSprite.setOrigin(0.5, 0.5);
        this.foodSprite.setDepth(foodY + 1);
        this.foodSprite.setVisible(false);

        this.once(GameObjects.Events.DESTROY, this.cleanup, this);
    }

    /**
     * Checks whether the grill can currently begin cooking food.
     */
    public canStartCooking(): boolean {
        return this.cookingState === 'IDLE' && this.getStock() > 0;
    }

    public isCooking(): boolean {
        return this.cookingState === 'COOKING';
    }

    public isFoodReady(): boolean {
        return this.cookingState === 'READY';
    }

    public getCookingState(): GrillCookingState {
        return this.cookingState;
    }

    /**
     * Initiates the cooking process: consumes 1 ingredient stock,
     * starts visual pulsing on the food sprite, and arms the completion timer.
     */
    public startCooking(): boolean {
        if (!this.canStartCooking()) {
            return false;
        }

        const currentStock = this.getStock();
        this.scene.registry.set('foodStock', currentStock - 1);
        const stockData: FoodStockUpdatedData = { stock: currentStock - 1 };
        eventBus.emit(EVENT_FOOD_STOCK_UPDATED, stockData);

        this.cookingState = 'COOKING';
        this.foodSprite.setVisible(true);
        this.foodSprite.setAlpha(COOKING_ALPHA_MIN);

        // Visual pulsing tween to show active cooking
        this.pulseTween = this.scene.tweens.add({
            targets: this.foodSprite,
            alpha: { from: COOKING_ALPHA_MIN, to: COOKING_ALPHA_MAX },
            duration: COOKING_PULSE_DURATION_MS,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // Asynchronous cooking timer
        this.cookingTimer = this.scene.time.delayedCall(
            COOKING_TIME_MS,
            this.finishCooking,
            undefined,
            this,
        );

        return true;
    }

    /**
     * Called when the cooking timer expires. Transitions state to READY
     * and sets the food sprite to fully opaque.
     */
    private finishCooking(): void {
        this.stopPulsing();
        this.cookingTimer = null;
        this.cookingState = 'READY';
        this.foodSprite.setAlpha(1.0);
    }

    /**
     * Collects cooked food from the grill.
     * Returns null if food is not yet ready or grill is idle.
     */
    public takeFood(): InteractableObject | null {
        if (this.cookingState !== 'READY') {
            return null;
        }

        this.foodSprite.setVisible(false);
        this.foodSprite.setAlpha(1.0);
        this.cookingState = 'IDLE';

        return InteractableObject.createFoodPlate(this.scene);
    }

    private getStock(): number {
        const value = this.scene.registry.get('foodStock');
        return typeof value === 'number' && Number.isFinite(value) ? value : 0;
    }

    private stopPulsing(): void {
        if (this.pulseTween !== null) {
            this.pulseTween.stop();
            this.pulseTween = null;
        }
    }

    private cleanup(): void {
        if (this.cookingTimer !== null) {
            this.cookingTimer.remove(false);
            this.cookingTimer = null;
        }
        this.stopPulsing();
        this.foodSprite.destroy();
    }
}
