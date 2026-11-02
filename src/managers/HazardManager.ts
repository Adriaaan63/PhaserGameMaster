import { GAME_REGISTRY, type GameRegistry } from '../data/GameRegistry';
import type { Client, ClientPosition } from '../entities/Client';
import {
    eventBus,
    EVENT_CLIENT_LEAVING,
    EVENT_CLIENT_MURDERED,
    EVENT_CLIENT_SEAT_VACATED,
    EVENT_CLIENT_SEATED,
    EVENT_DEAD_BODY_CLEANED,
    EVENT_DEAD_BODY_CREATED,
    type ClientLeavingData,
    type ClientMurderedData,
    type ClientSeatedData,
    type ClientSeatVacatedData,
    type DeadBodyData,
} from '../utils/EventBus';
import { ClientManager } from './ClientManager';
import { GridManager } from './GridManager';

/** Applies persistent fear penalties to seated customers near corpse tiles. */
export class HazardManager {
    private readonly seatedClients = new Map<number, Client>();

    private readonly handleClientSeated = (data: ClientSeatedData): void => {
        const client = this.clients.getClientById(data.clientId);
        if (client === null) return;
        this.seatedClients.set(client.clientId, client);
        this.refreshFearPenalties();
    };

    private readonly handleClientLeaving = (data: ClientLeavingData): void => {
        this.seatedClients.get(data.clientId)?.setFearPenalty(false);
        this.seatedClients.delete(data.clientId);
        this.refreshFearPenalties();
    };

    private readonly handleClientSeatVacated = (data: ClientSeatVacatedData): void => {
        this.seatedClients.get(data.clientId)?.setFearPenalty(false);
        this.seatedClients.delete(data.clientId);
        this.refreshFearPenalties();
    };

    private readonly handleClientMurdered = (data: ClientMurderedData): void => {
        this.seatedClients.get(data.deadClientId)?.setFearPenalty(false);
        this.seatedClients.delete(data.deadClientId);
        this.refreshFearPenalties();
    };

    private readonly handleDeadBodyChanged = (_data: DeadBodyData): void => {
        this.refreshFearPenalties();
    };

    public constructor(
        private readonly clients: ClientManager,
        private readonly grid: GridManager,
        private readonly registry: GameRegistry = GAME_REGISTRY,
    ) {
        eventBus.on(EVENT_CLIENT_SEATED, this.handleClientSeated);
        eventBus.on(EVENT_CLIENT_LEAVING, this.handleClientLeaving);
        eventBus.on(EVENT_CLIENT_SEAT_VACATED, this.handleClientSeatVacated);
        eventBus.on(EVENT_CLIENT_MURDERED, this.handleClientMurdered);
        eventBus.on(EVENT_DEAD_BODY_CREATED, this.handleDeadBodyChanged);
        eventBus.on(EVENT_DEAD_BODY_CLEANED, this.handleDeadBodyChanged);
    }

    public destroy(): void {
        eventBus.off(EVENT_CLIENT_SEATED, this.handleClientSeated);
        eventBus.off(EVENT_CLIENT_LEAVING, this.handleClientLeaving);
        eventBus.off(EVENT_CLIENT_SEAT_VACATED, this.handleClientSeatVacated);
        eventBus.off(EVENT_CLIENT_MURDERED, this.handleClientMurdered);
        eventBus.off(EVENT_DEAD_BODY_CREATED, this.handleDeadBodyChanged);
        eventBus.off(EVENT_DEAD_BODY_CLEANED, this.handleDeadBodyChanged);
        for (const client of this.seatedClients.values()) client.setFearPenalty(false);
        this.seatedClients.clear();
    }

    public refresh(): void {
        this.refreshFearPenalties();
    }

    private refreshFearPenalties(): void {
        const bodyPositions = this.grid.getDeadBodyPositions();
        for (const client of this.seatedClients.values()) {
            const seat = client.assignedSeat;
            client.setFearPenalty(
                seat !== null && bodyPositions.some((body) => this.isWithinFearRadius(seat, body)),
            );
        }
    }

    private isWithinFearRadius(client: ClientPosition, body: ClientPosition): boolean {
        return Math.max(
            Math.abs(client.tileX - body.tileX),
            Math.abs(client.tileY - body.tileY),
        ) <= this.registry.aftermath.fearRadiusTiles;
    }
}
