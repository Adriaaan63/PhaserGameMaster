import { GameObjects, Scene } from 'phaser';

import { TILE } from '../data/constants';
import type { ClientPosition } from './Client';

export type SandtrooperState = 'PATROLLING' | 'APPROACHING' | 'ARRESTING' | 'RETURNING';

/** Imperial inspector that follows routes assigned by WantedManager. */
export class Sandtrooper extends GameObjects.Container {
    private route: readonly ClientPosition[] = [];
    private routeIndex = 0;
    private trooperState: SandtrooperState = 'PATROLLING';

    public constructor(
        scene: Scene,
        position: ClientPosition,
        private readonly speed: number,
        width: number,
        height: number,
        color: number,
    ) {
        super(scene, position.tileX * TILE + TILE / 2, position.tileY * TILE + TILE / 2);
        this.setExclusive(true);
        this.add(scene.add.rectangle(0, 0, width, height, color).setStrokeStyle(2, 0x202020));
        scene.add.existing(this);
        this.setDepth(this.y + height);
    }

    public get currentState(): SandtrooperState {
        return this.trooperState;
    }

    public get currentTile(): ClientPosition {
        return {
            tileX: Math.floor(this.x / TILE),
            tileY: Math.floor(this.y / TILE),
        };
    }

    public setPatrolRoute(route: readonly ClientPosition[]): void {
        this.trooperState = 'PATROLLING';
        this.route = route;
        this.routeIndex = 0;
    }

    public get patrolRouteFinished(): boolean {
        return this.hasReachedRouteEnd();
    }

    public approach(route: readonly ClientPosition[]): void {
        this.trooperState = 'APPROACHING';
        this.route = route;
        this.routeIndex = 0;
    }

    public startArresting(): void {
        this.trooperState = 'ARRESTING';
        this.route = [];
        this.routeIndex = 0;
    }

    public returnToEntrance(route: readonly ClientPosition[]): void {
        this.trooperState = 'RETURNING';
        this.route = route;
        this.routeIndex = 0;
    }

    public update(deltaMs: number): void {
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
        return this.routeIndex >= this.route.length;
    }
}
