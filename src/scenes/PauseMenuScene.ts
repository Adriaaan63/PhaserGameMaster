import { Input, Scene } from 'phaser';

import { GAME_REGISTRY } from '../data/GameRegistry';
import { MenuFlowManager } from '../managers/MenuFlowManager';
import { MenuButton } from '../ui/MenuButton';
import { MenuPanel } from '../ui/MenuPanel';

/** Modal pause overlay that leaves both gameplay and its HUD frozen underneath. */
export class PauseMenuScene extends Scene {
    private readonly flow = new MenuFlowManager();
    private panel!: MenuPanel;
    private buttons: MenuButton[] = [];
    private keys!: {
        readonly escape: Input.Keyboard.Key;
        readonly enter: Input.Keyboard.Key;
        readonly up: Input.Keyboard.Key;
        readonly down: Input.Keyboard.Key;
    };
    private selectedIndex = 0;
    private ignoreEscapeUntilReleased = true;

    public constructor() {
        super('PauseMenuScene');
    }

    public create(): void {
        this.input.setTopOnly(true);
        this.ignoreEscapeUntilReleased = true;
        this.panel = new MenuPanel(this, 'PAUSED', "THE CANTINA CAN WAIT");
        const config = GAME_REGISTRY.menus;
        this.buttons = [
            new MenuButton(this, 'RESUME', config.buttonWidth, config.buttonHeight, () => this.resume(), () => this.select(0)),
            new MenuButton(this, 'OPTIONS', config.buttonWidth, config.buttonHeight, () => {
                this.flow.openOptions(this, 'PauseMenuScene');
            }, () => this.select(1)),
            new MenuButton(this, 'QUIT TO MAIN MENU', config.buttonWidth, config.buttonHeight, () => {
                this.flow.returnToMainMenu(this);
            }, () => this.select(2)),
        ];
        this.buttons.forEach((button, index) => {
            button.setPosition(0, (index - config.pauseButtonIndexCenter) * (config.buttonHeight + config.buttonGap));
            this.panel.add(button.container);
        });
        this.keys = this.createKeys();
        this.selectedIndex = 0;
        this.refreshFocus();
        this.events.once('shutdown', this.destroyMenu, this);
        this.events.once('destroy', this.destroyMenu, this);
    }

    public update(): void {
        if (this.ignoreEscapeUntilReleased) {
            if (this.keys.escape.isDown) return;
            this.ignoreEscapeUntilReleased = false;
        }
        if (Input.Keyboard.JustDown(this.keys.escape)) {
            this.resume();
            return;
        }
        if (Input.Keyboard.JustDown(this.keys.up)) this.moveSelection(-1);
        if (Input.Keyboard.JustDown(this.keys.down)) this.moveSelection(1);
        if (Input.Keyboard.JustDown(this.keys.enter)) this.activateSelected();
    }

    private resume(): void {
        this.flow.resumeGame(this);
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
        if (this.selectedIndex === 0) this.resume();
        else if (this.selectedIndex === 1) this.flow.openOptions(this, 'PauseMenuScene');
        else this.flow.returnToMainMenu(this);
    }

    private createKeys(): {
        readonly escape: Input.Keyboard.Key;
        readonly enter: Input.Keyboard.Key;
        readonly up: Input.Keyboard.Key;
        readonly down: Input.Keyboard.Key;
    } {
        const keyboard = this.input.keyboard;
        if (keyboard === null) throw new Error('Pause menu requires keyboard input.');
        return {
            escape: keyboard.addKey(Input.Keyboard.KeyCodes.ESC),
            enter: keyboard.addKey(Input.Keyboard.KeyCodes.ENTER),
            up: keyboard.addKey(Input.Keyboard.KeyCodes.UP),
            down: keyboard.addKey(Input.Keyboard.KeyCodes.DOWN),
        };
    }

    private destroyMenu(): void {
        Object.values(this.keys ?? {}).forEach((key) => key.destroy());
        this.buttons.forEach((button) => button.destroy());
        this.buttons = [];
    }
}
