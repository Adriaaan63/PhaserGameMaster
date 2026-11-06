import { GameObjects, Input, Scene } from 'phaser';

import { GAME_REGISTRY } from '../data/GameRegistry';
import {
    eventBus,
    EVENT_CLOSE_WANTED_POSTER,
    EVENT_OPEN_WANTED_POSTER,
    type WantedProfileData,
} from '../utils/EventBus';

/** Displays and closes the procedurally generated wanted poster. */
export class WantedUI {
    private readonly overlay: GameObjects.Container;
    private readonly closeKey: Input.Keyboard.Key;
    private isOpen = false;
    private ignoreCloseUntilReleased = false;

    private readonly handleOpen = (data: WantedProfileData): void => {
        this.isOpen = true;
        this.ignoreCloseUntilReleased = true;
        this.overlay.setVisible(true);
        const profile = data.profile;
        const panel = this.overlay.getAt(1);
        const portrait = this.overlay.getAt(2);
        const title = this.overlay.getAt(3);
        const detail = this.overlay.getAt(4);
        const reward = this.overlay.getAt(5);
        if (panel instanceof GameObjects.Rectangle) panel.setFillStyle(GAME_REGISTRY.wanted.posterBackgroundColor);
        if (portrait instanceof GameObjects.Rectangle) portrait.setFillStyle(profile.placeholderColor);
        if (title instanceof GameObjects.Text) title.setText('SEEK AND CAPTURE');
        if (detail instanceof GameObjects.Text) {
            detail.setText(`RACE: ${profile.race}\nDETAIL: ${profile.visualDetail}`);
        }
        if (reward instanceof GameObjects.Text) {
            reward.setText(`REWARD: ${profile.rewardCredits} CREDITS`);
        }
    };

    private readonly handleClose = (): void => {
        this.isOpen = false;
        this.overlay.setVisible(false);
    };

    public constructor(private readonly scene: Scene) {
        const config = GAME_REGISTRY.ui;
        const centerX = scene.scale.width / 2;
        const centerY = scene.scale.height / 2;
        const overlayBackground = scene.add.rectangle(
            centerX,
            centerY,
            scene.scale.width,
            scene.scale.height,
            config.wantedPosterOverlayColor,
            config.wantedPosterOverlayAlpha,
        );
        const panel = scene.add.rectangle(
            centerX,
            centerY,
            config.wantedPosterWidth,
            config.wantedPosterHeight,
            GAME_REGISTRY.wanted.posterBackgroundColor,
        ).setStrokeStyle(4, GAME_REGISTRY.wanted.posterPanelColor);
        const portrait = scene.add.rectangle(centerX, centerY - 30, 96, 96, 0xffffff);
        const title = scene.add.text(centerX, centerY - 126, '', {
            fontFamily: 'monospace',
            fontSize: `${config.wantedPosterTitleFontSize}px`,
            color: `#${GAME_REGISTRY.wanted.posterTextColor.toString(16).padStart(6, '0')}`,
            fontStyle: 'bold',
        }).setOrigin(0.5);
        const detail = scene.add.text(centerX - 175, centerY + 28, '', {
            fontFamily: 'monospace',
            fontSize: `${config.wantedPosterBodyFontSize}px`,
            color: `#${GAME_REGISTRY.wanted.posterDetailColor.toString(16).padStart(6, '0')}`,
            wordWrap: { width: 350 },
        });
        const reward = scene.add.text(centerX, centerY + 112, '', {
            fontFamily: 'monospace',
            fontSize: `${config.wantedPosterBodyFontSize}px`,
            color: `#${GAME_REGISTRY.wanted.posterDetailColor.toString(16).padStart(6, '0')}`,
            fontStyle: 'bold',
        }).setOrigin(0.5);
        const close = scene.add.text(
            centerX + config.wantedPosterWidth / 2 - 18,
            centerY - config.wantedPosterHeight / 2 + 12,
            'X',
            { fontFamily: 'monospace', fontSize: '18px', color: '#2a1710' },
        ).setOrigin(0.5).setInteractive({ useHandCursor: true });
        close.on('pointerdown', this.close);
        this.overlay = scene.add.container(0, 0, [
            overlayBackground,
            panel,
            portrait,
            title,
            detail,
            reward,
            close,
        ]).setDepth(config.wantedPosterDepth).setVisible(false);

        const keyboard = scene.input.keyboard;
        if (keyboard === null) throw new Error('No se encontró el teclado para cerrar el cartel Wanted.');
        this.closeKey = keyboard.addKey(Input.Keyboard.KeyCodes.SPACE);
        eventBus.on(EVENT_OPEN_WANTED_POSTER, this.handleOpen);
        eventBus.on(EVENT_CLOSE_WANTED_POSTER, this.handleClose);
        scene.events.once('shutdown', this.destroy, this);
        scene.events.once('destroy', this.destroy, this);
    }

    public update(): void {
        if (!this.closeKey.isDown) this.ignoreCloseUntilReleased = false;
        if (
            this.isOpen
            && !this.ignoreCloseUntilReleased
            && Input.Keyboard.JustDown(this.closeKey)
        ) {
            this.close();
        }
    }

    public get isVisible(): boolean {
        return this.isOpen;
    }

    public destroy(): void {
        eventBus.off(EVENT_OPEN_WANTED_POSTER, this.handleOpen);
        eventBus.off(EVENT_CLOSE_WANTED_POSTER, this.handleClose);
        this.closeKey.destroy();
        this.overlay.destroy(true);
    }

    private readonly close = (): void => {
        if (!this.isOpen) return;
        eventBus.emit(EVENT_CLOSE_WANTED_POSTER);
    };
}
