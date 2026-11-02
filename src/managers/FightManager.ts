import { GAME_REGISTRY, type GameRegistry } from '../data/GameRegistry';
import type { Client } from '../entities/Client';
import {
    eventBus,
    EVENT_CLIENT_MURDERED,
    EVENT_FIGHT_APPROACH_COMPLETE,
    EVENT_FIGHT_APPROACH_FAILED,
    EVENT_FIGHT_REQUESTED,
    EVENT_FIGHT_STARTED,
    EVENT_FIGHT_STOPPED,
    type ClientMurderedData,
    type FightApproachData,
    type FightRequestedData,
    type FightStartedData,
    type FightStoppedData,
} from '../utils/EventBus';
import { ClientManager } from './ClientManager';
import { PathfindingManager } from './PathfindingManager';

type FightPhase = 'APPROACHING' | 'FIGHTING';

interface FightSession {
    readonly key: string;
    readonly clients: readonly [Client, Client];
    readonly clientIds: readonly [number, number];
    readonly aggressorId: number;
    phase: FightPhase;
    remainingMs: number;
}

/** Coordinates the approach, active fight timer, interruption and consequences. */
export class FightManager {
    private readonly fights = new Map<string, FightSession>();
    private readonly fightKeyByClient = new Map<number, string>();

    private readonly handleFightRequested = (data: FightRequestedData): void => {
        this.beginApproach(data);
    };

    private readonly handleApproachComplete = (data: FightApproachData): void => {
        this.beginVisibleFight(data);
    };

    private readonly handleApproachFailed = (data: FightApproachData): void => {
        this.cancelApproach(data);
    };

    public constructor(
        private readonly clients: ClientManager,
        private readonly pathfinding: PathfindingManager,
        private readonly registry: GameRegistry = GAME_REGISTRY,
    ) {
        eventBus.on(EVENT_FIGHT_REQUESTED, this.handleFightRequested);
        eventBus.on(EVENT_FIGHT_APPROACH_COMPLETE, this.handleApproachComplete);
        eventBus.on(EVENT_FIGHT_APPROACH_FAILED, this.handleApproachFailed);
    }

    public update(deltaMs: number): void {
        for (const session of [...this.fights.values()]) {
            if (session.phase !== 'FIGHTING') continue;
            session.remainingMs = Math.max(0, session.remainingMs - deltaMs);
            if (session.remainingMs === 0) this.resolveFight(session);
        }
    }

    /** Stops the active fight involving the faced client when Wuher intervenes. */
    public intervene(clientId: number): boolean {
        const fightKey = this.fightKeyByClient.get(clientId);
        if (fightKey === undefined) return false;

        const session = this.fights.get(fightKey);
        if (session === undefined || session.phase !== 'FIGHTING') return false;
        this.removeFight(session);
        for (const client of session.clients) client.leaveAfterFight();

        const data: FightStoppedData = {
            clientIds: session.clientIds,
            reason: 'PLAYER_INTERVENTION',
        };
        eventBus.emit(EVENT_FIGHT_STOPPED, data);
        return true;
    }

    public destroy(): void {
        eventBus.off(EVENT_FIGHT_REQUESTED, this.handleFightRequested);
        eventBus.off(EVENT_FIGHT_APPROACH_COMPLETE, this.handleApproachComplete);
        eventBus.off(EVENT_FIGHT_APPROACH_FAILED, this.handleApproachFailed);
        for (const session of this.fights.values()) {
            if (session.phase === 'FIGHTING') {
                for (const client of session.clients) client.leaveAfterFight();
            } else {
                this.getClient(session.aggressorId)?.leaveWithoutPayment();
                this.getOpponent(session)?.cancelFightTarget();
            }
        }
        this.fights.clear();
        this.fightKeyByClient.clear();
    }

    private beginApproach(request: FightRequestedData): void {
        const aggressor = this.clients.getClientById(request.clientId);
        const target = this.clients.getClientById(request.opponentClientId);
        if (aggressor === null) return;
        if (
            target === null
            || aggressor === target
            || this.fightKeyByClient.has(aggressor.clientId)
            || this.fightKeyByClient.has(target.clientId)
        ) {
            aggressor.leaveWithoutPayment();
            return;
        }

        const route = this.pathfinding.findPathToAdjacent(
            aggressor.currentTile,
            target.currentTile,
            this.clients.getOccupiedPositions(aggressor.clientId),
        );
        if (route === null) {
            aggressor.leaveWithoutPayment();
            return;
        }

        if (!target.prepareAsFightTarget(aggressor.clientId)) {
            aggressor.leaveWithoutPayment();
            return;
        }
        if (!aggressor.approachFightTarget(target.clientId, route)) {
            target.cancelFightTarget();
            aggressor.leaveWithoutPayment();
            return;
        }

        const clientIds: readonly [number, number] = [aggressor.clientId, target.clientId];
        const key = this.getFightKey(clientIds);
        const session: FightSession = {
            key,
            clients: [aggressor, target],
            clientIds,
            aggressorId: aggressor.clientId,
            phase: 'APPROACHING',
            remainingMs: 0,
        };
        this.fights.set(key, session);
        for (const clientId of clientIds) this.fightKeyByClient.set(clientId, key);
    }

    private beginVisibleFight(data: FightApproachData): void {
        const session = this.getSessionForApproach(data);
        if (session === null) return;

        const [aggressor, target] = session.clients;
        const aggressorStarted = aggressor.startFight();
        const targetStarted = target.startFight();
        if (!aggressorStarted || !targetStarted) {
            if (aggressorStarted) aggressor.leaveAfterFight();
            if (targetStarted) target.leaveAfterFight();
            if (!targetStarted) target.cancelFightTarget();
            if (!aggressorStarted) aggressor.leaveWithoutPayment();
            this.removeFight(session);
            return;
        }

        session.phase = 'FIGHTING';
        session.remainingMs = this.registry.combat.fightDurationMs;
        const startedData: FightStartedData = { clientIds: session.clientIds };
        eventBus.emit(EVENT_FIGHT_STARTED, startedData);
    }

    private cancelApproach(data: FightApproachData): void {
        const session = this.getSessionForApproach(data);
        if (session === null) return;
        this.removeFight(session);
        this.getOpponent(session)?.cancelFightTarget();
        this.getClient(session.aggressorId)?.leaveWithoutPayment();
    }

    private resolveFight(session: FightSession): void {
        this.removeFight(session);
        const deadIndex = Math.random() < this.registry.combat.deadClientProbability ? 0 : 1;
        const deadClient = session.clients[deadIndex];
        const fleeingClient = session.clients[deadIndex === 0 ? 1 : 0];
        const furnitureSeat = session.clients[1].assignedSeat ?? session.clients[1].currentTile;
        const deathTile = deadClient.currentTile;

        deadClient.dieInFight();
        fleeingClient.fleeAfterFight();

        const murderedData: ClientMurderedData = {
            deadClientId: deadClient.clientId,
            fleeingClientId: fleeingClient.clientId,
            tileX: deathTile.tileX,
            tileY: deathTile.tileY,
            furnitureTileX: furnitureSeat.tileX,
            furnitureTileY: furnitureSeat.tileY,
        };
        eventBus.emit(EVENT_CLIENT_MURDERED, murderedData);

        const stoppedData: FightStoppedData = {
            clientIds: session.clientIds,
            reason: 'RESOLVED',
        };
        eventBus.emit(EVENT_FIGHT_STOPPED, stoppedData);
    }

    private getSessionForApproach(data: FightApproachData): FightSession | null {
        const fightKey = this.fightKeyByClient.get(data.clientId);
        if (fightKey === undefined) return null;
        const session = this.fights.get(fightKey);
        if (
            session === undefined
            || session.phase !== 'APPROACHING'
            || session.aggressorId !== data.clientId
            || !session.clientIds.includes(data.opponentClientId)
        ) return null;
        return session;
    }

    private getClient(clientId: number): Client | null {
        return this.clients.getClientById(clientId);
    }

    private getOpponent(session: FightSession): Client | null {
        const opponent = session.clients.find((client) => client.clientId !== session.aggressorId);
        return opponent ?? null;
    }

    private removeFight(session: FightSession): void {
        this.fights.delete(session.key);
        for (const clientId of session.clientIds) this.fightKeyByClient.delete(clientId);
    }

    private getFightKey(clientIds: readonly [number, number]): string {
        return [...clientIds].sort((left, right) => left - right).join(':');
    }
}
