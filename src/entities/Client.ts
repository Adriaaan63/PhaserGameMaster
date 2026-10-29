import { GameObjects, Scene } from 'phaser';
import { CLIENT_BODY_COLOR, TILE } from '../data/constants';

export type ClientState = 'WAITING_IN_LINE' | 'MOVING_TO_CHAIR' | 'SEATED' | 'LEAVING';

export interface ClientPosition { readonly tileX: number; readonly tileY: number; }

export interface ClientConfig {
    readonly patienceMs: number;
    readonly warningRatio: number;
    readonly criticalRatio: number;
    readonly healthyColor: number;
    readonly warningColor: number;
    readonly criticalColor: number;
    readonly moveSpeed: number;
}

export class Client extends GameObjects.Container {
    private readonly config: ClientConfig;
    private readonly indicator: GameObjects.Arc;
    private readonly bodyGraphic: GameObjects.Rectangle;
    private patienceRemainingMs: number;
    private currentState: ClientState = 'WAITING_IN_LINE';
    private route: readonly ClientPosition[] = [];
    private routeIndex = 0;

    public constructor(scene: Scene, position: ClientPosition, config: ClientConfig) {
        super(scene, position.tileX * TILE + TILE / 2, position.tileY * TILE + TILE / 2);
        this.config = config;
        this.patienceRemainingMs = config.patienceMs;
        this.bodyGraphic = scene.add.rectangle(0, 0, 22, 30, CLIENT_BODY_COLOR);
        this.indicator = scene.add.arc(0, -24, 7, 0, 360, false, config.healthyColor);
        this.indicator.setStrokeStyle(2, 0xffffff);
        this.add([this.bodyGraphic, this.indicator]);
        scene.add.existing(this);
        this.setDepth(this.y);
    }

    public get clientState(): ClientState { return this.currentState; }
    public get patienceRatio(): number { return this.patienceRemainingMs / this.config.patienceMs; }

    public setSelected(selected: boolean): void {
        this.bodyGraphic.setStrokeStyle(selected ? 3 : 0, 0xffff88);
    }

    public update(deltaMs: number): void {
        if (this.currentState === 'WAITING_IN_LINE') {
            this.patienceRemainingMs = Math.max(0, this.patienceRemainingMs - deltaMs);
            this.refreshIndicator();
            if (this.patienceRemainingMs === 0) {
                this.currentState = 'LEAVING';
                this.emit('patience-expired', this);
            }
        } else if (this.currentState === 'MOVING_TO_CHAIR') {
            this.advanceAlongRoute(deltaMs);
        }
    }

    public assignRoute(route: readonly ClientPosition[]): boolean {
        if (this.currentState !== 'WAITING_IN_LINE' || route.length === 0) return false;
        this.currentState = 'MOVING_TO_CHAIR';
        this.route = route;
        this.routeIndex = 0;
        return true;
    }

    private advanceAlongRoute(deltaMs: number): void {
        const target = this.route[this.routeIndex];
        if (target === undefined) {
            this.currentState = 'SEATED';
            this.indicator.setVisible(false);
            this.emit('seated', this);
            return;
        }
        const targetX = target.tileX * TILE + TILE / 2;
        const targetY = target.tileY * TILE + TILE / 2;
        const distance = this.config.moveSpeed * deltaMs / 1000;
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

    private refreshIndicator(): void {
        const ratio = this.patienceRatio;
        const color = ratio <= this.config.criticalRatio ? this.config.criticalColor
            : ratio <= this.config.warningRatio ? this.config.warningColor : this.config.healthyColor;
        this.indicator.setFillStyle(color);
        this.indicator.setScale(Math.max(0.2, ratio));
        this.indicator.setAlpha(ratio <= this.config.criticalRatio ? 0.5 + Math.abs(Math.sin(this.scene.time.now / 120)) / 2 : 1);
    }
}
