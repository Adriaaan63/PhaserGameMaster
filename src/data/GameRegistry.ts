import { TEXTURE_DRINK_FULL, TEXTURE_FOOD } from './constants';

export const CREDITS_REGISTRY_KEY = 'credits';
export const IMPERIAL_HEAT_REGISTRY_KEY = 'imperialHeat';
export const CRIMINAL_REPUTATION_REGISTRY_KEY = 'criminalReputation';
export const SCRAPS_REGISTRY_KEY = 'scraps';

export enum ClientRace {
    WOOKIEE = 'WOOKIEE',
    TRANDOSHAN = 'TRANDOSHAN',
    RODIAN = 'RODIAN',
    AQUALISH = 'AQUALISH',
    ITHORIAN = 'ITHORIAN',
}

export interface ReputationConfig {
    readonly startingReputation: number;
    readonly postRaidReputation: number;
    readonly reputationGainPerOrder: number;
    readonly reputationLossPerMiss: number;
    readonly reputationLossPerBetrayal: number;
    readonly maxReputation: number;
}

export interface JabbaRaidConfig {
    readonly thugCount: number;
    readonly thugSpeed: number;
    readonly formationSpacing: number;
    readonly formationRowOffsetY: number;
    readonly marchSpeed: number;
    readonly explosionDurationMs: number;
    readonly thugBodyWidth: number;
    readonly thugBodyHeight: number;
    readonly thugColor: number;
    readonly explosionColor: number;
}

export const CLIENT_RACES: readonly ClientRace[] = Object.freeze(Object.values(ClientRace));

export const AFFINITY_PENALTY_MULTIPLIER = 2;
export const AFFINITY_ADJACENCY_RADIUS_TILES = 1;

export const AFFINITY_RULES: Readonly<Record<ClientRace, readonly ClientRace[]>> = {
    [ClientRace.WOOKIEE]: [ClientRace.TRANDOSHAN],
    [ClientRace.TRANDOSHAN]: [ClientRace.WOOKIEE, ClientRace.RODIAN, ClientRace.ITHORIAN],
    [ClientRace.RODIAN]: [ClientRace.TRANDOSHAN, ClientRace.AQUALISH],
    [ClientRace.AQUALISH]: [ClientRace.RODIAN, ClientRace.ITHORIAN],
    [ClientRace.ITHORIAN]: [ClientRace.TRANDOSHAN, ClientRace.AQUALISH],
};

export interface ClientRacePresentation {
    readonly label: string;
    readonly placeholderColor: number;
}

export const CLIENT_RACE_PRESENTATION: Readonly<Record<ClientRace, ClientRacePresentation>> = {
    [ClientRace.WOOKIEE]: { label: 'Wookiee', placeholderColor: 0x79543b },
    [ClientRace.TRANDOSHAN]: { label: 'Trandoshano', placeholderColor: 0x87933f },
    [ClientRace.RODIAN]: { label: 'Rodiano', placeholderColor: 0x42a34b },
    [ClientRace.AQUALISH]: { label: 'Aqualish', placeholderColor: 0x536f83 },
    [ClientRace.ITHORIAN]: { label: 'Ithoriano', placeholderColor: 0xb48272 },
};

/** Selects a client archetype from the immutable race list. */
export function chooseClientRace(randomValue: number = Math.random()): ClientRace {
    const index = Math.min(CLIENT_RACES.length - 1, Math.floor(randomValue * CLIENT_RACES.length));
    return CLIENT_RACES[index] ?? ClientRace.WOOKIEE;
}

export type OrderItemId = 'FILLED_CUP' | 'FOOD_PLATE' | 'MUSIC';

export const BAND_PLAYING_DURATION_MS = 15_000;

export type AudioBus = 'BGM' | 'SFX' | 'UI';

export interface AudioConfig {
    readonly busVolumes: Readonly<Record<AudioBus, number>>;
    readonly maxConcurrentOneShotsPerBus: number;
    readonly bandFadeOutMs: number;
}

export interface BandConfig {
    readonly memberCount: number;
    readonly memberBodyWidth: number;
    readonly memberBodyHeight: number;
    readonly memberHeadRadius: number;
    readonly memberBodyColors: readonly number[];
    readonly instrumentColor: number;
    readonly instrumentWidth: number;
    readonly instrumentHeight: number;
    readonly playingBobOffset: number;
    readonly playingAnimationDurationMs: number;
    readonly interactionRadiusTiles: number;
}

export interface PatienceDurationConfig {
    readonly baseMs: number;
    readonly variationMs: number;
}

export interface PatienceConfig {
    readonly queue: PatienceDurationConfig;
    readonly service: Readonly<Record<OrderItemId, PatienceDurationConfig>>;
}

export interface OrderOption {
    readonly itemId: OrderItemId;
    readonly probability: number;
    readonly iconTexture: string;
    readonly iconText?: string;
}

export interface OrderConfig {
    readonly options: readonly OrderOption[];
}

export interface EconomyConfig {
    readonly startingCredits: number;
    readonly coinsPerSatisfiedClient: number;
    readonly valuePerCoin: number;
    readonly coinRadius: number;
    readonly coinColor: number;
    readonly coinOutlineColor: number;
    readonly coinOutlineWidth: number;
    readonly coinPlacementSearchRadiusTiles: number;
    readonly coinRatAttractionDelayMs: number;
}

export interface RatConfig {
    readonly movementSpeed: number;
    readonly fleeingSpeed: number;
    readonly interactionRadiusTiles: number;
    readonly bodyWidth: number;
    readonly bodyHeight: number;
    readonly bodyColor: number;
    readonly eyeColor: number;
}

export interface CombatConfig {
    readonly fightDurationMs: number;
    readonly deadClientProbability: number;
    readonly fightBubbleBorderWidth: number;
    readonly fightBubbleOffsetY: number;
    readonly fightBubbleWidth: number;
    readonly fightBubbleHeight: number;
    readonly fightBubbleColor: number;
    readonly fightBubbleBorderColor: number;
    readonly fightBubbleTextColor: number;
    readonly fightBubbleFontSize: number;
    readonly fightShakeAmplitude: number;
    readonly fightShakePeriodMs: number;
    readonly smokeColor: number;
    readonly smokeAlpha: number;
    readonly smokePuffs: readonly {
        readonly x: number;
        readonly y: number;
        readonly radius: number;
    }[];
    readonly smokeScaleMin: number;
    readonly smokeScaleMax: number;
    readonly smokeAnimationDurationMs: number;
    readonly smokeRotationDegrees: number;
    readonly corpseColor: number;
    readonly corpseAlpha: number;
    readonly corpseRotation: number;
    readonly bloodPoolColor: number;
    readonly bloodPoolWidth: number;
    readonly bloodPoolHeight: number;
    readonly bloodPoolOffsetY: number;
    readonly destroyedFurnitureTint: number;
    readonly destroyedFurnitureAlpha: number;
}

export interface ThreatConfig {
    readonly startingHeat: number;
    readonly heatPerMurder: number;
    readonly heatPerSecondFighting: number;
    readonly heatDecayPerSecond: number;
    readonly maxHeat: number;
}

export interface AftermathConfig {
    readonly cleaningTimeMs: number;
    readonly fearRadiusTiles: number;
    readonly fearPatienceMultiplier: number;
    readonly progressBarWidth: number;
    readonly progressBarHeight: number;
    readonly progressBarOffsetY: number;
    readonly progressBarBackgroundColor: number;
    readonly progressBarFillColor: number;
    readonly fearZoneColor: number;
    readonly bloodBodyWidth: number;
    readonly bloodBodyHeight: number;
    readonly corpseCollisionWidth: number;
    readonly corpseCollisionHeight: number;
}

export interface RepairConfig {
    readonly startingScraps: number;
    readonly scrapsPerFurniture: number;
}

export interface UiConfig {
    readonly topBarHeight: number;
    readonly topBarMargin: number;
    readonly topBarDepth: number;
    readonly slotPadding: number;
    readonly slotIconSize: number;
    readonly coinIconBaseSize: number;
    readonly phaseFontSize: number;
    readonly timeFontSize: number;
    readonly stockFontSize: number;
    readonly creditsFontSize: number;
    readonly narrowSlotMaxWidth: number;
    readonly narrowFontSizeReduction: number;
    readonly minimumNarrowFontSize: number;
    readonly centeredIconWidthRatio: number;
    readonly centeredIconHeightRatio: number;
    readonly sideBySideIconWidthRatio: number;
    readonly sideBySideIconHeightRatio: number;
    readonly sideBySideIconOffsetRatio: number;
    readonly sideBySideValueOffsetRatio: number;
    readonly feedbackOffsetY: number;
    readonly feedbackDurationMs: number;
    readonly feedbackFadeMs: number;
    readonly feedbackFontSize: number;
    readonly feedbackColor: number;
    readonly feedbackErrorColor: number;
    readonly playerProgressWidth: number;
    readonly playerProgressHeight: number;
    readonly playerProgressOffsetY: number;
    readonly playerProgressDepthOffset: number;
    readonly playerProgressBackgroundColor: number;
    readonly playerProgressFillColor: number;
    readonly affinityWheelRadius: number;
    readonly affinityWheelCenterX: number;
    readonly affinityWheelCenterY: number;
    readonly affinityNodeSize: number;
    readonly affinityNodeLabelOffsetY: number;
    readonly affinityNodeHoverScale: number;
    readonly affinityConnectionColor: number;
    readonly affinityConnectionHighlightColor: number;
    readonly affinityConnectionWidth: number;
    readonly affinityConnectionHighlightWidth: number;
    readonly affinityWarningIconText: string;
    readonly affinityWarningIconFontSize: number;
    readonly affinityWarningIconColor: number;
    readonly imperialBarWidth: number;
    readonly imperialBarHeight: number;
    readonly imperialBarMargin: number;
    readonly imperialBarLabelWidth: number;
    readonly imperialBarLabelColor: number;
    readonly imperialBarTrackColor: number;
    readonly imperialBarFillColor: number;
    readonly imperialBarTextColor: number;
    readonly reputationBarWidth: number;
    readonly reputationBarHeight: number;
    readonly reputationBarMargin: number;
    readonly reputationBarLabelWidth: number;
    readonly reputationBarLabelColor: number;
    readonly reputationBarTrackColor: number;
    readonly reputationBarFillColor: number;
    readonly reputationBarTextColor: number;
}

export interface GameRegistry {
    readonly patience: PatienceConfig;
    readonly orders: OrderConfig;
    readonly audio: AudioConfig;
    readonly band: BandConfig;
    readonly rats: RatConfig;
    readonly economy: EconomyConfig;
    readonly combat: CombatConfig;
    readonly threat: ThreatConfig;
    readonly reputation: ReputationConfig;
    readonly jabbaRaid: JabbaRaidConfig;
    readonly aftermath: AftermathConfig;
    readonly repairs: RepairConfig;
    readonly ui: UiConfig;
    readonly clients: {
        readonly spawnIntervalMs: number;
        readonly maxWaiting: number;
        readonly moveSpeed: number;
        readonly satisfiedStayMs: number;
        readonly leaveFadeMs: number;
        readonly exitRetryMs: number;
        readonly exitBlockedColor: number;
        readonly affinityWarningOffsetY: number;
        readonly affinityWarningFontSize: number;
        readonly affinityWarningColor: number;
        readonly affinityWarningStrokeWidth: number;
        readonly patienceWarningRatio: number;
        readonly patienceCriticalRatio: number;
        readonly patienceHealthyColor: number;
        readonly patienceWarningColor: number;
        readonly patienceCriticalColor: number;
        readonly bodyColor: number;
        readonly orderBubbleSize: number;
        readonly orderIconSize: number;
        readonly orderBubbleWarningRatio: number;
        readonly orderBubbleCriticalRatio: number;
        readonly orderBubbleBackgroundColor: number;
        readonly orderBubbleBorderColor: number;
        readonly orderBubbleHealthyColor: number;
        readonly orderBubbleWarningColor: number;
        readonly orderBubbleCriticalColor: number;
        readonly bodyWidth: number;
        readonly bodyHeight: number;
        readonly collisionBodyWidth: number;
        readonly collisionBodyHeight: number;
        readonly queueIndicatorOffsetY: number;
        readonly queueIndicatorRadius: number;
        readonly queueIndicatorStrokeWidth: number;
        readonly queueIndicatorOutlineColor: number;
        readonly queueIndicatorBlinkMs: number;
        readonly selectedOutlineWidth: number;
        readonly selectedOutlineColor: number;
        readonly orderBubbleOffsetY: number;
        readonly orderBubbleBorderWidth: number;
        readonly orderBubbleProgressAlpha: number;
    };
}

/** Central balance and visual tuning values for night customers and rewards. */
export const GAME_REGISTRY = {
    patience: {
        queue: { baseMs: 30_000, variationMs: 5_000 },
        service: {
            FILLED_CUP: { baseMs: 25_000, variationMs: 4_000 },
            FOOD_PLATE: { baseMs: 35_000, variationMs: 5_000 },
            MUSIC: { baseMs: 30_000, variationMs: 0 },
        },
    },
    orders: {
        options: [
            { itemId: 'FILLED_CUP', probability: 0.52, iconTexture: TEXTURE_DRINK_FULL },
            { itemId: 'FOOD_PLATE', probability: 0.28, iconTexture: TEXTURE_FOOD },
            { itemId: 'MUSIC', probability: 0.2, iconTexture: '', iconText: '♫' },
        ],
    },
    audio: {
        busVolumes: { BGM: 0.65, SFX: 0.8, UI: 0.75 },
        maxConcurrentOneShotsPerBus: 5,
        bandFadeOutMs: 700,
    },
    band: {
        memberCount: 4,
        memberBodyWidth: 14,
        memberBodyHeight: 20,
        memberHeadRadius: 7,
        memberBodyColors: [0x829ca8, 0x9b7c62, 0x8d9e7d, 0x7e899a],
        instrumentColor: 0xe2bd68,
        instrumentWidth: 19,
        instrumentHeight: 4,
        playingBobOffset: 3,
        playingAnimationDurationMs: 260,
        interactionRadiusTiles: 1,
    },
    economy: {
        startingCredits: 0,
        coinsPerSatisfiedClient: 3,
        valuePerCoin: 5,
        coinRadius: 8,
        coinColor: 0xf6c453,
        coinOutlineColor: 0x8c5b1a,
        coinOutlineWidth: 2,
        coinPlacementSearchRadiusTiles: 4,
        coinRatAttractionDelayMs: 3_000,
    },
    rats: {
        movementSpeed: 82,
        fleeingSpeed: 150,
        interactionRadiusTiles: 1,
        bodyWidth: 18,
        bodyHeight: 12,
        bodyColor: 0x6b5144,
        eyeColor: 0xffd166,
    },
    combat: {
        fightDurationMs: 5_000,
        deadClientProbability: 0.5,
        fightBubbleBorderWidth: 2,
        fightBubbleOffsetY: -102,
        fightBubbleWidth: 74,
        fightBubbleHeight: 24,
        fightBubbleColor: 0x8f1717,
        fightBubbleBorderColor: 0xff4545,
        fightBubbleTextColor: 0xffffff,
        fightBubbleFontSize: 11,
        fightShakeAmplitude: 3,
        fightShakePeriodMs: 55,
        smokeColor: 0x77716b,
        smokeAlpha: 0.86,
        smokePuffs: [
            { x: -18, y: 5, radius: 15 },
            { x: -7, y: -5, radius: 18 },
            { x: 8, y: 3, radius: 17 },
            { x: 19, y: -3, radius: 13 },
        ],
        smokeScaleMin: 0.88,
        smokeScaleMax: 1.12,
        smokeAnimationDurationMs: 310,
        smokeRotationDegrees: 5,
        corpseColor: 0x403638,
        corpseAlpha: 0.72,
        corpseRotation: 90,
        bloodPoolColor: 0x8b1111,
        bloodPoolWidth: 30,
        bloodPoolHeight: 13,
        bloodPoolOffsetY: 10,
        destroyedFurnitureTint: 0x6b2929,
        destroyedFurnitureAlpha: 0.42,
    },
    threat: {
        startingHeat: 0,
        heatPerMurder: 25,
        heatPerSecondFighting: 2,
        heatDecayPerSecond: 1,
        maxHeat: 100,
    },
    reputation: {
        startingReputation: 50,
        postRaidReputation: 20,
        reputationGainPerOrder: 1,
        reputationLossPerMiss: -2,
        reputationLossPerBetrayal: -25,
        maxReputation: 100,
    },
    jabbaRaid: {
        thugCount: 4,
        thugSpeed: 82,
        formationSpacing: 22,
        formationRowOffsetY: 22,
        marchSpeed: 48,
        explosionDurationMs: 650,
        thugBodyWidth: 18,
        thugBodyHeight: 24,
        thugColor: 0x4a2d2a,
        explosionColor: 0xffc247,
    },
    aftermath: {
        cleaningTimeMs: 3_000,
        fearRadiusTiles: 1,
        fearPatienceMultiplier: 2,
        progressBarWidth: 28,
        progressBarHeight: 4,
        progressBarOffsetY: -22,
        progressBarBackgroundColor: 0x242020,
        progressBarFillColor: 0xd9d2c4,
        fearZoneColor: 0xe54b36,
        bloodBodyWidth: 16,
        bloodBodyHeight: 26,
        corpseCollisionWidth: 25,
        corpseCollisionHeight: 25,
    },
    repairs: {
        startingScraps: 4,
        scrapsPerFurniture: 2,
    },
    ui: {
        topBarHeight: 64,
        topBarMargin: 4,
        topBarDepth: 20_000,
        slotPadding: 3,
        slotIconSize: 48,
        coinIconBaseSize: 20,
        phaseFontSize: 12,
        timeFontSize: 18,
        stockFontSize: 18,
        creditsFontSize: 17,
        narrowSlotMaxWidth: 76,
        narrowFontSizeReduction: 3,
        minimumNarrowFontSize: 9,
        centeredIconWidthRatio: 0.62,
        centeredIconHeightRatio: 0.78,
        sideBySideIconWidthRatio: 0.3,
        sideBySideIconHeightRatio: 0.65,
        sideBySideIconOffsetRatio: 0.25,
        sideBySideValueOffsetRatio: 0.18,
        feedbackOffsetY: 76,
        feedbackDurationMs: 2_500,
        feedbackFadeMs: 650,
        feedbackFontSize: 16,
        feedbackColor: 0xffd166,
        feedbackErrorColor: 0xff6b6b,
        playerProgressWidth: 24,
        playerProgressHeight: 4,
        playerProgressOffsetY: -43,
        playerProgressDepthOffset: 100_000,
        playerProgressBackgroundColor: 0x242020,
        playerProgressFillColor: 0xf1c75b,
        affinityWheelRadius: 100,
        affinityWheelCenterX: 0,
        affinityWheelCenterY: -20,
        affinityNodeSize: 42,
        affinityNodeLabelOffsetY: 8,
        affinityNodeHoverScale: 1.1,
        affinityConnectionColor: 0x660000,
        affinityConnectionHighlightColor: 0xff0000,
        affinityConnectionWidth: 2,
        affinityConnectionHighlightWidth: 4,
        affinityWarningIconText: '⚡ x2',
        affinityWarningIconFontSize: 9,
        affinityWarningIconColor: 0xff8080,
        imperialBarWidth: 220,
        imperialBarHeight: 22,
        imperialBarMargin: 12,
        imperialBarLabelWidth: 68,
        imperialBarLabelColor: 0x9e2525,
        imperialBarTrackColor: 0x171b21,
        imperialBarFillColor: 0xd93636,
        imperialBarTextColor: 0xf4ede2,
        reputationBarWidth: 220,
        reputationBarHeight: 22,
        reputationBarMargin: 12,
        reputationBarLabelWidth: 92,
        reputationBarLabelColor: 0xd5a62a,
        reputationBarTrackColor: 0x171b21,
        reputationBarFillColor: 0xf1c75b,
        reputationBarTextColor: 0x241d0b,
    },
    clients: {
        spawnIntervalMs: 8_000,
        maxWaiting: 4,
        moveSpeed: 72,
        satisfiedStayMs: 2_000,
        leaveFadeMs: 350,
        exitRetryMs: 1_000,
        exitBlockedColor: 0xff2020,
        affinityWarningOffsetY: -76,
        affinityWarningFontSize: 18,
        affinityWarningColor: 0xff2020,
        affinityWarningStrokeWidth: 3,
        patienceWarningRatio: 0.6,
        patienceCriticalRatio: 0.25,
        patienceHealthyColor: 0x00ff00,
        patienceWarningColor: 0xffb000,
        patienceCriticalColor: 0xff2020,
        bodyColor: 0x8b6f47,
        orderBubbleSize: 30,
        orderIconSize: 18,
        orderBubbleWarningRatio: 0.5,
        orderBubbleCriticalRatio: 0.2,
        orderBubbleBackgroundColor: 0xf5ead4,
        orderBubbleBorderColor: 0x3b3025,
        orderBubbleHealthyColor: 0x35b85a,
        orderBubbleWarningColor: 0xffb52e,
        orderBubbleCriticalColor: 0xe53935,
        bodyWidth: 22,
        bodyHeight: 30,
        collisionBodyWidth: 18,
        collisionBodyHeight: 20,
        queueIndicatorOffsetY: -24,
        queueIndicatorRadius: 7,
        queueIndicatorStrokeWidth: 2,
        queueIndicatorOutlineColor: 0xffffff,
        queueIndicatorBlinkMs: 120,
        selectedOutlineWidth: 3,
        selectedOutlineColor: 0xffff88,
        orderBubbleOffsetY: -50,
        orderBubbleBorderWidth: 2,
        orderBubbleProgressAlpha: 0.55,
    },
} as const satisfies GameRegistry;

/** Samples a patience duration around its configured base value. */
export function samplePatienceDuration(
    config: PatienceDurationConfig,
    randomValue: number = Math.random(),
): number {
    const variance = (randomValue * 2 - 1) * config.variationMs;
    return Math.round(config.baseMs + variance);
}
