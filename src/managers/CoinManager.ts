import { Physics, Scene } from 'phaser';

import {
    CREDITS_REGISTRY_KEY,
    GAME_REGISTRY,
    type EconomyConfig,
    type GameRegistry,
} from '../data/GameRegistry';
import { CoinDrop } from '../entities/CoinDrop';
import type { Player } from '../entities/Player';
import {
    eventBus,
    EVENT_COIN_COLLECTED,
    EVENT_COIN_STOLEN,
    type CoinCollectedData,
    type CoinStolenData,
} from '../utils/EventBus';

/** Owns persistent coin drops and arbitrates collection versus future rat theft. */
export class CoinManager {
    private readonly coins: Physics.Arcade.Group;

    public constructor(
        private readonly scene: Scene,
        player: Player,
        private readonly registry: GameRegistry = GAME_REGISTRY,
    ) {
        this.coins = scene.physics.add.group();
        scene.physics.add.overlap(player, this.coins, this.handlePlayerOverlap, undefined, this);
    }

    public spawnSatisfiedClientReward(x: number, y: number, economy: EconomyConfig = this.registry.economy): void {
        for (let index = 0; index < economy.coinsPerSatisfiedClient; index++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = economy.launchSpeedMin
                + Math.random() * (economy.launchSpeedMax - economy.launchSpeedMin);
            const coin = new CoinDrop(
                this.scene,
                x + Math.cos(angle) * economy.coinSpreadRadius,
                y + Math.sin(angle) * economy.coinSpreadRadius,
                economy.valuePerCoin,
                { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
                economy,
            );
            this.coins.add(coin);
        }
    }

    public update(): void {
        for (const child of this.coins.getChildren()) {
            if (child instanceof CoinDrop && child.active) child.update();
        }
    }

    /** Allows rat AI to choose drops without exposing the underlying physics group. */
    public getAvailableCoins(): readonly CoinDrop[] {
        return this.coins.getChildren().filter(
            (child): child is CoinDrop => child instanceof CoinDrop && child.active,
        );
    }

    /** Atomically removes a coin stolen by an NPC and notifies gameplay systems. */
    public stealCoin(coin: CoinDrop): boolean {
        if (!coin.claim('STOLEN')) return false;
        const data: CoinStolenData = { value: coin.value };
        eventBus.emit(EVENT_COIN_STOLEN, data);
        return true;
    }

    public destroy(): void {
        this.coins.clear(true, true);
    }

    private handlePlayerOverlap(_player: unknown, candidate: unknown): void {
        if (!(candidate instanceof CoinDrop) || !candidate.claim('COLLECTED')) return;

        const currentCredits = this.scene.registry.get(CREDITS_REGISTRY_KEY);
        const totalCredits = (typeof currentCredits === 'number'
            ? currentCredits
            : this.registry.economy.startingCredits) + candidate.value;
        this.scene.registry.set(CREDITS_REGISTRY_KEY, totalCredits);

        const data: CoinCollectedData = { value: candidate.value, totalCredits };
        eventBus.emit(EVENT_COIN_COLLECTED, data);
    }
}
