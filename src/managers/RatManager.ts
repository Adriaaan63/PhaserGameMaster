import { Scene } from 'phaser';

import { GAME_REGISTRY, type GameRegistry } from '../data/GameRegistry';
import { TILE } from '../data/constants';
import { CoinDrop } from '../entities/CoinDrop';
import { RatSpawner } from '../entities/RatSpawner';
import type { PathfindingManager } from './PathfindingManager';
import type { CoinManager } from './CoinManager';
import type { ClientPosition } from '../entities/Client';

/** Assigns old coin drops to independent rat spawns and handles scaring. */
export class RatManager {
    private readonly spawners: readonly RatSpawner[];
    private readonly assignedCoins = new Set<CoinDrop>();

    public constructor(
        scene: Scene,
        spawnPositions: readonly ClientPosition[],
        private readonly coins: CoinManager,
        pathfinding: PathfindingManager,
        private readonly registry: GameRegistry = GAME_REGISTRY,
    ) {
        this.spawners = spawnPositions.map((position) => new RatSpawner(
            scene,
            position,
            pathfinding,
            (coins) => coins.forEach((coin) => this.coins.notifyCoinStolen(coin)),
            (rat) => rat.assignedCoins.forEach((coin) => this.assignedCoins.delete(coin)),
            registry,
        ));
    }

    public update(deltaMs: number): void {
        for (const spawner of this.spawners) {
            const rat = spawner.rat;
            if (rat === null) continue;
            rat.update(deltaMs);
        }

        const availableCoins = this.coins.getAvailableCoins()
            .filter((coin) => !this.assignedCoins.has(coin))
            .filter((coin) => coin.ageMs >= this.registry.economy.coinRatAttractionDelayMs)
            .sort((left, right) => left.createdAt - right.createdAt);

        for (const spawner of this.spawners) {
            const oldestCoin = availableCoins.find((coin) => !this.assignedCoins.has(coin));
            if (oldestCoin === undefined || !spawner.isFree) continue;
            const lootGroup = this.coins.getAvailableLootGroup(oldestCoin.lootGroupId)
                .filter((coin) => !this.assignedCoins.has(coin));
            const rat = spawner.spawn(lootGroup);
            if (rat !== null) rat.assignedCoins.forEach((coin) => this.assignedCoins.add(coin));
        }
    }

    public scareAt(tileX: number, tileY: number): boolean {
        for (const spawner of this.spawners) {
            const rat = spawner.rat;
            if (
                rat !== null
                && (rat.ratState === 'SEEKING' || rat.ratState === 'RETURNING')
                && Math.hypot(rat.x - (tileX + 0.5) * TILE, rat.y - (tileY + 0.5) * TILE)
                    <= (this.registry.rats.interactionRadiusTiles + 0.5) * TILE
            ) {
                return rat.scare();
            }
        }
        return false;
    }

    public destroy(): void {
        for (const spawner of this.spawners) spawner.destroy();
        this.assignedCoins.clear();
    }
}
