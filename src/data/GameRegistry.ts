import { TEXTURE_DRINK_FULL, TEXTURE_FOOD } from './constants';

export const CREDITS_REGISTRY_KEY = 'credits';
export const IMPERIAL_HEAT_REGISTRY_KEY = 'imperialHeat';
export const CRIMINAL_REPUTATION_REGISTRY_KEY = 'criminalReputation';
export const WANTED_PROFILE_REGISTRY_KEY = 'wantedProfile';
export const SCRAPS_REGISTRY_KEY = 'scraps';
export const EMPTY_GLASSES_REGISTRY_KEY = 'emptyGlasses';
export const CURRENT_NIGHT_REGISTRY_KEY = 'currentNight';

export enum ClientRace {
    HUMAN = 'HUMAN',
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
    [ClientRace.HUMAN]: [],
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

export interface WantedProfile {
    readonly race: ClientRace;
    readonly placeholderColor: number;
    readonly visualDetail: string;
    readonly rewardCredits: number;
}

export interface WantedConfig {
    readonly spawnAtMs: number;
    readonly inspectionDelayMs: number;
    readonly detectionRadiusTiles: number;
    readonly patrolPointCount: number;
    readonly arrestDurationMs: number;
    readonly coverReputationGain: number;
    readonly exposeReputationLoss: number;
    readonly sandtrooperSpeed: number;
    readonly sandtrooperBodyWidth: number;
    readonly sandtrooperBodyHeight: number;
    readonly sandtrooperColor: number;
    readonly posterBackgroundColor: number;
    readonly posterPanelColor: number;
    readonly posterTextColor: number;
    readonly posterDetailColor: number;
}

export interface NightDifficulty {
    readonly spawnIntervalMs: number;
    readonly patienceMultiplier: number;
    readonly eventProbability: number;
}

export interface ProgressionConfig {
    readonly startingNight: number;
    readonly finalNight: number;
    readonly nightDurationMs: number;
    readonly nightOneSatisfiedClients: number;
    readonly nightSummaryDurationMs: number;
    readonly basePostNightMode: 'PRE_APERTURA';
    readonly difficultyByNight: Readonly<Record<number, NightDifficulty>>;
}

export const CLIENT_RACE_PRESENTATION: Readonly<Record<ClientRace, ClientRacePresentation>> = {
    [ClientRace.HUMAN]: { label: 'Human', placeholderColor: 0xb88452 },
    [ClientRace.WOOKIEE]: { label: 'Wookiee', placeholderColor: 0x79543b },
    [ClientRace.TRANDOSHAN]: { label: 'Trandoshan', placeholderColor: 0x87933f },
    [ClientRace.RODIAN]: { label: 'Rodian', placeholderColor: 0x42a34b },
    [ClientRace.AQUALISH]: { label: 'Aqualish', placeholderColor: 0x536f83 },
    [ClientRace.ITHORIAN]: { label: 'Ithorian', placeholderColor: 0xb48272 },
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
    readonly defaultMasterVolume: number;
    readonly defaultMuted: boolean;
    readonly maxConcurrentOneShotsPerBus: number;
    readonly bandFadeOutMs: number;
}

export interface MenuConfig {
    readonly panelWidth: number;
    readonly panelHeight: number;
    readonly panelColor: number;
    readonly overlayColor: number;
    readonly overlayAlpha: number;
    readonly borderColor: number;
    readonly accentColor: number;
    readonly textColor: number;
    readonly mutedTextColor: number;
    readonly focusColor: number;
    readonly buttonWidth: number;
    readonly buttonHeight: number;
    readonly buttonGap: number;
    readonly titleFontSize: number;
    readonly buttonFontSize: number;
    readonly bodyFontSize: number;
    readonly sliderWidth: number;
    readonly sliderHeight: number;
    readonly sliderKnobRadius: number;
    readonly focusPulseMs: number;
    readonly volumeStep: number;
    readonly backgroundColor: number;
    readonly horizonColor: number;
    readonly silhouetteColor: number;
    readonly windowGlowColor: number;
    readonly backgroundStarCount: number;
    readonly backgroundStarXStep: number;
    readonly backgroundStarYStep: number;
    readonly backgroundStarSmallRadius: number;
    readonly backgroundStarLargeRadius: number;
    readonly backgroundSkyHeightRatio: number;
    readonly horizonStartRatio: number;
    readonly primarySilhouette: Readonly<{ readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly radius: number }>;
    readonly upperSilhouette: Readonly<{ readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly radius: number }>;
    readonly windowLeft: Readonly<{ readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly radius: number }>;
    readonly windowRight: Readonly<{ readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly radius: number }>;
    readonly panelPadding: number;
    readonly panelFillAlpha: number;
    readonly panelDepth: number;
    readonly headingOffsetRatio: number;
    readonly subtitleOffsetRatio: number;
    readonly mainButtonIndexCenter: number;
    readonly mainFooterOffsetRatio: number;
    readonly pauseButtonIndexCenter: number;
    readonly optionsSliderY: number;
    readonly optionsVolumeLabelY: number;
    readonly optionsMuteButtonY: number;
    readonly optionsBackButtonY: number;
    readonly focusedScale: number;
    readonly windowAlpha: number;
    readonly starAlpha: number;
    readonly largeStarEvery: number;
    readonly panelBorderWidth: number;
}

export interface AudioSettings {
    readonly masterVolume: number;
    readonly muted: boolean;
}

export const AUDIO_MASTER_VOLUME_REGISTRY_KEY = 'audioMasterVolume';
export const AUDIO_MUTED_REGISTRY_KEY = 'audioMuted';

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
    readonly startingEmptyGlasses: number;
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

export interface TutorialConfig {
    readonly night2FoodPurchaseCreditThreshold: number;
    readonly night2CourtesyCredits: number;
    readonly night2HintDelayMs: number;
    readonly night2MeterHintDurationMs: number;
}

export interface UiConfig {
    readonly topBarHeight: number;
    readonly topBarMargin: number;
    readonly topBarSlotCount: number;
    readonly guideButtonSlotIndex: number;
    readonly materialsButtonSlotIndex: number;
    readonly topBarDepth: number;
    readonly tutorialOverlayDepth: number;
    readonly tutorialBlockerDepth: number;
    readonly slotPadding: number;
    readonly slotIconSize: number;
    readonly stockRowOffsetRatio: number;
    readonly stockRowIconOffsetRatio: number;
    readonly stockRowValueOffsetRatio: number;
    readonly stockRowIconWidthRatio: number;
    readonly stockRowIconHeightRatio: number;
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
    readonly tutorialMeterPulseDurationMs: number;
    readonly tutorialMeterMinimumAlpha: number;
    readonly reputationBarWidth: number;
    readonly reputationBarHeight: number;
    readonly reputationBarMargin: number;
    readonly reputationBarLabelWidth: number;
    readonly reputationBarLabelColor: number;
    readonly reputationBarTrackColor: number;
    readonly reputationBarFillColor: number;
    readonly reputationBarTextColor: number;
    readonly wantedPosterWidth: number;
    readonly wantedPosterHeight: number;
    readonly wantedPosterDepth: number;
    readonly wantedPosterOverlayColor: number;
    readonly wantedPosterOverlayAlpha: number;
    readonly wantedPosterTitleFontSize: number;
    readonly wantedPosterBodyFontSize: number;
    readonly shopWidth: number;
    readonly shopHeight: number;
    readonly shopSlotWidth: number;
    readonly shopSlotHeight: number;
    readonly shopSlotGap: number;
    readonly shopDepth: number;
    readonly shopPanelColor: number;
    readonly shopPanelBorderColor: number;
    readonly shopLockedSlotAlpha: number;
    readonly shopTextColor: number;
    readonly shopPriceColor: number;
    readonly shopButtonColor: number;
    readonly shopTooltipColor: number;
    readonly glassStorageBubbleWidth: number;
    readonly glassStorageBubbleHeight: number;
    readonly glassStorageBubbleOffsetY: number;
    readonly glassStoragePointerHeight: number;
    readonly glassStorageIconSize: number;
    readonly glassStorageIconOffsetX: number;
    readonly glassStorageCountOffsetX: number;
    readonly glassStorageCountFontSize: number;
    readonly glassStorageDepthOffset: number;
    readonly glassStorageBubbleColor: number;
    readonly glassStorageBubbleBorderColor: number;
    readonly glassStorageBubbleBorderWidth: number;
    readonly glassStorageBubbleCornerRadius: number;
}

export interface GameRegistry {
    readonly progression: ProgressionConfig;
    readonly patience: PatienceConfig;
    readonly orders: OrderConfig;
    readonly audio: AudioConfig;
    readonly menus: MenuConfig;
    readonly band: BandConfig;
    readonly rats: RatConfig;
    readonly economy: EconomyConfig;
    readonly combat: CombatConfig;
    readonly threat: ThreatConfig;
    readonly reputation: ReputationConfig;
    readonly wanted: WantedConfig;
    readonly jabbaRaid: JabbaRaidConfig;
    readonly aftermath: AftermathConfig;
    readonly repairs: RepairConfig;
    readonly tutorial: TutorialConfig;
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
    progression: {
        startingNight: 1,
        finalNight: 5,
        nightDurationMs: 210_000,
        nightOneSatisfiedClients: 3,
        nightSummaryDurationMs: 2_500,
        basePostNightMode: 'PRE_APERTURA',
        difficultyByNight: {
            1: { spawnIntervalMs: 8_000, patienceMultiplier: 1.25, eventProbability: 0 },
            2: { spawnIntervalMs: 18_000, patienceMultiplier: 1.1, eventProbability: 0.1 },
            3: { spawnIntervalMs: 12_000, patienceMultiplier: 0.9, eventProbability: 0.25 },
            4: { spawnIntervalMs: 8_500, patienceMultiplier: 0.72, eventProbability: 0.45 },
            5: { spawnIntervalMs: 6_000, patienceMultiplier: 0.58, eventProbability: 0.7 },
        },
    },
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
        defaultMasterVolume: 1,
        defaultMuted: false,
        maxConcurrentOneShotsPerBus: 5,
        bandFadeOutMs: 700,
    },
    menus: {
        panelWidth: 500,
        panelHeight: 440,
        panelColor: 0x211b18,
        overlayColor: 0x090d12,
        overlayAlpha: 0.78,
        borderColor: 0xc49352,
        accentColor: 0xe8b75b,
        textColor: 0xf4ead7,
        mutedTextColor: 0xb5a58e,
        focusColor: 0xe68a43,
        buttonWidth: 280,
        buttonHeight: 54,
        buttonGap: 16,
        titleFontSize: 28,
        buttonFontSize: 18,
        bodyFontSize: 15,
        sliderWidth: 240,
        sliderHeight: 12,
        sliderKnobRadius: 11,
        focusPulseMs: 180,
        volumeStep: 0.05,
        backgroundColor: 0x11191b,
        horizonColor: 0x3a3025,
        silhouetteColor: 0x171715,
        windowGlowColor: 0xc88948,
        backgroundStarCount: 32,
        backgroundStarXStep: 37,
        backgroundStarYStep: 19,
        backgroundStarSmallRadius: 1,
        backgroundStarLargeRadius: 2,
        backgroundSkyHeightRatio: 0.55,
        horizonStartRatio: 0.68,
        primarySilhouette: { x: 0.08, y: 0.52, width: 0.84, height: 0.22, radius: 0.025 },
        upperSilhouette: { x: 0.2, y: 0.43, width: 0.6, height: 0.12, radius: 0.02 },
        windowLeft: { x: 0.28, y: 0.48, width: 0.08, height: 0.13, radius: 0.015 },
        windowRight: { x: 0.64, y: 0.48, width: 0.08, height: 0.13, radius: 0.015 },
        panelPadding: 20,
        panelFillAlpha: 0.98,
        panelDepth: 30_000,
        headingOffsetRatio: 0.36,
        subtitleOffsetRatio: 0.25,
        mainButtonIndexCenter: 0.5,
        mainFooterOffsetRatio: 0.36,
        pauseButtonIndexCenter: 1,
        optionsSliderY: -24,
        optionsVolumeLabelY: 8,
        optionsMuteButtonY: 66,
        optionsBackButtonY: 144,
        focusedScale: 1.035,
        windowAlpha: 0.78,
        starAlpha: 0.7,
        largeStarEvery: 4,
        panelBorderWidth: 2,
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
        interactionRadiusTiles: 0,
    },
    economy: {
        startingCredits: 0,
        startingEmptyGlasses: 0,
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
    wanted: {
        spawnAtMs: 45_000,
        inspectionDelayMs: 5_000,
        detectionRadiusTiles: 3,
        patrolPointCount: 4,
        arrestDurationMs: 700,
        coverReputationGain: 15,
        exposeReputationLoss: -25,
        sandtrooperSpeed: 76,
        sandtrooperBodyWidth: 18,
        sandtrooperBodyHeight: 26,
        sandtrooperColor: 0xd8d2bb,
        posterBackgroundColor: 0xc49a61,
        posterPanelColor: 0x3a2418,
        posterTextColor: 0xf4ede2,
        posterDetailColor: 0x2a1710,
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
    tutorial: {
        night2FoodPurchaseCreditThreshold: 8,
        night2CourtesyCredits: 15,
        night2HintDelayMs: 800,
        night2MeterHintDurationMs: 1_800,
    },
    ui: {
        topBarHeight: 64,
        topBarMargin: 4,
        topBarSlotCount: 8,
        guideButtonSlotIndex: 4,
        materialsButtonSlotIndex: 5,
        topBarDepth: 20_000,
        tutorialOverlayDepth: 40_000,
        tutorialBlockerDepth: 39_999,
        slotPadding: 3,
        slotIconSize: 48,
        stockRowOffsetRatio: 0.23,
        stockRowIconOffsetRatio: 0.22,
        stockRowValueOffsetRatio: 0.17,
        stockRowIconWidthRatio: 0.28,
        stockRowIconHeightRatio: 0.32,
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
        tutorialMeterPulseDurationMs: 540,
        tutorialMeterMinimumAlpha: 0.24,
        reputationBarWidth: 220,
        reputationBarHeight: 22,
        reputationBarMargin: 12,
        reputationBarLabelWidth: 92,
        reputationBarLabelColor: 0xd5a62a,
        reputationBarTrackColor: 0x171b21,
        reputationBarFillColor: 0xf1c75b,
        reputationBarTextColor: 0x241d0b,
        wantedPosterWidth: 430,
        wantedPosterHeight: 300,
        wantedPosterDepth: 30_000,
        wantedPosterOverlayColor: 0x080b10,
        wantedPosterOverlayAlpha: 0.78,
        wantedPosterTitleFontSize: 24,
        wantedPosterBodyFontSize: 16,
        shopWidth: 660,
        shopHeight: 390,
        shopSlotWidth: 118,
        shopSlotHeight: 170,
        shopSlotGap: 12,
        shopDepth: 2_000,
        shopPanelColor: 0x18202b,
        shopPanelBorderColor: 0xc49a61,
        shopLockedSlotAlpha: 0.38,
        shopTextColor: 0xf4ede2,
        shopPriceColor: 0xf6c453,
        shopButtonColor: 0xd5a62a,
        shopTooltipColor: 0x0b0f14,
        glassStorageBubbleWidth: 48,
        glassStorageBubbleHeight: 28,
        glassStorageBubbleOffsetY: -38,
        glassStoragePointerHeight: 5,
        glassStorageIconSize: 30,
        glassStorageIconOffsetX: -9,
        glassStorageCountOffsetX: 10,
        glassStorageCountFontSize: 10,
        glassStorageDepthOffset: 10_000,
        glassStorageBubbleColor: 0xf5ead4,
        glassStorageBubbleBorderColor: 0x3b3025,
        glassStorageBubbleBorderWidth: 2,
        glassStorageBubbleCornerRadius: 4,
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

/** Returns the configured difficulty for a night, clamping unknown values to the final night. */
export function getNightDifficulty(
    night: number,
    registry: GameRegistry = GAME_REGISTRY,
): NightDifficulty {
    const normalizedNight = Math.max(
        registry.progression.startingNight,
        Math.min(registry.progression.finalNight, Math.floor(night)),
    );
    return registry.progression.difficultyByNight[normalizedNight]
        ?? registry.progression.difficultyByNight[registry.progression.finalNight];
}

/** Samples a patience duration around its configured base value. */
export function samplePatienceDuration(
    config: PatienceDurationConfig,
    randomValue: number = Math.random(),
): number {
    const variance = (randomValue * 2 - 1) * config.variationMs;
    return Math.round(config.baseMs + variance);
}
