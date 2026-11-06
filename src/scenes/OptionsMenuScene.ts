import { GameObjects, Input, Math as PhaserMath, Scene } from 'phaser';

import { GAME_REGISTRY } from '../data/GameRegistry';
import { AudioSettingsManager } from '../managers/AudioSettingsManager';
import { MenuFlowManager, MAIN_MENU_SCENE_KEY, PAUSE_MENU_SCENE_KEY } from '../managers/MenuFlowManager';
import { MenuButton } from '../ui/MenuButton';
import { MenuPanel } from '../ui/MenuPanel';

interface OptionsSceneData {
    readonly returnSceneKey?: string;
}

/** Reusable master-volume and mute overlay for title and pause menus. */
export class OptionsMenuScene extends Scene {
    private readonly flow = new MenuFlowManager();
    private settings!: AudioSettingsManager;
    private panel!: MenuPanel;
    private sliderTrack!: GameObjects.Rectangle;
    private sliderFill!: GameObjects.Rectangle;
    private sliderKnob!: GameObjects.Arc;
    private sliderFocus!: GameObjects.Rectangle;
    private volumeLabel!: GameObjects.Text;
    private muteButton!: MenuButton;
    private backButton!: MenuButton;
    private keys!: {
        readonly escape: Input.Keyboard.Key;
        readonly enter: Input.Keyboard.Key;
        readonly left: Input.Keyboard.Key;
        readonly right: Input.Keyboard.Key;
        readonly up: Input.Keyboard.Key;
        readonly down: Input.Keyboard.Key;
    };
    private returnSceneKey = MAIN_MENU_SCENE_KEY;
    private selectedIndex = 0;

    public constructor() {
        super('OptionsMenuScene');
    }

    public init(data: OptionsSceneData): void {
        this.returnSceneKey = data.returnSceneKey === PAUSE_MENU_SCENE_KEY
            ? PAUSE_MENU_SCENE_KEY
            : MAIN_MENU_SCENE_KEY;
    }

    public create(): void {
        this.input.setTopOnly(true);
        const config = GAME_REGISTRY.menus;
        this.settings = new AudioSettingsManager(this);
        this.panel = new MenuPanel(this, 'OPTIONS', 'MASTER AUDIO');
        this.createVolumeSlider();
        this.volumeLabel = this.add.text(0, config.optionsVolumeLabelY, '', {
            fontFamily: 'monospace',
            fontSize: `${GAME_REGISTRY.menus.bodyFontSize}px`,
            color: `#${GAME_REGISTRY.menus.textColor.toString(16).padStart(6, '0')}`,
        }).setOrigin(0.5);
        this.panel.add(this.volumeLabel);
        this.muteButton = new MenuButton(this, '', GAME_REGISTRY.menus.buttonWidth, GAME_REGISTRY.menus.buttonHeight, () => {
            this.settings.setMuted(!this.settings.settings.muted);
            this.refreshAudioControls();
        }, () => this.select(1));
        this.muteButton.setPosition(0, config.optionsMuteButtonY);
        this.panel.add(this.muteButton.container);
        this.backButton = new MenuButton(this, 'BACK', GAME_REGISTRY.menus.buttonWidth, GAME_REGISTRY.menus.buttonHeight, () => {
            this.flow.returnFromOptions(this, this.returnSceneKey);
        }, () => this.select(2));
        this.backButton.setPosition(0, config.optionsBackButtonY);
        this.panel.add(this.backButton.container);
        this.keys = this.createKeys();
        this.input.on('pointermove', this.handlePointerMove, this);
        this.input.on('pointerdown', this.handlePointerDown, this);
        this.events.once('shutdown', this.destroyMenu, this);
        this.events.once('destroy', this.destroyMenu, this);
        this.refreshAudioControls();
        this.refreshFocus();
    }

    public update(): void {
        if (Input.Keyboard.JustDown(this.keys.escape)) {
            this.flow.returnFromOptions(this, this.returnSceneKey);
            return;
        }
        if (Input.Keyboard.JustDown(this.keys.up)) this.select((this.selectedIndex + 2) % 3);
        if (Input.Keyboard.JustDown(this.keys.down)) this.select((this.selectedIndex + 1) % 3);
        if (this.selectedIndex === 0) {
            if (Input.Keyboard.JustDown(this.keys.left)) this.adjustVolume(-1);
            if (Input.Keyboard.JustDown(this.keys.right)) this.adjustVolume(1);
        }
        if (Input.Keyboard.JustDown(this.keys.enter)) {
            if (this.selectedIndex === 1) {
                this.settings.setMuted(!this.settings.settings.muted);
                this.refreshAudioControls();
            } else if (this.selectedIndex === 2) {
                this.flow.returnFromOptions(this, this.returnSceneKey);
            }
        }
    }

    private createVolumeSlider(): void {
        const config = GAME_REGISTRY.menus;
        const sliderY = config.optionsSliderY;
        this.sliderFocus = this.add.rectangle(0, sliderY, config.sliderWidth + config.buttonGap, config.buttonHeight, 0x000000, 0)
            .setStrokeStyle(config.panelBorderWidth, config.focusColor);
        this.panel.add(this.sliderFocus);
        this.sliderTrack = this.add.rectangle(0, sliderY, config.sliderWidth, config.sliderHeight, config.panelColor)
            .setStrokeStyle(1, config.borderColor)
            .setInteractive({ useHandCursor: true });
        this.panel.add(this.sliderTrack);
        this.sliderFill = this.add.rectangle(-config.sliderWidth / 2, sliderY, 0, config.sliderHeight, config.accentColor)
            .setOrigin(0, 0.5);
        this.panel.add(this.sliderFill);
        this.sliderKnob = this.add.circle(-config.sliderWidth / 2, sliderY, config.sliderKnobRadius, config.textColor)
            .setStrokeStyle(config.panelBorderWidth, config.borderColor);
        this.panel.add(this.sliderKnob);
    }

    private readonly handlePointerMove = (pointer: Input.Pointer): void => {
        if (!pointer.isDown || pointer.button !== 0) return;
        this.setVolumeFromPointer(pointer.x - this.scale.width / 2);
    };

    private readonly handlePointerDown = (pointer: Input.Pointer): void => {
        const centerX = this.scale.width / 2;
        const bounds = this.sliderTrack.getBounds();
        if (!bounds.contains(pointer.x, pointer.y)) return;
        this.select(0);
        this.setVolumeFromPointer(pointer.x - centerX);
    };

    private setVolumeFromPointer(localX: number): void {
        const halfWidth = GAME_REGISTRY.menus.sliderWidth / 2;
        this.settings.setMasterVolume((localX + halfWidth) / (halfWidth * 2));
        this.refreshAudioControls();
    }

    private adjustVolume(direction: number): void {
        this.settings.setMasterVolume(
            this.settings.settings.masterVolume + direction * GAME_REGISTRY.menus.volumeStep,
        );
        this.refreshAudioControls();
    }

    private refreshAudioControls(): void {
        const { masterVolume, muted } = this.settings.settings;
        const width = GAME_REGISTRY.menus.sliderWidth * masterVolume;
        this.sliderFill.setSize(width, GAME_REGISTRY.menus.sliderHeight);
        this.sliderKnob.setX(-GAME_REGISTRY.menus.sliderWidth / 2 + width);
        this.volumeLabel.setText(`${Math.round(masterVolume * 100)}%`);
        this.muteButton.setText(muted ? 'UNMUTE' : 'MUTE');
    }

    private select(index: number): void {
        this.selectedIndex = PhaserMath.Wrap(index, 0, 3);
        this.refreshFocus();
    }

    private refreshFocus(): void {
        this.sliderFocus.setVisible(this.selectedIndex === 0);
        this.muteButton.setFocused(this.selectedIndex === 1);
        this.backButton.setFocused(this.selectedIndex === 2);
    }

    private createKeys(): {
        readonly escape: Input.Keyboard.Key;
        readonly enter: Input.Keyboard.Key;
        readonly left: Input.Keyboard.Key;
        readonly right: Input.Keyboard.Key;
        readonly up: Input.Keyboard.Key;
        readonly down: Input.Keyboard.Key;
    } {
        const keyboard = this.input.keyboard;
        if (keyboard === null) throw new Error('Options menu requires keyboard input.');
        return {
            escape: keyboard.addKey(Input.Keyboard.KeyCodes.ESC),
            enter: keyboard.addKey(Input.Keyboard.KeyCodes.ENTER),
            left: keyboard.addKey(Input.Keyboard.KeyCodes.LEFT),
            right: keyboard.addKey(Input.Keyboard.KeyCodes.RIGHT),
            up: keyboard.addKey(Input.Keyboard.KeyCodes.UP),
            down: keyboard.addKey(Input.Keyboard.KeyCodes.DOWN),
        };
    }

    private destroyMenu(): void {
        this.input.off('pointermove', this.handlePointerMove, this);
        this.input.off('pointerdown', this.handlePointerDown, this);
        Object.values(this.keys ?? {}).forEach((key) => key.destroy());
        this.muteButton?.destroy();
        this.backButton?.destroy();
    }
}
