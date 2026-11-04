import { GameObjects, Geom, Input, Scene, Tweens } from 'phaser';

import { CREDITS_REGISTRY_KEY, GAME_REGISTRY } from '../data/GameRegistry';
import {
    TEXTURE_FOOD,
    UI_BUILD_ICON_KEY,
    UI_GUIDE_ICON_KEY,
    UI_HUD_FRAME_KEY,
    UI_HUD_FRAME_SOURCE_BOUNDS,
    UI_MATERIALS_ICON_KEY,
    UI_OPEN_ICON_KEY,
} from '../data/constants';
import {
    EVENT_CANTINA_OPEN,
    EVENT_COIN_COLLECTED,
    EVENT_CREDITS_UPDATED,
    EVENT_WANTED_REWARD_GRANTED,
    EVENT_FOOD_STOCK_UPDATED,
    EVENT_GAME_MODE_CHANGED,
    EVENT_GAME_WARNING,
    EVENT_NIGHT_TIMER_UPDATED,
    EVENT_TOGGLE_BUILD_MODE,
    EVENT_TOGGLE_CLIENT_GUIDE,
    EVENT_TOGGLE_MATERIALS,
    GAME_MODE_PRE_OPENING,
    eventBus,
    GAME_MODE_DAY,
    GAME_MODE_NIGHT,
    type BuildModeToggledData,
    type CoinCollectedData,
    type CreditsUpdatedData,
    type WantedRewardData,
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
    readonly icon: GameObjects.Image | GameObjects.Ellipse | null;
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

/** Unified fixed-to-camera top bar and transient action feedback. */
export class HUD {
    private readonly slots = new Map<HudSlotId, HudSlot>();
    private readonly barContainer: GameObjects.Container;
    private readonly feedbackConfig = GAME_REGISTRY.ui;
    private isBuildModeEnabled = true;
    private isMaterialsEnabled = true;
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
    private readonly onCreditsUpdatedBound = (data: CreditsUpdatedData): void => {
        this.setSlotValue('credits', `${data.totalCredits}`);
    };
    private readonly onWantedRewardBound = (data: WantedRewardData): void => {
        this.setSlotValue('credits', `${data.totalCredits}`);
        this.showFeedback(`+${data.rewardCredits} CRÉDITOS`);
    };
    private readonly onNightTimerUpdatedBound = (data: NightTimerUpdatedData): void => {
        this.setSlotValue('time', this.formatTime(data.remainingMs));
    };
    private readonly onGuideToggledBound = (data: ToggleClientGuideData): void => {
        this.isGuideOpen = data.enabled;
    };
    private readonly onMaterialsToggledBound = (data: ToggleMaterialsData): void => {
        this.isMaterialsOpen = data.enabled;
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
        eventBus.on(EVENT_CREDITS_UPDATED, this.onCreditsUpdatedBound);
        eventBus.on(EVENT_WANTED_REWARD_GRANTED, this.onWantedRewardBound);
        eventBus.on(EVENT_NIGHT_TIMER_UPDATED, this.onNightTimerUpdatedBound);
        eventBus.on(EVENT_TOGGLE_CLIENT_GUIDE, this.onGuideToggledBound);
        eventBus.on(EVENT_TOGGLE_MATERIALS, this.onMaterialsToggledBound);
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
        eventBus.off(EVENT_CREDITS_UPDATED, this.onCreditsUpdatedBound);
        eventBus.off(EVENT_WANTED_REWARD_GRANTED, this.onWantedRewardBound);
        eventBus.off(EVENT_NIGHT_TIMER_UPDATED, this.onNightTimerUpdatedBound);
        eventBus.off(EVENT_TOGGLE_CLIENT_GUIDE, this.onGuideToggledBound);
        eventBus.off(EVENT_TOGGLE_MATERIALS, this.onMaterialsToggledBound);
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
        const value = this.scene.add.text(0, 0, '', {
            fontFamily: 'monospace',
            fontSize: `${this.getValueFontSize(id)}px`,
            color: HUD_TEXT_COLOR,
            stroke: '#10151b',
            strokeThickness: 2,
            align: 'center',
        }).setOrigin(0.5);
        container.add(icon === null ? [frame, value] : [frame, icon, value]);

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

        return { container, icon, value, hitArea };
    }

    private createIcon(id: HudSlotId): GameObjects.Image | GameObjects.Ellipse | null {
        if (id === 'phase' || id === 'time') return null;
        if (id === 'credits') {
            const coinSize = this.feedbackConfig.coinIconBaseSize;
            return this.scene.add.ellipse(0, 0, coinSize, coinSize, HUD_COIN_COLOR)
                .setStrokeStyle(2, 0x8c5b1a, 1);
        }

        const textureBySlot: Partial<Record<HudSlotId, string>> = {
            food: TEXTURE_FOOD,
            guide: UI_GUIDE_ICON_KEY,
            materials: UI_MATERIALS_ICON_KEY,
            build: UI_BUILD_ICON_KEY,
            open: UI_OPEN_ICON_KEY,
        };
        const texture = textureBySlot[id];
        return texture === undefined ? null : this.scene.add.image(0, 0, texture);
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
                if (!this.isMaterialsEnabled) return;
                this.isMaterialsOpen = !this.isMaterialsOpen;
                const data: ToggleMaterialsData = { enabled: this.isMaterialsOpen };
                eventBus.emit(EVENT_TOGGLE_MATERIALS, data);
                this.showFeedback(this.isMaterialsOpen ? 'TIENDA ABIERTA' : 'PANEL CERRADO');
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
        this.slots.get('build')?.icon?.setAlpha(this.isBuildModeEnabled ? 1 : 0.35);
    }

    private refreshMaterialsSlot(): void {
        const slot = this.slots.get('materials');
        slot?.icon?.setAlpha(this.isMaterialsEnabled ? 1 : 0.35);
        if (this.isMaterialsEnabled) {
            slot?.hitArea?.setInteractive({ useHandCursor: true });
        } else {
            slot?.hitArea?.disableInteractive();
        }
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
        this.isMaterialsEnabled = mode === GAME_MODE_PRE_OPENING;
        if (!this.isMaterialsEnabled && this.isMaterialsOpen) {
            this.isMaterialsOpen = false;
            eventBus.emit(EVENT_TOGGLE_MATERIALS, { enabled: false });
        }
        this.refreshMaterialsSlot();
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
            if (frame instanceof GameObjects.Image) {
                const bounds = UI_HUD_FRAME_SOURCE_BOUNDS;
                const frameWidth = slotWidth * bounds.sourceWidth / bounds.visibleWidth;
                const frameHeight = barHeight * bounds.sourceHeight / bounds.visibleHeight;
                const transparentCenterOffsetX = bounds.visibleX
                    + bounds.visibleWidth / 2
                    - bounds.sourceWidth / 2;
                const transparentCenterOffsetY = bounds.visibleY
                    + bounds.visibleHeight / 2
                    - bounds.sourceHeight / 2;
                frame
                    .setDisplaySize(frameWidth, frameHeight)
                    .setPosition(
                        -transparentCenterOffsetX * frameWidth / bounds.sourceWidth,
                        -transparentCenterOffsetY * frameHeight / bounds.sourceHeight,
                    );
            }
            const hasSideBySideValue = id === 'food' || id === 'credits';
            const iconX = hasSideBySideValue
                ? -slotWidth * this.feedbackConfig.sideBySideIconOffsetRatio
                : 0;
            const valueX = hasSideBySideValue
                ? slotWidth * this.feedbackConfig.sideBySideValueOffsetRatio
                : 0;
            slot.icon?.setPosition(iconX, 0);
            const iconSize = hasSideBySideValue
                ? Math.min(
                    this.feedbackConfig.slotIconSize,
                    slotWidth * this.feedbackConfig.sideBySideIconWidthRatio,
                    barHeight * this.feedbackConfig.sideBySideIconHeightRatio,
                )
                : Math.min(
                    this.feedbackConfig.slotIconSize,
                    slotWidth * this.feedbackConfig.centeredIconWidthRatio,
                    barHeight * this.feedbackConfig.centeredIconHeightRatio,
                );
            if (slot.icon instanceof GameObjects.Image) {
                slot.icon.setDisplaySize(iconSize, iconSize);
            } else if (slot.icon instanceof GameObjects.Ellipse) {
                slot.icon.setScale(iconSize / this.feedbackConfig.coinIconBaseSize);
            }
            slot.value.setPosition(valueX, 0).setFontSize(`${this.getResponsiveValueFontSize(id, slotWidth)}px`);
            slot.hitArea
                ?.setSize(Math.max(1, slotWidth), barHeight)
                .setInteractive(
                    new Geom.Rectangle(-slotWidth / 2, -barHeight / 2, slotWidth, barHeight),
                    Geom.Rectangle.Contains,
                );
        }
        this.feedbackText.setPosition(width / 2, this.feedbackConfig.feedbackOffsetY);
    }

    private getValueFontSize(id: HudSlotId): number {
        switch (id) {
            case 'phase': return this.feedbackConfig.phaseFontSize;
            case 'time': return this.feedbackConfig.timeFontSize;
            case 'food': return this.feedbackConfig.stockFontSize;
            case 'credits': return this.feedbackConfig.creditsFontSize;
            default: return this.feedbackConfig.phaseFontSize;
        }
    }

    private getResponsiveValueFontSize(id: HudSlotId, slotWidth: number): number {
        const configuredSize = this.getValueFontSize(id);
        return slotWidth < this.feedbackConfig.narrowSlotMaxWidth
            ? Math.max(
                this.feedbackConfig.minimumNarrowFontSize,
                configuredSize - this.feedbackConfig.narrowFontSizeReduction,
            )
            : configuredSize;
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
