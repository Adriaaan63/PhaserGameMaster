import { GameObjects, Scene } from 'phaser';

import { EMPTY_GLASSES_REGISTRY_KEY, GAME_REGISTRY } from '../data/GameRegistry';
import { TEXTURE_DRINK_EMPTY } from '../data/constants';
import { eventBus, EVENT_GLASSES_UPDATED, type GlassesUpdatedData } from '../utils/EventBus';

/** Displays the purchased clean-glass stock above its Tiled storage location. */
export class GlassStorageIndicator extends GameObjects.Container {
    private readonly stockText: GameObjects.Text;
    private readonly handleGlassesUpdated = (data: GlassesUpdatedData): void => {
        this.setStock(data.stock);
    };

    public constructor(scene: Scene, x: number, y: number) {
        super(scene, x, y + GAME_REGISTRY.ui.glassStorageBubbleOffsetY);

        const config = GAME_REGISTRY.ui;
        const width = config.glassStorageBubbleWidth;
        const height = config.glassStorageBubbleHeight;
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        const bubble = scene.add.graphics();
        bubble.fillStyle(config.glassStorageBubbleColor, 1);
        bubble.fillRoundedRect(-halfWidth, -halfHeight, width, height, config.glassStorageBubbleCornerRadius);
        bubble.fillTriangle(
            -config.glassStoragePointerHeight,
            halfHeight - 1,
            config.glassStoragePointerHeight,
            halfHeight - 1,
            0,
            halfHeight + config.glassStoragePointerHeight,
        );
        bubble.lineStyle(config.glassStorageBubbleBorderWidth, config.glassStorageBubbleBorderColor, 1);
        bubble.strokeRoundedRect(-halfWidth, -halfHeight, width, height, config.glassStorageBubbleCornerRadius);

        const icon = scene.add.image(
            config.glassStorageIconOffsetX,
            0,
            TEXTURE_DRINK_EMPTY,
        ).setDisplaySize(config.glassStorageIconSize, config.glassStorageIconSize);
        this.stockText = scene.add.text(
            config.glassStorageCountOffsetX,
            0,
            '',
            {
                color: `#${config.glassStorageBubbleBorderColor.toString(16).padStart(6, '0')}`,
                fontFamily: 'monospace',
                fontSize: `${config.glassStorageCountFontSize}px`,
                fontStyle: 'bold',
            },
        ).setOrigin(0.5);

        this.add([bubble, icon, this.stockText]);
        this.setDepth(y + config.glassStorageDepthOffset);
        scene.add.existing(this);

        const initialStock = scene.registry.get(EMPTY_GLASSES_REGISTRY_KEY);
        this.setStock(typeof initialStock === 'number' ? initialStock : 0);
        eventBus.on(EVENT_GLASSES_UPDATED, this.handleGlassesUpdated);
        this.once(GameObjects.Events.DESTROY, this.cleanup, this);
    }

    private setStock(stock: number): void {
        this.stockText.setText(`x${Math.max(0, stock)}`);
    }

    private cleanup(): void {
        eventBus.off(EVENT_GLASSES_UPDATED, this.handleGlassesUpdated);
    }
}
