import { Physics, Scene } from 'phaser';
import { BAND_PLAYING_DURATION_MS, GAME_REGISTRY, samplePatienceDuration } from '../data/GameRegistry';
import { TILE } from '../data/constants';
import { Client, type ClientPosition } from '../entities/Client';
import { CoinManager } from './CoinManager';
import { GridManager } from './GridManager';
import { SeatingManager } from './SeatingManager';
import { PathfindingManager } from './PathfindingManager';
import {
    eventBus,
    EVENT_CLIENT_SATISFIED,
    EVENT_CLIENT_SEATED,
    EVENT_CLIENT_LEAVING,
    EVENT_CLIENT_EXIT_PATH_FAILED,
    EVENT_BAND_STARTED,
    type BandStartedData,
    type ClientExitPathFailedData,
    type ClientSatisfiedData,
    type ClientSeatedData,
    type ClientLeavingData,
} from '../utils/EventBus';

export class ClientManager {
    private readonly clients = new Set<Client>();
    private readonly collisionGroup: Physics.Arcade.Group;
    private readonly queueTiles: readonly ClientPosition[];
    private elapsedMs = 0;
    private queueIndex = 0;
    private nextClientId = 1;
    private enabled = false;

    public constructor(
        private readonly scene: Scene,
        private readonly grid: GridManager,
        private readonly coinManager: CoinManager,
        private readonly seating: SeatingManager,
        private readonly pathfinding: PathfindingManager,
        private readonly isBandPlaying: () => boolean,
    ) {
        this.queueTiles = this.grid.getObjectZoneTiles('zonaColaEntrada');
        this.collisionGroup = this.scene.physics.add.group();
        eventBus.on(EVENT_BAND_STARTED, this.onBandStartedBound);
    }

    public setEnabled(enabled: boolean): void { this.enabled = enabled; }

    public update(deltaMs: number): void {
        const orderedClients = [...this.clients].sort((left, right) => {
            const leftPriority = left.clientState === 'LEAVING'
                || left.clientState === 'FLEEING'
                || left.clientState === 'APPROACHING_FIGHT' ? 0 : 1;
            const rightPriority = right.clientState === 'LEAVING'
                || right.clientState === 'FLEEING'
                || right.clientState === 'APPROACHING_FIGHT' ? 0 : 1;
            return leftPriority - rightPriority || left.clientId - right.clientId;
        });
        const currentPositions = new Map<number, ClientPosition>(
            orderedClients.map((client) => [client.clientId, client.currentTile]),
        );
        const nextTileClaims = new Map<string, { readonly ownerId: number; readonly position: ClientPosition }>();

        for (const client of orderedClients) {
            const blockedPositions = orderedClients
                .filter((other) => other !== client)
                .map((other) => currentPositions.get(other.clientId))
                .filter((position): position is ClientPosition => position !== undefined);
            blockedPositions.push(...this.grid.getDeadBodyPositions());
            for (const claim of nextTileClaims.values()) {
                if (claim.ownerId !== client.clientId) blockedPositions.push(claim.position);
            }

            const nextPosition = client.nextRoutePosition;
            if (nextPosition !== null && !this.hasPosition(blockedPositions, nextPosition)) {
                nextTileClaims.set(this.positionKey(nextPosition), {
                    ownerId: client.clientId,
                    position: nextPosition,
                });
            }

            client.update(deltaMs, blockedPositions);
            currentPositions.set(client.clientId, client.currentTile);

            const updatedNextPosition = client.nextRoutePosition;
            if (updatedNextPosition !== null && !this.hasPosition(blockedPositions, updatedNextPosition)) {
                const key = this.positionKey(updatedNextPosition);
                if (!nextTileClaims.has(key)) {
                    nextTileClaims.set(key, { ownerId: client.clientId, position: updatedNextPosition });
                }
            }
        }

        if (!this.enabled || this.queueTiles.length === 0) return;
        this.elapsedMs += deltaMs;
        if (this.elapsedMs < GAME_REGISTRY.clients.spawnIntervalMs) return;
        this.elapsedMs %= GAME_REGISTRY.clients.spawnIntervalMs;
        const waiting = [...this.clients].filter((client) => client.clientState === 'WAITING_IN_LINE').length;
        if (waiting >= GAME_REGISTRY.clients.maxWaiting) return;
        const position = this.queueTiles[this.queueIndex];
        this.queueIndex = (this.queueIndex + 1) % this.queueTiles.length;
        const clientId = this.nextClientId++;
        const client = new Client(
            this.scene,
            clientId,
            position,
            samplePatienceDuration(GAME_REGISTRY.patience.queue),
            this.coinManager,
            this.grid,
            this.seating,
            this.pathfinding,
            GAME_REGISTRY,
            this.isBandPlaying,
        );
        client.setData('clientId', clientId);
        this.clients.add(client);
        this.collisionGroup.add(client);
        client.once('queue-abandoned', () => this.fadeClientOut(client));
        client.once('exited', () => this.fadeClientOut(client));
        client.once('leaving', () => {
            const data: ClientLeavingData = { clientId: client.clientId };
            eventBus.emit(EVENT_CLIENT_LEAVING, data);
        });
        client.on('exit-path-failed', (data: ClientExitPathFailedData) => {
            console.error('No existe una ruta transitable hasta la salida para el cliente.', data);
            eventBus.emit(EVENT_CLIENT_EXIT_PATH_FAILED, data);
        });
        client.once('seated', () => {
            const seat = client.assignedSeat;
            if (seat === null) return;
            const data: ClientSeatedData = {
                clientId: client.clientId,
                race: client.race,
                tileX: seat.tileX,
                tileY: seat.tileY,
            };
            eventBus.emit(EVENT_CLIENT_SEATED, data);
        });
        client.once('satisfied', () => {
            const seat = client.assignedSeat;
            const itemId = client.orderItemId;
            if (seat === null || itemId === null) return;
            const data: ClientSatisfiedData = {
                clientId: client.getData('clientId') as number,
                orderItemId: itemId,
                seatTileX: seat.tileX,
                seatTileY: seat.tileY,
            };
            eventBus.emit(EVENT_CLIENT_SATISFIED, data);
        });
    }

    public getWaitingClients(): readonly Client[] {
        return [...this.clients].filter((client) => client.clientState === 'WAITING_IN_LINE');
    }

    public getClientById(clientId: number): Client | null {
        return [...this.clients].find((client) => client.clientId === clientId) ?? null;
    }

    public removeMurderedClient(clientId: number): void {
        const client = this.getClientById(clientId);
        if (client === null) return;
        this.clients.delete(client);
        this.collisionGroup.remove(client, false, false);
        client.destroy();
    }

    public getCollisionGroup(): Physics.Arcade.Group {
        return this.collisionGroup;
    }

    public getOccupiedPositions(exceptClientId?: number): readonly ClientPosition[] {
        return [...this.clients]
            .filter((client) => client.clientId !== exceptClientId)
            .map((client) => client.currentTile);
    }

    public getClientWaitingForOrderAt(tileX: number, tileY: number): Client | null {
        for (const client of this.clients) {
            if (
                client.clientState === 'SEATED_WAITING_ORDER'
                && Math.floor(client.x / TILE) === tileX
                && Math.floor(client.y / TILE) === tileY
            ) {
                return client;
            }
        }
        return null;
    }

    public getFightingClientAt(tileX: number, tileY: number): Client | null {
        for (const client of this.clients) {
            if (
                client.clientState === 'FIGHTING'
                && Math.floor(client.x / TILE) === tileX
                && Math.floor(client.y / TILE) === tileY
            ) return client;
        }
        return null;
    }

    public destroy(): void {
        eventBus.off(EVENT_BAND_STARTED, this.onBandStartedBound);
        this.collisionGroup.clear(false, false);
        for (const client of this.clients) client.destroy();
        this.clients.clear();
    }

    private fadeClientOut(client: Client): void {
        this.clients.delete(client);
        this.collisionGroup.remove(client, false, false);
        this.scene.tweens.add({
            targets: client,
            alpha: 0,
            duration: GAME_REGISTRY.clients.leaveFadeMs,
            onComplete: () => client.destroy(),
        });
    }

    private readonly onBandStartedBound = (data: BandStartedData): void => {
        const durationMs = Math.min(data.durationMs, BAND_PLAYING_DURATION_MS);
        for (const client of this.clients) client.satisfyMusicOrder(durationMs);
    };

    private positionKey(position: ClientPosition): string {
        return `${position.tileX}:${position.tileY}`;
    }

    private hasPosition(positions: readonly ClientPosition[], target: ClientPosition): boolean {
        return positions.some((position) =>
            position.tileX === target.tileX && position.tileY === target.tileY,
        );
    }
}
