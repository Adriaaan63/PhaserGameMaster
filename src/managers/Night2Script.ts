import { Scene, Time } from 'phaser';

import { CREDITS_REGISTRY_KEY, GAME_REGISTRY } from '../data/GameRegistry';
import { TILE } from '../data/constants';
import {
    eventBus,
    EVENT_CLOSE_WANTED_POSTER,
    EVENT_CLIENT_ORDER_STARTED,
    EVENT_CREDITS_UPDATED,
    EVENT_FOOD_COOKING_STARTED,
    EVENT_GAME_MODE_CHANGED,
    EVENT_GAME_WARNING,
    EVENT_OPEN_WANTED_POSTER,
    EVENT_SHOP_FOOD_PURCHASED,
    EVENT_TOGGLE_CLIENT_GUIDE,
    EVENT_TOGGLE_MATERIALS,
    EVENT_TUTORIAL_CLOSED,
    EVENT_TUTORIAL_METER_HINT,
    GAME_MODE_NIGHT,
    type GameModeChangedData,
    type ClientOrderStartedData,
    type FoodCookingStartedData,
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
    | 'NIGHT_SERVICE'
    | 'FOOD_ORDER_DIALOG'
    | 'FOOD_GRILL_HINT'
    | 'SERVICE'
    | 'READY';

interface Night2Targets {
    readonly wantedPoster: { readonly tileX: number; readonly tileY: number };
    readonly grill: { readonly tileX: number; readonly tileY: number } | null;
}

/** Blocks the second-night pre-opening tutorial until each system is used. */
export class Night2Script {
    private stage: Night2Stage = 'SHOP_DIALOG';
    private started = false;
    private foodPurchased = false;
    private startupTimer: Time.TimerEvent | null = null;
    private shopReopenTimer: Time.TimerEvent | null = null;
    private heatTimer: Time.TimerEvent | null = null;
    private reputationTimer: Time.TimerEvent | null = null;

    private readonly handleModeChanged = (data: GameModeChangedData): void => {
        if (data.mode === GAME_MODE_NIGHT) {
            if (this.stage === 'READY') this.stage = 'NIGHT_SERVICE';
            return;
        }
        if (data.mode !== 'PRE_APERTURA' || this.started) return;
        this.started = true;
        this.showShopDialog();
    };

    private readonly handleClientOrderStarted = (data: ClientOrderStartedData): void => {
        if (this.stage !== 'NIGHT_SERVICE' || data.orderItemId !== 'FOOD_PLATE') return;
        this.stage = 'FOOD_ORDER_DIALOG';
        this.tutorial.showTutorial(
            'A customer has ordered food. Wuher must have empty hands to use the grill. Face the grill and press SPACE to spend one food ration and start cooking. Wait until the food is ready, then press SPACE again to pick up the plate. Carry it to the customer who ordered it and press SPACE to serve it.',
        );
    };

    private readonly handleFoodCookingStarted = (data: FoodCookingStartedData): void => {
        const grill = this.targets.grill;
        if (
            this.stage !== 'FOOD_GRILL_HINT'
            || grill === null
            || data.tileX !== grill.tileX
            || data.tileY !== grill.tileY
        ) return;

        this.stage = 'SERVICE';
        this.tutorial.showPointers([]);
    };

    private readonly handleTutorialClosed = (): void => {
        switch (this.stage) {
            case 'SHOP_DIALOG':
                this.stage = 'SHOP_HINT';
                this.scene.registry.set('requireFoodPurchase', true);
                this.tutorial.showButtonHint('materials');
                this.tutorial.pointToScreen(
                    this.getHudButtonPosition('materials').x,
                    GAME_REGISTRY.ui.topBarHeight / 2,
                );
                break;
            case 'GUIDE_DIALOG':
                this.stage = 'GUIDE_HINT';
                this.tutorial.showButtonHint('guide');
                this.tutorial.pointToScreen(
                    this.getHudButtonPosition('guide').x,
                    GAME_REGISTRY.ui.topBarHeight / 2,
                );
                break;
            case 'FOOD_ORDER_DIALOG': {
                const grill = this.targets.grill;
                if (grill === null) {
                    this.stage = 'SERVICE';
                    eventBus.emit(EVENT_GAME_WARNING, {
                        message: 'The grill is not configured in this map.',
                    });
                    break;
                }
                this.stage = 'FOOD_GRILL_HINT';
                this.tutorial.pointToWorld(
                    grill.tileX * TILE + TILE / 2,
                    grill.tileY * TILE + TILE / 2,
                );
                break;
            }
            case 'AFFINITY_DIALOG':
                this.stage = 'HEAT_HINT';
                eventBus.emit(EVENT_TUTORIAL_METER_HINT, {
                    meter: 'IMPERIAL_HEAT',
                    active: true,
                });
                this.heatTimer?.remove(false);
                this.heatTimer = this.scene.time.delayedCall(
                    GAME_REGISTRY.tutorial.night2MeterHintDurationMs,
                    () => {
                        this.heatTimer = null;
                        if (this.stage !== 'HEAT_HINT') return;
                        eventBus.emit(EVENT_TUTORIAL_METER_HINT, {
                            meter: 'IMPERIAL_HEAT',
                            active: false,
                        });
                        this.stage = 'HEAT_DIALOG';
                        this.tutorial.showTutorial(
                            'Imperial Heat rises while fights continue and spikes when someone dies. It slowly falls when the cantina is peaceful. If it reaches its limit, Imperial patrols raid the cantina and end the shift.',
                        );
                    },
                );
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
                    this.shopReopenTimer?.remove(false);
                    this.shopReopenTimer = this.scene.time.delayedCall(0, () => {
                        this.shopReopenTimer = null;
                        if (this.stage !== 'SHOP_OPEN' || this.foodPurchased) return;
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
            this.showAffinityConsequencesDialog();
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
        eventBus.emit(EVENT_TUTORIAL_METER_HINT, {
            meter: 'CRIMINAL_REPUTATION',
            active: true,
        });
        this.reputationTimer?.remove(false);
        this.reputationTimer = this.scene.time.delayedCall(
            GAME_REGISTRY.tutorial.night2MeterHintDurationMs,
            () => {
                this.reputationTimer = null;
                if (this.stage !== 'REPUTATION_HINT') return;
                eventBus.emit(EVENT_TUTORIAL_METER_HINT, {
                    meter: 'CRIMINAL_REPUTATION',
                    active: false,
                });
                this.stage = 'REPUTATION_DIALOG';
                this.tutorial.showTutorial(
                    'Criminal Reputation measures Jabba’s trust. Betrayal and failed deals reduce it, while helping the cantina’s criminal business keeps it high.',
                );
            },
        );
    };

    public constructor(
        private readonly scene: Scene,
        private readonly tutorial: TutorialManager,
        private readonly targets: Night2Targets,
    ) {
        eventBus.on(EVENT_GAME_MODE_CHANGED, this.handleModeChanged);
        eventBus.on(EVENT_CLIENT_ORDER_STARTED, this.handleClientOrderStarted);
        eventBus.on(EVENT_FOOD_COOKING_STARTED, this.handleFoodCookingStarted);
        eventBus.on(EVENT_TUTORIAL_CLOSED, this.handleTutorialClosed);
        eventBus.on(EVENT_SHOP_FOOD_PURCHASED, this.handleFoodPurchased);
        eventBus.on(EVENT_TOGGLE_MATERIALS, this.handleMaterialsToggled);
        eventBus.on(EVENT_TOGGLE_CLIENT_GUIDE, this.handleGuideToggled);
        eventBus.on(EVENT_OPEN_WANTED_POSTER, this.handleWantedOpened);
        eventBus.on(EVENT_CLOSE_WANTED_POSTER, this.handleWantedClosed);
        this.startupTimer = scene.time.delayedCall(0, () => {
            this.startupTimer = null;
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
        this.startupTimer?.remove(false);
        this.startupTimer = null;
        this.shopReopenTimer?.remove(false);
        this.shopReopenTimer = null;
        this.heatTimer?.remove(false);
        this.heatTimer = null;
        eventBus.emit(EVENT_TUTORIAL_METER_HINT, {
            meter: 'IMPERIAL_HEAT',
            active: false,
        });
        eventBus.emit(EVENT_TUTORIAL_METER_HINT, {
            meter: 'CRIMINAL_REPUTATION',
            active: false,
        });
        this.reputationTimer?.remove(false);
        this.reputationTimer = null;
        eventBus.off(EVENT_GAME_MODE_CHANGED, this.handleModeChanged);
        eventBus.off(EVENT_CLIENT_ORDER_STARTED, this.handleClientOrderStarted);
        eventBus.off(EVENT_FOOD_COOKING_STARTED, this.handleFoodCookingStarted);
        eventBus.off(EVENT_TUTORIAL_CLOSED, this.handleTutorialClosed);
        eventBus.off(EVENT_SHOP_FOOD_PURCHASED, this.handleFoodPurchased);
        eventBus.off(EVENT_TOGGLE_MATERIALS, this.handleMaterialsToggled);
        eventBus.off(EVENT_TOGGLE_CLIENT_GUIDE, this.handleGuideToggled);
        eventBus.off(EVENT_OPEN_WANTED_POSTER, this.handleWantedOpened);
        eventBus.off(EVENT_CLOSE_WANTED_POSTER, this.handleWantedClosed);
    }

    private ensureNight2Credits(): void {
        const currentCredits = Number(this.scene.registry.get(CREDITS_REGISTRY_KEY)) || 0;
        const { night2FoodPurchaseCreditThreshold, night2CourtesyCredits } = GAME_REGISTRY.tutorial;
        if (currentCredits < night2FoodPurchaseCreditThreshold) {
            const newTotal = night2CourtesyCredits;
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

    private showAffinityConsequencesDialog(): void {
        this.tutorial.showTutorial(
            'Keep rival species apart: incompatible customers at the same table, or in neighboring seats along the same bar, lose patience twice as fast. If tempers run out, they can start a fight. Stop it before someone dies; a body and blood damage furniture, frighten nearby customers, speed up their impatience, and make nearby chairs unusable until the mess is cleaned.',
        );
    }

    private getHudButtonPosition(id: 'guide' | 'materials'): { readonly x: number } {
        const config = GAME_REGISTRY.ui;
        const index = id === 'guide'
            ? config.guideButtonSlotIndex
            : config.materialsButtonSlotIndex;
        const slotWidth = (this.scene.scale.width - config.topBarMargin * 2)
            / config.topBarSlotCount;
        return {
            x: config.topBarMargin + slotWidth * (index + 0.5),
        };
    }

}
