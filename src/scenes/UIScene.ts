import { Scene } from 'phaser';

import { InventoryUI } from '../ui/InventoryUI';

/**
 * Scene dedicated exclusively to HUD, overlay dialogs, and UI elements.
 * Runs in parallel on top of the gameplay scene (NightCantinaScene)
 * to maintain strict separation of concerns (SRP).
 */
export class UIScene extends Scene {
    private inventoryUI!: InventoryUI;

    public constructor() {
        super('UIScene');
    }

    public create(): void {
        this.inventoryUI = new InventoryUI(this);
    }

    public getInventoryUI(): InventoryUI {
        return this.inventoryUI;
    }
}
