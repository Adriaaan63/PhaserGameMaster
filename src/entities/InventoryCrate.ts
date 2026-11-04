import { GameObjects, Scene } from 'phaser';

import { TILE } from '../data/constants';
import { EMPTY_GLASSES_REGISTRY_KEY } from '../data/GameRegistry';
import { eventBus, EVENT_GLASSES_UPDATED, type GlassesUpdatedData } from '../utils/EventBus';

/** Physical storage point for clean glasses purchased from the shop. */
export class InventoryCrate extends GameObjects.Container {
    public cleanGlasses: number;

    private readonly handleGlassesUpdated = (data: GlassesUpdatedData): void => {
        this.cleanGlasses = data.stock;
    };

    public constructor(scene: Scene, x: number, y: number) {
        const body = scene.add.rectangle(0, 0, TILE - 4, TILE - 8, 0x8b5a2b)
            .setStrokeStyle(2, 0x3a2418);
        super(scene, x, y, [body]);
        this.cleanGlasses = this.readInitialStock(scene);
        scene.add.existing(this);
        this.setDepth(y + TILE / 2);
        eventBus.on(EVENT_GLASSES_UPDATED, this.handleGlassesUpdated);
        this.once(GameObjects.Events.DESTROY, this.cleanup, this);
    }

    public takeGlasses(amount = 1): number {
        const taken = Math.min(Math.max(0, amount), this.cleanGlasses);
        this.cleanGlasses -= taken;
        return taken;
    }

    private cleanup(): void {
        eventBus.off(EVENT_GLASSES_UPDATED, this.handleGlassesUpdated);
    }

    private readInitialStock(scene: Scene): number {
        const stock = scene.registry.get(EMPTY_GLASSES_REGISTRY_KEY);
        return typeof stock === 'number' ? stock : 0;
    }
}
