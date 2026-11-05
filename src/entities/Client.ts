import { GameObjects, Physics, Scene, Tweens } from 'phaser';
import {
    AFFINITY_PENALTY_MULTIPLIER,
    chooseClientRace,
    CLIENT_RACE_PRESENTATION,
    GAME_REGISTRY,
    samplePatienceDuration,
    type ClientRace,
    type GameRegistry,
    type OrderOption,
    type OrderItemId,
    type WantedProfile,
} from '../data/GameRegistry';
import { TILE } from '../data/constants';
import type { InteractableObjectType } from './InteractableObject';
import type { GridManager } from '../managers/GridManager';
import type { SeatingManager } from '../managers/SeatingManager';
import type { PathfindingManager } from '../managers/PathfindingManager';
import type { CoinManager } from '../managers/CoinManager';
import {
    eventBus,
    EVENT_FIGHT_REQUESTED,
    EVENT_CLIENT_ORDER_STARTED,
    EVENT_CLIENT_SEAT_VACATED,
    type ClientSeatVacatedData,
    EVENT_FIGHT_APPROACH_COMPLETE,
    EVENT_FIGHT_APPROACH_FAILED,
    type FightApproachData,
    type FightRequestedData,
} from '../utils/EventBus';

export type ClientState =
    | 'WAITING_IN_LINE'
    | 'QUEUE_LEAVING'
    | 'MOVING_TO_CHAIR'
    | 'SEATED_WAITING_ORDER'
    | 'SATISFIED'
    | 'APPROACHING_FIGHT'
    | 'FIGHT_TARGET'
    | 'FIGHTING'
    | 'DEAD'
    | 'FLEEING'
    | 'LEAVING'
    | 'EXIT_BLOCKED';

export interface ClientPosition { readonly tileX: number; readonly tileY: number; }

export class Client extends GameObjects.Container {
    private readonly registry: GameRegistry;
    private readonly indicator: GameObjects.Arc;
    private readonly bodyGraphic: GameObjects.Rectangle;
    private readonly affinityWarning: GameObjects.Text;
    private readonly fightBubble: GameObjects.Container;
    private fightSmokeCloud: GameObjects.Container | null = null;
    private fightSmokeTween: Tweens.Tween | null = null;
    private patienceRemainingMs: number;
    private patienceTotalMs: number;
    private currentState: ClientState = 'WAITING_IN_LINE';
    private route: readonly ClientPosition[] = [];
    private routeIndex = 0;
    private activeOrder: OrderOption | null = null;
    private spawnRewardAfterMusic = false;
    private orderBubble: GameObjects.Container | null = null;
    private orderProgress: GameObjects.Rectangle | null = null;
    private seatPosition: ClientPosition | null = null;
    private satisfiedRemainingMs = 0;
    private exitNotified = false;
    private exitRetryRemainingMs = 0;
    private exitFailureReported = false;
    private seatReleased = false;
    private seatWasOccupied = false;
    private affinityPenaltyActive = false;
    private fearPenaltyActive = false;
    private affinityOpponentIds: readonly number[] = [];
    private fightRequestSent = false;
    private fightApproachNotified = false;
    private fightApproachFailedNotified = false;
    private fightTargetClientId: number | null = null;
    private exitStateAfterPathFailure: 'LEAVING' | 'FLEEING' = 'LEAVING';
    private readonly patienceMultiplier: number;
    private readonly allowedOrderItems: readonly OrderItemId[] | null;
    public readonly race: ClientRace;
    public readonly isWanted: boolean;

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
        private readonly isBandPlaying: () => boolean = () => false,
        wantedProfile: WantedProfile | null = null,
        patienceMultiplier = 1,
        forcedRace: ClientRace | null = null,
        allowedOrderItems: readonly OrderItemId[] | null = null,
    ) {
        super(scene, position.tileX * TILE + TILE / 2, position.tileY * TILE + TILE / 2);
        this.setExclusive(true);
        this.registry = registry;
        this.race = wantedProfile?.race ?? forcedRace ?? chooseClientRace();
        this.patienceMultiplier = patienceMultiplier;
        this.allowedOrderItems = allowedOrderItems;
        this.isWanted = wantedProfile !== null;
        this.patienceRemainingMs = queuePatienceMs;
        this.patienceTotalMs = queuePatienceMs;
        this.bodyGraphic = scene.add.rectangle(
            0,
            0,
            registry.clients.bodyWidth,
            registry.clients.bodyHeight,
            CLIENT_RACE_PRESENTATION[this.race].placeholderColor,
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
        this.affinityWarning = scene.add.text(
            0,
            registry.clients.affinityWarningOffsetY,
            '!!',
            {
                fontFamily: 'monospace',
                fontSize: `${registry.clients.affinityWarningFontSize}px`,
                color: `#${registry.clients.affinityWarningColor.toString(16).padStart(6, '0')}`,
                fontStyle: 'bold',
                stroke: '#3b1010',
                strokeThickness: registry.clients.affinityWarningStrokeWidth,
            },
        ).setOrigin(0.5).setVisible(false);
        const fightBackground = scene.add.rectangle(
            0,
            0,
            registry.combat.fightBubbleWidth,
            registry.combat.fightBubbleHeight,
            registry.combat.fightBubbleColor,
        );
        fightBackground.setStrokeStyle(
            registry.combat.fightBubbleBorderWidth,
            registry.combat.fightBubbleBorderColor,
            1,
        );
        const fightLabel = scene.add.text(0, 0, 'FIGHT!', {
            fontFamily: 'monospace',
            fontSize: `${registry.combat.fightBubbleFontSize}px`,
            color: `#${registry.combat.fightBubbleTextColor.toString(16).padStart(6, '0')}`,
            fontStyle: 'bold',
        }).setOrigin(0.5);
        this.fightBubble = scene.add.container(0, registry.combat.fightBubbleOffsetY, [
            fightBackground,
            fightLabel,
        ]).setVisible(false);
        this.add([this.bodyGraphic, this.indicator, this.affinityWarning, this.fightBubble]);
        if (wantedProfile !== null) {
            this.add(scene.add.text(
                0,
                -registry.clients.bodyHeight / 2 - 8,
                'WANTED',
                {
                    fontFamily: 'monospace',
                    fontSize: '8px',
                    color: '#f1c75b',
                    fontStyle: 'bold',
                },
            ).setOrigin(0.5));
        }
        scene.add.existing(this);
        scene.physics.add.existing(this);
        const body = this.body;
        if (!(body instanceof Physics.Arcade.Body)) {
            throw new Error('No se pudo crear el cuerpo físico del cliente.');
        }
        body
            .setSize(registry.clients.collisionBodyWidth, registry.clients.collisionBodyHeight)
            .setOffset(
                -registry.clients.collisionBodyWidth / 2,
                -registry.clients.collisionBodyHeight / 2,
            )
            .setAllowGravity(false)
            .setImmovable(true);
        // Pathfinding owns client movement; Arcade Physics only blocks Wuher from overlapping them.
        body.pushable = false;
        body.moves = false;
        this.setDepth(this.y);
        this.once(GameObjects.Events.DESTROY, this.cleanupFightSmoke, this);
    }

    public get clientState(): ClientState { return this.currentState; }
    public get patienceRatio(): number {
        return this.patienceTotalMs <= 0 ? 0 : this.patienceRemainingMs / this.patienceTotalMs;
    }

    public get orderItemId(): OrderOption['itemId'] | null { return this.activeOrder?.itemId ?? null; }
    public get assignedSeat(): ClientPosition | null { return this.seatPosition; }

    public applyAffinityPenalty(opponentClientIds: readonly number[]): void {
        this.affinityPenaltyActive = true;
        this.affinityOpponentIds = opponentClientIds;
        this.affinityWarning.setVisible(true);
    }

    public removeAffinityPenalty(): void {
        this.affinityPenaltyActive = false;
        this.affinityOpponentIds = [];
        this.affinityWarning.setVisible(false);
    }

    public setFearPenalty(active: boolean): void {
        this.fearPenaltyActive = active;
    }

    public get affinityOpponentId(): number | null {
        return this.affinityOpponentIds[0] ?? null;
    }

    public receiveOrder(itemId: InteractableObjectType): boolean {
        if (
            this.currentState !== 'SEATED_WAITING_ORDER'
            || this.activeOrder === null
            || this.activeOrder.itemId !== itemId
        ) {
            return false;
        }

        this.currentState = 'SATISFIED';
        this.spawnRewardAfterMusic = false;
        this.orderBubble?.destroy();
        this.orderBubble = null;
        this.orderProgress = null;
        this.spawnCoinDrops();
        this.satisfiedRemainingMs = this.registry.clients.satisfiedStayMs;
        this.emit('satisfied', this);
        return true;
    }

    /** Satisfies a seated music order and delays its reward until the performance ends. */
    public satisfyMusicOrder(durationMs: number): boolean {
        if (this.currentState !== 'SEATED_WAITING_ORDER' || this.activeOrder?.itemId !== 'MUSIC') {
            return false;
        }

        this.currentState = 'SATISFIED';
        this.spawnRewardAfterMusic = true;
        this.orderBubble?.destroy();
        this.orderBubble = null;
        this.orderProgress = null;
        this.satisfiedRemainingMs = durationMs;
        this.emit('satisfied', this);
        return true;
    }

    public prepareAsFightTarget(aggressorClientId: number): boolean {
        if (this.currentState !== 'SEATED_WAITING_ORDER') return false;
        this.currentState = 'FIGHT_TARGET';
        this.fightTargetClientId = aggressorClientId;
        this.indicator.setVisible(true).setFillStyle(this.registry.combat.fightBubbleBorderColor);
        return true;
    }

    public approachFightTarget(targetClientId: number, route: readonly ClientPosition[]): boolean {
        if (this.currentState !== 'SEATED_WAITING_ORDER') return false;
        this.currentState = 'APPROACHING_FIGHT';
        this.fightTargetClientId = targetClientId;
        this.fightApproachNotified = false;
        this.fightApproachFailedNotified = false;
        this.clearOrderBubble();
        this.indicator.setVisible(false);
        this.route = route;
        this.routeIndex = 0;
        return true;
    }

    public cancelFightTarget(): void {
        if (this.currentState !== 'FIGHT_TARGET') return;
        this.currentState = 'SEATED_WAITING_ORDER';
        this.fightTargetClientId = null;
        this.indicator.setVisible(false);
    }

    public startFight(): boolean {
        if (this.currentState !== 'APPROACHING_FIGHT' && this.currentState !== 'FIGHT_TARGET') return false;
        this.currentState = 'FIGHTING';
        this.clearOrderBubble();
        this.indicator.setVisible(false);
        this.affinityWarning.setVisible(false);
        this.fightBubble.setVisible(true);
        this.createFightSmoke();
        return true;
    }

    public leaveWithoutPayment(): void {
        if (this.currentState === 'SEATED_WAITING_ORDER' || this.currentState === 'APPROACHING_FIGHT') {
            this.leaveService();
        }
    }

    /** Forces an immediate unpaid exit for external emergencies such as a raid. */
    public fleeImmediately(): void {
        if (this.currentState === 'DEAD' || this.currentState === 'FLEEING' || this.currentState === 'LEAVING') {
            return;
        }
        this.clearFightVisuals();
        this.activeOrder = null;
        this.exitStateAfterPathFailure = 'FLEEING';
        this.currentState = 'FLEEING';
        this.indicator.setVisible(false);
        this.emit('leaving', this);
        this.tryStartExitRoute();
    }

    public fleeToPosition(
        destination: ClientPosition,
        notifyLeaving = true,
        predefinedRoute: readonly ClientPosition[] | null = null,
    ): boolean {
        if (this.currentState === 'DEAD' || this.currentState === 'FLEEING') return false;
        this.clearFightVisuals();
        this.activeOrder = null;
        this.exitStateAfterPathFailure = 'FLEEING';
        this.currentState = 'FLEEING';
        this.indicator.setVisible(false);
        if (notifyLeaving) this.emit('leaving', this);
        const route = predefinedRoute ?? this.pathfinding.findPath(this.currentTile, destination);
        if (route === null) {
            this.enterExitBlocked(this.currentTile, destination, 'NO_PATH');
            return false;
        }
        this.route = route;
        this.routeIndex = 0;
        if (route.length === 0) this.notifyExitComplete();
        return true;
    }

    public arrest(): boolean {
        if (this.currentState === 'DEAD') return false;
        this.clearFightVisuals();
        this.activeOrder = null;
        this.currentState = 'FLEEING';
        this.releaseSeatIfVacated();
        this.currentState = 'DEAD';
        this.setVisible(false);
        const body = this.body;
        if (body instanceof Physics.Arcade.Body) body.enable = false;
        return true;
    }

    public leaveAfterFight(): boolean {
        if (this.currentState !== 'FIGHTING') return false;
        this.clearFightVisuals();
        this.activeOrder = null;
        this.exitStateAfterPathFailure = 'LEAVING';
        this.currentState = 'LEAVING';
        this.emit('leaving', this);
        this.tryStartExitRoute();
        return true;
    }

    public dieInFight(): boolean {
        if (this.currentState !== 'FIGHTING') return false;
        this.clearFightVisuals();
        this.activeOrder = null;
        this.currentState = 'DEAD';
        this.removeAffinityPenalty();
        this.setVisible(false);
        const body = this.body;
        if (body instanceof Physics.Arcade.Body) body.enable = false;
        return true;
    }

    public fleeAfterFight(): boolean {
        if (this.currentState !== 'FIGHTING') return false;
        this.clearFightVisuals();
        this.activeOrder = null;
        this.exitStateAfterPathFailure = 'FLEEING';
        this.currentState = 'FLEEING';
        this.emit('leaving', this);
        this.tryStartExitRoute();
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
                this.abandonQueue();
            }
        } else if (this.currentState === 'MOVING_TO_CHAIR') {
            this.advanceAlongRoute(deltaMs, blockedPositions);
        } else if (this.currentState === 'SEATED_WAITING_ORDER') {
            this.patienceRemainingMs = Math.max(
                0,
                this.patienceRemainingMs - deltaMs * this.getPatienceMultiplier(),
            );
            this.refreshOrderBubble();
            if (this.patienceRemainingMs === 0) {
                this.handleServicePatienceExpired();
            }
        } else if (this.currentState === 'SATISFIED') {
            this.satisfiedRemainingMs = Math.max(0, this.satisfiedRemainingMs - deltaMs);
            if (this.satisfiedRemainingMs === 0) {
                if (this.spawnRewardAfterMusic) {
                    this.spawnRewardAfterMusic = false;
                    this.spawnCoinDrops();
                }
                this.leaveService();
            }
        } else if (this.currentState === 'APPROACHING_FIGHT') {
            this.advanceAlongRoute(deltaMs, blockedPositions);
        } else if (this.currentState === 'LEAVING') {
            this.advanceAlongRoute(deltaMs, blockedPositions);
        } else if (this.currentState === 'FLEEING') {
            this.advanceAlongRoute(deltaMs, blockedPositions);
        } else if (this.currentState === 'FIGHTING') {
            this.refreshFightBubble();
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
            if (route === null) {
                if (this.currentState === 'APPROACHING_FIGHT') this.notifyFightApproachFailed();
                return;
            }
            this.route = route;
            this.routeIndex = 0;
            target = this.route[this.routeIndex];
        }
        if (target === undefined) {
            if (this.currentState === 'APPROACHING_FIGHT') {
                this.notifyFightApproachComplete();
            } else if (this.currentState === 'LEAVING' || this.currentState === 'FLEEING') {
                this.notifyExitComplete();
            } else {
                this.currentState = 'SEATED_WAITING_ORDER';
                this.seatWasOccupied = true;
                this.indicator.setVisible(false);
                this.emit('seated', this);
                this.startOrderService();
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
            this.leaveService();
            return;
        }

        this.activeOrder = selectedOrder;
        this.patienceTotalMs = Math.round(
            samplePatienceDuration(this.registry.patience.service[selectedOrder.itemId])
                * this.patienceMultiplier,
        );
        this.patienceRemainingMs = this.patienceTotalMs;
        this.createOrderBubble(selectedOrder);
        this.refreshOrderBubble();
        eventBus.emit(EVENT_CLIENT_ORDER_STARTED, {
            clientId: this.clientId,
            orderItemId: selectedOrder.itemId,
        });
    }

    private chooseOrder(): OrderOption | null {
        const orderOptions = this.registry.orders.options.filter((option) => (
            option.itemId !== 'MUSIC' || !this.isBandPlaying()
        ) && (
            this.allowedOrderItems === null
            || this.allowedOrderItems.includes(option.itemId)
        ));
        if (orderOptions.length === 0) return null;

        const totalProbability = orderOptions.reduce(
            (total, option) => total + option.probability,
            0,
        );
        if (totalProbability <= 0) return null;

        const roll = Math.random() * totalProbability;
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

        const icon = order.iconText === undefined
            ? this.scene.add.image(0, 0, order.iconTexture).setDisplaySize(
                visual.orderIconSize,
                visual.orderIconSize,
            )
            : this.scene.add.text(0, 0, order.iconText, {
                fontFamily: 'monospace',
                fontSize: `${visual.orderIconSize}px`,
                color: `#${visual.orderBubbleBorderColor.toString(16).padStart(6, '0')}`,
                fontStyle: 'bold',
            }).setOrigin(0.5);

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

    private handleServicePatienceExpired(): void {
        const opponentClientId = this.affinityOpponentId;
        if (this.affinityPenaltyActive && opponentClientId !== null && !this.fightRequestSent) {
            this.fightRequestSent = true;
            const data: FightRequestedData = { clientId: this.clientId, opponentClientId };
            eventBus.emit(EVENT_FIGHT_REQUESTED, data);
            return;
        }
        this.leaveService();
    }

    private getPatienceMultiplier(): number {
        const affinityMultiplier = this.affinityPenaltyActive ? AFFINITY_PENALTY_MULTIPLIER : 1;
        const fearMultiplier = this.fearPenaltyActive ? this.registry.aftermath.fearPatienceMultiplier : 1;
        return affinityMultiplier * fearMultiplier;
    }

    private refreshFightBubble(): void {
        const combat = this.registry.combat;
        const horizontalShake = Math.sin(this.scene.time.now / combat.fightShakePeriodMs)
            * combat.fightShakeAmplitude;
        this.fightBubble.setPosition(horizontalShake, combat.fightBubbleOffsetY);
    }

    private clearFightVisuals(): void {
        this.cleanupFightSmoke();
        this.fightBubble.setVisible(false);
        this.fightBubble.setPosition(0, this.registry.combat.fightBubbleOffsetY);
        this.affinityWarning.setVisible(false);
    }

    private cleanupFightSmoke(): void {
        this.fightSmokeTween?.stop();
        this.fightSmokeTween = null;
        if (this.fightSmokeCloud !== null) {
            this.fightSmokeCloud.removeAll(true);
            this.fightSmokeCloud.destroy();
            this.fightSmokeCloud = null;
        }
    }

    private createFightSmoke(): void {
        const combat = this.registry.combat;
        const smoke = this.scene.add.container(0, 0);
        const puffs = combat.smokePuffs.map((puff) => this.scene.add.circle(
            puff.x,
            puff.y,
            puff.radius,
            combat.smokeColor,
            combat.smokeAlpha,
        ));
        smoke.add(puffs);
        this.addAt(smoke, 1);
        this.fightSmokeCloud = smoke;
        this.fightSmokeTween = this.scene.tweens.add({
            targets: smoke,
            scaleX: combat.smokeScaleMax,
            scaleY: combat.smokeScaleMin,
            angle: combat.smokeRotationDegrees,
            duration: combat.smokeAnimationDurationMs,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut',
        });
    }

    private clearOrderBubble(): void {
        this.orderBubble?.destroy();
        this.orderBubble = null;
        this.orderProgress = null;
        this.activeOrder = null;
    }

    private notifyFightApproachComplete(): void {
        if (this.fightApproachNotified || this.fightTargetClientId === null) return;
        this.fightApproachNotified = true;
        const data: FightApproachData = {
            clientId: this.clientId,
            opponentClientId: this.fightTargetClientId,
        };
        eventBus.emit(EVENT_FIGHT_APPROACH_COMPLETE, data);
    }

    private notifyFightApproachFailed(): void {
        if (this.fightApproachFailedNotified || this.fightTargetClientId === null) return;
        this.fightApproachFailedNotified = true;
        const data: FightApproachData = {
            clientId: this.clientId,
            opponentClientId: this.fightTargetClientId,
        };
        eventBus.emit(EVENT_FIGHT_APPROACH_FAILED, data);
    }

    private abandonQueue(): void {
        this.currentState = 'QUEUE_LEAVING';
        this.indicator.setVisible(false);
        this.emit('queue-abandoned', this);
    }

    private leaveService(): void {
        this.clearFightVisuals();
        this.activeOrder = null;
        this.exitStateAfterPathFailure = 'LEAVING';
        this.currentState = 'LEAVING';
        this.emit('leaving', this);
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
        this.currentState = this.exitStateAfterPathFailure;
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
            (this.currentState !== 'LEAVING'
                && this.currentState !== 'FLEEING'
                && this.currentState !== 'APPROACHING_FIGHT')
            || !this.seatWasOccupied
            || this.seatReleased
            || this.seatPosition === null
        ) return;
        const current = this.currentTile;
        if (current.tileX === this.seatPosition.tileX && current.tileY === this.seatPosition.tileY) return;
        this.seating.release(this.clientId, this.seatPosition.tileX, this.seatPosition.tileY);
        this.seatReleased = true;
        const data: ClientSeatVacatedData = {
            clientId: this.clientId,
            tileX: this.seatPosition.tileX,
            tileY: this.seatPosition.tileY,
        };
        eventBus.emit(EVENT_CLIENT_SEAT_VACATED, data);
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
        this.coinManager.spawnSatisfiedClientReward(this.x, this.y, this.clientId);
    }
}
