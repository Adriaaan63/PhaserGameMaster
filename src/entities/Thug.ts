import { GameObjects, Scene } from 'phaser';

import { TILE } from '../data/constants';
import type { ClientPosition } from './Client';

export type ThugState = 'FORMING' | 'ATTACKING' | 'EXPLODING' | 'RETURNING' | 'DONE';

/** Lightweight raid NPC that follows routes assigned by JabbaRaidManager. */
export class Thug extends GameObjects.Container {
    private route: readonly ClientPosition[] = [];
    private routeIndex = 0;
    private thugState: ThugState = 'FORMING';
    private targetKey: string | null = null;
    private explosionComplete = false;

    public constructor(
        scene: Scene,
        x: number,
        y: number,
        private readonly speed: number,
        width: number,
        height: number,
        color: number,
    ) {
        super(scene, x, y);
        this.setExclusive(true);
        this.add(scene.add.rectangle(0, 0, width, height, color).setStrokeStyle(2, 0x120b0b));
        scene.add.existing(this);
        this.setDepth(y + height);
    }

    public get currentState(): ThugState {
        return this.thugState;
    }

    public get currentTile(): ClientPosition {
        return {
            tileX: Math.floor(this.x / TILE),
            tileY: Math.floor(this.y / TILE),
        };
    }

    public get assignedTargetKey(): string | null {
        return this.targetKey;
    }

    public setFormationState(): void {
        this.thugState = 'FORMING';
        this.route = [];
        this.routeIndex = 0;
    }

    public assignTarget(route: readonly ClientPosition[], targetKey: string): void {
        this.thugState = 'ATTACKING';
        this.route = route;
        this.routeIndex = 0;
        this.targetKey = targetKey;
    }

    public startExplosion(): void {
        this.thugState = 'EXPLODING';
        this.route = [];
        this.routeIndex = 0;
        this.explosionComplete = false;
    }

    public completeExplosion(): void {
        this.explosionComplete = true;
    }

    public get isExplosionComplete(): boolean {
        return this.explosionComplete;
    }

    public assignReturnRoute(route: readonly ClientPosition[]): void {
        this.thugState = 'RETURNING';
        this.route = route;
        this.routeIndex = 0;
    }

    public update(deltaMs: number): void {
        if (this.thugState !== 'ATTACKING' && this.thugState !== 'RETURNING') return;
        const target = this.route[this.routeIndex];
        if (target === undefined) return;

        const targetX = target.tileX * TILE + TILE / 2;
        const targetY = target.tileY * TILE + TILE / 2;
        const distance = this.speed * deltaMs / 1000;
        const deltaX = targetX - this.x;
        const deltaY = targetY - this.y;
        const length = Math.hypot(deltaX, deltaY);
        if (length <= distance) {
            this.setPosition(targetX, targetY);
            this.routeIndex++;
        } else {
            this.setPosition(
                this.x + deltaX / length * distance,
                this.y + deltaY / length * distance,
            );
        }
        this.setDepth(this.y + this.height);
    }

    public hasReachedRouteEnd(): boolean {
        return (
            (this.thugState === 'ATTACKING' || this.thugState === 'RETURNING')
            && this.routeIndex >= this.route.length
        );
    }

    public finish(): void {
        this.thugState = 'DONE';
        this.destroy();
    }
}
