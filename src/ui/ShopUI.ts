import { GameObjects, Geom, Input, Scene } from 'phaser';

import {
    CREDITS_REGISTRY_KEY,
    EMPTY_GLASSES_REGISTRY_KEY,
    GAME_REGISTRY,
    SCRAPS_REGISTRY_KEY,
} from '../data/GameRegistry';
import { SHOP_ITEMS, type ShopItem } from '../data/ShopRegistry';
import {
    UI_INVENTORY_SLOT_FRAME_KEY,
    UI_INVENTORY_SLOT_FRAME_SOURCE_BOUNDS,
} from '../data/constants';
import {
    EVENT_CREDITS_UPDATED,
    EVENT_FOOD_STOCK_UPDATED,
    EVENT_GAME_WARNING,
    EVENT_GLASSES_UPDATED,
    EVENT_SCRAPS_UPDATED,
    EVENT_TOGGLE_MATERIALS,
    GAME_MODE_PRE_OPENING,
    eventBus,
    type ToggleMaterialsData,
} from '../utils/EventBus';
import { InventoryUI } from './InventoryUI';

/** Pre-opening shop overlay that routes each purchase to its inventory system. */
export class ShopUI {
    private readonly overlay: GameObjects.Container;
    private readonly panel: GameObjects.Rectangle;
    private readonly closeKey: Input.Keyboard.Key;
    private readonly tooltip: GameObjects.Container;
    private isOpen = false;
    private readonly config = GAME_REGISTRY.ui;

    private readonly handleToggle = (data: ToggleMaterialsData): void => {
        if (
            data.enabled
            && this.scene.registry.get('gameMode') !== GAME_MODE_PRE_OPENING
        ) {
            eventBus.emit(EVENT_GAME_WARNING, {
                message: 'La tienda solo está disponible durante la Pre-Apertura.',
            });
            return;
        }
        this.setOpen(data.enabled);
    };

    public constructor(
        private readonly scene: Scene,
        private readonly inventoryUI: InventoryUI,
    ) {
        this.panel = scene.add.rectangle(0, 0, this.config.shopWidth, this.config.shopHeight, this.config.shopPanelColor)
            .setStrokeStyle(3, this.config.shopPanelBorderColor);
        const title = scene.add.text(0, -this.config.shopHeight / 2 + 28, 'TIENDA DE MATERIALES', {
            fontFamily: 'monospace',
            fontSize: '24px',
            color: `#${this.config.shopTextColor.toString(16).padStart(6, '0')}`,
            fontStyle: 'bold',
        }).setOrigin(0.5);
        const close = scene.add.text(this.config.shopWidth / 2 - 22, -this.config.shopHeight / 2 + 16, 'X', {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: `#${this.config.shopTextColor.toString(16).padStart(6, '0')}`,
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        close.on('pointerdown', () => this.close());

        const slots = SHOP_ITEMS.map((item, index) => this.createSlot(item, index));
        this.tooltip = scene.add.container(0, 0).setVisible(false);
        this.overlay = scene.add.container(0, 0, [this.panel, title, close, ...slots, this.tooltip])
            .setDepth(this.config.shopDepth)
            .setVisible(false);

        const keyboard = scene.input.keyboard;
        if (keyboard === null) throw new Error('No se encontró el teclado para cerrar la tienda.');
        this.closeKey = keyboard.addKey(Input.Keyboard.KeyCodes.ESC);
        eventBus.on(EVENT_TOGGLE_MATERIALS, this.handleToggle);
        scene.scale.on('resize', this.reposition, this);
        scene.events.once('shutdown', this.destroy, this);
        scene.events.once('destroy', this.destroy, this);
        this.reposition();
    }

    public update(): void {
        if (this.isOpen && Input.Keyboard.JustDown(this.closeKey)) this.close();
    }

    public destroy(): void {
        eventBus.off(EVENT_TOGGLE_MATERIALS, this.handleToggle);
        this.scene.scale.off('resize', this.reposition, this);
        this.closeKey.destroy();
        this.overlay.destroy(true);
    }

    private createSlot(item: ShopItem, index: number): GameObjects.Container {
        const x = this.getSlotX(index);
        const y = 8;
        const slot = this.scene.add.container(x, y);
        const background = this.scene.add.image(0, 0, UI_INVENTORY_SLOT_FRAME_KEY);
        this.fitFrame(background, this.config.shopSlotWidth, this.config.shopSlotHeight);
        const icon = this.scene.add.image(0, -25, item.iconFrame).setDisplaySize(48, 48);
        const name = this.scene.add.text(0, 16, item.name, {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: `#${this.config.shopTextColor.toString(16).padStart(6, '0')}`,
            align: 'center',
            wordWrap: { width: this.config.shopSlotWidth - 12 },
        }).setOrigin(0.5);
        const price = this.scene.add.text(0, 45, `${item.price} CR`, {
            fontFamily: 'monospace',
            fontSize: '13px',
            color: `#${this.config.shopPriceColor.toString(16).padStart(6, '0')}`,
            fontStyle: 'bold',
        }).setOrigin(0.5);
        const buy = this.scene.add.text(0, 70, 'COMPRAR', {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#241d0b',
            backgroundColor: `#${this.config.shopButtonColor.toString(16).padStart(6, '0')}`,
            padding: { left: 7, right: 7, top: 4, bottom: 4 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        buy.on('pointerup', (pointer: Input.Pointer) => {
            pointer.event.stopPropagation();
            this.purchase(item);
        });
        slot.add([background, icon, name, price, buy]);
        slot.setSize(this.config.shopSlotWidth, this.config.shopSlotHeight);
        slot.setInteractive(new Geom.Rectangle(
            -this.config.shopSlotWidth / 2,
            -this.config.shopSlotHeight / 2,
            this.config.shopSlotWidth,
            this.config.shopSlotHeight,
        ), Geom.Rectangle.Contains);
        slot.on('pointerover', () => this.showTooltip(item, x, y));
        slot.on('pointerout', () => this.tooltip.setVisible(false));
        return slot;
    }

    private purchase(item: ShopItem): void {
        const credits = this.readNumber(CREDITS_REGISTRY_KEY, 0);
        if (credits < item.price) {
            eventBus.emit(EVENT_GAME_WARNING, { message: 'No tienes créditos suficientes.' });
            return;
        }
        if (!this.routePurchase(item)) return;
        const totalCredits = credits - item.price;
        this.scene.registry.set(CREDITS_REGISTRY_KEY, totalCredits);
        eventBus.emit(EVENT_CREDITS_UPDATED, { totalCredits });
        eventBus.emit(EVENT_GAME_WARNING, { message: `${item.name} comprado.` });
    }

    private routePurchase(item: ShopItem): boolean {
        switch (item.type) {
            case 'FOOD': {
                const stock = this.readNumber('foodStock', 0) + 1;
                this.scene.registry.set('foodStock', stock);
                eventBus.emit(EVENT_FOOD_STOCK_UPDATED, { stock });
                return true;
            }
            case 'SCRAP': {
                const stock = this.readNumber(SCRAPS_REGISTRY_KEY, 0) + 1;
                this.scene.registry.set(SCRAPS_REGISTRY_KEY, stock);
                eventBus.emit(EVENT_SCRAPS_UPDATED, { stock });
                return true;
            }
            case 'EMPTY_GLASSES': {
                const stock = this.readNumber(EMPTY_GLASSES_REGISTRY_KEY, 0) + 1;
                this.scene.registry.set(EMPTY_GLASSES_REGISTRY_KEY, stock);
                eventBus.emit(EVENT_GLASSES_UPDATED, { stock });
                return true;
            }
            case 'FURNITURE':
                if (item.furnitureId === undefined) return false;
                this.inventoryUI.addItem(item.furnitureId);
                return true;
        }
    }

    private showTooltip(item: ShopItem, x: number, y: number): void {
        this.tooltip.removeAll(true);
        const background = this.scene.add.rectangle(
            x,
            y + this.config.shopSlotHeight / 2 + 34,
            220,
            74,
            this.config.shopTooltipColor,
            0.96,
        ).setStrokeStyle(1, 0xd5a62a);
        const text = this.scene.add.text(
            x - 100,
            y + this.config.shopSlotHeight / 2 + 5,
            `${item.name}\n${item.description}`,
            {
                fontFamily: 'monospace',
                fontSize: '11px',
                color: `#${this.config.shopTextColor.toString(16).padStart(6, '0')}`,
                wordWrap: { width: 200 },
            },
        );
        this.tooltip.add([background, text]).setVisible(true);
    }

    private setOpen(enabled: boolean): void {
        this.isOpen = enabled;
        this.overlay.setVisible(enabled);
        if (!enabled) this.tooltip.setVisible(false);
    }

    private close(): void {
        eventBus.emit(EVENT_TOGGLE_MATERIALS, { enabled: false });
    }

    private reposition(): void {
        this.overlay.setPosition(this.scene.scale.width / 2, this.scene.scale.height / 2);
    }

    private getSlotX(index: number): number {
        const totalWidth = SHOP_ITEMS.length * this.config.shopSlotWidth
            + (SHOP_ITEMS.length - 1) * this.config.shopSlotGap;
        return -totalWidth / 2 + this.config.shopSlotWidth / 2
            + index * (this.config.shopSlotWidth + this.config.shopSlotGap);
    }

    private fitFrame(image: GameObjects.Image, width: number, height: number): void {
        image.setCrop(
            UI_INVENTORY_SLOT_FRAME_SOURCE_BOUNDS.visibleX,
            UI_INVENTORY_SLOT_FRAME_SOURCE_BOUNDS.visibleY,
            UI_INVENTORY_SLOT_FRAME_SOURCE_BOUNDS.visibleWidth,
            UI_INVENTORY_SLOT_FRAME_SOURCE_BOUNDS.visibleHeight,
        ).setDisplaySize(width, height);
    }

    private readNumber(key: string, fallback: number): number {
        const value = this.scene.registry.get(key);
        return typeof value === 'number' ? value : fallback;
    }
}
