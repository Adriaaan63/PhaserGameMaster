import { GameObjects, Geom, Input, Scene, Types } from 'phaser';

import {
    UNLOCKED_FURNITURE_IDS,
    getFurnitureConfig,
    type FurnitureConfig,
} from '../data/FurnitureRegistry';
import {
    AFFINITY_RULES,
    CLIENT_RACES,
    CLIENT_RACE_PRESENTATION,
} from '../data/GameRegistry';
import {
    EVENT_DRAG_END,
    EVENT_DRAG_MOVE,
    EVENT_FURNITURE_PLACED,
    EVENT_FURNITURE_REMOVED,
    EVENT_START_PLACEMENT,
    EVENT_TOGGLE_BUILD_MODE,
    EVENT_TOGGLE_CLIENT_GUIDE,
    eventBus,
    type BuildModeToggledData,
    type FurniturePlacedData,
    type FurnitureRemovedData,
    type PlacementEndData,
    type PlacementMoveData,
    type PlacementStartData,
    type ToggleClientGuideData,
} from '../utils/EventBus';

interface SlotElements {
    readonly container: GameObjects.Container;
    readonly background: GameObjects.Rectangle;
    readonly countText: GameObjects.Text;
}

const SLOT_WIDTH = 120;
const SLOT_HEIGHT = 36;
const ICON_DISPLAY_SIZE = 22;
const BAR_WIDTH = 320;
const BAR_HEIGHT = 56;
const GUIDE_PANEL_WIDTH = 480;
const GUIDE_PANEL_HEIGHT = 300;
const GUIDE_PANEL_DEPTH = 1_500;
const GUIDE_PANEL_BACKGROUND_COLOR = 0x211b16;
const GUIDE_PANEL_BORDER_COLOR = 0xd4a359;
const GUIDE_PANEL_BACKDROP_COLOR = 0x000000;
const GUIDE_PANEL_BACKDROP_ALPHA = 0.72;
const SLOT_BORDER_COLOR = 0xd4a359;

const INITIAL_STOCK: Readonly<Record<string, number>> = {
    mesa_redonda_0: 5,
    silla_estandar_0: 10,
} as const;

/** Furniture inventory toolbar and client guide modal. */
export class InventoryUI {
    private readonly stock: Map<string, number> = new Map();
    private readonly slots: Map<string, SlotElements> = new Map();
    private isDragging = false;
    private activeDragId: string | null = null;
    private isBuildModeEnabled = true;

    private readonly barContainer: GameObjects.Container;
    private readonly guidePanelContainer: GameObjects.Container;
    private readonly guideBackdrop: GameObjects.Rectangle;
    private readonly guidePanelBackground: GameObjects.Rectangle;

    private readonly onFurniturePlacedBound = (data: FurniturePlacedData): void => {
        this.deductItem(data.furnitureId);
    };
    private readonly onFurnitureRemovedBound = (data: FurnitureRemovedData): void => {
        this.addItem(data.furnitureId);
    };
    private readonly onBuildModeToggledBound = (data: BuildModeToggledData): void => {
        this.isBuildModeEnabled = data.enabled;
        this.barContainer.setVisible(data.enabled);
        if (!data.enabled) {
            this.isDragging = false;
            this.activeDragId = null;
        }
    };
    private readonly onGuideToggledBound = (data: ToggleClientGuideData): void => {
        this.guidePanelContainer.setVisible(data.enabled);
    };

    public constructor(private readonly scene: Scene) {
        for (const [id, quantity] of Object.entries(INITIAL_STOCK)) this.stock.set(id, quantity);

        this.barContainer = scene.add.container(0, 0).setVisible(this.isBuildModeEnabled);
        this.guidePanelContainer = scene.add.container(0, 0)
            .setDepth(GUIDE_PANEL_DEPTH)
            .setVisible(false);
        this.guideBackdrop = scene.add.rectangle(
            0, 0, 1, 1, GUIDE_PANEL_BACKDROP_COLOR, GUIDE_PANEL_BACKDROP_ALPHA,
        ).setInteractive();
        this.guidePanelBackground = scene.add.rectangle(
            0, 0, GUIDE_PANEL_WIDTH, GUIDE_PANEL_HEIGHT, GUIDE_PANEL_BACKGROUND_COLOR, 0.98,
        );

        this.createBottomBar();
        this.createAffinityGuidePanel();
        this.reposition();
        this.setupEventListeners();
        scene.events.once('shutdown', this.destroy, this);
        scene.events.once('destroy', this.destroy, this);
    }

    public deductItem(furnitureId: string): boolean {
        const current = this.stock.get(furnitureId) ?? 0;
        if (current <= 0) return false;
        this.stock.set(furnitureId, current - 1);
        this.updateSlotDisplay(furnitureId);
        return true;
    }

    public addItem(furnitureId: string): void {
        this.stock.set(furnitureId, (this.stock.get(furnitureId) ?? 0) + 1);
        this.updateSlotDisplay(furnitureId);
    }

    public getQuantity(furnitureId: string): number {
        return this.stock.get(furnitureId) ?? 0;
    }

    public reposition(): void {
        const width = this.scene.scale.width;
        const height = this.scene.scale.height;
        this.barContainer.setPosition(width / 2, height - 38);
        this.guidePanelContainer.setPosition(width / 2, height / 2);
        this.guideBackdrop.setSize(width, height);
        this.guideBackdrop.setInteractive(
            new Geom.Rectangle(-width / 2, -height / 2, width, height),
            Geom.Rectangle.Contains,
        );
    }

    public destroy(): void {
        eventBus.off(EVENT_FURNITURE_PLACED, this.onFurniturePlacedBound);
        eventBus.off(EVENT_FURNITURE_REMOVED, this.onFurnitureRemovedBound);
        eventBus.off(EVENT_TOGGLE_BUILD_MODE, this.onBuildModeToggledBound);
        eventBus.off(EVENT_TOGGLE_CLIENT_GUIDE, this.onGuideToggledBound);
        this.scene.scale.off('resize', this.reposition, this);
        this.scene.input.off('pointermove', this.handleScenePointerMove, this);
        this.scene.input.off('pointerup', this.handleScenePointerUp, this);
        this.barContainer.destroy(true);
        this.guidePanelContainer.destroy(true);
        this.slots.clear();
    }

    private createBottomBar(): void {
        const background = this.scene.add.rectangle(0, 0, BAR_WIDTH, BAR_HEIGHT, 0x14110e, 0.9)
            .setStrokeStyle(1.5, SLOT_BORDER_COLOR, 0.85);
        const title = this.scene.add.text(0, -BAR_HEIGHT / 2 + 7, 'INVENTARIO - MOBILIARIO', {
            fontFamily: 'monospace',
            fontSize: '9px',
            color: '#bfa068',
            align: 'center',
        }).setOrigin(0.5);
        this.barContainer.add([background, title]);

        const slotSpacing = SLOT_WIDTH + 10;
        const totalWidth = UNLOCKED_FURNITURE_IDS.length * slotSpacing - 10;
        const startX = -totalWidth / 2 + SLOT_WIDTH / 2;
        for (const [index, furnitureId] of UNLOCKED_FURNITURE_IDS.entries()) {
            const config = getFurnitureConfig(furnitureId);
            if (config === undefined) continue;
            const slot = this.createItemSlot(config, startX + index * slotSpacing, 7);
            this.slots.set(furnitureId, slot);
            this.barContainer.add(slot.container);
        }
    }

    private createItemSlot(config: FurnitureConfig, offsetX: number, offsetY: number): SlotElements {
        const container = this.scene.add.container(offsetX, offsetY);
        const background = this.scene.add.rectangle(0, 0, SLOT_WIDTH, SLOT_HEIGHT, 0x241e18, 0.95)
            .setStrokeStyle(1, SLOT_BORDER_COLOR, 0.6)
            .setInteractive({ useHandCursor: true });
        const icon = this.scene.add.image(-SLOT_WIDTH / 2 + 20, 0, config.texture)
            .setDisplaySize(ICON_DISPLAY_SIZE, ICON_DISPLAY_SIZE);
        const itemLabel = this.scene.add.text(-SLOT_WIDTH / 2 + 36, -6, config.name, {
            fontFamily: 'sans-serif', fontSize: '11px', color: '#f4ede2',
        });
        const countText = this.scene.add.text(
            -SLOT_WIDTH / 2 + 36,
            6,
            `x${this.stock.get(config.id) ?? 0}`,
            { fontFamily: 'monospace', fontSize: '11px', color: '#ffd166' },
        );
        container.add([background, icon, itemLabel, countText]);

        background.on('pointerover', () => {
            if ((this.stock.get(config.id) ?? 0) > 0) background.setStrokeStyle(1.5, 0xffffff, 1);
        });
        background.on('pointerout', () => background.setStrokeStyle(1, SLOT_BORDER_COLOR, 0.6));
        background.on('pointerdown', (
            pointer: Input.Pointer,
            _localX: number,
            _localY: number,
            event: Types.Input.EventData,
        ) => {
            event.stopPropagation();
            if (!this.isBuildModeEnabled || (this.stock.get(config.id) ?? 0) <= 0) return;
            this.isDragging = true;
            this.activeDragId = config.id;
            const data: PlacementStartData = {
                furnitureId: config.id,
                screenX: pointer.x,
                screenY: pointer.y,
            };
            eventBus.emit(EVENT_START_PLACEMENT, data);
        });

        return { container, background, countText };
    }

    private createAffinityGuidePanel(): void {
        const title = this.scene.add.text(0, -GUIDE_PANEL_HEIGHT / 2 + 34, 'GUÍA DE CLIENTES', {
            fontFamily: 'monospace', fontSize: '20px', color: '#ffd166',
            stroke: '#241e18', strokeThickness: 3,
        }).setOrigin(0.5);
        const body = this.scene.add.text(
            0,
            -GUIDE_PANEL_HEIGHT / 2 + 76,
            this.createAffinityGuideText(),
            {
                fontFamily: 'monospace', fontSize: '14px', color: '#f4ead8',
                align: 'left', lineSpacing: 13,
            },
        ).setOrigin(0.5, 0).setWordWrapWidth(GUIDE_PANEL_WIDTH - 64);
        const hint = this.scene.add.text(
            0,
            GUIDE_PANEL_HEIGHT / 2 - 24,
            'Pulsa GUÍA DE CLIENTES para cerrar',
            { fontFamily: 'monospace', fontSize: '10px', color: '#c8b99f' },
        ).setOrigin(0.5);
        this.guidePanelBackground.setStrokeStyle(2, GUIDE_PANEL_BORDER_COLOR, 1);
        this.guidePanelContainer.add([
            this.guideBackdrop,
            this.guidePanelBackground,
            title,
            body,
            hint,
        ]);
        this.guideBackdrop.on('pointerdown', (
            _pointer: Input.Pointer,
            _localX: number,
            _localY: number,
            event: Types.Input.EventData,
        ) => {
            event.stopPropagation();
            eventBus.emit(EVENT_TOGGLE_CLIENT_GUIDE, { enabled: false } satisfies ToggleClientGuideData);
        });
    }

    private createAffinityGuideText(): string {
        return CLIENT_RACES.map((race) => {
            const enemies = AFFINITY_RULES[race]
                .map((enemy) => CLIENT_RACE_PRESENTATION[enemy].label)
                .join(', ');
            return `${CLIENT_RACE_PRESENTATION[race].label} — Enemistad: ${enemies}`;
        }).join('\n\n');
    }

    private updateSlotDisplay(furnitureId: string): void {
        const slot = this.slots.get(furnitureId);
        if (slot === undefined) return;
        const count = this.stock.get(furnitureId) ?? 0;
        slot.countText.setText(`x${count}`);
        slot.container.setAlpha(count <= 0 ? 0.45 : 1);
        slot.countText.setColor(count <= 0 ? '#e74c3c' : '#ffd166');
    }

    private setupEventListeners(): void {
        eventBus.on(EVENT_FURNITURE_PLACED, this.onFurniturePlacedBound);
        eventBus.on(EVENT_FURNITURE_REMOVED, this.onFurnitureRemovedBound);
        eventBus.on(EVENT_TOGGLE_BUILD_MODE, this.onBuildModeToggledBound);
        eventBus.on(EVENT_TOGGLE_CLIENT_GUIDE, this.onGuideToggledBound);
        this.scene.scale.on('resize', this.reposition, this);
        this.scene.input.on('pointermove', this.handleScenePointerMove, this);
        this.scene.input.on('pointerup', this.handleScenePointerUp, this);
    }

    private handleScenePointerMove(pointer: Input.Pointer): void {
        if (!this.isBuildModeEnabled || !this.isDragging) return;
        const data: PlacementMoveData = { screenX: pointer.x, screenY: pointer.y };
        eventBus.emit(EVENT_DRAG_MOVE, data);
    }

    private handleScenePointerUp(pointer: Input.Pointer): void {
        if (!this.isBuildModeEnabled || !this.isDragging) return;
        this.isDragging = false;
        this.activeDragId = null;
        const data: PlacementEndData = { screenX: pointer.x, screenY: pointer.y };
        eventBus.emit(EVENT_DRAG_END, data);
    }
}
