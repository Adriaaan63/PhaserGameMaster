import { Display, GameObjects, Geom, Input, Scene, Tweens, Types } from 'phaser';

import {
    UNLOCKED_FURNITURE_IDS,
    getFurnitureConfig,
    type FurnitureConfig,
} from '../data/FurnitureRegistry';
import {
    AFFINITY_RULES,
    CLIENT_RACES,
    CLIENT_RACE_PRESENTATION,
    GAME_REGISTRY,
    type ClientRace,
} from '../data/GameRegistry';
import {
    UI_CAROUSEL_ARROW_KEY,
    UI_HUD_FRAME_KEY,
    UI_HUD_FRAME_SOURCE_BOUNDS,
    UI_INVENTORY_SLOT_FRAME_KEY,
    UI_INVENTORY_SLOT_FRAME_SOURCE_BOUNDS,
} from '../data/constants';
import {
    EVENT_DRAG_END,
    EVENT_DRAG_MOVE,
    EVENT_FURNITURE_PLACED,
    EVENT_FURNITURE_REMOVED,
    EVENT_START_PLACEMENT,
    EVENT_TOGGLE_BUILD_MODE,
    EVENT_TOGGLE_CLIENT_GUIDE,
    EVENT_TUTORIAL_PAUSE_CHANGED,
    eventBus,
    type BuildModeToggledData,
    type FurniturePlacedData,
    type FurnitureRemovedData,
    type PlacementEndData,
    type PlacementMoveData,
    type PlacementStartData,
    type ToggleClientGuideData,
    type TutorialPauseChangedData,
} from '../utils/EventBus';

interface SlotElements {
    readonly container: GameObjects.Container;
    readonly background: GameObjects.Image;
    readonly hitArea: GameObjects.Rectangle;
    readonly countText: GameObjects.Text;
}

interface AffinityNodePosition {
    readonly x: number;
    readonly y: number;
}

interface AffinityConnection {
    readonly firstRace: ClientRace;
    readonly secondRace: ClientRace;
    readonly warningIcon: GameObjects.Text;
}

const SLOT_SIZE = 56;
const SLOT_SPACING = 10;
const SLOT_STRIDE = SLOT_SIZE + SLOT_SPACING;
const MAX_VISIBLE_SLOTS = 3;
const ARROW_WIDTH = 32;
const ARROW_DISPLAY_SIZE = 24;
const BAR_HORIZONTAL_PADDING = 12;
const ICON_DISPLAY_SIZE = 32;
const BAR_HEIGHT = 80;
const BAR_BOTTOM_OFFSET = 44;
const SLOT_ROW_Y = 10;
const CAROUSEL_TWEEN_DURATION_MS = 220;
const RESPONSIVE_SCREEN_MARGIN = 8;
const GUIDE_PANEL_WIDTH = 520;
const GUIDE_PANEL_HEIGHT = 380;
const GUIDE_PANEL_DEPTH = 1_500;
const GUIDE_PANEL_BACKDROP_COLOR = 0x000000;
const GUIDE_PANEL_BACKDROP_ALPHA = 0.72;

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
    private isTutorialPaused = false;

    private readonly barContainer: GameObjects.Container;
    private readonly slotsContainer: GameObjects.Container;
    private readonly maskGraphics: GameObjects.Graphics;
    private readonly carouselMask: Display.Masks.GeometryMask;
    private readonly carouselBounds = new Geom.Rectangle();
    private barBackground!: GameObjects.Image;
    private barTitle!: GameObjects.Text;
    private leftArrow!: GameObjects.Image;
    private rightArrow!: GameObjects.Image;
    private carouselTween: Tweens.Tween | null = null;
    private currentSlotIndex = 0;
    private visibleSlotCount = MAX_VISIBLE_SLOTS;
    private carouselUsesArrows = false;
    private currentBarWidth = 0;
    private isGuideOpen = false;
    private readonly guidePanelContainer: GameObjects.Container;
    private readonly guideBackdrop: GameObjects.Rectangle;
    private readonly guidePanelBackground: GameObjects.Image;

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
        this.refreshInteractionState();
    };
    private readonly onTutorialPauseChangedBound = (data: TutorialPauseChangedData): void => {
        this.isTutorialPaused = data.paused;
        if (data.paused) {
            this.isDragging = false;
            this.activeDragId = null;
        }
        this.refreshInteractionState();
    };
    private readonly onGuideToggledBound = (data: ToggleClientGuideData): void => {
        this.isGuideOpen = data.enabled;
        this.guidePanelContainer.setVisible(data.enabled);
    };
    private readonly onGuideEscapeBound = (): void => {
        if (!this.isGuideOpen) return;
        const data: ToggleClientGuideData = { enabled: false };
        eventBus.emit(EVENT_TOGGLE_CLIENT_GUIDE, data);
    };

    public constructor(private readonly scene: Scene) {
        for (const [id, quantity] of Object.entries(INITIAL_STOCK)) this.stock.set(id, quantity);

        this.barContainer = scene.add.container(0, 0).setVisible(this.isBuildModeEnabled);
        this.slotsContainer = scene.add.container(0, 0);
        this.maskGraphics = scene.make.graphics({ x: 0, y: 0 });
        this.carouselMask = this.maskGraphics.createGeometryMask();
        this.slotsContainer.setMask(this.carouselMask);
        this.guidePanelContainer = scene.add.container(0, 0)
            .setDepth(GUIDE_PANEL_DEPTH)
            .setVisible(false);
        this.guideBackdrop = scene.add.rectangle(
            0, 0, 1, 1, GUIDE_PANEL_BACKDROP_COLOR, GUIDE_PANEL_BACKDROP_ALPHA,
        ).setInteractive();
        this.guidePanelBackground = scene.add.image(0, 0, UI_INVENTORY_SLOT_FRAME_KEY).setAlpha(0.98);
        this.fitFrameToBounds(
            this.guidePanelBackground,
            GUIDE_PANEL_WIDTH,
            GUIDE_PANEL_HEIGHT,
            UI_INVENTORY_SLOT_FRAME_SOURCE_BOUNDS,
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
        if (this.carouselTween !== null) {
            this.carouselTween.stop();
            this.carouselTween = null;
        }
        const width = this.scene.scale.width;
        const height = this.scene.scale.height;
        const availableWidth = Math.max(1, width - RESPONSIVE_SCREEN_MARGIN * 2);
        const idealVisibleSlots = Math.min(MAX_VISIBLE_SLOTS, Math.max(1, this.slots.size));
        const contentWidth = idealVisibleSlots * SLOT_SIZE + (idealVisibleSlots - 1) * SLOT_SPACING;
        this.carouselUsesArrows = this.slots.size > MAX_VISIBLE_SLOTS;
        this.currentBarWidth = contentWidth
            + 2 * BAR_HORIZONTAL_PADDING
            + (this.carouselUsesArrows ? 2 * ARROW_WIDTH : 0);
        if (this.currentBarWidth > availableWidth) {
            this.currentBarWidth = availableWidth;
            this.carouselUsesArrows = true;
        }
        const barX = width / 2;
        const barY = height - BAR_BOTTOM_OFFSET;
        this.barContainer.setPosition(barX, barY);
        this.fitFrameToBounds(
            this.barBackground,
            this.currentBarWidth,
            BAR_HEIGHT,
            UI_HUD_FRAME_SOURCE_BOUNDS,
        );
        this.barTitle.setPosition(0, -BAR_HEIGHT / 2 + 7);

        const viewportWidth = this.getCarouselViewportWidth();
        this.visibleSlotCount = Math.max(
            1,
            Math.min(MAX_VISIBLE_SLOTS, Math.floor((viewportWidth + SLOT_SPACING) / SLOT_STRIDE)),
        );
        this.currentSlotIndex = Math.min(this.currentSlotIndex, this.getMaxSlotIndex());
        const arrowGutter = this.carouselUsesArrows ? ARROW_WIDTH : 0;
        const viewportLeft = -this.currentBarWidth / 2 + BAR_HORIZONTAL_PADDING + arrowGutter;
        this.slotsContainer.setPosition(this.getTargetSlotsContainerX(viewportLeft), SLOT_ROW_Y);
        for (const [index, slot] of [...this.slots.values()].entries()) {
            slot.container.setPosition(index * SLOT_STRIDE, 0);
        }
        this.leftArrow.setPosition(
            -this.currentBarWidth / 2 + BAR_HORIZONTAL_PADDING + ARROW_WIDTH / 2,
            SLOT_ROW_Y,
        ).setDisplaySize(ARROW_DISPLAY_SIZE, ARROW_DISPLAY_SIZE);
        this.rightArrow.setPosition(
            this.currentBarWidth / 2 - BAR_HORIZONTAL_PADDING - ARROW_WIDTH / 2,
            SLOT_ROW_Y,
        ).setDisplaySize(ARROW_DISPLAY_SIZE, ARROW_DISPLAY_SIZE);

        const maskX = barX + viewportLeft;
        const maskY = barY + SLOT_ROW_Y - SLOT_SIZE / 2;
        this.maskGraphics.clear();
        this.maskGraphics.fillStyle(0xffffff, 1);
        this.maskGraphics.fillRect(maskX, maskY, viewportWidth, SLOT_SIZE);
        this.carouselBounds.setTo(maskX, maskY, viewportWidth, SLOT_SIZE);
        this.refreshArrowStates();

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
        eventBus.off(EVENT_TUTORIAL_PAUSE_CHANGED, this.onTutorialPauseChangedBound);
        eventBus.off(EVENT_TOGGLE_CLIENT_GUIDE, this.onGuideToggledBound);
        this.scene.scale.off('resize', this.reposition, this);
        this.scene.input.off('pointermove', this.handleScenePointerMove, this);
        this.scene.input.off('pointerup', this.handleScenePointerUp, this);
        this.scene.input.off('wheel', this.handleSceneWheel, this);
        this.scene.input.keyboard?.off('keydown-ESC', this.onGuideEscapeBound, this);
        this.carouselTween?.stop();
        this.carouselTween = null;
        this.slotsContainer.clearMask();
        this.carouselMask.destroy();
        this.maskGraphics.destroy();
        this.barContainer.destroy(true);
        this.guidePanelContainer.destroy(true);
        this.slots.clear();
    }

    private createBottomBar(): void {
        this.barBackground = this.scene.add.image(0, 0, UI_HUD_FRAME_KEY).setAlpha(0.96);
        this.barTitle = this.scene.add.text(0, -BAR_HEIGHT / 2 + 7, 'INVENTORY - FURNITURE', {
            fontFamily: 'monospace',
            fontSize: '9px',
            color: '#bfa068',
            align: 'center',
        }).setOrigin(0.5);
        this.leftArrow = this.scene.add.image(0, SLOT_ROW_Y, UI_CAROUSEL_ARROW_KEY)
            .setDisplaySize(ARROW_DISPLAY_SIZE, ARROW_DISPLAY_SIZE)
            .setInteractive({ useHandCursor: true });
        this.rightArrow = this.scene.add.image(0, SLOT_ROW_Y, UI_CAROUSEL_ARROW_KEY)
            .setFlipX(true)
            .setDisplaySize(ARROW_DISPLAY_SIZE, ARROW_DISPLAY_SIZE)
            .setInteractive({ useHandCursor: true });
        this.configureArrow(this.leftArrow, -1);
        this.configureArrow(this.rightArrow, 1);
        this.barContainer.add([
            this.barBackground,
            this.barTitle,
            this.slotsContainer,
            this.leftArrow,
            this.rightArrow,
        ]);

        for (const [index, furnitureId] of UNLOCKED_FURNITURE_IDS.entries()) {
            const config = getFurnitureConfig(furnitureId);
            if (config === undefined) continue;
            const slot = this.createItemSlot(config, index * SLOT_STRIDE, 0);
            this.slots.set(furnitureId, slot);
            this.slotsContainer.add(slot.container);
        }
    }

    private createItemSlot(config: FurnitureConfig, offsetX: number, offsetY: number): SlotElements {
        const container = this.scene.add.container(offsetX, offsetY);
        const background = this.scene.add.image(0, 0, UI_INVENTORY_SLOT_FRAME_KEY);
        this.fitFrameToBounds(
            background,
            SLOT_SIZE,
            SLOT_SIZE,
            UI_INVENTORY_SLOT_FRAME_SOURCE_BOUNDS,
        );
        const hitArea = this.scene.add.rectangle(0, 0, SLOT_SIZE, SLOT_SIZE, 0xffffff, 0.001)
            .setInteractive({ useHandCursor: true });
        const icon = this.scene.add.image(0, -4, config.texture)
            .setDisplaySize(ICON_DISPLAY_SIZE, ICON_DISPLAY_SIZE);
        const countText = this.scene.add.text(
            SLOT_SIZE / 2 - 5,
            SLOT_SIZE / 2 - 4,
            `x${this.stock.get(config.id) ?? 0}`,
            {
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#ffd166',
                stroke: '#10151b',
                strokeThickness: 3,
            },
        ).setOrigin(1, 1);
        container.add([background, hitArea, icon, countText]);

        hitArea.on('pointerover', () => {
            if ((this.stock.get(config.id) ?? 0) > 0) background.setTint(0xffe1a0);
        });
        hitArea.on('pointerout', () => background.clearTint());
        hitArea.on('pointerdown', (
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

        return { container, background, hitArea, countText };
    }

    private fitFrameToBounds(
        frame: GameObjects.Image,
        targetWidth: number,
        targetHeight: number,
        sourceBounds: {
            readonly sourceWidth: number;
            readonly sourceHeight: number;
            readonly visibleX: number;
            readonly visibleY: number;
            readonly visibleWidth: number;
            readonly visibleHeight: number;
        },
    ): void {
        const displayWidth = targetWidth * sourceBounds.sourceWidth / sourceBounds.visibleWidth;
        const displayHeight = targetHeight * sourceBounds.sourceHeight / sourceBounds.visibleHeight;
        const visibleCenterOffsetX = sourceBounds.visibleX
            + sourceBounds.visibleWidth / 2
            - sourceBounds.sourceWidth / 2;
        const visibleCenterOffsetY = sourceBounds.visibleY
            + sourceBounds.visibleHeight / 2
            - sourceBounds.sourceHeight / 2;

        frame
            .setDisplaySize(displayWidth, displayHeight)
            .setPosition(
                -visibleCenterOffsetX * displayWidth / sourceBounds.sourceWidth,
                -visibleCenterOffsetY * displayHeight / sourceBounds.sourceHeight,
            );
    }

    private createAffinityGuidePanel(): void {
        const title = this.scene.add.text(0, -GUIDE_PANEL_HEIGHT / 2 + 34, 'CLIENT GUIDE', {
            fontFamily: 'monospace', fontSize: '20px', color: '#ffd166',
            stroke: '#241e18', strokeThickness: 3,
        }).setOrigin(0.5);
        const hint = this.scene.add.text(
            0,
            GUIDE_PANEL_HEIGHT / 2 - 24,
            'Press CLIENT GUIDE to close',
            { fontFamily: 'monospace', fontSize: '10px', color: '#c8b99f' },
        ).setOrigin(0.5);
        const linesGraphics = this.scene.add.graphics();
        const ui = GAME_REGISTRY.ui;
        const nodePositions = new Map<ClientRace, AffinityNodePosition>();
        const nodes = new Map<ClientRace, GameObjects.Container>();

        for (const [index, race] of CLIENT_RACES.entries()) {
            const angle = index * (Math.PI * 2 / CLIENT_RACES.length) - Math.PI / 2;
            nodePositions.set(race, {
                x: ui.affinityWheelCenterX + Math.cos(angle) * ui.affinityWheelRadius,
                y: ui.affinityWheelCenterY + Math.sin(angle) * ui.affinityWheelRadius,
            });
        }

        const connections = this.createAffinityConnections(linesGraphics, nodePositions);
        this.drawAffinityConnections(linesGraphics, connections, nodePositions, null);

        for (const race of CLIENT_RACES) {
            const position = nodePositions.get(race);
            if (position === undefined) continue;

            const presentation = CLIENT_RACE_PRESENTATION[race];
            const node = this.scene.add.container(position.x, position.y);
            const circle = this.scene.add.circle(
                0,
                0,
                ui.affinityNodeSize / 2,
                presentation.placeholderColor,
                1,
            ).setStrokeStyle(2, 0xd8e7f2, 1);
            const label = this.scene.add.text(
                0,
                ui.affinityNodeSize / 2 + ui.affinityNodeLabelOffsetY,
                presentation.label,
                {
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    color: '#f4ead8',
                    stroke: '#10151b',
                    strokeThickness: 3,
                    align: 'center',
                },
            ).setOrigin(0.5, 0);
            node.add([circle, label]);
            node.setSize(ui.affinityNodeSize, ui.affinityNodeSize)
                .setInteractive({ useHandCursor: true });
            node.on('pointerover', () => {
                node.setScale(ui.affinityNodeHoverScale);
                circle.setStrokeStyle(3, 0xffffff, 1);
                this.drawAffinityConnections(linesGraphics, connections, nodePositions, race);
            });
            node.on('pointerout', () => {
                node.setScale(1);
                circle.setStrokeStyle(2, 0xd8e7f2, 1);
                this.drawAffinityConnections(linesGraphics, connections, nodePositions, null);
            });
            nodes.set(race, node);
        }

        this.guidePanelContainer.add([
            this.guideBackdrop,
            this.guidePanelBackground,
            linesGraphics,
            ...connections.map((connection) => connection.warningIcon),
            ...nodes.values(),
            title,
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

    private createAffinityConnections(
        linesGraphics: GameObjects.Graphics,
        nodePositions: ReadonlyMap<ClientRace, AffinityNodePosition>,
    ): AffinityConnection[] {
        const connections: AffinityConnection[] = [];
        const seenPairs = new Set<string>();
        const ui = GAME_REGISTRY.ui;

        for (const race of CLIENT_RACES) {
            for (const enemy of AFFINITY_RULES[race]) {
                const raceIndex = CLIENT_RACES.indexOf(race);
                const enemyIndex = CLIENT_RACES.indexOf(enemy);
                const pairKey = raceIndex < enemyIndex
                    ? `${race}:${enemy}`
                    : `${enemy}:${race}`;
                if (seenPairs.has(pairKey)) continue;
                seenPairs.add(pairKey);

                const firstPosition = nodePositions.get(race);
                const secondPosition = nodePositions.get(enemy);
                if (firstPosition === undefined || secondPosition === undefined) continue;

                const warningIcon = this.scene.add.text(
                    (firstPosition.x + secondPosition.x) / 2,
                    (firstPosition.y + secondPosition.y) / 2,
                    ui.affinityWarningIconText,
                    {
                        fontFamily: 'monospace',
                        fontSize: `${ui.affinityWarningIconFontSize}px`,
                        color: `#${ui.affinityWarningIconColor.toString(16).padStart(6, '0')}`,
                        stroke: '#1a0808',
                        strokeThickness: 3,
                        backgroundColor: '#171114',
                        align: 'center',
                    },
                ).setOrigin(0.5);

                connections.push({
                    firstRace: race,
                    secondRace: enemy,
                    warningIcon,
                });
            }
        }

        return connections;
    }

    /** Redraws either the complete affinity web or only one race's enemy links. */
    private drawAffinityConnections(
        linesGraphics: GameObjects.Graphics,
        connections: readonly AffinityConnection[],
        nodePositions: ReadonlyMap<ClientRace, AffinityNodePosition>,
        highlightedRace: ClientRace | null,
    ): void {
        const ui = GAME_REGISTRY.ui;
        linesGraphics.clear();

        for (const connection of connections) {
            const isHighlightedConnection = highlightedRace === null
                || (
                    connection.firstRace === highlightedRace
                    && AFFINITY_RULES[highlightedRace].includes(connection.secondRace)
                )
                || (
                    connection.secondRace === highlightedRace
                    && AFFINITY_RULES[highlightedRace].includes(connection.firstRace)
                );
            connection.warningIcon.setVisible(isHighlightedConnection);
            if (!isHighlightedConnection) continue;

            const firstPosition = nodePositions.get(connection.firstRace);
            const secondPosition = nodePositions.get(connection.secondRace);
            if (firstPosition === undefined || secondPosition === undefined) continue;

            const color = highlightedRace === null
                ? ui.affinityConnectionColor
                : ui.affinityConnectionHighlightColor;
            const lineWidth = highlightedRace === null
                ? ui.affinityConnectionWidth
                : ui.affinityConnectionHighlightWidth;
            linesGraphics.lineStyle(lineWidth, color, 1);
            linesGraphics.lineBetween(
                firstPosition.x,
                firstPosition.y,
                secondPosition.x,
                secondPosition.y,
            );
        }
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
        eventBus.on(EVENT_TUTORIAL_PAUSE_CHANGED, this.onTutorialPauseChangedBound);
        eventBus.on(EVENT_TOGGLE_CLIENT_GUIDE, this.onGuideToggledBound);
        this.scene.scale.on('resize', this.reposition, this);
        this.scene.input.on('pointermove', this.handleScenePointerMove, this);
        this.scene.input.on('pointerup', this.handleScenePointerUp, this);
        this.scene.input.on('wheel', this.handleSceneWheel, this);
        this.scene.input.keyboard?.on('keydown-ESC', this.onGuideEscapeBound, this);
    }

    private refreshInteractionState(): void {
        const enabled = !this.isTutorialPaused;
        for (const slot of this.slots.values()) {
            if (enabled && this.isBuildModeEnabled) {
                slot.hitArea.setInteractive({ useHandCursor: true });
            } else {
                slot.hitArea.disableInteractive();
            }
        }
        for (const arrow of [this.leftArrow, this.rightArrow]) {
            if (enabled && this.carouselUsesArrows) {
                arrow.setInteractive({ useHandCursor: true });
            } else {
                arrow.disableInteractive();
            }
        }
        if (enabled && this.isGuideOpen) {
            this.guideBackdrop.setInteractive();
        } else {
            this.guideBackdrop.disableInteractive();
        }
    }

    private configureArrow(arrow: GameObjects.Image, direction: -1 | 1): void {
        arrow.on('pointerover', () => {
            if (arrow.input?.enabled) arrow.setTint(0xffd166);
        });
        arrow.on('pointerout', () => arrow.clearTint());
        arrow.on('pointerdown', (
            _pointer: Input.Pointer,
            _localX: number,
            _localY: number,
            event: Types.Input.EventData,
        ) => {
            event.stopPropagation();
            this.navigateCarousel(direction);
        });
    }

    private navigateCarousel(direction: -1 | 1): void {
        const nextIndex = this.currentSlotIndex + direction;
        if (nextIndex < 0 || nextIndex > this.getMaxSlotIndex()) return;

        this.currentSlotIndex = nextIndex;
        if (this.carouselTween !== null) this.carouselTween.stop();
        const arrowGutter = this.carouselUsesArrows ? ARROW_WIDTH : 0;
        const viewportLeft = -this.currentBarWidth / 2 + BAR_HORIZONTAL_PADDING + arrowGutter;
        this.carouselTween = this.scene.tweens.add({
            targets: this.slotsContainer,
            x: this.getTargetSlotsContainerX(viewportLeft),
            duration: CAROUSEL_TWEEN_DURATION_MS,
            ease: 'Sine.Out',
            onComplete: () => {
                this.carouselTween = null;
            },
        });
        this.refreshArrowStates();
    }

    public getFurnitureSlotCenter(furnitureId: string): { readonly x: number; readonly y: number } {
        const slot = this.slots.get(furnitureId);
        if (slot === undefined) {
            throw new Error(`No existe el mueble ${furnitureId} en el inventario.`);
        }
        return {
            x: this.barContainer.x + this.slotsContainer.x + slot.container.x,
            y: this.barContainer.y + this.slotsContainer.y + slot.container.y,
        };
    }

    private handleSceneWheel(
        pointer: Input.Pointer,
        _gameObjects: GameObjects.GameObject[],
        _deltaX: number,
        deltaY: number,
        _deltaZ: number,
    ): void {
        if (!this.isBuildModeEnabled || !this.carouselBounds.contains(pointer.x, pointer.y)) return;
        if (deltaY > 0) this.navigateCarousel(1);
        else if (deltaY < 0) this.navigateCarousel(-1);
    }

    private getCarouselViewportWidth(): number {
        const arrowGutter = this.carouselUsesArrows ? ARROW_WIDTH : 0;
        return Math.max(1, this.currentBarWidth - 2 * (BAR_HORIZONTAL_PADDING + arrowGutter));
    }

    private getMaxSlotIndex(): number {
        return Math.max(0, this.slots.size - this.visibleSlotCount);
    }

    private getTargetSlotsContainerX(viewportLeft: number): number {
        return viewportLeft + SLOT_SIZE / 2 - this.currentSlotIndex * SLOT_STRIDE;
    }

    private refreshArrowStates(): void {
        const hasPrevious = this.currentSlotIndex > 0;
        const hasNext = this.currentSlotIndex < this.getMaxSlotIndex();
        this.setArrowEnabled(this.leftArrow, this.carouselUsesArrows, hasPrevious);
        this.setArrowEnabled(this.rightArrow, this.carouselUsesArrows, hasNext);
    }

    private setArrowEnabled(arrow: GameObjects.Image, visible: boolean, enabled: boolean): void {
        arrow.setVisible(visible);
        arrow.setAlpha(enabled ? 1 : 0.3);
        arrow.clearTint();
        if (arrow.input !== null) arrow.input.enabled = visible && enabled;
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
