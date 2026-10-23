import { GameObjects, Input, Scene } from 'phaser';

import {
    EVENT_CANTINA_OPEN,
    EVENT_DRAG_END,
    EVENT_DRAG_MOVE,
    EVENT_FURNITURE_PLACED,
    EVENT_FURNITURE_REMOVED,
    EVENT_GAME_MODE_CHANGED,
    EVENT_START_PLACEMENT,
    eventBus,
    type FurniturePlacedData,
    type FurnitureRemovedData,
    type GameModeChangedData,
    type FurnitureType,
    type PlacementEndData,
    type PlacementMoveData,
    type PlacementStartData,
} from '../utils/EventBus';

interface SlotElements {
    readonly container: GameObjects.Container;
    readonly background: GameObjects.Rectangle;
    readonly countText: GameObjects.Text;
}

/**
 * HUD component responsible for the Pre-Opening inventory toolbar.
 * Displays available furniture stock (Mesa and Silla) in a responsive
 * bottom bar and provides an "Abrir Cantina" action button in the top-right.
 */
export class InventoryUI {
    private readonly scene: Scene;
    private readonly stock: Record<FurnitureType, number> = {
        MESA: 5,
        SILLA: 10,
    };

    private isDragging: boolean = false;
    private activeDragType: FurnitureType | null = null;

    private readonly barContainer: GameObjects.Container;
    private readonly openButtonContainer: GameObjects.Container;
    private readonly slots: Map<FurnitureType, SlotElements> = new Map();

    private readonly onFurniturePlacedBound = (data: FurniturePlacedData): void => {
        this.deductItem(data.type);
    };

    private readonly onFurnitureRemovedBound = (data: FurnitureRemovedData): void => {
        this.addItem(data.type);
    };

    private readonly onGameModeChangedBound = (data: GameModeChangedData): void => {
        const preOpening = data.mode === 'PRE_APERTURA';
        this.barContainer.setVisible(preOpening);
        this.openButtonContainer.setVisible(preOpening);
    };

    public constructor(scene: Scene) {
        this.scene = scene;

        this.barContainer = this.scene.add.container(0, 0);
        this.openButtonContainer = this.scene.add.container(0, 0);

        this.createBottomBar();
        this.createOpenButton();
        this.reposition();

        this.setupEventListeners();

        this.scene.events.once('shutdown', this.destroy, this);
        this.scene.events.once('destroy', this.destroy, this);
    }

    /**
     * Deducts one unit of the specified furniture from inventory.
     */
    public deductItem(type: FurnitureType): boolean {
        if (this.stock[type] <= 0) {
            return false;
        }

        this.stock[type]--;
        this.updateSlotDisplay(type);
        return true;
    }

    /**
     * Adds one unit of the specified furniture back into inventory.
     */
    public addItem(type: FurnitureType): void {
        this.stock[type]++;
        this.updateSlotDisplay(type);
    }

    /**
     * Gets current quantity of a specific furniture type.
     */
    public getQuantity(type: FurnitureType): number {
        return this.stock[type];
    }

    /**
     * Adjusts the UI positions responsively to match the current viewport.
     */
    public reposition(): void {
        const width = this.scene.scale.width;
        const height = this.scene.scale.height;

        this.barContainer.setPosition(width / 2, height - 38);
        this.openButtonContainer.setPosition(width - 92, 28);
    }

    /**
     * Cleans up all visual game objects and event listeners.
     */
    public destroy(): void {
        eventBus.off(EVENT_FURNITURE_PLACED, this.onFurniturePlacedBound);
        eventBus.off(EVENT_FURNITURE_REMOVED, this.onFurnitureRemovedBound);
        eventBus.off(EVENT_GAME_MODE_CHANGED, this.onGameModeChangedBound);

        this.scene.scale.off('resize', this.reposition, this);
        this.scene.input.off('pointermove', this.handleScenePointerMove, this);
        this.scene.input.off('pointerup', this.handleScenePointerUp, this);

        this.barContainer.destroy(true);
        this.openButtonContainer.destroy(true);
        this.slots.clear();
    }

    /**
     * Builds the bottom toolbar containing the Mesa and Silla item slots.
     */
    private createBottomBar(): void {
        const barWidth = 320;
        const barHeight = 56;

        // Background panel
        const bg = this.scene.add.rectangle(0, 0, barWidth, barHeight, 0x14110e, 0.9);
        bg.setStrokeStyle(1.5, 0xd4a359, 0.85);

        // Header label
        const titleText = this.scene.add.text(0, -barHeight / 2 + 7, 'INVENTARIO - PRE-APERTURA', {
            fontFamily: 'monospace',
            fontSize: '9px',
            color: '#bfa068',
            align: 'center',
        });
        titleText.setOrigin(0.5, 0.5);

        this.barContainer.add([bg, titleText]);

        // Slot 1: Mesa
        const mesaSlot = this.createItemSlot('MESA', 'Mesa', 0x8c5828, 0xd4ac0d, -75, 7);
        // Slot 2: Silla
        const sillaSlot = this.createItemSlot('SILLA', 'Silla', 0x2980b9, 0x5dade2, 75, 7);

        this.slots.set('MESA', mesaSlot);
        this.slots.set('SILLA', sillaSlot);

        this.barContainer.add([mesaSlot.container, sillaSlot.container]);
    }

    /**
     * Creates an interactive inventory slot with an icon, title, and quantity text.
     */
    private createItemSlot(
        type: FurnitureType,
        label: string,
        fillColor: number,
        borderColor: number,
        offsetX: number,
        offsetY: number,
    ): SlotElements {
        const slotContainer = this.scene.add.container(offsetX, offsetY);
        const slotWidth = 120;
        const slotHeight = 36;

        const slotBg = this.scene.add.rectangle(0, 0, slotWidth, slotHeight, 0x241e18, 0.95);
        slotBg.setStrokeStyle(1, borderColor, 0.6);
        slotBg.setInteractive({ useHandCursor: true });

        // Furniture preview icon
        const icon = this.scene.add.rectangle(-slotWidth / 2 + 20, 0, 22, 22, fillColor);
        icon.setStrokeStyle(1.5, borderColor, 1);

        // Item label
        const itemLabel = this.scene.add.text(-slotWidth / 2 + 36, -6, label, {
            fontFamily: 'sans-serif',
            fontSize: '11px',
            color: '#f4ede2',
        });

        // Stock counter text
        const countText = this.scene.add.text(-slotWidth / 2 + 36, 6, `x${this.stock[type]}`, {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#ffd166',
        });

        slotContainer.add([slotBg, icon, itemLabel, countText]);

        // Slot interactions: hover and drag start
        slotBg.on('pointerover', () => {
            if (this.stock[type] > 0) {
                slotBg.setStrokeStyle(1.5, 0xffffff, 1);
            }
        });

        slotBg.on('pointerout', () => {
            slotBg.setStrokeStyle(1, borderColor, 0.6);
        });

        slotBg.on('pointerdown', (pointer: Input.Pointer) => {
            if (this.stock[type] <= 0) {
                return;
            }

            this.isDragging = true;
            this.activeDragType = type;

            const startData: PlacementStartData = {
                type,
                screenX: pointer.x,
                screenY: pointer.y,
            };
            eventBus.emit(EVENT_START_PLACEMENT, startData);
        });

        return {
            container: slotContainer,
            background: slotBg,
            countText,
        };
    }

    /**
     * Builds the "Abrir Cantina" visual button placed at the top-right of the screen.
     */
    private createOpenButton(): void {
        const btnWidth = 150;
        const btnHeight = 34;

        const btnBg = this.scene.add.rectangle(0, 0, btnWidth, btnHeight, 0xd35400, 0.95);
        btnBg.setStrokeStyle(1.5, 0xf39c12, 1);
        btnBg.setInteractive({ useHandCursor: true });

        const btnText = this.scene.add.text(0, 0, 'ABRIR CANTINA', {
            fontFamily: 'sans-serif',
            fontSize: '11px',
            color: '#ffffff',
        });
        btnText.setOrigin(0.5, 0.5);

        this.openButtonContainer.add([btnBg, btnText]);

        btnBg.on('pointerover', () => {
            btnBg.setFillStyle(0xe67e22, 1);
        });

        btnBg.on('pointerout', () => {
            btnBg.setFillStyle(0xd35400, 0.95);
        });

        btnBg.on('pointerdown', () => {
            console.log('Abrir Cantina pulsado...');
            eventBus.emit(EVENT_CANTINA_OPEN);
        });
    }

    /**
     * Updates visual display (count text and dimming) for a given slot.
     */
    private updateSlotDisplay(type: FurnitureType): void {
        const slot = this.slots.get(type);
        if (slot === undefined) {
            return;
        }

        const count = this.stock[type];
        slot.countText.setText(`x${count}`);

        if (count <= 0) {
            slot.container.setAlpha(0.45);
            slot.countText.setColor('#e74c3c');
        } else {
            slot.container.setAlpha(1);
            slot.countText.setColor('#ffd166');
        }
    }

    /**
     * Sets up global event bus and scene pointer listeners for Drag & Drop propagation.
     */
    private setupEventListeners(): void {
        eventBus.on(EVENT_FURNITURE_PLACED, this.onFurniturePlacedBound);
        eventBus.on(EVENT_FURNITURE_REMOVED, this.onFurnitureRemovedBound);
        eventBus.on(EVENT_GAME_MODE_CHANGED, this.onGameModeChangedBound);

        this.scene.scale.on('resize', this.reposition, this);

        this.scene.input.on('pointermove', this.handleScenePointerMove, this);
        this.scene.input.on('pointerup', this.handleScenePointerUp, this);
    }

    private handleScenePointerMove(pointer: Input.Pointer): void {
        if (!this.isDragging) {
            return;
        }

        const moveData: PlacementMoveData = {
            screenX: pointer.x,
            screenY: pointer.y,
        };
        eventBus.emit(EVENT_DRAG_MOVE, moveData);
    }

    private handleScenePointerUp(pointer: Input.Pointer): void {
        if (!this.isDragging) {
            return;
        }

        this.isDragging = false;
        this.activeDragType = null;

        const endData: PlacementEndData = {
            screenX: pointer.x,
            screenY: pointer.y,
        };
        eventBus.emit(EVENT_DRAG_END, endData);
    }
}
