import { GameObjects, Input, Scene } from 'phaser';

import {
    FURNITURE_REGISTRY,
    UNLOCKED_FURNITURE_IDS,
    getFurnitureConfig,
    type FurnitureConfig,
} from '../data/FurnitureRegistry';
import { CREDITS_REGISTRY_KEY, GAME_REGISTRY } from '../data/GameRegistry';
import {
    EVENT_CANTINA_OPEN,
    EVENT_COIN_COLLECTED,
    EVENT_DRAG_END,
    EVENT_DRAG_MOVE,
    EVENT_FURNITURE_PLACED,
    EVENT_FURNITURE_REMOVED,
    EVENT_GAME_MODE_CHANGED,
    EVENT_START_PLACEMENT,
    EVENT_TOGGLE_BUILD_MODE,
    eventBus,
    type BuildModeToggledData,
    type CoinCollectedData,
    type FurniturePlacedData,
    type FurnitureRemovedData,
    type GameModeChangedData,
    type PlacementEndData,
    type PlacementMoveData,
    type PlacementStartData,
} from '../utils/EventBus';

/** Visual elements that make up a single inventory slot. */
interface SlotElements {
    readonly container: GameObjects.Container;
    readonly background: GameObjects.Rectangle;
    readonly countText: GameObjects.Text;
}

/** Slot width / height used for layout calculations. */
const SLOT_WIDTH = 120;
const SLOT_HEIGHT = 36;
/** Size of the preview icon inside each slot (square). */
const ICON_DISPLAY_SIZE = 22;
const BAR_WIDTH = 320;
const BAR_HEIGHT = 56;
const OPEN_BUTTON_WIDTH = 150;
const OPEN_BUTTON_HEIGHT = 34;
const BUILD_MODE_BUTTON_WIDTH = 172;
const BUILD_MODE_BUTTON_HEIGHT = 32;
const BUILD_MODE_BUTTON_Y = 72;
const CREDITS_DISPLAY_X = 12;
const CREDITS_DISPLAY_Y = 12;
const CREDITS_DISPLAY_DEPTH = 1_000;

/** Border colour used for the default (non-hovered) slot state. */
const SLOT_BORDER_COLOR = 0xd4a359;

/**
 * Starting stock keyed by furniture config ID.
 * These initial values can later be driven by save-data or shop state.
 */
const INITIAL_STOCK: Readonly<Record<string, number>> = {
    mesa_redonda_0: 5,
    silla_estandar_0: 10,
} as const;

/**
 * HUD component responsible for the Pre-Opening inventory toolbar.
 * Displays available furniture stock in a responsive bottom bar and
 * provides an "Abrir Cantina" action button in the top-right.
 *
 * Fully data-driven: slots are generated from `UNLOCKED_FURNITURE_IDS`
 * and the `FurnitureRegistry`, so adding new furniture only requires
 * updating the registry and adding an entry to the unlocked list.
 */
export class InventoryUI {
    private readonly scene: Scene;
    private readonly stock: Map<string, number> = new Map();

    private isDragging: boolean = false;
    private activeDragId: string | null = null;

    private readonly barContainer: GameObjects.Container;
    private readonly openButtonContainer: GameObjects.Container;
    private readonly buildModeButtonContainer: GameObjects.Container;
    private readonly creditsText: GameObjects.Text;
    private readonly slots: Map<string, SlotElements> = new Map();
    private isBuildModeEnabled = true;
    private buildModeButtonText!: GameObjects.Text;
    private credits = 0;

    private readonly onFurniturePlacedBound = (data: FurniturePlacedData): void => {
        this.deductItem(data.furnitureId);
    };

    private readonly onFurnitureRemovedBound = (data: FurnitureRemovedData): void => {
        this.addItem(data.furnitureId);
    };

    private readonly onGameModeChangedBound = (data: GameModeChangedData): void => {
        const preOpening = data.mode === 'PRE_APERTURA';
        this.setBuildModeEnabled(preOpening);
        this.buildModeButtonContainer.setVisible(true);
        this.openButtonContainer.setVisible(preOpening);
    };

    private readonly onCoinCollectedBound = (data: CoinCollectedData): void => {
        this.credits = data.totalCredits;
        this.refreshCreditsDisplay();
    };

    public constructor(scene: Scene) {
        this.scene = scene;

        // Initialise stock from static defaults
        for (const [id, quantity] of Object.entries(INITIAL_STOCK)) {
            this.stock.set(id, quantity);
        }

        this.barContainer = this.scene.add.container(0, 0);
        this.openButtonContainer = this.scene.add.container(0, 0);
        this.buildModeButtonContainer = this.scene.add.container(0, 0);
        const initialCredits = this.scene.registry.get(CREDITS_REGISTRY_KEY);
        this.credits = typeof initialCredits === 'number'
            ? initialCredits
            : GAME_REGISTRY.economy.startingCredits;
        this.creditsText = this.scene.add.text(CREDITS_DISPLAY_X, CREDITS_DISPLAY_Y, '', {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#ffd166',
            stroke: '#241e18',
            strokeThickness: 3,
        }).setScrollFactor(0).setDepth(CREDITS_DISPLAY_DEPTH);
        this.refreshCreditsDisplay();

        this.createBottomBar();
        this.createOpenButton();
        this.createBuildModeButton();
        this.barContainer.setVisible(this.isBuildModeEnabled);
        this.reposition();

        this.setupEventListeners();

        this.scene.events.once('shutdown', this.destroy, this);
        this.scene.events.once('destroy', this.destroy, this);
    }

    /**
     * Deducts one unit of the specified furniture from inventory.
     */
    public deductItem(furnitureId: string): boolean {
        const current = this.stock.get(furnitureId) ?? 0;
        if (current <= 0) {
            return false;
        }

        this.stock.set(furnitureId, current - 1);
        this.updateSlotDisplay(furnitureId);
        return true;
    }

    /**
     * Adds one unit of the specified furniture back into inventory.
     */
    public addItem(furnitureId: string): void {
        const current = this.stock.get(furnitureId) ?? 0;
        this.stock.set(furnitureId, current + 1);
        this.updateSlotDisplay(furnitureId);
    }

    /**
     * Gets current quantity of a specific furniture by its registry ID.
     */
    public getQuantity(furnitureId: string): number {
        return this.stock.get(furnitureId) ?? 0;
    }

    /**
     * Adjusts the UI positions responsively to match the current viewport.
     */
    public reposition(): void {
        const width = this.scene.scale.width;
        const height = this.scene.scale.height;

        this.barContainer.setPosition(width / 2, height - 38);
        this.openButtonContainer.setPosition(width - 92, 28);
        this.buildModeButtonContainer.setPosition(width - 102, BUILD_MODE_BUTTON_Y);
    }

    /**
     * Cleans up all visual game objects and event listeners.
     */
    public destroy(): void {
        eventBus.off(EVENT_FURNITURE_PLACED, this.onFurniturePlacedBound);
        eventBus.off(EVENT_FURNITURE_REMOVED, this.onFurnitureRemovedBound);
        eventBus.off(EVENT_GAME_MODE_CHANGED, this.onGameModeChangedBound);
        eventBus.off(EVENT_COIN_COLLECTED, this.onCoinCollectedBound);

        this.scene.scale.off('resize', this.reposition, this);
        this.scene.input.off('pointermove', this.handleScenePointerMove, this);
        this.scene.input.off('pointerup', this.handleScenePointerUp, this);

        this.barContainer.destroy(true);
        this.openButtonContainer.destroy(true);
        this.buildModeButtonContainer.destroy(true);
        this.creditsText.destroy();
        this.slots.clear();
    }

    /**
     * Builds the bottom toolbar containing the furniture item slots.
     * Slots are generated dynamically from `UNLOCKED_FURNITURE_IDS`.
     */
    private createBottomBar(): void {
        // Background panel
        const bg = this.scene.add.rectangle(0, 0, BAR_WIDTH, BAR_HEIGHT, 0x14110e, 0.9);
        bg.setStrokeStyle(1.5, SLOT_BORDER_COLOR, 0.85);

        // Header label
        const titleText = this.scene.add.text(0, -BAR_HEIGHT / 2 + 7, 'INVENTARIO - PRE-APERTURA', {
            fontFamily: 'monospace',
            fontSize: '9px',
            color: '#bfa068',
            align: 'center',
        });
        titleText.setOrigin(0.5, 0.5);

        this.barContainer.add([bg, titleText]);

        // Dynamically create a slot for each unlocked furniture
        const totalSlots = UNLOCKED_FURNITURE_IDS.length;
        const slotSpacing = SLOT_WIDTH + 10;
        const totalWidth = totalSlots * slotSpacing - 10;
        const startX = -totalWidth / 2 + SLOT_WIDTH / 2;

        for (let index = 0; index < UNLOCKED_FURNITURE_IDS.length; index++) {
            const furnitureId = UNLOCKED_FURNITURE_IDS[index];
            const config = getFurnitureConfig(furnitureId);
            if (config === undefined) {
                continue;
            }

            const offsetX = startX + index * slotSpacing;
            const offsetY = 7;

            const slot = this.createItemSlot(config, offsetX, offsetY);
            this.slots.set(furnitureId, slot);
            this.barContainer.add(slot.container);
        }
    }

    /**
     * Creates an interactive inventory slot with a sprite preview icon,
     * title label, and quantity text.
     *
     * @param config Furniture configuration from the registry.
     * @param offsetX Horizontal offset within the bar container.
     * @param offsetY Vertical offset within the bar container.
     */
    private createItemSlot(
        config: FurnitureConfig,
        offsetX: number,
        offsetY: number,
    ): SlotElements {
        const slotContainer = this.scene.add.container(offsetX, offsetY);

        const slotBg = this.scene.add.rectangle(0, 0, SLOT_WIDTH, SLOT_HEIGHT, 0x241e18, 0.95);
        slotBg.setStrokeStyle(1, SLOT_BORDER_COLOR, 0.6);
        slotBg.setInteractive({ useHandCursor: true });

        // Furniture preview icon — real sprite from the registry texture
        const icon = this.scene.add.image(-SLOT_WIDTH / 2 + 20, 0, config.texture);
        icon.setDisplaySize(ICON_DISPLAY_SIZE, ICON_DISPLAY_SIZE);

        // Item label
        const itemLabel = this.scene.add.text(-SLOT_WIDTH / 2 + 36, -6, config.name, {
            fontFamily: 'sans-serif',
            fontSize: '11px',
            color: '#f4ede2',
        });

        // Stock counter text
        const currentStock = this.stock.get(config.id) ?? 0;
        const countText = this.scene.add.text(-SLOT_WIDTH / 2 + 36, 6, `x${currentStock}`, {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#ffd166',
        });

        slotContainer.add([slotBg, icon, itemLabel, countText]);

        // Slot interactions: hover and drag start
        slotBg.on('pointerover', () => {
            if ((this.stock.get(config.id) ?? 0) > 0) {
                slotBg.setStrokeStyle(1.5, 0xffffff, 1);
            }
        });

        slotBg.on('pointerout', () => {
            slotBg.setStrokeStyle(1, SLOT_BORDER_COLOR, 0.6);
        });

        slotBg.on('pointerdown', (pointer: Input.Pointer) => {
            if (!this.isBuildModeEnabled || (this.stock.get(config.id) ?? 0) <= 0) {
                return;
            }

            this.isDragging = true;
            this.activeDragId = config.id;

            const startData: PlacementStartData = {
                furnitureId: config.id,
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
        const btnBg = this.scene.add.rectangle(0, 0, OPEN_BUTTON_WIDTH, OPEN_BUTTON_HEIGHT, 0xd35400, 0.95);
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
            this.setBuildModeEnabled(false);
            eventBus.emit(EVENT_CANTINA_OPEN);
        });
    }

    /** Creates the HUD toggle that controls furniture placement and removal. */
    private createBuildModeButton(): void {
        const background = this.scene.add.rectangle(
            0, 0, BUILD_MODE_BUTTON_WIDTH, BUILD_MODE_BUTTON_HEIGHT, 0x355e3b, 0.95,
        );
        background.setStrokeStyle(1.5, 0xa8d08d, 1);
        background.setInteractive({ useHandCursor: true });
        this.buildModeButtonText = this.scene.add.text(0, 0, '', {
            fontFamily: 'sans-serif',
            fontSize: '11px',
            color: '#ffffff',
        }).setOrigin(0.5);
        this.buildModeButtonContainer.add([background, this.buildModeButtonText]);
        background.on('pointerdown', () => this.setBuildModeEnabled(!this.isBuildModeEnabled));
        this.refreshBuildModeButton();
    }

    private setBuildModeEnabled(enabled: boolean): void {
        if (this.isBuildModeEnabled === enabled) {
            this.barContainer.setVisible(enabled);
            this.refreshBuildModeButton();
            return;
        }
        this.isBuildModeEnabled = enabled;
        this.barContainer.setVisible(enabled);
        if (!enabled) {
            this.isDragging = false;
            this.activeDragId = null;
        }
        this.refreshBuildModeButton();
        const data: BuildModeToggledData = { enabled };
        eventBus.emit(EVENT_TOGGLE_BUILD_MODE, data);
    }

    private refreshBuildModeButton(): void {
        this.buildModeButtonText?.setText(
            `MODO CONSTRUCCIÓN: ${this.isBuildModeEnabled ? 'ON' : 'OFF'}`,
        );
    }

    private refreshCreditsDisplay(): void {
        this.creditsText.setText(`CRÉDITOS: ${this.credits}`);
    }

    /**
     * Updates visual display (count text and dimming) for a given furniture ID slot.
     */
    private updateSlotDisplay(furnitureId: string): void {
        const slot = this.slots.get(furnitureId);
        if (slot === undefined) {
            return;
        }

        const count = this.stock.get(furnitureId) ?? 0;
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
        eventBus.on(EVENT_COIN_COLLECTED, this.onCoinCollectedBound);

        this.scene.scale.on('resize', this.reposition, this);

        this.scene.input.on('pointermove', this.handleScenePointerMove, this);
        this.scene.input.on('pointerup', this.handleScenePointerUp, this);
    }

    private handleScenePointerMove(pointer: Input.Pointer): void {
        if (!this.isBuildModeEnabled || !this.isDragging) {
            return;
        }

        const moveData: PlacementMoveData = {
            screenX: pointer.x,
            screenY: pointer.y,
        };
        eventBus.emit(EVENT_DRAG_MOVE, moveData);
    }

    private handleScenePointerUp(pointer: Input.Pointer): void {
        if (!this.isBuildModeEnabled || !this.isDragging) {
            return;
        }

        this.isDragging = false;
        this.activeDragId = null;

        const endData: PlacementEndData = {
            screenX: pointer.x,
            screenY: pointer.y,
        };
        eventBus.emit(EVENT_DRAG_END, endData);
    }
}
