import {
    AFFINITY_ADJACENCY_RADIUS_TILES,
    AFFINITY_RULES,
    type ClientRace,
} from '../data/GameRegistry';
import type { Client, ClientPosition } from '../entities/Client';
import {
    eventBus,
    EVENT_CLIENT_LEAVING,
    EVENT_CLIENT_SEATED,
    type ClientLeavingData,
    type ClientSeatedData,
} from '../utils/EventBus';
import { ClientManager } from './ClientManager';

/** Recomputes seated-customer affinity penalties whenever a seat is occupied or vacated. */
export class AffinityManager {
    private readonly seatedClients = new Map<number, Client>();

    private readonly handleClientSeated = (data: ClientSeatedData): void => {
        const client = this.clientManager.getClientById(data.clientId);
        if (client === null || client.race !== data.race || client.assignedSeat === null) return;
        this.seatedClients.set(client.clientId, client);
        this.refreshPenalties();
    };

    private readonly handleClientLeaving = (data: ClientLeavingData): void => {
        const client = this.seatedClients.get(data.clientId);
        client?.removeAffinityPenalty();
        this.seatedClients.delete(data.clientId);
        this.refreshPenalties();
    };

    public constructor(private readonly clientManager: ClientManager) {
        eventBus.on(EVENT_CLIENT_SEATED, this.handleClientSeated);
        eventBus.on(EVENT_CLIENT_LEAVING, this.handleClientLeaving);
    }

    public destroy(): void {
        eventBus.off(EVENT_CLIENT_SEATED, this.handleClientSeated);
        eventBus.off(EVENT_CLIENT_LEAVING, this.handleClientLeaving);
        for (const client of this.seatedClients.values()) client.removeAffinityPenalty();
        this.seatedClients.clear();
    }

    /** Re-evaluates every seated customer so multiple nearby rivals don't stack penalties. */
    private refreshPenalties(): void {
        const clients = [...this.seatedClients.values()];
        const penalizedClients = new Set<number>();

        for (let leftIndex = 0; leftIndex < clients.length; leftIndex++) {
            const left = clients[leftIndex];
            if (left === undefined || left.assignedSeat === null) continue;

            for (let rightIndex = leftIndex + 1; rightIndex < clients.length; rightIndex++) {
                const right = clients[rightIndex];
                if (right === undefined || right.assignedSeat === null) continue;
                if (!this.areAdjacent(left.assignedSeat, right.assignedSeat)) continue;
                if (!this.areEnemies(left.race, right.race)) continue;

                penalizedClients.add(left.clientId);
                penalizedClients.add(right.clientId);
            }
        }

        for (const client of clients) {
            if (penalizedClients.has(client.clientId)) client.applyAffinityPenalty();
            else client.removeAffinityPenalty();
        }
    }

    private areAdjacent(left: ClientPosition, right: ClientPosition): boolean {
        const horizontalDistance = Math.abs(left.tileX - right.tileX);
        const verticalDistance = Math.abs(left.tileY - right.tileY);
        return Math.max(horizontalDistance, verticalDistance) <= AFFINITY_ADJACENCY_RADIUS_TILES
            && (horizontalDistance > 0 || verticalDistance > 0);
    }

    private areEnemies(left: ClientRace, right: ClientRace): boolean {
        return AFFINITY_RULES[left].includes(right) || AFFINITY_RULES[right].includes(left);
    }
}
