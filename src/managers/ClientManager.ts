import { Scene } from 'phaser';
import {
    CLIENT_LEAVE_FADE_MS, CLIENT_MAX_WAITING, CLIENT_MOVE_SPEED, CLIENT_PATIENCE_CRITICAL_COLOR,
    CLIENT_PATIENCE_CRITICAL_RATIO, CLIENT_PATIENCE_HEALTHY_COLOR,
    CLIENT_PATIENCE_MS, CLIENT_PATIENCE_WARNING_COLOR,
    CLIENT_PATIENCE_WARNING_RATIO, CLIENT_SPAWN_INTERVAL_MS,
} from '../data/constants';
import { Client, type ClientPosition } from '../entities/Client';
import { GridManager } from './GridManager';
import { eventBus, EVENT_CLIENT_SEATED, type ClientSeatedData } from '../utils/EventBus';

export class ClientManager {
    private readonly clients = new Set<Client>();
    private readonly queueTiles: readonly ClientPosition[];
    private elapsedMs = 0;
    private queueIndex = 0;
    private nextClientId = 1;
    private enabled = false;

    public constructor(private readonly scene: Scene, grid: GridManager) {
        this.queueTiles = grid.getObjectZoneTiles('zonaColaEntrada');
    }

    public setEnabled(enabled: boolean): void { this.enabled = enabled; }

    public update(deltaMs: number): void {
        for (const client of [...this.clients]) client.update(deltaMs);
        if (!this.enabled || this.queueTiles.length === 0) return;
        this.elapsedMs += deltaMs;
        if (this.elapsedMs < CLIENT_SPAWN_INTERVAL_MS) return;
        this.elapsedMs %= CLIENT_SPAWN_INTERVAL_MS;
        const waiting = [...this.clients].filter((client) => client.clientState === 'WAITING_IN_LINE').length;
        if (waiting >= CLIENT_MAX_WAITING) return;
        const position = this.queueTiles[this.queueIndex];
        this.queueIndex = (this.queueIndex + 1) % this.queueTiles.length;
        const client = new Client(this.scene, position, {
            patienceMs: CLIENT_PATIENCE_MS,
            warningRatio: CLIENT_PATIENCE_WARNING_RATIO,
            criticalRatio: CLIENT_PATIENCE_CRITICAL_RATIO,
            healthyColor: CLIENT_PATIENCE_HEALTHY_COLOR,
            warningColor: CLIENT_PATIENCE_WARNING_COLOR,
            criticalColor: CLIENT_PATIENCE_CRITICAL_COLOR,
            moveSpeed: CLIENT_MOVE_SPEED,
        });
        client.setData('clientId', this.nextClientId++);
        this.clients.add(client);
        client.once('patience-expired', () => {
            this.clients.delete(client);
            this.scene.tweens.add({
                targets: client,
                alpha: 0,
                duration: CLIENT_LEAVE_FADE_MS,
                onComplete: () => client.destroy(),
            });
        });
        client.once('seated', () => {
            const data: ClientSeatedData = { clientId: client.getData('clientId') as number };
            eventBus.emit(EVENT_CLIENT_SEATED, data);
        });
    }

    public getWaitingClients(): readonly Client[] {
        return [...this.clients].filter((client) => client.clientState === 'WAITING_IN_LINE');
    }

    public destroy(): void {
        for (const client of this.clients) client.destroy();
        this.clients.clear();
    }
}
