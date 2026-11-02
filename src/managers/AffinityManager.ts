import {
    AFFINITY_RULES,
    type ClientRace,
} from '../data/GameRegistry';
import type { Client, ClientPosition } from '../entities/Client';
import type { GridManager } from './GridManager';
import {
    eventBus,
    EVENT_CLIENT_MURDERED,
    EVENT_CLIENT_LEAVING,
    EVENT_CLIENT_SEAT_VACATED,
    EVENT_CLIENT_SEATED,
    type ClientMurderedData,
    type ClientLeavingData,
    type ClientSeatVacatedData,
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

    private readonly handleClientSeatVacated = (data: ClientSeatVacatedData): void => {
        this.seatedClients.get(data.clientId)?.removeAffinityPenalty();
        this.seatedClients.delete(data.clientId);
        this.refreshPenalties();
    };

    private readonly handleClientMurdered = (data: ClientMurderedData): void => {
        this.seatedClients.get(data.deadClientId)?.removeAffinityPenalty();
        this.seatedClients.delete(data.deadClientId);
        this.refreshPenalties();
    };

    public constructor(
        private readonly clientManager: ClientManager,
        private readonly gridManager: GridManager,
    ) {
        eventBus.on(EVENT_CLIENT_SEATED, this.handleClientSeated);
        eventBus.on(EVENT_CLIENT_LEAVING, this.handleClientLeaving);
        eventBus.on(EVENT_CLIENT_SEAT_VACATED, this.handleClientSeatVacated);
        eventBus.on(EVENT_CLIENT_MURDERED, this.handleClientMurdered);
    }

    public refresh(): void {
        this.refreshPenalties();
    }

    public destroy(): void {
        eventBus.off(EVENT_CLIENT_SEATED, this.handleClientSeated);
        eventBus.off(EVENT_CLIENT_LEAVING, this.handleClientLeaving);
        eventBus.off(EVENT_CLIENT_SEAT_VACATED, this.handleClientSeatVacated);
        eventBus.off(EVENT_CLIENT_MURDERED, this.handleClientMurdered);
        for (const client of this.seatedClients.values()) client.removeAffinityPenalty();
        this.seatedClients.clear();
    }

    /** Re-evaluates every seated customer so multiple nearby rivals don't stack penalties. */
    private refreshPenalties(): void {
        const clients = [...this.seatedClients.values()];
        const opponentsByClient = new Map<number, Set<number>>();

        for (let leftIndex = 0; leftIndex < clients.length; leftIndex++) {
            const left = clients[leftIndex];
            if (left === undefined || left.assignedSeat === null) continue;

            for (let rightIndex = leftIndex + 1; rightIndex < clients.length; rightIndex++) {
                const right = clients[rightIndex];
                if (right === undefined || right.assignedSeat === null) continue;
                if (!this.shareServingStructure(left.assignedSeat, right.assignedSeat)) continue;
                if (!this.areEnemies(left.race, right.race)) continue;

                const leftOpponents = opponentsByClient.get(left.clientId) ?? new Set<number>();
                const rightOpponents = opponentsByClient.get(right.clientId) ?? new Set<number>();
                leftOpponents.add(right.clientId);
                rightOpponents.add(left.clientId);
                opponentsByClient.set(left.clientId, leftOpponents);
                opponentsByClient.set(right.clientId, rightOpponents);
            }
        }

        for (const client of clients) {
            const opponents = opponentsByClient.get(client.clientId);
            if (opponents !== undefined) client.applyAffinityPenalty([...opponents]);
            else client.removeAffinityPenalty();
        }
    }

    private shareServingStructure(left: ClientPosition, right: ClientPosition): boolean {
        const leftStructures = this.gridManager.getServingStructureIdsForChair(left.tileX, left.tileY);
        const rightStructures = this.gridManager.getServingStructureIdsForChair(right.tileX, right.tileY);
        return [...leftStructures].some((structureId) => rightStructures.has(structureId));
    }

    private areEnemies(left: ClientRace, right: ClientRace): boolean {
        return AFFINITY_RULES[left].includes(right) || AFFINITY_RULES[right].includes(left);
    }
}
