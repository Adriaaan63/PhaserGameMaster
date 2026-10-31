import { TEXTURE_DRINK_FULL, TEXTURE_FOOD } from './constants';

export const CREDITS_REGISTRY_KEY = 'credits';

export type OrderItemId = 'FILLED_CUP' | 'FOOD_PLATE';

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
    readonly launchSpeedMin: number;
    readonly launchSpeedMax: number;
    readonly coinSpreadRadius: number;
    readonly drag: number;
}

export interface GameRegistry {
    readonly patience: PatienceConfig;
    readonly orders: OrderConfig;
    readonly economy: EconomyConfig;
    readonly clients: {
        readonly spawnIntervalMs: number;
        readonly maxWaiting: number;
        readonly moveSpeed: number;
        readonly satisfiedStayMs: number;
        readonly leaveFadeMs: number;
        readonly exitRetryMs: number;
        readonly exitBlockedColor: number;
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
        },
    },
    orders: {
        options: [
            { itemId: 'FILLED_CUP', probability: 0.65, iconTexture: TEXTURE_DRINK_FULL },
            { itemId: 'FOOD_PLATE', probability: 0.35, iconTexture: TEXTURE_FOOD },
        ],
    },
    economy: {
        startingCredits: 0,
        coinsPerSatisfiedClient: 3,
        valuePerCoin: 5,
        coinRadius: 8,
        coinColor: 0xf6c453,
        coinOutlineColor: 0x8c5b1a,
        coinOutlineWidth: 2,
        launchSpeedMin: 20,
        launchSpeedMax: 65,
        coinSpreadRadius: 14,
        drag: 80,
    },
    clients: {
        spawnIntervalMs: 8_000,
        maxWaiting: 4,
        moveSpeed: 72,
        satisfiedStayMs: 2_000,
        leaveFadeMs: 350,
        exitRetryMs: 1_000,
        exitBlockedColor: 0xff2020,
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
