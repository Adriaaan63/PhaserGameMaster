import { GameObjects, Scene } from 'phaser';
import {
    GAME_REGISTRY,
    samplePatienceDuration,
    type GameRegistry,
    type OrderOption,
} from '../data/GameRegistry';
import { TILE } from '../data/constants';
import type { InteractableObjectType } from './InteractableObject';
import type { GridManager } from '../managers/GridManager';
import type { SeatingManager } from '../managers/SeatingManager';
import type { PathfindingManager } from '../managers/PathfindingManager';
import type { CoinManager } from '../managers/CoinManager';

export type ClientState =
    | 'WAITING_IN_LINE'
    | 'MOVING_TO_CHAIR'
    | 'SEATED_WAITING_ORDER'
    | 'SATISFIED'
    | 'LEAVING'
    | 'EXIT_BLOCKED';

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
    private satisfiedRemainingMs = 0;
    private exitNotified = false;
    private exitRetryRemainingMs = 0;
    private exitFailureReported = false;
    private seatReleased = false;
    private seatWasOccupied = false;

    public constructor(
        scene: Scene,
        public readonly clientId: number,
        position: ClientPosition,
        queuePatienceMs: number,
        private readonly coinManager: CoinManager,
        private readonly grid: GridManager,
        private readonly seating: SeatingManager,
        private readonly pathfinding: PathfindingManager,
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
        this.satisfiedRemainingMs = this.registry.clients.satisfiedStayMs;
        this.emit('satisfied', this);
        return true;
    }

    public setSelected(selected: boolean): void {
        this.bodyGraphic.setStrokeStyle(
            selected ? this.registry.clients.selectedOutlineWidth : 0,
            this.registry.clients.selectedOutlineColor,
        );
    }

    public get currentTile(): ClientPosition {
        return { tileX: Math.floor(this.x / TILE), tileY: Math.floor(this.y / TILE) };
    }

    public get nextRoutePosition(): ClientPosition | null {
        return this.route[this.routeIndex] ?? null;
    }

    public update(deltaMs: number, blockedPositions: readonly ClientPosition[] = []): void {
        if (this.currentState === 'WAITING_IN_LINE') {
            this.patienceRemainingMs = Math.max(0, this.patienceRemainingMs - deltaMs);
            this.refreshQueueIndicator();
            if (this.patienceRemainingMs === 0) {
                this.leave('patience-expired');
            }
        } else if (this.currentState === 'MOVING_TO_CHAIR') {
            this.advanceAlongRoute(deltaMs, blockedPositions);
        } else if (this.currentState === 'SEATED_WAITING_ORDER') {
            this.patienceRemainingMs = Math.max(0, this.patienceRemainingMs - deltaMs);
            this.refreshOrderBubble();
            if (this.patienceRemainingMs === 0) {
                this.leave('service-expired');
            }
        } else if (this.currentState === 'SATISFIED') {
            this.satisfiedRemainingMs = Math.max(0, this.satisfiedRemainingMs - deltaMs);
            if (this.satisfiedRemainingMs === 0) this.leave('service-expired');
        } else if (this.currentState === 'LEAVING') {
            this.advanceAlongRoute(deltaMs, blockedPositions);
        } else if (this.currentState === 'EXIT_BLOCKED') {
            this.exitRetryRemainingMs = Math.max(0, this.exitRetryRemainingMs - deltaMs);
            if (this.exitRetryRemainingMs === 0) this.tryStartExitRoute(blockedPositions);
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

    private advanceAlongRoute(deltaMs: number, blockedPositions: readonly ClientPosition[]): void {
        let target = this.route[this.routeIndex];
        if (target !== undefined && this.isBlocked(target, blockedPositions)) {
            const destination = this.route[this.route.length - 1];
            if (destination === undefined) return;
            const route = this.pathfinding.findPath(this.currentTile, destination, blockedPositions);
            if (route === null) return;
            this.route = route;
            this.routeIndex = 0;
            target = this.route[this.routeIndex];
        }
        if (target === undefined) {
            if (this.currentState === 'LEAVING') {
                this.notifyExitComplete();
            } else {
                this.currentState = 'SEATED_WAITING_ORDER';
                this.seatWasOccupied = true;
                this.indicator.setVisible(false);
                this.startOrderService();
                this.emit('seated', this);
            }
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
        this.releaseSeatIfVacated();
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

    private leave(_reason: 'patience-expired' | 'service-expired'): void {
        this.currentState = 'LEAVING';
        this.orderBubble?.destroy();
        this.orderBubble = null;
        this.orderProgress = null;
        this.tryStartExitRoute();
    }

    private tryStartExitRoute(blockedPositions: readonly ClientPosition[] = []): void {
        const exit = this.grid.getExitPosition();
        const start = this.currentTile;
        if (exit === null) {
            this.enterExitBlocked(start, null, 'EXIT_NOT_CONFIGURED');
            return;
        }
        const route = this.pathfinding.findPath(start, exit, blockedPositions);
        if (route === null) {
            this.enterExitBlocked(start, exit, 'NO_PATH');
            return;
        }
        this.currentState = 'LEAVING';
        this.indicator.setVisible(false);
        this.exitFailureReported = false;
        this.route = route;
        this.routeIndex = 0;
        if (route.length === 0) this.notifyExitComplete();
    }

    private enterExitBlocked(
        start: ClientPosition,
        exit: ClientPosition | null,
        reason: 'EXIT_NOT_CONFIGURED' | 'NO_PATH',
    ): void {
        this.currentState = 'EXIT_BLOCKED';
        this.route = [];
        this.routeIndex = 0;
        this.exitRetryRemainingMs = this.registry.clients.exitRetryMs;
        this.bodyGraphic.setFillStyle(this.registry.clients.exitBlockedColor);
        this.indicator.setVisible(true).setFillStyle(this.registry.clients.exitBlockedColor);
        if (this.exitFailureReported) return;
        this.exitFailureReported = true;
        this.emit('exit-path-failed', { clientId: this.clientId, start, exit, reason });
    }

    private releaseSeatIfVacated(): void {
        if (
            this.currentState !== 'LEAVING'
            || !this.seatWasOccupied
            || this.seatReleased
            || this.seatPosition === null
        ) return;
        const current = this.currentTile;
        if (current.tileX === this.seatPosition.tileX && current.tileY === this.seatPosition.tileY) return;
        this.seating.release(this.clientId, this.seatPosition.tileX, this.seatPosition.tileY);
        this.seatReleased = true;
    }

    private isBlocked(position: ClientPosition, blockedPositions: readonly ClientPosition[]): boolean {
        return blockedPositions.some((blocked) =>
            blocked.tileX === position.tileX && blocked.tileY === position.tileY,
        );
    }

    private notifyExitComplete(): void {
        if (this.exitNotified) return;
        this.exitNotified = true;
        this.emit('exited', this);
    }

    private spawnCoinDrops(): void {
        this.coinManager.spawnSatisfiedClientReward(this.x, this.y);
    }
}
