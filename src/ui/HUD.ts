import { GameObjects, Scene } from 'phaser';

import {
    EVENT_BEVERAGE_FILL_PROGRESS,
    EVENT_FOOD_STOCK_UPDATED,
    EVENT_GAME_MODE_CHANGED,
    EVENT_GAME_WARNING,
    eventBus,
    type BeverageFillProgressData,
    type FoodStockUpdatedData,
    type GameModeChangedData,
    type GameWarningData,
} from '../utils/EventBus';

export class HUD {
    private readonly scene: Scene;
    private readonly foodText: GameObjects.Text;
    private readonly progressContainer: GameObjects.Container;
    private readonly progressFill: GameObjects.Rectangle;
    private readonly warningText: GameObjects.Text;
    private readonly progressWidth: number = 180;

    private readonly onFillProgressBound = (data: BeverageFillProgressData): void => {
        this.updateFillProgress(data);
    };

    private readonly onFoodStockUpdatedBound = (data: FoodStockUpdatedData): void => {
        this.foodText.setText(`Comida: ${data.stock}`);
    };

    private readonly onGameModeChangedBound = (data: GameModeChangedData): void => {
        this.warningText.setText(data.mode === 'PRE_APERTURA' ? 'PRE-APERTURA' : 'TURNO NOCTURNO');
    };

    private readonly onWarningBound = (data: GameWarningData): void => {
        this.warningText.setText(data.message);
        this.warningText.setColor('#ff6b6b');
        this.scene.time.delayedCall(2500, () => {
            this.warningText.setColor('#f4ede2');
        });
    };

    public constructor(scene: Scene) {
        this.scene = scene;
        this.foodText = scene.add.text(18, 18, 'Comida: 0', {
            color: '#f4ede2',
            fontFamily: 'sans-serif',
            fontSize: '16px',
        }).setScrollFactor(0);

        const background = scene.add.rectangle(0, 0, this.progressWidth, 14, 0x241e18, 0.95)
            .setOrigin(0, 0.5)
            .setStrokeStyle(1, 0xd4a359, 0.9);
        this.progressFill = scene.add.rectangle(0, 0, 1, 10, 0x27ae60, 1)
            .setOrigin(0, 0.5);
        const label = scene.add.text(0, -17, 'LLENANDO JARRA', {
            color: '#f4ede2',
            fontFamily: 'sans-serif',
            fontSize: '11px',
        }).setOrigin(0, 0.5);

        this.progressContainer = scene.add.container(18, 58, [background, this.progressFill, label]);
        this.progressContainer.setScrollFactor(0);
        this.progressContainer.setVisible(false);

        const initialStock = scene.registry.get('foodStock');
        this.foodText.setText(`Comida: ${typeof initialStock === 'number' ? initialStock : 0}`);
        this.warningText = scene.add.text(18, 42, 'PRE-APERTURA', {
            color: '#f4ede2',
            fontFamily: 'sans-serif',
            fontSize: '13px',
        }).setScrollFactor(0);

        eventBus.on(EVENT_BEVERAGE_FILL_PROGRESS, this.onFillProgressBound);
        eventBus.on(EVENT_FOOD_STOCK_UPDATED, this.onFoodStockUpdatedBound);
        eventBus.on(EVENT_GAME_MODE_CHANGED, this.onGameModeChangedBound);
        eventBus.on(EVENT_GAME_WARNING, this.onWarningBound);
        scene.events.once('shutdown', this.destroy, this);
        scene.events.once('destroy', this.destroy, this);
    }

    public destroy(): void {
        eventBus.off(EVENT_BEVERAGE_FILL_PROGRESS, this.onFillProgressBound);
        eventBus.off(EVENT_FOOD_STOCK_UPDATED, this.onFoodStockUpdatedBound);
        eventBus.off(EVENT_GAME_MODE_CHANGED, this.onGameModeChangedBound);
        eventBus.off(EVENT_GAME_WARNING, this.onWarningBound);
        this.foodText.destroy();
        this.warningText.destroy();
        this.progressContainer.destroy(true);
    }

    private updateFillProgress(data: BeverageFillProgressData): void {
        this.progressContainer.setVisible(data.active);
        this.progressFill.setDisplaySize(this.progressWidth * (data.progress / 100), 10);
    }
}
