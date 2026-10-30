import { Physics, Scene } from 'phaser';
import { GAME_REGISTRY, samplePatienceDuration } from '../data/GameRegistry';
import { TILE } from '../data/constants';
import { Client, type ClientPosition } from '../entities/Client';
import { GridManager } from './GridManager';
import {
    eventBus,
    EVENT_CLIENT_SATISFIED,
    EVENT_CLIENT_SEATED,
    type ClientSatisfiedData,
    type ClientSeatedData,
} from '../utils/EventBus';

export class ClientManager {
    private readonly clients = new Set<Client>();
    private readonly queueTiles: readonly ClientPosition[];
    private elapsedMs = 0;
    private queueIndex = 0;
    private nextClientId = 1;
    private enabled = false;

    public constructor(
        private readonly scene: Scene,
        grid: GridManager,
        private readonly coinsGroup: Physics.Arcade.Group,
    ) {
        this.queueTiles = grid.getObjectZoneTiles('zonaColaEntrada');
    }

    public setEnabled(enabled: boolean): void { this.enabled = enabled; }

    public update(deltaMs: number): void {
        for (const client of [...this.clients]) client.update(deltaMs);
        if (!this.enabled || this.queueTiles.length === 0) return;
        this.elapsedMs += deltaMs;
        if (this.elapsedMs < GAME_REGISTRY.clients.spawnIntervalMs) return;
        this.elapsedMs %= GAME_REGISTRY.clients.spawnIntervalMs;
        const waiting = [...this.clients].filter((client) => client.clientState === 'WAITING_IN_LINE').length;
        if (waiting >= GAME_REGISTRY.clients.maxWaiting) return;
        const position = this.queueTiles[this.queueIndex];
        this.queueIndex = (this.queueIndex + 1) % this.queueTiles.length;
        const client = new Client(
            this.scene,
            position,
            samplePatienceDuration(GAME_REGISTRY.patience.queue),
            this.coinsGroup,
            GAME_REGISTRY,
        );
        client.setData('clientId', this.nextClientId++);
        this.clients.add(client);
        client.once('patience-expired', () => this.fadeClientOut(client));
        client.once('service-expired', () => this.fadeClientOut(client));
        client.once('seated', () => {
            const data: ClientSeatedData = { clientId: client.getData('clientId') as number };
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

    public destroy(): void {
        for (const client of this.clients) client.destroy();
        this.clients.clear();
    }

    private fadeClientOut(client: Client): void {
        this.clients.delete(client);
        this.scene.tweens.add({
            targets: client,
            alpha: 0,
            duration: GAME_REGISTRY.clients.leaveFadeMs,
            onComplete: () => client.destroy(),
        });
    }
}
