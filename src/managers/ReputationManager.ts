import { Math as PhaserMath, Scene } from 'phaser';

import {
    CRIMINAL_REPUTATION_REGISTRY_KEY,
    GAME_REGISTRY,
    type GameRegistry,
} from '../data/GameRegistry';
import {
    eventBus,
    EVENT_CLIENT_LEAVING,
    EVENT_CLIENT_SATISFIED,
    EVENT_JABBA_RAID_ENDED,
    EVENT_JABBA_RAID_STARTED,
    EVENT_REPUTATION_UPDATED,
    type ClientLeavingData,
    type ClientSatisfiedData,
    type JabbaRaidEndedData,
    type ReputationUpdatedData,
} from '../utils/EventBus';

/** Persists and updates Jabba's criminal reputation across night scenes. */
export class ReputationManager {
    private reputation: number;
    private readonly satisfiedClients = new Set<number>();
    private raidActive = false;
    private raidTriggered = false;

    private readonly handleSatisfied = (data: ClientSatisfiedData): void => {
        if (this.raidActive) return;
        this.satisfiedClients.add(data.clientId);
        this.changeReputation(this.registry.reputation.reputationGainPerOrder);
    };

    private readonly handleLeaving = (data: ClientLeavingData): void => {
        if (this.raidActive) return;
        if (this.satisfiedClients.delete(data.clientId)) return;
        this.changeReputation(this.registry.reputation.reputationLossPerMiss);
    };

    private readonly handleRaidStarted = (): void => {
        this.raidActive = true;
    };

    private readonly handleRaidEnded = (_data: JabbaRaidEndedData): void => {
        this.raidActive = false;
        this.raidTriggered = false;
        this.satisfiedClients.clear();
        this.setReputation(this.registry.reputation.postRaidReputation);
    };

    public constructor(
        private readonly scene: Scene,
        private readonly registry: GameRegistry = GAME_REGISTRY,
    ) {
        const storedReputation = this.scene.registry.get(CRIMINAL_REPUTATION_REGISTRY_KEY);
        this.reputation = PhaserMath.Clamp(
            typeof storedReputation === 'number'
                ? storedReputation
                : this.registry.reputation.startingReputation,
            0,
            this.registry.reputation.maxReputation,
        );
        this.scene.registry.set(CRIMINAL_REPUTATION_REGISTRY_KEY, this.reputation);
        eventBus.on(EVENT_CLIENT_SATISFIED, this.handleSatisfied);
        eventBus.on(EVENT_CLIENT_LEAVING, this.handleLeaving);
        eventBus.on(EVENT_JABBA_RAID_STARTED, this.handleRaidStarted);
        eventBus.on(EVENT_JABBA_RAID_ENDED, this.handleRaidEnded);
    }

    public destroy(): void {
        eventBus.off(EVENT_CLIENT_SATISFIED, this.handleSatisfied);
        eventBus.off(EVENT_CLIENT_LEAVING, this.handleLeaving);
        eventBus.off(EVENT_JABBA_RAID_STARTED, this.handleRaidStarted);
        eventBus.off(EVENT_JABBA_RAID_ENDED, this.handleRaidEnded);
    }

    public get currentReputation(): number {
        return this.reputation;
    }

    public applyBetrayal(): void {
        this.changeReputation(this.registry.reputation.reputationLossPerBetrayal);
    }

    private changeReputation(delta: number): void {
        if (this.raidActive || delta === 0) return;
        const previousReputation = this.reputation;
        this.reputation = PhaserMath.Clamp(
            this.reputation + delta,
            0,
            this.registry.reputation.maxReputation,
        );
        this.scene.registry.set(CRIMINAL_REPUTATION_REGISTRY_KEY, this.reputation);
        const data: ReputationUpdatedData = {
            currentReputation: this.reputation,
            change: this.reputation - previousReputation,
        };
        eventBus.emit(EVENT_REPUTATION_UPDATED, data);
        if (this.reputation === 0 && !this.raidTriggered) {
            this.raidTriggered = true;
            eventBus.emit(EVENT_JABBA_RAID_STARTED, { reputation: this.reputation });
        }
    }

    private setReputation(value: number): void {
        const previousReputation = this.reputation;
        this.reputation = PhaserMath.Clamp(
            value,
            0,
            this.registry.reputation.maxReputation,
        );
        this.scene.registry.set(CRIMINAL_REPUTATION_REGISTRY_KEY, this.reputation);
        eventBus.emit(EVENT_REPUTATION_UPDATED, {
            currentReputation: this.reputation,
            change: this.reputation - previousReputation,
        });
    }
}
