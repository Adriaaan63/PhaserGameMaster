import { GameObjects, Scene, Tweens } from 'phaser';

import { IMPERIAL_HEAT_REGISTRY_KEY, GAME_REGISTRY } from '../data/GameRegistry';
import {
    EVENT_HEAT_UPDATED,
    EVENT_NIGHT_FEATURES_CHANGED,
    EVENT_TUTORIAL_METER_HINT,
    eventBus,
    type HeatUpdatedData,
    type NightFeaturesData,
    type TutorialMeterHintData,
} from '../utils/EventBus';

/** Responsive lower-left Imperial alert meter driven by threat events. */
export class ImperialBarUI {
    private readonly container: GameObjects.Container;
    private readonly track: GameObjects.Rectangle;
    private readonly fill: GameObjects.Rectangle;
    private readonly label: GameObjects.Rectangle;
    private readonly labelText: GameObjects.Text;
    private readonly config = GAME_REGISTRY.ui;
    private heatTween: Tweens.Tween | null = null;
    private hintTween: Tweens.Tween | null = null;
    private heatHintActive = false;
    private readonly handleFeaturesChanged = (data: NightFeaturesData): void => {
        this.container.setVisible(data.advancedSystemsEnabled);
        this.refreshHintAnimation();
    };

    private readonly handleMeterHint = (data: TutorialMeterHintData): void => {
        if (data.meter !== 'IMPERIAL_HEAT') return;
        this.heatHintActive = data.active;
        this.refreshHintAnimation();
    };

    private readonly handleHeatUpdated = (data: HeatUpdatedData): void => {
        const ratio = Math.max(
            0,
            Math.min(1, data.currentHeat / GAME_REGISTRY.threat.maxHeat),
        );
        this.heatTween?.stop();
        this.heatTween = this.scene.tweens.add({
            targets: this.fill,
            scaleX: ratio,
            duration: 300,
            ease: 'Sine.Out',
            onComplete: () => {
                this.heatTween = null;
            },
        });
    };

    public constructor(private readonly scene: Scene) {
        this.container = scene.add.container(0, 0)
            .setScrollFactor(0)
            .setDepth(this.config.topBarDepth);
        this.container.setVisible(scene.registry.get('currentNight') !== 1);

        const trackWidth = this.config.imperialBarWidth - this.config.imperialBarLabelWidth;
        this.track = scene.add.rectangle(0, 0, trackWidth, this.config.imperialBarHeight, this.config.imperialBarTrackColor);
        this.fill = scene.add.rectangle(
            0,
            0,
            trackWidth,
            this.config.imperialBarHeight - 4,
            this.config.imperialBarFillColor,
        ).setOrigin(0, 0.5).setScale(0, 1);
        this.label = scene.add.rectangle(
            0,
            0,
            this.config.imperialBarLabelWidth,
            this.config.imperialBarHeight,
            this.config.imperialBarLabelColor,
        );
        this.labelText = scene.add.text(0, 0, 'IMPERIUM', {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: `#${this.config.imperialBarTextColor.toString(16).padStart(6, '0')}`,
            fontStyle: 'bold',
        }).setOrigin(0.5);
        this.container.add([this.track, this.fill, this.label, this.labelText]);

        eventBus.on(EVENT_HEAT_UPDATED, this.handleHeatUpdated);
        eventBus.on(EVENT_NIGHT_FEATURES_CHANGED, this.handleFeaturesChanged);
        eventBus.on(EVENT_TUTORIAL_METER_HINT, this.handleMeterHint);
        scene.scale.on('resize', this.reposition, this);
        scene.events.once('shutdown', this.destroy, this);
        scene.events.once('destroy', this.destroy, this);
        this.reposition();

        const storedHeat = scene.registry.get(IMPERIAL_HEAT_REGISTRY_KEY);
        if (typeof storedHeat === 'number') {
            this.handleHeatUpdated({ currentHeat: storedHeat, addedHeat: 0 });
        }
    }

    public destroy(): void {
        eventBus.off(EVENT_HEAT_UPDATED, this.handleHeatUpdated);
        eventBus.off(EVENT_NIGHT_FEATURES_CHANGED, this.handleFeaturesChanged);
        eventBus.off(EVENT_TUTORIAL_METER_HINT, this.handleMeterHint);
        this.scene.scale.off('resize', this.reposition, this);
        this.heatTween?.stop();
        this.heatTween = null;
        this.hintTween?.stop();
        this.hintTween = null;
        this.container.destroy(true);
    }

    private refreshHintAnimation(): void {
        if (!this.heatHintActive || !this.container.visible) {
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
            - this.config.imperialBarMargin
            - this.config.imperialBarHeight / 2;
        const x = this.config.imperialBarMargin;
        const trackWidth = this.config.imperialBarWidth - this.config.imperialBarLabelWidth;

        this.label.setPosition(x + this.config.imperialBarLabelWidth / 2, y);
        this.labelText.setPosition(x + this.config.imperialBarLabelWidth / 2, y);
        this.track.setPosition(
            x + this.config.imperialBarLabelWidth + trackWidth / 2,
            y,
        );
        this.fill.setPosition(x + this.config.imperialBarLabelWidth, y);
    }
}
