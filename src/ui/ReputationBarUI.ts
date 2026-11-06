import { GameObjects, Scene, Tweens } from 'phaser';

import {
    CRIMINAL_REPUTATION_REGISTRY_KEY,
    GAME_REGISTRY,
} from '../data/GameRegistry';
import {
    eventBus,
    EVENT_NIGHT_FEATURES_CHANGED,
    EVENT_REPUTATION_UPDATED,
    EVENT_TUTORIAL_METER_HINT,
    type NightFeaturesData,
    type ReputationUpdatedData,
    type TutorialMeterHintData,
} from '../utils/EventBus';

/** Responsive lower-right criminal reputation meter driven by reputation events. */
export class ReputationBarUI {
    private readonly container: GameObjects.Container;
    private readonly track: GameObjects.Rectangle;
    private readonly fill: GameObjects.Rectangle;
    private readonly label: GameObjects.Rectangle;
    private readonly labelText: GameObjects.Text;
    private readonly config = GAME_REGISTRY.ui;
    private reputationTween: Tweens.Tween | null = null;
    private hintTween: Tweens.Tween | null = null;
    private reputationHintActive = false;
    private readonly handleFeaturesChanged = (data: NightFeaturesData): void => {
        this.container.setVisible(data.advancedSystemsEnabled);
        this.refreshHintAnimation();
    };

    private readonly handleMeterHint = (data: TutorialMeterHintData): void => {
        if (data.meter !== 'CRIMINAL_REPUTATION') return;
        this.reputationHintActive = data.active;
        this.refreshHintAnimation();
    };

    private readonly handleReputationUpdated = (data: ReputationUpdatedData): void => {
        const ratio = Math.max(
            0,
            Math.min(1, data.currentReputation / GAME_REGISTRY.reputation.maxReputation),
        );
        this.reputationTween?.stop();
        this.reputationTween = this.scene.tweens.add({
            targets: this.fill,
            scaleX: ratio,
            duration: 300,
            ease: 'Sine.Out',
            onComplete: () => {
                this.reputationTween = null;
            },
        });
    };

    public constructor(private readonly scene: Scene) {
        this.container = scene.add.container(0, 0)
            .setScrollFactor(0)
            .setDepth(this.config.topBarDepth);
        this.container.setVisible(scene.registry.get('currentNight') !== 1);
        const trackWidth = this.config.reputationBarWidth - this.config.reputationBarLabelWidth;
        this.track = scene.add.rectangle(
            0,
            0,
            trackWidth,
            this.config.reputationBarHeight,
            this.config.reputationBarTrackColor,
        );
        this.fill = scene.add.rectangle(
            0,
            0,
            trackWidth,
            this.config.reputationBarHeight - 4,
            this.config.reputationBarFillColor,
        ).setOrigin(0, 0.5).setScale(0, 1);
        this.label = scene.add.rectangle(
            0,
            0,
            this.config.reputationBarLabelWidth,
            this.config.reputationBarHeight,
            this.config.reputationBarLabelColor,
        );
        this.labelText = scene.add.text(0, 0, 'REPUTATION', {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: `#${this.config.reputationBarTextColor.toString(16).padStart(6, '0')}`,
            fontStyle: 'bold',
        }).setOrigin(0.5);
        this.container.add([this.track, this.fill, this.label, this.labelText]);

        eventBus.on(EVENT_REPUTATION_UPDATED, this.handleReputationUpdated);
        eventBus.on(EVENT_NIGHT_FEATURES_CHANGED, this.handleFeaturesChanged);
        eventBus.on(EVENT_TUTORIAL_METER_HINT, this.handleMeterHint);
        scene.scale.on('resize', this.reposition, this);
        scene.events.once('shutdown', this.destroy, this);
        scene.events.once('destroy', this.destroy, this);
        this.reposition();

        const storedReputation = scene.registry.get(CRIMINAL_REPUTATION_REGISTRY_KEY);
        this.handleReputationUpdated({
            currentReputation: typeof storedReputation === 'number'
                ? storedReputation
                : GAME_REGISTRY.reputation.startingReputation,
            change: 0,
        });
    }

    public destroy(): void {
        eventBus.off(EVENT_REPUTATION_UPDATED, this.handleReputationUpdated);
        eventBus.off(EVENT_NIGHT_FEATURES_CHANGED, this.handleFeaturesChanged);
        eventBus.off(EVENT_TUTORIAL_METER_HINT, this.handleMeterHint);
        this.scene.scale.off('resize', this.reposition, this);
        this.reputationTween?.stop();
        this.reputationTween = null;
        this.hintTween?.stop();
        this.hintTween = null;
        this.container.destroy(true);
    }

    private refreshHintAnimation(): void {
        if (!this.reputationHintActive || !this.container.visible) {
            this.hintTween?.stop();
            this.hintTween = null;
            this.container.setAlpha(1);
            return;
        }
        if (this.hintTween !== null) return;

        this.hintTween = this.scene.tweens.add({
            targets: this.container,
            alpha: this.config.tutorialMeterMinimumAlpha,
            duration: this.config.tutorialMeterPulseDurationMs,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut',
        });
    }

    private reposition(): void {
        const y = this.scene.scale.height
            - this.config.reputationBarMargin
            - this.config.reputationBarHeight / 2;
        const x = this.scene.scale.width - this.config.reputationBarMargin - this.config.reputationBarWidth;
        const trackWidth = this.config.reputationBarWidth - this.config.reputationBarLabelWidth;
        this.label.setPosition(x + this.config.reputationBarLabelWidth / 2, y);
        this.labelText.setPosition(x + this.config.reputationBarLabelWidth / 2, y);
        this.track.setPosition(
            x + this.config.reputationBarLabelWidth + trackWidth / 2,
            y,
        );
        this.fill.setPosition(x + this.config.reputationBarLabelWidth, y);
    }
}
