import { GameObjects, Scene } from 'phaser';

import { GAME_REGISTRY } from '../data/GameRegistry';
import { UI_INVENTORY_SLOT_FRAME_KEY } from '../data/constants';

/** Shared dimmed backdrop and framed panel for title, options and pause menus. */
export class MenuPanel {
    public readonly container: GameObjects.Container;
    public width: number;
    public height: number;
    private readonly backdrop: GameObjects.Rectangle;
    private readonly panelFill: GameObjects.Rectangle;
    private readonly frame: GameObjects.Image;
    private readonly border: GameObjects.Rectangle;
    private readonly heading: GameObjects.Text;
    private readonly subtitleText: GameObjects.Text;
    private readonly subtitle: string;

    public constructor(
        private readonly scene: Scene,
        title: string,
        subtitle = '',
    ) {
        this.subtitle = subtitle;
        const config = GAME_REGISTRY.menus;
        this.width = Math.min(config.panelWidth, scene.scale.width - config.panelPadding * 2);
        this.height = Math.min(config.panelHeight, scene.scale.height - config.panelPadding * 2);
        this.backdrop = scene.add.rectangle(
            0, 0, scene.scale.width, scene.scale.height, config.overlayColor, config.overlayAlpha,
        ).setOrigin(0).setPosition(-scene.scale.width / 2, -scene.scale.height / 2).setInteractive();
        this.panelFill = scene.add.rectangle(0, 0, this.width, this.height, config.panelColor, config.panelFillAlpha);
        this.frame = scene.add.image(0, 0, UI_INVENTORY_SLOT_FRAME_KEY)
            .setDisplaySize(this.width + config.panelPadding * 2, this.height + config.panelPadding * 2)
            .setTint(config.panelColor);
        this.border = scene.add.rectangle(0, 0, this.width, this.height)
            .setStrokeStyle(config.panelBorderWidth, config.borderColor);
        this.heading = scene.add.text(0, -this.height * config.headingOffsetRatio, title, {
            fontFamily: 'monospace',
            fontSize: `${config.titleFontSize}px`,
            color: `#${config.accentColor.toString(16).padStart(6, '0')}`,
            fontStyle: 'bold',
            align: 'center',
            wordWrap: { width: this.width - config.panelPadding * 2 },
        }).setOrigin(0.5);
        this.subtitleText = scene.add.text(0, -this.height * config.subtitleOffsetRatio, subtitle, {
            fontFamily: 'monospace',
            fontSize: `${config.bodyFontSize}px`,
            color: `#${config.mutedTextColor.toString(16).padStart(6, '0')}`,
            align: 'center',
            wordWrap: { width: this.width - config.panelPadding * 2 },
        }).setOrigin(0.5);
        this.container = scene.add.container(scene.scale.width / 2, scene.scale.height / 2, [
            this.backdrop, this.panelFill, this.frame, this.border, this.heading, this.subtitleText,
        ]).setDepth(config.panelDepth).setScrollFactor(0);
        scene.scale.on('resize', this.reposition, this);
        scene.events.once('shutdown', this.destroy, this);
        scene.events.once('destroy', this.destroy, this);
    }

    public add<T extends GameObjects.GameObject>(object: T): T {
        this.container.add(object);
        return object;
    }

    public destroy(): void {
        this.scene.scale.off('resize', this.reposition, this);
    }

    private reposition(): void {
        const config = GAME_REGISTRY.menus;
        this.width = Math.min(config.panelWidth, this.scene.scale.width - config.panelPadding * 2);
        this.height = Math.min(config.panelHeight, this.scene.scale.height - config.panelPadding * 2);
        this.backdrop.setSize(this.scene.scale.width, this.scene.scale.height);
        this.backdrop.setPosition(-this.scene.scale.width / 2, -this.scene.scale.height / 2);
        this.panelFill.setSize(this.width, this.height);
        this.frame.setDisplaySize(this.width + config.panelPadding * 2, this.height + config.panelPadding * 2);
        this.border.setSize(this.width, this.height);
        this.heading.setPosition(0, -this.height * config.headingOffsetRatio).setWordWrapWidth(this.width - config.panelPadding * 2);
        this.subtitleText.setText(this.subtitle)
            .setPosition(0, -this.height * config.subtitleOffsetRatio)
            .setWordWrapWidth(this.width - config.panelPadding * 2);
        this.container.setPosition(this.scene.scale.width / 2, this.scene.scale.height / 2);
    }
}
