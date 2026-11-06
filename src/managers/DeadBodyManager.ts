import { Physics, Scene } from 'phaser';

import { GAME_REGISTRY, type GameRegistry } from '../data/GameRegistry';
import type { ClientPosition } from '../entities/Client';
import { DeadBodyEntity } from '../entities/DeadBodyEntity';
import {
    eventBus,
    EVENT_CLIENT_MURDERED,
    EVENT_DEAD_BODY_CLEANED,
    EVENT_DEAD_BODY_CREATED,
    EVENT_PLAYER_ACTION_PROGRESS,
    type ClientMurderedData,
    type DeadBodyData,
    type PlayerActionProgressData,
} from '../utils/EventBus';
import { GridManager } from './GridManager';

/** Owns corpse entities, their blocking tiles and the hold-to-clean interaction. */
export class DeadBodyManager {
    private readonly bodies = new Map<string, DeadBodyEntity>();
    private readonly collisionGroup: Physics.Arcade.Group;
    private cleaningKey: string | null = null;
    private cleaningProgressMs = 0;

    private readonly handleClientMurdered = (data: ClientMurderedData): void => {
        this.createBody(data.tileX, data.tileY);
    };

    public constructor(
        private readonly scene: Scene,
        private readonly grid: GridManager,
        private readonly registry: GameRegistry = GAME_REGISTRY,
    ) {
        this.collisionGroup = scene.physics.add.group();
        eventBus.on(EVENT_CLIENT_MURDERED, this.handleClientMurdered);
    }

    public getCollisionGroup(): Physics.Arcade.Group {
        return this.collisionGroup;
    }

    public hasBodyAt(tileX: number, tileY: number): boolean {
        return this.bodies.has(this.key(tileX, tileY));
    }

    /** Advances or cancels one continuous hold-to-clean action. */
    public updateCleaning(
        target: ClientPosition | null,
        interactionHeld: boolean,
        handsEmpty: boolean,
        deltaMs: number,
    ): boolean {
        if (!interactionHeld || !handsEmpty || target === null) {
            const wasCleaning = this.cleaningKey !== null;
            this.cancelCleaning();
            return wasCleaning;
        }

        const key = this.key(target.tileX, target.tileY);
        const body = this.bodies.get(key);
        if (body === undefined) {
            const wasCleaning = this.cleaningKey !== null;
            this.cancelCleaning();
            return wasCleaning;
        }

        if (this.cleaningKey !== key) {
            this.cancelCleaning();
            this.cleaningKey = key;
        }
        this.cleaningProgressMs = Math.min(
            this.registry.aftermath.cleaningTimeMs,
            this.cleaningProgressMs + deltaMs,
        );
        const progress = this.cleaningProgressMs / this.registry.aftermath.cleaningTimeMs;
        this.emitCleaningProgress(true, progress * 100);
        if (progress >= 1) this.finishCleaning(key, body);
        return true;
    }

    public destroy(): void {
        eventBus.off(EVENT_CLIENT_MURDERED, this.handleClientMurdered);
        this.cancelCleaning();
        for (const [key, body] of [...this.bodies]) {
            this.grid.clearDeadBodyAt(body.tileX, body.tileY);
            body.destroy();
            this.bodies.delete(key);
        }
    }

    private createBody(tileX: number, tileY: number): void {
        const key = this.key(tileX, tileY);
        if (this.bodies.has(key)) return;
        const body = new DeadBodyEntity(this.scene, tileX, tileY, this.registry);
        this.bodies.set(key, body);
        this.grid.markDeadBodyAt(tileX, tileY);
        this.collisionGroup.add(body);
        const data: DeadBodyData = { tileX, tileY };
        eventBus.emit(EVENT_DEAD_BODY_CREATED, data);
    }

    private finishCleaning(key: string, body: DeadBodyEntity): void {
        this.bodies.delete(key);
        this.grid.clearDeadBodyAt(body.tileX, body.tileY);
        this.collisionGroup.remove(body, false, false);
        body.destroy();
        this.cleaningKey = null;
        this.cleaningProgressMs = 0;
        this.emitCleaningProgress(false, 0);
        const data: DeadBodyData = { tileX: body.tileX, tileY: body.tileY };
        eventBus.emit(EVENT_DEAD_BODY_CLEANED, data);
    }

    private cancelCleaning(): void {
        const wasCleaning = this.cleaningKey !== null;
        this.cleaningKey = null;
        this.cleaningProgressMs = 0;
        if (wasCleaning) this.emitCleaningProgress(false, 0);
    }

    private emitCleaningProgress(active: boolean, progress: number): void {
        const data: PlayerActionProgressData = { active, progress, action: 'CLEANING' };
        eventBus.emit(EVENT_PLAYER_ACTION_PROGRESS, data);
    }

    private key(tileX: number, tileY: number): string {
        return `${tileX}:${tileY}`;
    }
}
