import { Scene } from 'phaser';

import { GAME_REGISTRY, type GameRegistry } from '../data/GameRegistry';
import type { ClientPosition } from './Client';
import type { CoinDrop } from './CoinDrop';
import { Rat } from './Rat';
import type { PathfindingManager } from '../managers/PathfindingManager';

/** Owns one rat spawn point and never has more than one active rat. */
export class RatSpawner {
    private activeRat: Rat | null = null;

    public constructor(
        private readonly scene: Scene,
        public readonly position: ClientPosition,
        private readonly pathfinding: PathfindingManager,
        private readonly onCoinsStolen: (coins: readonly CoinDrop[]) => void,
        private readonly onRatReleased: (rat: Rat) => void,
        private readonly registry: GameRegistry = GAME_REGISTRY,
    ) {}

    public get isFree(): boolean {
        return this.activeRat === null;
    }

    public get rat(): Rat | null {
        return this.activeRat;
    }

    public spawn(targetCoins: readonly CoinDrop[]): Rat | null {
        if (
            this.activeRat !== null
            || targetCoins.length === 0
        ) return null;
        const assignedCoins: CoinDrop[] = [];
        for (const coin of targetCoins) {
            if (!coin.assignToRat()) {
                for (const assignedCoin of assignedCoins) assignedCoin.releaseFromRat();
                return null;
            }
            assignedCoins.push(coin);
        }

        this.activeRat = new Rat(
            this.scene,
            this.position,
            targetCoins,
            this.pathfinding,
            {
                onReturned: (rat) => this.release(rat),
                onCoinsStolen: this.onCoinsStolen,
            },
            this.registry,
        );
        return this.activeRat;
    }

    public release(rat: Rat): void {
        if (this.activeRat !== rat) return;
        this.activeRat = null;
        this.onRatReleased(rat);
        rat.destroy();
    }

    public destroy(): void {
        this.activeRat?.destroy();
        this.activeRat = null;
    }
}
