import { Scene, Time } from 'phaser';

import { CREDITS_REGISTRY_KEY, GAME_REGISTRY } from '../data/GameRegistry';
import { TILE } from '../data/constants';
import {
    eventBus,
    EVENT_CLOSE_WANTED_POSTER,
    EVENT_CREDITS_UPDATED,
    EVENT_GAME_MODE_CHANGED,
    EVENT_GAME_WARNING,
    EVENT_OPEN_WANTED_POSTER,
    EVENT_SHOP_FOOD_PURCHASED,
    EVENT_TOGGLE_CLIENT_GUIDE,
    EVENT_TOGGLE_MATERIALS,
    EVENT_TUTORIAL_CLOSED,
    type GameModeChangedData,
    type ToggleClientGuideData,
    type ToggleMaterialsData,
} from '../utils/EventBus';
import { TutorialManager } from './TutorialManager';

type Night2Stage =
    | 'SHOP_DIALOG'
    | 'SHOP_HINT'
    | 'SHOP_OPEN'
    | 'GUIDE_DIALOG'
    | 'GUIDE_HINT'
    | 'GUIDE_OPEN'
    | 'AFFINITY_DIALOG'
    | 'HEAT_HINT'
    | 'HEAT_DIALOG'
    | 'WANTED_DIALOG'
    | 'WANTED_HINT'
    | 'WANTED_OPEN'
    | 'REPUTATION_HINT'
    | 'REPUTATION_DIALOG'
    | 'READY';

interface Night2Targets {
    readonly wantedPoster: { readonly tileX: number; readonly tileY: number };
}

/** Blocks the second-night pre-opening tutorial until each system is used. */
export class Night2Script {
    private stage: Night2Stage = 'SHOP_DIALOG';
    private started = false;
    private foodPurchased = false;
    private heatTimer: Time.TimerEvent | null = null;
    private reputationTimer: Time.TimerEvent | null = null;

    private readonly handleModeChanged = (data: GameModeChangedData): void => {
        if (data.mode !== 'PRE_APERTURA' || this.started) return;
        this.started = true;
        this.showShopDialog();
    };

    private readonly handleTutorialClosed = (): void => {
        switch (this.stage) {
            case 'SHOP_DIALOG':
                this.stage = 'SHOP_HINT';
                this.scene.registry.set('requireFoodPurchase', true);
                this.tutorial.showButtonHint('materials');
                this.tutorial.pointToScreen(this.getHudButtonPosition('materials').x, 26);
                break;
            case 'GUIDE_DIALOG':
                this.stage = 'GUIDE_HINT';
                this.tutorial.showButtonHint('guide');
                this.tutorial.pointToScreen(this.getHudButtonPosition('guide').x, 26);
                break;
            case 'GUIDE_OPEN':
                this.stage = 'AFFINITY_DIALOG';
                this.affinityDialogShown = true;
                this.tutorial.showTutorial(
                    'The affinity wheel shows which species get along. Seating incompatible customers can cause fights, bodies, and blood that make the cantina harder to manage.',
                );
                break;
            case 'AFFINITY_DIALOG':
                this.stage = 'HEAT_HINT';
                this.tutorial.pointToScreen(this.getHeatPosition().x, this.getHeatPosition().y);
                this.heatTimer?.remove(false);
                this.heatTimer = this.scene.time.delayedCall(800, () => {
                    this.heatTimer = null;
                    if (this.stage !== 'HEAT_HINT') return;
                    this.tutorial.showPointers([]);
                    this.stage = 'HEAT_DIALOG';
                    this.tutorial.showTutorial(
                        'Imperial Heat rises when violence happens and attracts patrols. Keep it under control; it falls when the cantina stays quiet.',
                    );
                });
                break;
            case 'HEAT_DIALOG':
                this.tutorial.showPointers([]);
                this.stage = 'WANTED_DIALOG';
                this.tutorial.showTutorial(
                    'The Wanted system identifies a suspect for the night. You can expose, hide, or ignore the fugitive.',
                );
                break;
            case 'WANTED_DIALOG':
                this.stage = 'WANTED_HINT';
                this.tutorial.pointToWorld(
                    this.targets.wantedPoster.tileX * TILE + TILE / 2,
                    this.targets.wantedPoster.tileY * TILE + TILE / 2,
                );
                break;
            case 'REPUTATION_DIALOG':
                this.stage = 'READY';
                this.tutorial.hide();
                this.tutorial.showPointers([]);
                break;
            default:
                break;
        }
    };

    private readonly handleFoodPurchased = (): void => {
        if (this.stage !== 'SHOP_OPEN') return;
        this.foodPurchased = true;
        this.scene.registry.set('requireFoodPurchase', false);
    };

    private readonly handleMaterialsToggled = (data: ToggleMaterialsData): void => {
        if (this.stage === 'SHOP_HINT' && data.enabled) {
            this.stage = 'SHOP_OPEN';
            this.tutorial.showPointers([]);
            this.tutorial.hideButtonHint('materials');
            this.scene.registry.set('requireFoodPurchase', true);
            return;
        }
        if (this.stage === 'SHOP_OPEN') {
            if (!this.foodPurchased) {
                if (!data.enabled) {
                    eventBus.emit(EVENT_GAME_WARNING, {
                        message: 'You must buy food before closing the store.',
                    });
                    this.scene.time.delayedCall(0, () => {
                        eventBus.emit(EVENT_TOGGLE_MATERIALS, { enabled: true });
                    });
                }
                return;
            }
            if (!data.enabled) {
                this.scene.registry.set('requireFoodPurchase', false);
                this.showGuideDialog();
            }
        }
    };

    private readonly handleGuideToggled = (data: ToggleClientGuideData): void => {
        if (this.stage === 'GUIDE_HINT' && data.enabled) {
            this.stage = 'GUIDE_OPEN';
            this.tutorial.showPointers([]);
            this.tutorial.hideButtonHint('guide');
            return;
        }
        if (this.stage === 'GUIDE_OPEN' && !data.enabled) {
            this.stage = 'AFFINITY_DIALOG';
            this.tutorial.showTutorial(
                'The affinity wheel shows which species get along. Seating incompatible customers can cause fights, bodies, and blood that make the cantina harder to manage.',
            );
        }
    };

    private readonly handleWantedOpened = (): void => {
        if (this.stage !== 'WANTED_HINT') return;
        this.stage = 'WANTED_OPEN';
        this.tutorial.showPointers([]);
    };

    private readonly handleWantedClosed = (): void => {
        if (this.stage !== 'WANTED_OPEN') return;
        this.stage = 'REPUTATION_HINT';
        this.tutorial.pointToScreen(this.getReputationPosition().x, this.getReputationPosition().y);
        this.reputationTimer?.remove(false);
        this.reputationTimer = this.scene.time.delayedCall(800, () => {
            this.reputationTimer = null;
            if (this.stage !== 'REPUTATION_HINT') return;
            this.tutorial.showPointers([]);
            this.stage = 'REPUTATION_DIALOG';
            this.tutorial.showTutorial(
                'Criminal Reputation measures Jabba’s trust. Betrayal and failed deals reduce it, while helping the cantina’s criminal business keeps it high.',
            );
        });
    };

    public constructor(
        private readonly scene: Scene,
        private readonly tutorial: TutorialManager,
        private readonly targets: Night2Targets,
    ) {
        eventBus.on(EVENT_GAME_MODE_CHANGED, this.handleModeChanged);
        eventBus.on(EVENT_TUTORIAL_CLOSED, this.handleTutorialClosed);
        eventBus.on(EVENT_SHOP_FOOD_PURCHASED, this.handleFoodPurchased);
        eventBus.on(EVENT_TOGGLE_MATERIALS, this.handleMaterialsToggled);
        eventBus.on(EVENT_TOGGLE_CLIENT_GUIDE, this.handleGuideToggled);
        eventBus.on(EVENT_OPEN_WANTED_POSTER, this.handleWantedOpened);
        eventBus.on(EVENT_CLOSE_WANTED_POSTER, this.handleWantedClosed);
        scene.time.delayedCall(0, () => {
            if (!this.started && scene.registry.get('gameMode') === 'PRE_APERTURA') {
                this.started = true;
                this.showShopDialog();
            }
        });
        scene.events.once('shutdown', this.destroy, this);
        scene.events.once('destroy', this.destroy, this);
    }

    public destroy(): void {
        this.tutorial.hideButtonHint('materials');
        this.tutorial.hideButtonHint('guide');
        this.scene.registry.set('requireFoodPurchase', false);
        this.heatTimer?.remove(false);
        this.heatTimer = null;
        this.reputationTimer?.remove(false);
        this.reputationTimer = null;
        eventBus.off(EVENT_GAME_MODE_CHANGED, this.handleModeChanged);
        eventBus.off(EVENT_TUTORIAL_CLOSED, this.handleTutorialClosed);
        eventBus.off(EVENT_SHOP_FOOD_PURCHASED, this.handleFoodPurchased);
        eventBus.off(EVENT_TOGGLE_MATERIALS, this.handleMaterialsToggled);
        eventBus.off(EVENT_TOGGLE_CLIENT_GUIDE, this.handleGuideToggled);
        eventBus.off(EVENT_OPEN_WANTED_POSTER, this.handleWantedOpened);
        eventBus.off(EVENT_CLOSE_WANTED_POSTER, this.handleWantedClosed);
    }

    private ensureNight2Credits(): void {
        const currentCredits = Number(this.scene.registry.get(CREDITS_REGISTRY_KEY)) || 0;
        if (currentCredits < 8) {
            const newTotal = 15;
            this.scene.registry.set(CREDITS_REGISTRY_KEY, newTotal);
            eventBus.emit(EVENT_CREDITS_UPDATED, { totalCredits: newTotal });
            eventBus.emit(EVENT_GAME_WARNING, {
                message: 'Courtesy bonus granted for tutorial (+15 CR)!',
            });
        }
    }

    private showShopDialog(): void {
        this.ensureNight2Credits();
        this.stage = 'SHOP_DIALOG';
        this.tutorial.showTutorial(
            'The Materials shop provides food, scrap, furniture, and clean glasses. Buy food now to keep the kitchen supplied during the night.',
        );
    }

    private showGuideDialog(): void {
        this.stage = 'GUIDE_DIALOG';
        this.tutorial.showTutorial(
            'The Client Guide contains the affinity wheel. It shows which species work well together before you assign seats.',
        );
    }

    private getHudButtonPosition(id: 'guide' | 'materials'): { readonly x: number } {
        const index = id === 'guide' ? 4 : 5;
        const margin = 12;
        const slotWidth = (this.scene.scale.width - margin * 2) / 8;
        return { x: margin + slotWidth * (index + 0.5) };
    }

    private getHeatPosition(): { readonly x: number; readonly y: number } {
        return {
            x: GAME_REGISTRY.ui.imperialBarMargin + GAME_REGISTRY.ui.imperialBarWidth / 2,
            y: this.scene.scale.height - GAME_REGISTRY.ui.imperialBarMargin
                - GAME_REGISTRY.ui.imperialBarHeight / 2,
        };
    }

    private getReputationPosition(): { readonly x: number; readonly y: number } {
        return {
            x: this.scene.scale.width - GAME_REGISTRY.ui.reputationBarMargin
                - GAME_REGISTRY.ui.reputationBarWidth / 2,
            y: this.scene.scale.height - GAME_REGISTRY.ui.reputationBarMargin
                - GAME_REGISTRY.ui.reputationBarHeight / 2,
        };
    }
}
