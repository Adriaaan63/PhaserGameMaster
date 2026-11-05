import { Scene } from 'phaser';

import {
    eventBus,
    EVENT_CLIENT_ORDER_STARTED,
    EVENT_GAME_MODE_CHANGED,
    type ClientOrderStartedData,
    type GameModeChangedData,
} from '../utils/EventBus';
import { TutorialManager, type TutorialStep } from './TutorialManager';

/** Guided onboarding for the advanced management systems in the second night. */
export class Night2Script {
    private cookingTutorialShown = false;

    private readonly handleModeChanged = (data: GameModeChangedData): void => {
        if (data.mode !== 'PRE_APERTURA') return;
        this.tutorial.start(this.preOpeningSteps);
    };

    private readonly handleOrderStarted = (data: ClientOrderStartedData): void => {
        if (this.cookingTutorialShown || data.orderItemId !== 'FOOD_PLATE') return;
        this.cookingTutorialShown = true;
        this.tutorial.start([
            { text: 'This customer ordered food. The Grill prepares one plate at a time.', pauseGameplay: true },
            { text: 'Stand near the Grill and hold Space until the plate is ready.', pauseGameplay: false },
        ]);
    };

    private readonly preOpeningSteps: readonly TutorialStep[] = [
        { text: 'Use Materials to buy food and keep the kitchen supplied.', pauseGameplay: false },
        { text: 'The Client Guide shows which species work well together.', pauseGameplay: false },
        { text: 'Fights increase Imperial Heat and can leave bodies and blood behind.', pauseGameplay: false },
        { text: 'Read the Wanted poster to identify the suspect for this night.', pauseGameplay: false },
        { text: 'Criminal Reputation reflects Jabba’s trust. Betrayal damages it heavily.', pauseGameplay: false },
    ];

    public constructor(
        private readonly scene: Scene,
        private readonly tutorial: TutorialManager,
    ) {
        eventBus.on(EVENT_GAME_MODE_CHANGED, this.handleModeChanged);
        eventBus.on(EVENT_CLIENT_ORDER_STARTED, this.handleOrderStarted);
        scene.time.delayedCall(0, () => this.tutorial.start(this.preOpeningSteps));
        scene.events.once('shutdown', this.destroy, this);
        scene.events.once('destroy', this.destroy, this);
    }

    public destroy(): void {
        eventBus.off(EVENT_GAME_MODE_CHANGED, this.handleModeChanged);
        eventBus.off(EVENT_CLIENT_ORDER_STARTED, this.handleOrderStarted);
    }
}
