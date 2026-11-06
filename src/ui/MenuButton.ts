import { GameObjects, Scene, Tweens } from 'phaser';

import { GAME_REGISTRY } from '../data/GameRegistry';
import { UI_HUD_FRAME_KEY } from '../data/constants';

/** Reusable pointer and keyboard focus control for the application menus. */
export class MenuButton {
    public readonly container: GameObjects.Container;
    private readonly background: GameObjects.Image;
    private readonly label: GameObjects.Text;
    private focusTween: Tweens.Tween | null = null;
    private isFocused = false;

    public constructor(
        private readonly scene: Scene,
        text: string,
        width: number,
        height: number,
        onActivate: () => void,
        onFocus?: () => void,
    ) {
        const config = GAME_REGISTRY.menus;
        this.background = scene.add.image(0, 0, UI_HUD_FRAME_KEY)
            .setDisplaySize(width, height)
            .setTint(config.panelColor);
        this.label = scene.add.text(0, 0, text, {
            fontFamily: 'monospace',
            fontSize: `${config.buttonFontSize}px`,
            color: `#${config.textColor.toString(16).padStart(6, '0')}`,
            fontStyle: 'bold',
            align: 'center',
            wordWrap: { width: width - config.panelPadding * 2 },
        }).setOrigin(0.5);
        this.container = scene.add.container(0, 0, [this.background, this.label]);
        this.background.setInteractive({ useHandCursor: true });
        this.background.on('pointerover', () => {
            onFocus?.();
            this.setFocused(true);
        });
        this.background.on('pointerdown', onActivate);
        this.setFocused(false);
    }

    public setPosition(x: number, y: number): this {
        this.container.setPosition(x, y);
        return this;
    }

    public setFocused(focused: boolean): void {
        if (this.isFocused === focused) return;
        this.isFocused = focused;
        const config = GAME_REGISTRY.menus;
        this.label.setColor(`#${(focused ? config.accentColor : config.textColor).toString(16).padStart(6, '0')}`);
        this.background.setTint(focused ? config.focusColor : config.panelColor);
        this.focusTween?.stop();
        this.focusTween = null;
        this.background.setScale(1);
        if (focused) {
            this.focusTween = this.scene.tweens.add({
                targets: this.background,
                scale: config.focusedScale,
                duration: config.focusPulseMs,
                yoyo: true,
                ease: 'Sine.Out',
            });
        }
    }

    public setText(text: string): void {
        this.label.setText(text);
    }

    public destroy(): void {
        this.focusTween?.stop();
        this.focusTween = null;
    }
}
