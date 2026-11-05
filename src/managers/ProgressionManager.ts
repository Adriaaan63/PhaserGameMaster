import { Math as PhaserMath, Scene, Time } from 'phaser';

import {
    CURRENT_NIGHT_REGISTRY_KEY,
    GAME_REGISTRY,
    getNightDifficulty,
    type GameRegistry,
} from '../data/GameRegistry';
import {
    eventBus,
    EVENT_CLIENT_SATISFIED,
    EVENT_GAME_MODE_CHANGED,
    EVENT_NIGHT_ENDED,
    EVENT_NIGHT_TIMER_UPDATED,
    GAME_MODE_PRE_OPENING,
    type ClientSatisfiedData,
} from '../utils/EventBus';

/** Owns the persistent five-night progression and the active night timer. */
export class ProgressionManager {
    private timer: Time.TimerEvent | null = null;
    private remainingMs = 0;
    private satisfiedClients = 0;
    private nightActive = false;
    private nightFinished = false;

    private readonly handleSatisfied = (_data: ClientSatisfiedData): void => {
        if (!this.nightActive || this.currentNight !== 1) return;
        this.satisfiedClients++;
        if (this.satisfiedClients >= this.registry.progression.nightOneSatisfiedClients) {
            this.finishNight('TUTORIAL_CONDITION');
        }
    };

    public constructor(
        private readonly scene: Scene,
        private readonly registry: GameRegistry = GAME_REGISTRY,
    ) {
        const storedNight = scene.registry.get(CURRENT_NIGHT_REGISTRY_KEY);
        const currentNight = typeof storedNight === 'number'
            ? PhaserMath.Clamp(
                Math.floor(storedNight),
                registry.progression.startingNight,
                registry.progression.finalNight,
            )
            : registry.progression.startingNight;
        scene.registry.set(CURRENT_NIGHT_REGISTRY_KEY, currentNight);
        eventBus.on(EVENT_CLIENT_SATISFIED, this.handleSatisfied);
        scene.events.once('shutdown', this.destroy, this);
        scene.events.once('destroy', this.destroy, this);
    }

    public get currentNight(): number {
        return this.scene.registry.get(CURRENT_NIGHT_REGISTRY_KEY) as number;
    }

    public get remainingTimeMs(): number {
        return this.remainingMs;
    }

    public get difficulty() {
        return getNightDifficulty(this.currentNight, this.registry);
    }

    public startNight(): void {
        if (this.nightActive) return;
        this.nightActive = true;
        this.nightFinished = false;
        this.satisfiedClients = 0;
        this.remainingMs = this.registry.progression.nightDurationMs;
        this.timer?.remove(false);
        const timer = this.scene.time.addEvent({
            delay: 1_000,
            loop: true,
            callback: this.tick,
        });
        this.timer = timer;
        eventBus.emit(EVENT_GAME_MODE_CHANGED, { mode: 'NOCHE' });
        this.emitTimer();
    }

    public destroy(): void {
        eventBus.off(EVENT_CLIENT_SATISFIED, this.handleSatisfied);
        this.timer?.remove(false);
    }

    private readonly tick = (): void => {
        if (!this.nightActive || this.nightFinished) return;
        this.remainingMs = Math.max(0, this.remainingMs - 1_000);
        this.emitTimer();
        if (this.remainingMs <= 0) this.finishNight('TIME');
    };

    private finishNight(reason: 'TIME' | 'TUTORIAL_CONDITION'): void {
        if (!this.nightActive || this.nightFinished) return;
        this.nightFinished = true;
        this.nightActive = false;
        const completedNight = this.currentNight;
        const nextNight = Math.min(
            this.registry.progression.finalNight,
            completedNight + 1,
        );
        this.scene.registry.set(CURRENT_NIGHT_REGISTRY_KEY, nextNight);
        this.scene.registry.set('gameMode', GAME_MODE_PRE_OPENING);
        eventBus.emit(EVENT_GAME_MODE_CHANGED, { mode: GAME_MODE_PRE_OPENING });
        eventBus.emit(EVENT_NIGHT_ENDED, { completedNight, nextNight, reason });
    }

    private emitTimer(): void {
        eventBus.emit(EVENT_NIGHT_TIMER_UPDATED, { remainingMs: this.remainingMs });
    }
}
