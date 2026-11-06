import { GameObjects, Input, Scene } from 'phaser';

import { GAME_REGISTRY } from '../data/GameRegistry';
import { MenuFlowManager } from '../managers/MenuFlowManager';
import { MenuButton } from '../ui/MenuButton';
import { MenuPanel } from '../ui/MenuPanel';

/** Title screen and entry point for a fresh run. */
export class MainMenuScene extends Scene {
    private readonly flow = new MenuFlowManager();
    private panel!: MenuPanel;
    private background!: GameObjects.Graphics;
    private buttons: MenuButton[] = [];
    private cursorKeys!: {
        readonly up: Input.Keyboard.Key;
        readonly down: Input.Keyboard.Key;
        readonly enter: Input.Keyboard.Key;
    };
    private selectedIndex = 0;

    public constructor() {
        super('MainMenuScene');
    }

    public create(): void {
        this.input.setTopOnly(true);
        this.drawCantinaBackdrop();
        this.panel = new MenuPanel(this, "CHALMUN'S CANTINA", 'MOS EISLEY HUSTLE  |  OUTER RIM');
        const config = GAME_REGISTRY.menus;
        this.buttons = [
            new MenuButton(this, 'PLAY', config.buttonWidth, config.buttonHeight, () => {
                this.flow.startNewGame(this);
            }, () => this.select(0)),
            new MenuButton(this, 'OPTIONS', config.buttonWidth, config.buttonHeight, () => {
                this.flow.openOptions(this, 'MainMenuScene');
            }, () => this.select(1)),
        ];
        this.buttons.forEach((button, index) => {
            button.setPosition(0, (index - config.mainButtonIndexCenter) * (config.buttonHeight + config.buttonGap));
            this.panel.add(button.container);
        });
        this.panel.add(this.add.text(0, this.panel.height * config.mainFooterOffsetRatio, 'A CANTINA ON THE EDGE OF THE GALAXY', {
            fontFamily: 'monospace',
            fontSize: `${config.bodyFontSize}px`,
            color: `#${config.mutedTextColor.toString(16).padStart(6, '0')}`,
            align: 'center',
        }).setOrigin(0.5));
        this.selectedIndex = 0;
        this.refreshFocus();
        this.cursorKeys = this.createMenuKeys();
        this.events.once('shutdown', this.destroyMenu, this);
        this.events.once('destroy', this.destroyMenu, this);
    }

    public update(): void {
        if (Input.Keyboard.JustDown(this.cursorKeys.up)) this.moveSelection(-1);
        if (Input.Keyboard.JustDown(this.cursorKeys.down)) this.moveSelection(1);
        if (Input.Keyboard.JustDown(this.cursorKeys.enter)) this.activateSelected();
    }

    private drawCantinaBackdrop(): void {
        this.background = this.add.graphics().setDepth(-1).setScrollFactor(0);
        this.drawBackdropShapes();
        this.scale.on('resize', this.drawBackdropShapes, this);
    }

    private drawBackdropShapes(): void {
        const config = GAME_REGISTRY.menus;
        const { width, height } = this.scale;
        this.background.clear();
        this.background.fillStyle(config.backgroundColor, 1);
        this.background.fillRect(0, 0, width, height);
        this.background.fillStyle(config.horizonColor, 1);
        this.background.fillRect(0, height * config.horizonStartRatio, width, height * (1 - config.horizonStartRatio));
        this.background.fillStyle(config.silhouetteColor, 1);
        const mainBuilding = config.primarySilhouette;
        const upperBuilding = config.upperSilhouette;
        const leftWindow = config.windowLeft;
        const rightWindow = config.windowRight;
        this.background.fillRoundedRect(width * mainBuilding.x, height * mainBuilding.y, width * mainBuilding.width, height * mainBuilding.height, height * mainBuilding.radius);
        this.background.fillRoundedRect(width * upperBuilding.x, height * upperBuilding.y, width * upperBuilding.width, height * upperBuilding.height, height * upperBuilding.radius);
        this.background.fillStyle(config.windowGlowColor, config.windowAlpha);
        this.background.fillRoundedRect(width * leftWindow.x, height * leftWindow.y, width * leftWindow.width, height * leftWindow.height, height * leftWindow.radius);
        this.background.fillRoundedRect(width * rightWindow.x, height * rightWindow.y, width * rightWindow.width, height * rightWindow.height, height * rightWindow.radius);
        this.background.fillStyle(config.accentColor, config.starAlpha);
        for (let index = 0; index < config.backgroundStarCount; index += 1) {
            const horizontal = ((index * config.backgroundStarXStep) % config.backgroundStarCount) / config.backgroundStarCount;
            const vertical = ((index * config.backgroundStarYStep) % config.backgroundStarCount) / config.backgroundStarCount;
            const radius = index % config.largeStarEvery === 0
                ? config.backgroundStarLargeRadius
                : config.backgroundStarSmallRadius;
            this.background.fillCircle(width * horizontal, height * vertical * config.backgroundSkyHeightRatio, radius);
        }
    }

    private createMenuKeys(): {
        readonly up: Input.Keyboard.Key;
        readonly down: Input.Keyboard.Key;
        readonly enter: Input.Keyboard.Key;
    } {
        const keyboard = this.input.keyboard;
        if (keyboard === null) throw new Error('Main menu requires keyboard input.');
        return {
            up: keyboard.addKey(Input.Keyboard.KeyCodes.UP),
            down: keyboard.addKey(Input.Keyboard.KeyCodes.DOWN),
            enter: keyboard.addKey(Input.Keyboard.KeyCodes.ENTER),
        };
    }

    private moveSelection(direction: number): void {
        this.selectedIndex = (this.selectedIndex + direction + this.buttons.length) % this.buttons.length;
        this.refreshFocus();
    }

    private select(index: number): void {
        this.selectedIndex = index;
        this.refreshFocus();
    }

    private refreshFocus(): void {
        this.buttons.forEach((button, index) => button.setFocused(index === this.selectedIndex));
    }

    private activateSelected(): void {
        if (this.selectedIndex === 0) this.flow.startNewGame(this);
        else this.flow.openOptions(this, 'MainMenuScene');
    }

    private destroyMenu(): void {
        this.scale.off('resize', this.drawBackdropShapes, this);
        this.cursorKeys?.up.destroy();
        this.cursorKeys?.down.destroy();
        this.cursorKeys?.enter.destroy();
        this.buttons.forEach((button) => button.destroy());
        this.buttons = [];
        this.background?.destroy();
    }
}
