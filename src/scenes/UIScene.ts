import { Scene } from 'phaser';

import { InventoryUI } from '../ui/InventoryUI';
import { HUD } from '../ui/HUD';
import { ImperialBarUI } from '../ui/ImperialBarUI';
import { ReputationBarUI } from '../ui/ReputationBarUI';

/**
 * Scene dedicated exclusively to HUD, overlay dialogs, and UI elements.
 * Runs in parallel on top of the gameplay scene (NightCantinaScene)
 * to maintain strict separation of concerns (SRP).
 */
export class UIScene extends Scene {
    private inventoryUI!: InventoryUI;
    private hud!: HUD;
    private imperialBar!: ImperialBarUI;
    private reputationBar!: ReputationBarUI;

    public constructor() {
        super('UIScene');
    }

    public create(): void {
        this.input.setTopOnly(true);
        this.inventoryUI = new InventoryUI(this);
        this.hud = new HUD(this);
        this.imperialBar = new ImperialBarUI(this);
        this.reputationBar = new ReputationBarUI(this);
    }

    public getInventoryUI(): InventoryUI {
        return this.inventoryUI;
    }
}
