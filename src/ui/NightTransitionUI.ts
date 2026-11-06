import { GameObjects, Scene, Tweens } from 'phaser';

import {
    eventBus,
    EVENT_NIGHT_END_READY,
    EVENT_NIGHT_TRANSITION_COMPLETE,
    type NightEndedData,
} from '../utils/EventBus';

/** Displays the inter-night title card without coupling progression to UI. */
export class NightTransitionUI {
    private readonly overlay: GameObjects.Container;
    private readonly backdrop: GameObjects.Rectangle;
    private readonly title: GameObjects.Text;
    private tween: Tweens.Tween | null = null;

    private readonly handleNightEndReady = (data: NightEndedData): void => {
        this.tween?.stop();
        this.overlay.setVisible(true);
        this.backdrop.setAlpha(0);
        this.title.setText(`NIGHT ${data.nextNight}`);
        this.title.setAlpha(0);
        this.tween = this.scene.tweens.add({
            targets: [this.backdrop, this.title],
            alpha: 1,
            duration: 700,
            hold: 1_100,
            yoyo: true,
            ease: 'Sine.InOut',
            onComplete: () => {
                this.overlay.setVisible(false);
                this.tween = null;
                eventBus.emit(EVENT_NIGHT_TRANSITION_COMPLETE);
            },
        });
    };

    public constructor(private readonly scene: Scene) {
        this.backdrop = scene.add.rectangle(
            0, 0, scene.scale.width, scene.scale.height, 0x000000, 1,
        ).setOrigin(0);
        this.title = scene.add.text(
            scene.scale.width / 2,
            scene.scale.height / 2,
            '',
            {
                color: '#f4ede2',
                fontFamily: 'monospace',
                fontSize: '32px',
                stroke: '#111821',
                strokeThickness: 6,
            },
        ).setOrigin(0.5);
        this.overlay = scene.add.container(0, 0, [this.backdrop, this.title])
            .setDepth(20_000)
            .setScrollFactor(0)
            .setVisible(false);
        eventBus.on(EVENT_NIGHT_END_READY, this.handleNightEndReady);
        scene.scale.on('resize', this.reposition, this);
        scene.events.once('shutdown', this.destroy, this);
        scene.events.once('destroy', this.destroy, this);
        this.reposition();
    }

    public destroy(): void {
        eventBus.off(EVENT_NIGHT_END_READY, this.handleNightEndReady);
        this.scene.scale.off('resize', this.reposition, this);
        this.tween?.stop();
        this.overlay.destroy(true);
    }

    public get isVisible(): boolean {
        return this.overlay.visible;
    }

    private reposition(): void {
        this.backdrop.setSize(this.scene.scale.width, this.scene.scale.height);
        this.title.setPosition(this.scene.scale.width / 2, this.scene.scale.height / 2);
    }
}
