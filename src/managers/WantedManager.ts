import { Math as PhaserMath, Scene, Time } from 'phaser';

import {
    CREDITS_REGISTRY_KEY,
    GAME_REGISTRY,
    WANTED_PROFILE_REGISTRY_KEY,
    CLIENT_RACE_PRESENTATION,
    CLIENT_RACES,
    type WantedProfile,
} from '../data/GameRegistry';
import { Client, type ClientPosition } from '../entities/Client';
import { Sandtrooper } from '../entities/Sandtrooper';
import {
    eventBus,
    EVENT_CLIENT_SEATED,
    EVENT_OPEN_WANTED_POSTER,
    EVENT_WANTED_PROFILE_UPDATED,
    EVENT_WANTED_INSPECTION_STARTED,
    EVENT_WANTED_ARRESTED,
    EVENT_WANTED_ESCAPED,
    EVENT_WANTED_REWARD_GRANTED,
    type ClientSeatedData,
} from '../utils/EventBus';
import { ClientManager } from './ClientManager';
import { GridManager, TILE_TYPE_EMPTY, TILE_TYPE_FLOOR } from './GridManager';
import { PathfindingManager } from './PathfindingManager';
import { ReputationManager } from './ReputationManager';

const WANTED_DETAILS: Readonly<Record<string, readonly string[]>> = {
    WOOKIEE: ['Lleva una trenza de cuero', 'Tiene una cicatriz en el hombro'],
    TRANDOSHAN: ['Viste una bandolera roja', 'Tiene una escama dorada'],
    RODIAN: ['Lleva un sombrero viejo', 'Tiene una antena rota'],
    AQUALISH: ['Usa un pañuelo azul', 'Tiene una ceja marcada'],
    ITHORIAN: ['Lleva un collar metálico', 'Tiene una marca en el cuello'],
};

/** Owns the wanted profile, poster interaction, inspection and its outcomes. */
export class WantedManager {
    private readonly profile: WantedProfile;
    private clientManager: ClientManager | null = null;
    private inspectionTimer: Time.TimerEvent | null = null;
    private sandtrooper: Sandtrooper | null = null;
    private arrestTimer: Time.TimerEvent | null = null;
    private wantedClientId: number | null = null;
    private entrance: ClientPosition | null = null;
    private patrolPoints: readonly ClientPosition[] = [];
    private patrolPointIndex = 0;
    private resolved = false;
    private enabled = true;

    private readonly handleClientSeated = (data: ClientSeatedData): void => {
        if (!this.enabled || !data.isWanted || this.clientManager === null) return;
        this.wantedClientId = data.clientId;
        this.inspectionTimer?.remove(false);
        this.inspectionTimer = this.scene.time.delayedCall(
            GAME_REGISTRY.wanted.inspectionDelayMs,
            () => this.startInspection(),
        );
    };

    public constructor(
        private readonly scene: Scene,
        private readonly grid: GridManager,
        private readonly pathfinding: PathfindingManager,
        private readonly reputation: ReputationManager,
    ) {
        this.profile = this.generateProfile();
        this.scene.registry.set(WANTED_PROFILE_REGISTRY_KEY, this.profile);
        eventBus.emit(EVENT_WANTED_PROFILE_UPDATED, { profile: this.profile });
        eventBus.on(EVENT_CLIENT_SEATED, this.handleClientSeated);
    }

    public setClientManager(clientManager: ClientManager): void {
        this.clientManager = clientManager;
    }

    public get currentProfile(): WantedProfile {
        return this.profile;
    }

    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        if (!enabled) {
            this.inspectionTimer?.remove(false);
            this.inspectionTimer = null;
            this.sandtrooper?.destroy();
            this.sandtrooper = null;
        }
    }

    public update(deltaMs: number): void {
        if (!this.enabled || this.sandtrooper === null) return;
        this.sandtrooper.update(deltaMs);
        if (this.sandtrooper.currentState === 'PATROLLING' && !this.resolved) {
            if (this.isWantedClientDetected()) {
                this.tryApproachWantedClient();
            } else if (this.sandtrooper.patrolRouteFinished) {
                this.assignNextPatrolRoute();
            }
        }
        if (
            this.sandtrooper.currentState === 'APPROACHING'
            && this.sandtrooper.hasReachedRouteEnd()
        ) {
            this.startAutomaticArrest();
        } else if (
            this.sandtrooper.currentState === 'RETURNING'
            && this.sandtrooper.hasReachedRouteEnd()
        ) {
            this.sandtrooper.destroy();
            this.sandtrooper = null;
        }
    }

    public interactAt(tileX: number, tileY: number): boolean {
        if (!this.enabled) return false;
        if (this.isPosterTile(tileX, tileY)) {
            eventBus.emit(EVENT_OPEN_WANTED_POSTER, { profile: this.profile });
            return true;
        }
        const client = this.getWantedClient();
        if (
            client !== null
            && this.sandtrooper !== null
            && client.clientState === 'SEATED_WAITING_ORDER'
            && this.isSameTile(tileX, tileY, client.currentTile)
        ) {
            this.coverWantedClient(client);
            return true;
        }
        if (this.sandtrooper !== null && this.isSameTile(tileX, tileY, this.sandtrooper.currentTile)) {
            this.arrestWantedClient(true);
            return true;
        }
        return false;
    }

    public destroy(): void {
        eventBus.off(EVENT_CLIENT_SEATED, this.handleClientSeated);
        this.inspectionTimer?.remove(false);
        this.inspectionTimer = null;
        this.arrestTimer?.remove(false);
        this.arrestTimer = null;
        this.sandtrooper?.destroy();
        this.sandtrooper = null;
    }

    private startInspection(): void {
        const client = this.getWantedClient();
        if (client === null || client.clientState !== 'SEATED_WAITING_ORDER') return;
        const entrance = this.getEntrance();
        if (entrance === null) return;
        this.entrance = entrance;
        this.sandtrooper = new Sandtrooper(
            this.scene,
            entrance,
            GAME_REGISTRY.wanted.sandtrooperSpeed,
            GAME_REGISTRY.wanted.sandtrooperBodyWidth,
            GAME_REGISTRY.wanted.sandtrooperBodyHeight,
            GAME_REGISTRY.wanted.sandtrooperColor,
        );
        this.patrolPoints = this.getPatrolPoints(entrance);
        this.patrolPointIndex = 0;
        this.assignNextPatrolRoute();
        eventBus.emit(EVENT_WANTED_INSPECTION_STARTED, { clientId: client.clientId });
    }

    private tryApproachWantedClient(): void {
        if (this.sandtrooper === null || this.resolved) return;
        const client = this.getWantedClient();
        if (client === null || client.clientState !== 'SEATED_WAITING_ORDER') return;
        const route = this.pathfinding.findPathToAdjacent(this.sandtrooper.currentTile, client.currentTile);
        if (route !== null) this.sandtrooper.approach(route);
    }

    private startAutomaticArrest(): void {
        if (this.sandtrooper === null || this.resolved) return;
        this.sandtrooper.startArresting();
        this.arrestTimer?.remove(false);
        this.arrestTimer = this.scene.time.delayedCall(
            GAME_REGISTRY.wanted.arrestDurationMs,
            () => {
                this.arrestTimer = null;
                this.arrestWantedClient(false);
            },
        );
    }

    private assignNextPatrolRoute(): void {
        if (this.sandtrooper === null || this.patrolPoints.length === 0) return;
        const point = this.patrolPoints[this.patrolPointIndex % this.patrolPoints.length];
        this.patrolPointIndex++;
        const route = this.pathfinding.findPath(this.sandtrooper.currentTile, point);
        if (route !== null && route.length > 0) {
            this.sandtrooper.setPatrolRoute(route);
        }
    }

    private isWantedClientDetected(): boolean {
        if (this.sandtrooper === null) return false;
        const client = this.getWantedClient();
        if (client === null || client.clientState !== 'SEATED_WAITING_ORDER') return false;
        const trooperTile = this.sandtrooper.currentTile;
        const clientTile = client.currentTile;
        const distance = Math.abs(trooperTile.tileX - clientTile.tileX)
            + Math.abs(trooperTile.tileY - clientTile.tileY);
        return distance <= GAME_REGISTRY.wanted.detectionRadiusTiles;
    }

    private getPatrolPoints(entrance: ClientPosition): readonly ClientPosition[] {
        const candidates: ClientPosition[] = [];
        for (let tileY = 0; tileY < this.grid.tilemap.height; tileY++) {
            for (let tileX = 0; tileX < this.grid.tilemap.width; tileX++) {
                const type = this.grid.getTileTypeAtGrid(tileX, tileY);
                if (type === TILE_TYPE_EMPTY || type === TILE_TYPE_FLOOR) {
                    candidates.push({ tileX, tileY });
                }
            }
        }
        const points = candidates.filter((tile) =>
            tile.tileX !== entrance.tileX || tile.tileY !== entrance.tileY,
        );
        const pointCount = Math.min(GAME_REGISTRY.wanted.patrolPointCount, points.length);
        if (pointCount === 0) return [entrance];
        const selected: ClientPosition[] = [];
        for (let index = 0; index < pointCount; index++) {
            const pointIndex = Math.floor(index * points.length / pointCount);
            const point = points[pointIndex];
            if (point !== undefined) selected.push(point);
        }
        return selected;
    }

    private coverWantedClient(client: Client): void {
        const secretDoor = this.grid.getObjectZoneCenterTiles('puerta_secreta')[0];
        if (secretDoor === undefined) return;
        const route = this.pathfinding.findPath(client.currentTile, secretDoor)
            ?? this.pathfinding.findPathToAdjacent(client.currentTile, secretDoor);
        if (route === null) return;
        client.fleeToPosition(secretDoor, false, route);
        this.resolved = true;
        this.reputation.applyWantedCover();
        client.once('exited', () => {
            eventBus.emit(EVENT_WANTED_ESCAPED, { clientId: client.clientId });
            this.returnSandtrooper();
        });
    }

    private arrestWantedClient(byPlayer: boolean): void {
        if (this.resolved) return;
        const client = this.getWantedClient();
        if (client === null) return;
        this.resolved = true;
        if (byPlayer) {
            this.reputation.applyWantedExposure();
            this.grantReward();
        }
        client.arrest();
        this.clientManager?.removeClient(client.clientId);
        eventBus.emit(EVENT_WANTED_ARRESTED, { clientId: client.clientId });
        this.returnSandtrooper();
    }

    private returnSandtrooper(): void {
        if (this.sandtrooper === null || this.entrance === null) return;
        const route = this.pathfinding.findPath(this.sandtrooper.currentTile, this.entrance)
            ?? this.pathfinding.findPathToAdjacent(this.sandtrooper.currentTile, this.entrance);
        if (route !== null) this.sandtrooper.returnToEntrance(route);
    }

    private grantReward(): void {
        const currentCredits = this.scene.registry.get(CREDITS_REGISTRY_KEY);
        const totalCredits = (
            typeof currentCredits === 'number' ? currentCredits : GAME_REGISTRY.economy.startingCredits
        ) + this.profile.rewardCredits;
        this.scene.registry.set(CREDITS_REGISTRY_KEY, totalCredits);
        eventBus.emit(EVENT_WANTED_REWARD_GRANTED, {
            rewardCredits: this.profile.rewardCredits,
            totalCredits,
        });
    }

    private getWantedClient(): Client | null {
        return this.clientManager?.getClientById(this.wantedClientId ?? -1) ?? null;
    }

    private getEntrance(): ClientPosition | null {
        return this.grid.getObjectZoneCenterTiles('cantina_entrada')[0]
            ?? this.grid.getObjectZoneCenterTiles('EntradaCantina')[0]
            ?? null;
    }

    private isPosterTile(tileX: number, tileY: number): boolean {
        return this.grid.getObjectZoneTiles('busca_captura').some((tile) =>
            tile.tileX === tileX && tile.tileY === tileY,
        );
    }

    private isNear(tileX: number, tileY: number, target: ClientPosition): boolean {
        return Math.abs(tileX - target.tileX) <= 1 && Math.abs(tileY - target.tileY) <= 1;
    }

    private isSameTile(tileX: number, tileY: number, target: ClientPosition): boolean {
        return tileX === target.tileX && tileY === target.tileY;
    }

    private generateProfile(): WantedProfile {
        const race = CLIENT_RACES[Math.floor(Math.random() * CLIENT_RACES.length)] ?? CLIENT_RACES[0];
        const presentation = CLIENT_RACE_PRESENTATION[race];
        const details = WANTED_DETAILS[race] ?? ['Tiene un aspecto sospechoso'];
        return {
            race,
            placeholderColor: presentation.placeholderColor,
            visualDetail: details[Math.floor(Math.random() * details.length)] ?? details[0],
            rewardCredits: PhaserMath.Between(35, 75),
        };
    }
}
