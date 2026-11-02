import { GameObjects, Geom, Input, Scene, Tweens } from 'phaser';

import { CREDITS_REGISTRY_KEY, GAME_REGISTRY } from '../data/GameRegistry';
import {
    TEXTURE_FOOD,
    UI_BUILD_ICON_KEY,
    UI_GUIDE_ICON_KEY,
    UI_HUD_FRAME_KEY,
    UI_MATERIALS_ICON_KEY,
    UI_OPEN_ICON_KEY,
    UI_PHASE_ICON_KEY,
    UI_TIME_ICON_KEY,
} from '../data/constants';
import {
    EVENT_CANTINA_OPEN,
    EVENT_COIN_COLLECTED,
    EVENT_FOOD_STOCK_UPDATED,
    EVENT_GAME_MODE_CHANGED,
    EVENT_GAME_WARNING,
    EVENT_NIGHT_TIMER_UPDATED,
    EVENT_TOGGLE_BUILD_MODE,
    EVENT_TOGGLE_CLIENT_GUIDE,
    EVENT_TOGGLE_MATERIALS,
    eventBus,
    GAME_MODE_DAY,
    GAME_MODE_NIGHT,
    type BuildModeToggledData,
    type CoinCollectedData,
    type FoodStockUpdatedData,
    type GameModeChangedData,
    type GameWarningData,
    type NightTimerUpdatedData,
    type ToggleClientGuideData,
    type ToggleMaterialsData,
} from '../utils/EventBus';

type HudSlotId = 'phase' | 'food' | 'credits' | 'time' | 'guide' | 'materials' | 'build' | 'open';

interface HudSlot {
    readonly container: GameObjects.Container;
    readonly icon: GameObjects.Image | GameObjects.Ellipse;
    readonly label: GameObjects.Text;
    readonly value: GameObjects.Text;
    readonly hitArea: GameObjects.Rectangle | null;
}

const HUD_SLOT_IDS: readonly HudSlotId[] = [
    'phase', 'food', 'credits', 'time', 'guide', 'materials', 'build', 'open',
];
const HUD_PANEL_COLOR = 0x111821;
const HUD_TEXT_COLOR = '#f4ede2';
const HUD_BUTTON_HOVER_COLOR = 0xffd166;
const HUD_COIN_COLOR = 0xf6c453;
const HUD_SLOT_LABELS: Readonly<Record<HudSlotId, string>> = {
    phase: 'FASE',
    food: 'COMIDA',
    credits: 'CRÉDITOS',
    time: 'TIEMPO',
    guide: 'GUÍA',
    materials: 'MATERIALES',
    build: 'CONSTRUCCIÓN',
    open: 'APERTURA',
};

/** Unified fixed-to-camera top bar and transient action feedback. */
export class HUD {
    private readonly slots = new Map<HudSlotId, HudSlot>();
    private readonly barContainer: GameObjects.Container;
    private readonly feedbackConfig = GAME_REGISTRY.ui;
    private isBuildModeEnabled = true;
    private isMaterialsOpen = false;
    private isGuideOpen = false;
    private feedbackTween: Tweens.Tween | null = null;
    private feedbackText!: GameObjects.Text;

    private readonly onFoodStockUpdatedBound = (data: FoodStockUpdatedData): void => {
        this.setSlotValue('food', `x${data.stock}`);
    };
    private readonly onGameModeChangedBound = (data: GameModeChangedData): void => {
        this.updatePhase(data.mode);
        if (data.mode === GAME_MODE_NIGHT) this.showFeedback('¡CANTINA ABIERTA!');
        if (data.mode === GAME_MODE_DAY) this.showFeedback('FASE DIURNA');
    };
    private readonly onWarningBound = (data: GameWarningData): void => {
        this.showFeedback(data.message, true);
    };
    private readonly onCoinCollectedBound = (data: CoinCollectedData): void => {
        this.setSlotValue('credits', `${data.totalCredits}`);
        this.showFeedback(`+${data.value} CRÉDITOS`);
    };
    private readonly onNightTimerUpdatedBound = (data: NightTimerUpdatedData): void => {
        this.setSlotValue('time', this.formatTime(data.remainingMs));
    };
    private readonly onGuideToggledBound = (data: ToggleClientGuideData): void => {
        this.isGuideOpen = data.enabled;
    };

    public constructor(private readonly scene: Scene) {
        this.barContainer = scene.add.container(0, 0).setDepth(this.feedbackConfig.topBarDepth);
        this.createTopBar();
        this.createFeedbackText();
        this.updatePhaseFromRegistry();
        this.setSlotValue('food', `x${this.readRegistryNumber('foodStock', 0)}`);
        this.setSlotValue('credits', `${this.readRegistryNumber(
            CREDITS_REGISTRY_KEY,
            GAME_REGISTRY.economy.startingCredits,
        )}`);
        this.setSlotValue('time', '--:--');
        this.refreshBuildModeSlot();
        this.reposition();

        eventBus.on(EVENT_FOOD_STOCK_UPDATED, this.onFoodStockUpdatedBound);
        eventBus.on(EVENT_GAME_MODE_CHANGED, this.onGameModeChangedBound);
        eventBus.on(EVENT_GAME_WARNING, this.onWarningBound);
        eventBus.on(EVENT_COIN_COLLECTED, this.onCoinCollectedBound);
        eventBus.on(EVENT_NIGHT_TIMER_UPDATED, this.onNightTimerUpdatedBound);
        eventBus.on(EVENT_TOGGLE_CLIENT_GUIDE, this.onGuideToggledBound);
        scene.scale.on('resize', this.reposition, this);
        scene.events.once('shutdown', this.destroy, this);
        scene.events.once('destroy', this.destroy, this);

        const initialBuildMode: BuildModeToggledData = { enabled: true };
        eventBus.emit(EVENT_TOGGLE_BUILD_MODE, initialBuildMode);
    }

    public destroy(): void {
        eventBus.off(EVENT_FOOD_STOCK_UPDATED, this.onFoodStockUpdatedBound);
        eventBus.off(EVENT_GAME_MODE_CHANGED, this.onGameModeChangedBound);
        eventBus.off(EVENT_GAME_WARNING, this.onWarningBound);
        eventBus.off(EVENT_COIN_COLLECTED, this.onCoinCollectedBound);
        eventBus.off(EVENT_NIGHT_TIMER_UPDATED, this.onNightTimerUpdatedBound);
        eventBus.off(EVENT_TOGGLE_CLIENT_GUIDE, this.onGuideToggledBound);
        this.scene.scale.off('resize', this.reposition, this);
        if (this.feedbackTween !== null) {
            this.feedbackTween.stop();
            this.feedbackTween = null;
        }
        this.barContainer.destroy(true);
        this.feedbackText.destroy();
        this.slots.clear();
    }

    private createTopBar(): void {
        const background = this.scene.add.rectangle(0, 0, 1, this.feedbackConfig.topBarHeight, HUD_PANEL_COLOR, 0.96);
        this.barContainer.add(background);

        for (const id of HUD_SLOT_IDS) {
            const slot = this.createSlot(id);
            this.slots.set(id, slot);
            this.barContainer.add(slot.container);
        }
    }

    private createSlot(id: HudSlotId): HudSlot {
        const container = this.scene.add.container(0, 0);
        const frame = this.scene.add.image(0, 0, UI_HUD_FRAME_KEY).setAlpha(0.9);
        const icon = this.createIcon(id);
        const label = this.scene.add.text(0, 15, HUD_SLOT_LABELS[id], {
            fontFamily: 'monospace',
            fontSize: '7px',
            color: '#b9c5cf',
            align: 'center',
        }).setOrigin(0.5);
        const value = this.scene.add.text(0, 0, '', {
            fontFamily: 'monospace',
            fontSize: id === 'phase' ? '8px' : '10px',
            color: HUD_TEXT_COLOR,
            stroke: '#10151b',
            strokeThickness: 2,
            align: 'center',
        }).setOrigin(0.5);
        container.add([frame, icon, label, value]);

        const interactive = id === 'guide' || id === 'materials' || id === 'build' || id === 'open';
        let hitArea: GameObjects.Rectangle | null = null;
        if (interactive) {
            hitArea = this.scene.add.rectangle(0, 0, 1, 1, 0xffffff, 0.001)
                .setInteractive({ useHandCursor: true });
            container.add(hitArea);
            hitArea.on('pointerover', () => frame.setTint(HUD_BUTTON_HOVER_COLOR));
            hitArea.on('pointerout', () => frame.clearTint());
            hitArea.on('pointerdown', (
                _pointer: Input.Pointer,
                _localX: number,
                _localY: number,
                event: Event,
            ) => {
                event.stopPropagation();
                this.handleSlotPressed(id);
            });
        }

        return { container, icon, label, value, hitArea };
    }

    private createIcon(id: HudSlotId): GameObjects.Image | GameObjects.Ellipse {
        if (id === 'credits') {
            return this.scene.add.ellipse(0, -12, 11, 11, HUD_COIN_COLOR)
                .setStrokeStyle(2, 0x8c5b1a, 1);
        }

        const textureBySlot: Partial<Record<HudSlotId, string>> = {
            phase: UI_PHASE_ICON_KEY,
            food: TEXTURE_FOOD,
            time: UI_TIME_ICON_KEY,
            guide: UI_GUIDE_ICON_KEY,
            materials: UI_MATERIALS_ICON_KEY,
            build: UI_BUILD_ICON_KEY,
            open: UI_OPEN_ICON_KEY,
        };
        const texture = textureBySlot[id] ?? UI_PHASE_ICON_KEY;
        return this.scene.add.image(0, -12, texture);
    }

    private createFeedbackText(): void {
        this.feedbackText = this.scene.add.text(
            this.scene.scale.width / 2,
            this.feedbackConfig.feedbackOffsetY,
            '',
            {
                fontFamily: 'monospace',
                fontSize: `${this.feedbackConfig.feedbackFontSize}px`,
                color: `#${this.feedbackConfig.feedbackColor.toString(16).padStart(6, '0')}`,
                stroke: '#16120e',
                strokeThickness: 4,
                align: 'center',
            },
        ).setOrigin(0.5).setScrollFactor(0).setDepth(this.feedbackConfig.topBarDepth + 1).setVisible(false);
    }

    private handleSlotPressed(id: HudSlotId): void {
        switch (id) {
            case 'guide': {
                this.isGuideOpen = !this.isGuideOpen;
                const data: ToggleClientGuideData = { enabled: this.isGuideOpen };
                eventBus.emit(EVENT_TOGGLE_CLIENT_GUIDE, data);
                break;
            }
            case 'materials': {
                this.isMaterialsOpen = !this.isMaterialsOpen;
                const data: ToggleMaterialsData = { enabled: this.isMaterialsOpen };
                eventBus.emit(EVENT_TOGGLE_MATERIALS, data);
                console.info(`Panel de materiales ${this.isMaterialsOpen ? 'abierto' : 'cerrado'}.`);
                this.showFeedback(this.isMaterialsOpen ? 'MATERIALES: PRÓXIMAMENTE' : 'PANEL CERRADO');
                break;
            }
            case 'build': {
                this.isBuildModeEnabled = !this.isBuildModeEnabled;
                const data: BuildModeToggledData = { enabled: this.isBuildModeEnabled };
                eventBus.emit(EVENT_TOGGLE_BUILD_MODE, data);
                this.refreshBuildModeSlot();
                break;
            }
            case 'open': {
                if (!this.isOpenButtonVisible()) return;
                this.setBuildMode(false);
                eventBus.emit(EVENT_CANTINA_OPEN);
                break;
            }
            default:
                break;
        }
    }

    private setBuildMode(enabled: boolean): void {
        this.isBuildModeEnabled = enabled;
        const data: BuildModeToggledData = { enabled };
        eventBus.emit(EVENT_TOGGLE_BUILD_MODE, data);
        this.refreshBuildModeSlot();
    }

    private refreshBuildModeSlot(): void {
        this.setSlotValue('build', this.isBuildModeEnabled ? 'ON' : 'OFF');
    }

    private updatePhaseFromRegistry(): void {
        const mode = this.scene.registry.get('gameMode');
        this.updatePhase(mode === GAME_MODE_NIGHT || mode === GAME_MODE_DAY ? mode : 'PRE_APERTURA');
    }

    private updatePhase(mode: GameModeChangedData['mode']): void {
        const phaseName = mode === 'PRE_APERTURA'
            ? 'PRE-APERTURA'
            : mode === GAME_MODE_NIGHT ? 'NOCTURNA' : 'DÍA';
        this.setSlotValue('phase', phaseName);
        this.setSlotValue('time', '--:--');
        const openSlot = this.slots.get('open');
        openSlot?.container.setVisible(mode === 'PRE_APERTURA');
    }

    private isOpenButtonVisible(): boolean {
        return this.slots.get('open')?.container.visible ?? false;
    }

    private setSlotValue(id: HudSlotId, value: string): void {
        this.slots.get(id)?.value.setText(value);
    }

    private showFeedback(message: string, isError = false): void {
        if (this.feedbackTween !== null) {
            this.feedbackTween.stop();
            this.feedbackTween = null;
        }
        const errorColor = GAME_REGISTRY.ui.feedbackErrorColor.toString(16).padStart(6, '0');
        const defaultColor = GAME_REGISTRY.ui.feedbackColor.toString(16).padStart(6, '0');
        this.feedbackText.setText(message)
            .setColor(isError ? `#${errorColor}` : `#${defaultColor}`)
            .setAlpha(1)
            .setVisible(true);
        this.feedbackTween = this.scene.tweens.add({
            targets: this.feedbackText,
            alpha: 0,
            delay: this.feedbackConfig.feedbackDurationMs,
            duration: this.feedbackConfig.feedbackFadeMs,
            onComplete: () => {
                this.feedbackText.setVisible(false);
                this.feedbackTween = null;
            },
        });
    }

    private reposition(): void {
        const width = this.scene.scale.width;
        const barHeight = this.feedbackConfig.topBarHeight;
        const margin = this.feedbackConfig.topBarMargin;
        const usableWidth = Math.max(0, width - margin * 2);
        const slotWidth = usableWidth / HUD_SLOT_IDS.length;
        const y = barHeight / 2;

        this.barContainer.setPosition(width / 2, y).setScrollFactor(0);
        const panel = this.barContainer.getAt(0);
        if (panel instanceof GameObjects.Rectangle) panel.setSize(width, barHeight);

        for (const [index, id] of HUD_SLOT_IDS.entries()) {
            const slot = this.slots.get(id);
            if (slot === undefined) continue;
            const slotX = -width / 2 + margin + slotWidth * (index + 0.5);
            slot.container.setPosition(slotX, 0);
            const frame = slot.container.getAt(0);
            if (frame instanceof GameObjects.Image) frame.setDisplaySize(Math.max(1, slotWidth), barHeight);
            const iconX = -slotWidth * 0.27;
            const valueX = slotWidth * 0.14;
            slot.icon.setPosition(iconX, -12);
            if (slot.icon instanceof GameObjects.Image) {
                slot.icon.setDisplaySize(
                    Math.min(this.feedbackConfig.slotIconSize, slotWidth * 0.25),
                    Math.min(this.feedbackConfig.slotIconSize, barHeight * 0.35),
                );
            }
            slot.label.setPosition(0, 15).setFontSize(`${slotWidth < 76 ? 6 : 7}px`);
            slot.value.setPosition(valueX, 0).setFontSize(`${slotWidth < 76 ? 8 : 10}px`);
            slot.hitArea
                ?.setSize(Math.max(1, slotWidth), barHeight)
                .setInteractive(
                    new Geom.Rectangle(-slotWidth / 2, -barHeight / 2, slotWidth, barHeight),
                    Geom.Rectangle.Contains,
                );
        }
        this.feedbackText.setPosition(width / 2, this.feedbackConfig.feedbackOffsetY);
    }

    private readRegistryNumber(key: string, fallback: number): number {
        const value: unknown = this.scene.registry.get(key);
        return typeof value === 'number' ? value : fallback;
    }

    private formatTime(remainingMs: number): string {
        const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1_000));
        const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const seconds = (totalSeconds % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
    }
}
