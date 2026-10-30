import { GameObjects, Physics, Scene } from 'phaser';
import {
    GAME_REGISTRY,
    samplePatienceDuration,
    type GameRegistry,
    type OrderOption,
} from '../data/GameRegistry';
import { TILE } from '../data/constants';
import { CoinDrop } from './CoinDrop';
import type { InteractableObjectType } from './InteractableObject';

export type ClientState =
    | 'WAITING_IN_LINE'
    | 'MOVING_TO_CHAIR'
    | 'SEATED_WAITING_ORDER'
    | 'SATISFIED'
    | 'LEAVING';

export interface ClientPosition { readonly tileX: number; readonly tileY: number; }

export class Client extends GameObjects.Container {
    private readonly registry: GameRegistry;
    private readonly indicator: GameObjects.Arc;
    private readonly bodyGraphic: GameObjects.Rectangle;
    private patienceRemainingMs: number;
    private patienceTotalMs: number;
    private currentState: ClientState = 'WAITING_IN_LINE';
    private route: readonly ClientPosition[] = [];
    private routeIndex = 0;
    private activeOrder: OrderOption | null = null;
    private orderBubble: GameObjects.Container | null = null;
    private orderProgress: GameObjects.Rectangle | null = null;
    private seatPosition: ClientPosition | null = null;

    public constructor(
        scene: Scene,
        position: ClientPosition,
        queuePatienceMs: number,
        private readonly coinsGroup: Physics.Arcade.Group,
        registry: GameRegistry = GAME_REGISTRY,
    ) {
        super(scene, position.tileX * TILE + TILE / 2, position.tileY * TILE + TILE / 2);
        this.registry = registry;
        this.patienceRemainingMs = queuePatienceMs;
        this.patienceTotalMs = queuePatienceMs;
        this.bodyGraphic = scene.add.rectangle(
            0,
            0,
            registry.clients.bodyWidth,
            registry.clients.bodyHeight,
            registry.clients.bodyColor,
        );
        this.indicator = scene.add.arc(
            0,
            registry.clients.queueIndicatorOffsetY,
            registry.clients.queueIndicatorRadius,
            0,
            360,
            false,
            registry.clients.patienceHealthyColor,
        );
        this.indicator.setStrokeStyle(
            registry.clients.queueIndicatorStrokeWidth,
            registry.clients.queueIndicatorOutlineColor,
        );
        this.add([this.bodyGraphic, this.indicator]);
        scene.add.existing(this);
        this.setDepth(this.y);
    }

    public get clientState(): ClientState { return this.currentState; }
    public get patienceRatio(): number {
        return this.patienceTotalMs <= 0 ? 0 : this.patienceRemainingMs / this.patienceTotalMs;
    }

    public get orderItemId(): OrderOption['itemId'] | null { return this.activeOrder?.itemId ?? null; }
    public get assignedSeat(): ClientPosition | null { return this.seatPosition; }

    public receiveOrder(itemId: InteractableObjectType): boolean {
        if (
            this.currentState !== 'SEATED_WAITING_ORDER'
            || this.activeOrder === null
            || this.activeOrder.itemId !== itemId
        ) {
            return false;
        }

        this.currentState = 'SATISFIED';
        this.orderBubble?.destroy();
        this.orderBubble = null;
        this.orderProgress = null;
        this.spawnCoinDrops();
        this.emit('satisfied', this);
        return true;
    }

    public setSelected(selected: boolean): void {
        this.bodyGraphic.setStrokeStyle(
            selected ? this.registry.clients.selectedOutlineWidth : 0,
            this.registry.clients.selectedOutlineColor,
        );
    }

    public update(deltaMs: number): void {
        if (this.currentState === 'WAITING_IN_LINE') {
            this.patienceRemainingMs = Math.max(0, this.patienceRemainingMs - deltaMs);
            this.refreshQueueIndicator();
            if (this.patienceRemainingMs === 0) {
                this.leave('patience-expired');
            }
        } else if (this.currentState === 'MOVING_TO_CHAIR') {
            this.advanceAlongRoute(deltaMs);
        } else if (this.currentState === 'SEATED_WAITING_ORDER') {
            this.patienceRemainingMs = Math.max(0, this.patienceRemainingMs - deltaMs);
            this.refreshOrderBubble();
            if (this.patienceRemainingMs === 0) {
                this.leave('service-expired');
            }
        }
    }

    public assignRoute(route: readonly ClientPosition[]): boolean {
        if (this.currentState !== 'WAITING_IN_LINE' || route.length === 0) return false;
        this.currentState = 'MOVING_TO_CHAIR';
        this.route = route;
        this.seatPosition = route[route.length - 1] ?? null;
        this.routeIndex = 0;
        return true;
    }

    private advanceAlongRoute(deltaMs: number): void {
        const target = this.route[this.routeIndex];
        if (target === undefined) {
            this.currentState = 'SEATED_WAITING_ORDER';
            this.indicator.setVisible(false);
            this.startOrderService();
            this.emit('seated', this);
            return;
        }
        const targetX = target.tileX * TILE + TILE / 2;
        const targetY = target.tileY * TILE + TILE / 2;
        const distance = this.registry.clients.moveSpeed * deltaMs / 1000;
        const deltaX = targetX - this.x;
        const deltaY = targetY - this.y;
        const length = Math.hypot(deltaX, deltaY);
        if (length <= distance) {
            this.setPosition(targetX, targetY);
            this.routeIndex++;
        } else {
            this.setPosition(this.x + deltaX / length * distance, this.y + deltaY / length * distance);
        }
        this.setDepth(this.y);
    }

    private refreshQueueIndicator(): void {
        const ratio = this.patienceRatio;
        const color = ratio <= this.registry.clients.patienceCriticalRatio
            ? this.registry.clients.patienceCriticalColor
            : ratio <= this.registry.clients.patienceWarningRatio
                ? this.registry.clients.patienceWarningColor
                : this.registry.clients.patienceHealthyColor;
        this.indicator.setFillStyle(color);
        this.indicator.setScale(Math.max(this.registry.clients.patienceCriticalRatio, ratio));
        this.indicator.setAlpha(
            ratio <= this.registry.clients.patienceCriticalRatio
                ? 0.5 + Math.abs(Math.sin(this.scene.time.now / this.registry.clients.queueIndicatorBlinkMs)) / 2
                : 1,
        );
    }

    private startOrderService(): void {
        const selectedOrder = this.chooseOrder();
        if (selectedOrder === null) {
            this.leave('service-expired');
            return;
        }

        this.activeOrder = selectedOrder;
        this.patienceTotalMs = samplePatienceDuration(this.registry.patience.service[selectedOrder.itemId]);
        this.patienceRemainingMs = this.patienceTotalMs;
        this.createOrderBubble(selectedOrder);
        this.refreshOrderBubble();
    }

    private chooseOrder(): OrderOption | null {
        const orderOptions = this.registry.orders.options;
        if (orderOptions.length === 0) return null;

        const roll = Math.random();
        let cumulativeProbability = 0;
        for (const option of orderOptions) {
            cumulativeProbability += option.probability;
            if (roll < cumulativeProbability) return option;
        }
        return orderOptions[orderOptions.length - 1] ?? null;
    }

    private createOrderBubble(order: OrderOption): void {
        const visual = this.registry.clients;
        const size = visual.orderBubbleSize;
        const bubble = this.scene.add.container(0, visual.orderBubbleOffsetY);
        const background = this.scene.add.rectangle(
            0,
            0,
            size,
            size,
            visual.orderBubbleBackgroundColor,
        );
        background.setStrokeStyle(visual.orderBubbleBorderWidth, visual.orderBubbleBorderColor);

        const progress = this.scene.add.rectangle(
            0,
            size / 2 - visual.orderBubbleBorderWidth,
            size - visual.orderBubbleBorderWidth * 2,
            size - visual.orderBubbleBorderWidth * 2,
            visual.orderBubbleHealthyColor,
            visual.orderBubbleProgressAlpha,
        );
        progress.setOrigin(0.5, 1);

        const icon = this.scene.add.image(0, 0, order.iconTexture);
        icon.setDisplaySize(visual.orderIconSize, visual.orderIconSize);

        const frame = this.scene.add.rectangle(0, 0, size, size);
        frame.setFillStyle(visual.orderBubbleBackgroundColor, 0);
        frame.setStrokeStyle(visual.orderBubbleBorderWidth, visual.orderBubbleBorderColor);
        bubble.add([background, progress, icon, frame]);
        this.add(bubble);
        this.orderBubble = bubble;
        this.orderProgress = progress;
    }

    private refreshOrderBubble(): void {
        const progress = this.orderProgress;
        if (progress === null) return;

        const ratio = Math.max(0, Math.min(1, this.patienceRatio));
        const visual = this.registry.clients;
        const color = ratio <= visual.orderBubbleCriticalRatio
            ? visual.orderBubbleCriticalColor
            : ratio <= visual.orderBubbleWarningRatio
                ? visual.orderBubbleWarningColor
                : visual.orderBubbleHealthyColor;
        progress.setFillStyle(color, visual.orderBubbleProgressAlpha);
        progress.setScale(1, ratio);
    }

    private leave(reason: 'patience-expired' | 'service-expired'): void {
        this.currentState = 'LEAVING';
        this.orderBubble?.destroy();
        this.orderBubble = null;
        this.orderProgress = null;
        this.emit(reason, this);
    }

    private spawnCoinDrops(): void {
        const economy = this.registry.economy;
        for (let coinIndex = 0; coinIndex < economy.coinsPerSatisfiedClient; coinIndex++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = economy.launchSpeedMin
                + Math.random() * (economy.launchSpeedMax - economy.launchSpeedMin);
            const spawnX = this.x + Math.cos(angle) * economy.coinSpreadRadius;
            const spawnY = this.y + Math.sin(angle) * economy.coinSpreadRadius;
            const coin = new CoinDrop(
                this.scene,
                spawnX,
                spawnY,
                economy.valuePerCoin,
                { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
                economy,
            );
            this.coinsGroup.add(coin);
        }
    }
}
