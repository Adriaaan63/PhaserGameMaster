import { Scene } from 'phaser';

import { InventoryUI } from '../ui/InventoryUI';
import { HUD } from '../ui/HUD';
import { ImperialBarUI } from '../ui/ImperialBarUI';
import { ReputationBarUI } from '../ui/ReputationBarUI';
import { WantedUI } from '../ui/WantedUI';
import { ShopUI } from '../ui/ShopUI';
import { TutorialUI } from '../ui/TutorialUI';
import { NightTransitionUI } from '../ui/NightTransitionUI';
import { MenuFlowManager, NIGHT_SCENE_KEY, PAUSE_MENU_SCENE_KEY } from '../managers/MenuFlowManager';
import {
    EVENT_CANCEL_CLIENT_SELECTION,
    EVENT_CLIENT_SELECTED,
    EVENT_CLIENT_SELECTION_CLEARED,
    EVENT_CLOSE_WANTED_POSTER,
    EVENT_TOGGLE_CLIENT_GUIDE,
    EVENT_TUTORIAL_CLOSE_REQUESTED,
    eventBus,
} from '../utils/EventBus';

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
    private wantedUI!: WantedUI;
    private shopUI!: ShopUI;
    private tutorialUI!: TutorialUI;
    private nightTransitionUI!: NightTransitionUI;
    private readonly menuFlow = new MenuFlowManager();
    private isClientSelected = false;

    private readonly onClientSelected = (): void => { this.isClientSelected = true; };
    private readonly onClientSelectionCleared = (): void => { this.isClientSelected = false; };
    private readonly onEscape = (): void => this.handleEscape();

    public constructor() {
        super('UIScene');
    }

    public create(): void {
        this.input.setTopOnly(true);
        this.inventoryUI = new InventoryUI(this);
        this.hud = new HUD(this);
        this.imperialBar = new ImperialBarUI(this);
        this.reputationBar = new ReputationBarUI(this);
        this.wantedUI = new WantedUI(this);
        this.shopUI = new ShopUI(this, this.inventoryUI);
        this.tutorialUI = new TutorialUI(this);
        this.nightTransitionUI = new NightTransitionUI(this);
        this.input.keyboard?.on('keydown-ESC', this.onEscape, this);
        eventBus.on(EVENT_CLIENT_SELECTED, this.onClientSelected);
        eventBus.on(EVENT_CLIENT_SELECTION_CLEARED, this.onClientSelectionCleared);
        this.events.once('shutdown', this.cleanupInput, this);
        this.events.once('destroy', this.cleanupInput, this);
    }

    public update(): void {
        this.wantedUI?.update();
    }

    public getInventoryUI(): InventoryUI {
        return this.inventoryUI;
    }

    private handleEscape(): void {
        if (this.tutorialUI.isDialogOpen) {
            eventBus.emit(EVENT_TUTORIAL_CLOSE_REQUESTED);
            return;
        }
        if (this.shopUI.isVisible) {
            this.shopUI.requestClose();
            return;
        }
        if (this.inventoryUI.isGuideVisible) {
            eventBus.emit(EVENT_TOGGLE_CLIENT_GUIDE, { enabled: false });
            return;
        }
        if (this.wantedUI.isVisible) {
            eventBus.emit(EVENT_CLOSE_WANTED_POSTER);
            return;
        }
        if (this.nightTransitionUI.isVisible || this.scene.isActive(PAUSE_MENU_SCENE_KEY)) return;
        if (this.isClientSelected) {
            eventBus.emit(EVENT_CANCEL_CLIENT_SELECTION);
            return;
        }
        if (this.scene.isActive(NIGHT_SCENE_KEY)) this.menuFlow.openPause(this);
    }

    private cleanupInput(): void {
        this.input.keyboard?.off('keydown-ESC', this.onEscape, this);
        eventBus.off(EVENT_CLIENT_SELECTED, this.onClientSelected);
        eventBus.off(EVENT_CLIENT_SELECTION_CLEARED, this.onClientSelectionCleared);
    }
}
